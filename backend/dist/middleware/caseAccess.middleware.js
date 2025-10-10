"use strict";
// backend/src/middleware/caseAccess.middleware.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkItemAccessByParentCase = exports.checkCaseAccess = void 0;
const db_1 = __importDefault(require("../db"));
// Assumindo que a tipagem de Express.Request com req.user e req.accessFilter já existe globalmente,
// ou foi definida em auth.ts e unitAccess.middleware.ts.
/**
 * Middleware auxiliar que checa se o usuário tem permissão de unidade para
 * interagir com um Caso específico (GET, PUT, POST, DELETE).
 * * O ID do caso pode vir de req.params.id, req.params.casoId ou req.body.caso_associado_id.
 * * @param idLocation Onde encontrar o ID na requisição ('params' ou 'body').
 * @param idName O nome do campo do ID ('id', 'casoId', 'caso_associado_id').
 */
const checkCaseAccess = (idLocation, idName) => {
    return async (req, res, next) => {
        // ID do Caso a ser verificado (inicialmente como string)
        const rawId = req?.[idLocation]?.[idName];
        const casoIdString = rawId ? String(rawId) : undefined;
        if (!casoIdString) {
            if (idLocation === 'params' || req.method !== 'POST') {
                return res.status(400).json({ message: "ID do Caso é obrigatório para esta operação." });
            }
            return next();
        }
        // 1. Converte o ID para número
        const casoId = parseInt(casoIdString, 10);
        // ⭐️ CORREÇÃO ESSENCIAL: Intercepta o NaN antes de quebrar o PostgreSQL
        if (isNaN(casoId)) {
            console.error("ID de Caso inválido detectado (NaN). Bloqueando acesso para evitar erro SQL.");
            return res.status(400).json({ message: "ID do Caso inválido (não é um número válido)." });
        }
        const accessFilter = req.accessFilter;
        // 1. RESOLVER PLACEHOLDERS E PARÂMETROS
        // O ID do caso (NUMÉRICO) é agora o primeiro parâmetro, $1.
        const params = [casoId];
        let unitWhere = accessFilter.whereClause;
        if (accessFilter.params.length === 1) {
            unitWhere = unitWhere.replace('$X', `$${params.length + 1}`);
            params.push(accessFilter.params[0]);
        }
        else if (accessFilter.params.length === 2) {
            unitWhere = unitWhere.replace('$X', `$${params.length + 1}`).replace('$Y', `$${params.length + 2}`);
            params.push(accessFilter.params[0], accessFilter.params[1]);
        }
        // 2. CONSULTA DE VERIFICAÇÃO DE PERMISSÃO
        // O $1::INTEGER é seguro porque casoId é checado como número válido.
        const query = `SELECT id FROM casos WHERE id = $1::INTEGER AND ${unitWhere}`;
        try {
            const result = await db_1.default.query(query, params);
            if (result.rowCount === 0) {
                return res.status(403).json({ message: "Acesso Proibido. Você não tem permissão para interagir com este caso (Unit ID)." });
            }
            // Armazena o casoId (numérico) na requisição para uso posterior (log, etc.)
            req.casoId = casoId;
            next();
        }
        catch (error) {
            console.error("Erro na checagem de acesso centralizada:", error);
            res.status(500).json({ message: "Erro de validação de acesso." });
        }
    };
};
exports.checkCaseAccess = checkCaseAccess;
/**
 * Middleware específico para rotas PUT/PATCH que usam o ID de um ITEM FILHO (Encaminhamento, etc.).
 * ...
 */
const checkItemAccessByParentCase = (itemIdName, itemTableName) => {
    return async (req, res, next) => {
        const rawId = req.params[itemIdName];
        const itemIdString = rawId ? String(rawId) : undefined;
        // 1. Converte o ID do Item Filho para número
        const itemId = parseInt(itemIdString || '', 10);
        // ⭐️ CORREÇÃO ESSENCIAL: Intercepta o NaN antes de quebrar o PostgreSQL
        if (isNaN(itemId)) {
            console.error(`ID de ${itemTableName} inválido detectado (NaN). Bloqueando acesso.`);
            return res.status(400).json({ message: `ID do ${itemTableName} inválido (não é um número válido).` });
        }
        const accessFilter = req.accessFilter;
        try {
            // 1. Encontra o casoId associado ao item filho (usando o itemId NUMÉRICO)
            const casoResult = await db_1.default.query(`SELECT "casoId" FROM ${itemTableName} WHERE id = $1`, [itemId]);
            if (casoResult.rowCount === 0) {
                return res.status(404).json({ message: `${itemTableName} não encontrado.` });
            }
            const casoId = casoResult.rows[0].casoId; // Este já deve ser um número, vindo do DB
            // 2. Resolve Placeholders
            const params = [casoId];
            let unitWhere = accessFilter.whereClause;
            if (accessFilter.params.length === 1) {
                unitWhere = unitWhere.replace('$X', `$${params.length + 1}`);
                params.push(accessFilter.params[0]);
            }
            else if (accessFilter.params.length === 2) {
                unitWhere = unitWhere.replace('$X', `$${params.length + 1}`).replace('$Y', `$${params.length + 2}`);
                params.push(accessFilter.params[0], accessFilter.params[1]);
            }
            // 3. Checa a permissão de unidade para o caso
            const checkQuery = `SELECT id FROM casos WHERE id = $1::INTEGER AND ${unitWhere}`;
            const checkResult = await db_1.default.query(checkQuery, params);
            if (checkResult.rowCount === 0) {
                return res.status(403).json({ message: "Acesso Proibido. Você não pode atualizar este item de um caso fora da sua unidade." });
            }
            // Armazena o casoId na requisição para uso no log, etc.
            req.casoId = casoId;
            next();
        }
        catch (error) {
            console.error(`Erro na checagem de acesso de ${itemTableName}:`, error);
            res.status(500).json({ message: "Erro de validação de acesso." });
        }
    };
};
exports.checkItemAccessByParentCase = checkItemAccessByParentCase;
