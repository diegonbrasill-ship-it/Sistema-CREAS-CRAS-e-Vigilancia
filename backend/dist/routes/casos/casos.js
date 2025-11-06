"use strict";
// backend/src/routes/casos.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanSqlString = void 0;
const express_1 = require("express");
const db_1 = __importDefault(require("../../db"));
const auth_1 = require("../../middleware/auth/auth");
const unitAccess_middleware_1 = require("../../middleware/unitAccess.middleware");
const caseAccess_middleware_1 = require("../../middleware/caseAccess.middleware"); // Manter para rotas de modificação
const router = (0, express_1.Router)();
const casos_controller_1 = require("./casos.controller");
// FUNÇÃO UTILITÁRIA: Limpeza de strings SQL
const cleanSqlString = (sql) => sql.replace(/\s+/g, ' ').trim();
exports.cleanSqlString = cleanSqlString;
router.use(auth_1.authMiddleware, (0, unitAccess_middleware_1.unitAccessMiddleware)('casos', 'unit_id'));
// ROTA POST /casos - CRIAR NOVO CASO (CORRIGIDO: Inserção de dados_completos)
router.post("/", casos_controller_1.CasosCrontroller.create);
// ROTA GET /casos - LISTAR CASOS (CORREÇÃO DE TIPAGEM E BPC)
router.get("/", casos_controller_1.CasosCrontroller.list);
// ROTA PUT /casos/:id - ATUALIZAR CASO (Mantém segurança de modificação)
router.put("/:id", (0, caseAccess_middleware_1.checkCaseAccess)('params', 'id'), casos_controller_1.CasosCrontroller.update);
// PATCH /casos/:id/status (Mantém segurança de modificação)
router.patch("/:id/status", (0, caseAccess_middleware_1.checkCaseAccess)('params', 'id'), casos_controller_1.CasosCrontroller.patch);
// DELETE /casos/:id (Mantém segurança de modificação)
router.delete("/:id", (0, caseAccess_middleware_1.checkCaseAccess)('params', 'id'), casos_controller_1.CasosCrontroller.delete);
// GET /casos/:id - DETALHES DO CASO (Segurança Reintroduzida)
router.get("/:id", casos_controller_1.CasosCrontroller.getCaso);
// =======================================================================
// GET /casos/:casoId/encaminhamentos (Segurança Reintroduzida)
// =======================================================================
router.get("/:casoId/encaminhamentos", async (req, res) => {
    const { casoId } = req.params;
    const accessFilter = req.accessFilter; // Cláusula de filtro de unidade
    // 1. Resolve Placeholders para a checagem de acesso
    const unitParams = [casoId]; // ID do Caso é o $1
    let unitWhere = accessFilter.whereClause;
    if (accessFilter.params.length === 1) {
        unitWhere = unitWhere.replace('$X', `$${unitParams.length + 1}`);
        unitParams.push(accessFilter.params[0]);
    }
    else if (accessFilter.params.length === 2) {
        unitWhere = unitWhere.replace('$X', `$${unitParams.length + 1}`).replace('$Y', `$${unitParams.length + 2}`);
        unitParams.push(accessFilter.params[0], accessFilter.params[1]);
    }
    // 2. Query: Busca encaminhamentos APENAS se o caso pertencer à unidade
    const finalUnitWhere = accessFilter.whereClause === 'TRUE' ? 'TRUE' : `(${unitWhere.replace(/casos\./g, 'c.')} OR c.unit_id IS NULL)`;
    const checkQuery = (0, exports.cleanSqlString)(`
        SELECT enc.id, enc."servicoDestino", enc."dataEncaminhamento", enc.status,
               enc.observacoes, usr.username AS "tecRef"
        FROM encaminhamentos enc
        LEFT JOIN users usr ON enc."userId" = usr.id
        LEFT JOIN casos c ON enc."casoId" = c.id
        WHERE enc."casoId" = $1 AND ${finalUnitWhere}
        ORDER BY enc."dataEncaminhamento" DESC
    `);
    try {
        const result = await db_1.default.query(checkQuery, unitParams);
        res.json(result.rows);
    }
    catch (err) {
        console.error(`Erro ao listar encaminhamentos para o caso ${casoId}:`, err.message);
        res.status(500).json({ message: "Erro ao buscar encaminhamentos." });
    }
});
// =======================================================================
// ROTA GET /casos/busca-rapida - BUSCA RÁPIDA PARA ASSOCIAÇÃO DE DEMANDAS
// =======================================================================
router.get("/busca-rapida", auth_1.authMiddleware, (0, unitAccess_middleware_1.unitAccessMiddleware)('casos', 'unit_id'), async (req, res) => {
    const accessFilter = req.accessFilter;
    const { q } = req.query;
    const searchTerm = q?.trim();
    if (!searchTerm || searchTerm.length < 3) {
        return res.json([]); // Retorna vazio se a busca for muito curta
    }
    try {
        const params = [];
        const addParam = (val) => {
            params.push(val);
            return `$${params.length}`;
        };
        // 1. Constrói a cláusula WHERE de busca (Nome, NIS, CPF, ID)
        const wild = `%${searchTerm}%`;
        const p1 = addParam(wild);
        const p2 = addParam(wild);
        const p3 = addParam(wild);
        // Tentativa de buscar por ID exato se o termo for numérico
        const idSearch = parseInt(searchTerm, 10);
        let idClause = '';
        if (!isNaN(idSearch)) {
            const pId = addParam(idSearch);
            idClause = ` OR id = ${pId}::INTEGER`;
        }
        const searchClause = (0, exports.cleanSqlString)(`
            (nome ILIKE ${p1} OR
             dados_completos->>'nis' ILIKE ${p2} OR
             dados_completos->>'cpf' ILIKE ${p3}
             ${idClause}
            )
        `);
        // 2. Constrói o filtro de acesso por unidade
        const [unitFilterContent, unitParams] = [accessFilter.whereClause, accessFilter.params];
        let accessParams = [...unitParams];
        // Substitui placeholders do accessFilter
        let accessWhere = unitFilterContent;
        let pIndex = params.length;
        if (unitParams.length === 1) {
            accessWhere = accessWhere.replace('$X', `$${++pIndex}`);
        }
        else if (unitParams.length === 2) {
            accessWhere = accessWhere.replace('$X', `$${++pIndex}`).replace('$Y', `$${++pIndex}`);
        }
        params.push(...accessParams);
        // 3. Montagem final da query (combinando busca, status Ativo e segurança)
        const query = (0, exports.cleanSqlString)(`
            SELECT id, nome, "tecRef", dados_completos->>'nis' AS nis, dados_completos->>'cpf' AS cpf
            FROM casos
            WHERE status = 'Ativo' 
              AND (${searchClause})
              AND (${accessWhere})
            ORDER BY nome ASC
            LIMIT 10
        `);
        const result = await db_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (err) {
        console.error("Erro na busca rápida de casos:", err.message);
        res.status(500).json({ message: "Erro na busca rápida de casos." });
    }
});
exports.default = router;
