"use strict";
// backend/src/routes/anexos.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const upload_1 = __importDefault(require("../middleware/upload"));
const logger_1 = require("../services/logger");
const unitAccess_middleware_1 = require("../middleware/unitAccess.middleware");
const caseAccess_middleware_1 = require("../middleware/caseAccess.middleware");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = express_1.default.Router();
// FUNÇÃO UTILITÁRIA: Limpeza de strings SQL
const cleanSqlString = (sql) => {
    return sql.replace(/\s+/g, ' ').trim();
};
// Middleware auxiliar para checar acesso por anexo ID (usa o cleanSqlString)
async function checkAnexoAccess(req, res, next) {
    const { id: anexoIdString } = req.params;
    const accessFilter = req.accessFilter;
    const anexoId = parseInt(anexoIdString, 10);
    if (isNaN(anexoId)) {
        return res.status(400).json({ message: 'ID do anexo inválido.' });
    }
    try {
        // 1. Busca o casoId associado ao anexo/demanda
        const casoResultQuery = cleanSqlString('SELECT "casoId", "demandaId" FROM anexos WHERE id = $1');
        const casoResult = await db_1.default.query(casoResultQuery, [anexoId]);
        if (casoResult.rowCount === 0) {
            return res.status(404).json({ message: 'Anexo não encontrado.' });
        }
        const { casoId, demandaId } = casoResult.rows[0];
        let idToCheck = casoId;
        if (!idToCheck && demandaId) {
            const demandaQuery = cleanSqlString('SELECT caso_associado_id FROM demandas WHERE id = $1');
            const demandaResult = await db_1.default.query(demandaQuery, [demandaId]);
            idToCheck = demandaResult.rows[0]?.caso_associado_id;
        }
        if (!idToCheck) {
            return res.status(403).json({ message: 'Acesso Proibido. Anexo sem vínculo de caso.' });
        }
        // 2. Checa a permissão de unidade para o caso (lógica do checkCaseAccess)
        const params = [idToCheck];
        const accessFilter = req.accessFilter;
        let unitWhere = accessFilter.whereClause;
        if (accessFilter.params.length === 1) {
            unitWhere = unitWhere.replace('$X', `$${params.length + 1}`);
            params.push(accessFilter.params[0]);
        }
        else if (accessFilter.params.length === 2) {
            unitWhere = unitWhere.replace('$X', `$${params.length + 1}`).replace('$Y', `$${params.length + 2}`);
            params.push(accessFilter.params[0], accessFilter.params[1]);
        }
        const checkQuery = cleanSqlString(`SELECT id FROM casos WHERE id = $1 AND ${unitWhere}`);
        const checkResult = await db_1.default.query(checkQuery, params);
        if (checkResult.rowCount === 0) {
            return res.status(403).json({ message: "Acesso Proibido. O anexo pertence a um caso fora da sua unidade de atuação." });
        }
        req.casoId = idToCheck;
        next();
    }
    catch (error) {
        console.error("Erro na checagem de acesso de anexo:", error);
        res.status(500).json({ message: "Erro de validação de acesso ao anexo." });
    }
}
// APLICAÇÃO GERAL DOS MIDDLEWARES DE SEGURANÇA NA ROTA
router.use(auth_1.authMiddleware, (0, unitAccess_middleware_1.unitAccessMiddleware)('casos', 'unit_id'));
// =======================================================================
// ROTA para listar os anexos de um CASO (Ajuste de Colunas)
// =======================================================================
router.get('/casos/:casoId', async (req, res) => {
    const { casoId } = req.params;
    const parsedId = parseInt(casoId, 10);
    if (isNaN(parsedId)) {
        console.error(`ERRO: casoId inválido recebido: ${casoId}`);
        return res.status(400).json({ message: 'ID de caso inválido.' });
    }
    try {
        // ⭐️ CORREÇÃO DO SCHEMA SQL: Colunas alteradas para o seu padrão (nomeOriginal, dataUpload, casoId)
        const query = cleanSqlString(`
      SELECT
        anex.id, anex."nomeOriginal", anex."tamanhoArquivo", 
        anex."dataUpload", anex.descricao, usr.username AS "uploadedBy"
      FROM anexos anex
      LEFT JOIN users usr ON anex."userId" = usr.id
      WHERE anex."casoId" = $1 
      ORDER BY anex."dataUpload" DESC;
    `);
        // Passar o ID parseado
        const result = await db_1.default.query(query, [parsedId]);
        res.json(result.rows);
    }
    catch (err) {
        console.error(`Erro ao listar anexos: ${err.message}`);
        res.status(500).json({ message: 'Erro ao buscar anexos.' });
    }
});
// =======================================================================
// ROTA: Upload de anexo para um CASO (Corrigido as colunas)
// =======================================================================
router.post('/upload/caso/:casoId', (0, caseAccess_middleware_1.checkCaseAccess)('params', 'casoId'), upload_1.default.single('anexo'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo foi enviado.' });
    }
    const { casoId } = req.params;
    const { descricao } = req.body;
    const { id: userId, username, unit_id: userUnitId } = req.user;
    const uploadedFile = req.file;
    const { originalname, filename, path: filePath, mimetype, size } = uploadedFile;
    try {
        // ⭐️ CORREÇÃO DO SCHEMA SQL
        const query = cleanSqlString(`
        INSERT INTO anexos 
          ("casoId", "userId", "nomeOriginal", "nomeArmazenado", "caminhoArquivo", "tipoArquivo", "tamanhoArquivo", descricao)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, "nomeOriginal";
      `);
        const result = await db_1.default.query(query, [
            casoId, userId, originalname, filename, filePath, mimetype, size, descricao
        ]);
        const novoAnexo = result.rows[0];
        await (0, logger_1.logAction)({
            userId,
            username,
            action: 'UPLOAD_CASE_ATTACHMENT',
            details: { casoId, anexoId: novoAnexo.id, nomeArquivo: novoAnexo.nomeOriginal, unitId: userUnitId }
        });
        res.status(201).json({ message: 'Arquivo enviado com sucesso!', anexo: novoAnexo });
    }
    catch (err) {
        console.error(`Erro ao salvar informações do anexo no banco de dados: ${err.message}`);
        res.status(500).json({ message: 'Erro no servidor ao registrar o anexo.' });
    }
});
// =======================================================================
// ROTA: Upload de anexo para uma DEMANDA (Corrigido as colunas)
// =======================================================================
router.post('/upload/demanda/:demandaId', upload_1.default.single('anexo'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo foi enviado.' });
    }
    // ... (lógica de upload demanda inalterada)
    const { demandaId } = req.params;
    const { descricao } = req.body;
    const { id: userId, username, unit_id: userUnitId } = req.user;
    const uploadedFile = req.file;
    const { originalname, filename, path: filePath, mimetype, size } = uploadedFile;
    try {
        // ⭐️ CORREÇÃO DO SCHEMA SQL
        const query = cleanSqlString(`
                INSERT INTO anexos
                  ("demandaId", "userId", "nomeOriginal", "nomeArmazenado", "caminhoArquivo", "tipoArquivo", "tamanhoArquivo", descricao)
                VALUES
                  ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, "nomeOriginal";
            `);
        const result = await db_1.default.query(query, [
            demandaId, userId, originalname, filename, filePath, mimetype, size, descricao
        ]);
        const novoAnexo = result.rows[0];
        await (0, logger_1.logAction)({
            userId,
            username,
            action: 'UPLOAD_DEMAND_ATTACHMENT',
            details: { demandaId, anexoId: novoAnexo.id, nomeArquivo: novoAnexo.nomeOriginal, unitId: userUnitId }
        });
        res.status(201).json({ message: 'Arquivo enviado com sucesso!', anexo: novoAnexo });
    }
    catch (err) {
        console.error(`Erro ao anexar arquivo à demanda ${demandaId}: ${err.message}`);
        res.status(500).json({ message: 'Erro no servidor ao registrar o anexo.' });
    }
});
// =======================================================================
// ROTA para permitir o DOWNLOAD de um anexo (Mantém checkAnexoAccess)
// =======================================================================
router.get('/download/:id', checkAnexoAccess, async (req, res) => {
    const { id } = req.params;
    const { id: userId, username, unit_id: userUnitId } = req.user;
    const casoId = req.casoId;
    try {
        const query = cleanSqlString(`SELECT "caminhoArquivo", "nomeOriginal" FROM anexos WHERE id = $1`);
        const result = await db_1.default.query(query, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Anexo não encontrado.' });
        }
        const anexo = result.rows[0];
        const filePath = path_1.default.resolve(anexo.caminhoArquivo);
        await (0, logger_1.logAction)({
            userId,
            username,
            action: 'DOWNLOAD_ATTACHMENT',
            details: { anexoId: id, nomeArquivo: anexo.nomeOriginal, casoId, unitId: userUnitId }
        });
        if (fs_1.default.existsSync(filePath)) {
            res.download(filePath, anexo.nomeOriginal, (err) => {
                if (err) {
                    console.error('Erro durante o download do arquivo:', err);
                }
            });
        }
        else {
            console.error(`Arquivo não encontrado no disco: ${filePath}`);
            res.status(404).json({ message: 'Arquivo não encontrado no servidor.' });
        }
    }
    catch (err) {
        console.error(`Erro ao processar download do anexo ${id}: ${err.message}`);
        res.status(500).json({ message: 'Erro ao processar download.' });
    }
});
exports.default = router;
