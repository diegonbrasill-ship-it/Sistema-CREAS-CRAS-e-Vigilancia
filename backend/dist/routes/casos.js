"use strict";
// backend/src/routes/casos.ts (VERSÃO FINAL COM MIDDLEWARES DE ACESSO REMOVIDOS)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanSqlString = void 0;
exports.anonimizarDadosSeNecessario = anonimizarDadosSeNecessario;
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const unitAccess_middleware_1 = require("../middleware/unitAccess.middleware");
const logger_1 = require("../services/logger");
const constants_1 = require("../utils/constants");
const caseAccess_middleware_1 = require("../middleware/caseAccess.middleware");
const router = (0, express_1.Router)();
// FUNÇÃO UTILITÁRIA: Limpeza de strings SQL
const cleanSqlString = (sql) => sql.replace(/\s+/g, ' ').trim();
exports.cleanSqlString = cleanSqlString;
// =======================================================================
// FUNÇÃO DE ANONIMIZAÇÃO DE DADOS (Mantida)
// =======================================================================
function anonimizarDadosSeNecessario(user, data) {
    const isVigilancia = user.role === 'vigilancia';
    if (!isVigilancia || !data)
        return data;
    const anonimizarCaso = (caso) => {
        const deveAnonimizar = caso.unit_id === constants_1.UNIT_ID_CREAS;
        if (!deveAnonimizar)
            return caso;
        const casoAnonimizado = { ...caso };
        const casoId = casoAnonimizado.id || 'XXX';
        casoAnonimizado.nome = `[DADO SIGILOSO - ID: ${casoId}]`;
        delete casoAnonimizado.cpf;
        delete casoAnonimizado.nis;
        if (casoAnonimizado.dados_completos) {
            casoAnonimizado.dados_completos.nome = `[DADO SIGILOSO - ID: ${casoId}]`;
            delete casoAnonimizado.dados_completos.cpf;
            delete casoAnonimizado.dados_completos.nis;
        }
        return casoAnonimizado;
    };
    return Array.isArray(data) ? data.map(anonimizarCaso) : anonimizarCaso(data);
}
// =======================================================================
// MIDDLEWARES GERAIS DE SEGURANÇA
// =======================================================================
router.use(auth_1.authMiddleware, (0, unitAccess_middleware_1.unitAccessMiddleware)('casos', 'unit_id'));
// =======================================================================
// ROTA POST /casos - Criar novo caso
// =======================================================================
// Rotas POST, PUT, DELETE, PATCH SEMPRE USAM checagem de acesso para modificação.
router.post("/", (0, caseAccess_middleware_1.checkCaseAccess)('body', 'unit_id'), async (req, res) => {
    const { dataCad, tecRef, nome, dados_completos, unit_id } = req.body;
    const userId = req.user.id;
    const username = req.user.username;
    try {
        const insertQuery = (0, exports.cleanSqlString)(`
      INSERT INTO casos ("dataCad", "tecRef", nome, dados_completos, unit_id, "userId", status)
      VALUES ($1, $2, $3, $4, $5, $6, 'Ativo')
      RETURNING *
    `);
        const result = await db_1.default.query(insertQuery, [
            dataCad,
            tecRef,
            nome,
            JSON.stringify(dados_completos),
            unit_id,
            userId
        ]);
        await (0, logger_1.logAction)({ userId, username, action: 'CREATE_CASE', details: { casoId: result.rows[0].id } });
        res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error("Erro ao criar caso:", err.message);
        res.status(500).json({ message: "Erro ao criar caso." });
    }
});
// =======================================================================
// ROTA GET /casos - LISTAR CASOS 
// ... (Rota de Listagem inalterada)
// =======================================================================
router.get("/", async (req, res) => {
    const user = req.user;
    const accessFilter = req.accessFilter;
    // Desestruturação da Query
    const { q, tecRef, filtro, valor, status = 'Ativo', confirmedViolence, socioeducacao, mes } = req.query;
    try {
        let query = `
      SELECT id, "dataCad", "tecRef", nome, status,
             dados_completos->>'bairro' AS bairro,
             dados_completos->>'confirmacaoViolencia' AS "confirmacaoViolencia",
             dados_completos->>'membroSocioeducacao' AS "membroSocioeducacao",
             unit_id
      FROM casos
    `;
        const params = [];
        const whereClauses = [];
        // helper: adiciona param e retorna placeholder $n
        const addParam = (val) => {
            params.push(val);
            return `$${params.length}`;
        };
        // 1. FILTROS STATUS E MÊS
        if (status && status !== 'todos') {
            const ph = addParam(status);
            whereClauses.push(`status = ${ph}::VARCHAR`);
        }
        if (mes) {
            const ph = addParam(mes);
            whereClauses.push(`TO_CHAR("dataCad", 'YYYY-MM') = ${ph}::VARCHAR`);
        }
        // 2. FILTRO DE BUSCA (geral ou por tecRef/filtro)
        const searchTerm = valor && filtro === 'q' ? valor : tecRef;
        if (searchTerm) {
            const wild = `%${searchTerm}%`;
            const p1 = addParam(wild);
            const p2 = addParam(wild);
            const p3 = addParam(wild);
            const p4 = addParam(wild);
            whereClauses.push((0, exports.cleanSqlString)(`
        (nome ILIKE ${p1} OR
         "tecRef" ILIKE ${p2} OR
         dados_completos->>'nis' ILIKE ${p3} OR
         dados_completos->>'cpf' ILIKE ${p4})
      `));
        }
        // ⭐️ TRATAMENTO ROBUSTO PARA FILTROS DE CARD/GRÁFICO
        else if (filtro && valor && filtro !== 'q') {
            const jsonKey = filtro;
            const phValor = addParam(valor);
            if (jsonKey === 'por_bairro') {
                // Lógica de Bairro (busca exata)
                whereClauses.push(`LOWER(dados_completos->>'bairro') = LOWER(${phValor}::TEXT)`);
            }
            else if (jsonKey === 'por_violencia') {
                // Lógica de Tipo de Violência (busca parcial - ILIKE)
                whereClauses.push(`dados_completos->>'tipoViolencia' ILIKE ${phValor}`);
            }
            else if (jsonKey === 'por_faixa_etaria') {
                // Lógica de Faixa Etária (filtro complexo no frontend, tratamento especial no backend)
                whereClauses.push((0, exports.cleanSqlString)(`
            CASE 
                WHEN (dados_completos->>'idade')::integer BETWEEN 0 AND 11 THEN 'Criança (0-11)' 
                WHEN (dados_completos->>'idade')::integer BETWEEN 12 AND 17 THEN 'Adolescente (12-17)' 
                WHEN (dados_completos->>'idade')::integer BETWEEN 18 AND 29 THEN 'Jovem (18-29)' 
                WHEN (dados_completos->>'idade')::integer BETWEEN 30 AND 59 THEN 'Adulto (30-59)' 
                WHEN (dados_completos->>'idade')::integer >= 60 THEN 'Idoso (60+)' 
                ELSE 'Não informado' 
            END = ${phValor}::TEXT
        `));
            }
            else {
                // Lógica Genérica: Cobre todos os cards e a maioria dos gráficos
                whereClauses.push(`dados_completos->>'${jsonKey}' = ${phValor}::TEXT`);
            }
        }
        // 3. FILTROS DE COERÊNCIA (Apenas mantidos por compatibilidade)
        if (confirmedViolence === 'true')
            whereClauses.push(`(dados_completos->>'confirmacaoViolencia')::TEXT = 'Confirmada'`);
        if (socioeducacao === 'true')
            whereClauses.push(`(dados_completos->>'membroSocioeducacao')::TEXT = 'Sim'`);
        // 4. FILTRO DE ACESSO POR UNIDADE (mapeamento sequencial seguro)
        if (accessFilter.whereClause !== 'TRUE') {
            // cria placeholders sequenciais e adiciona os valores aos params com addParam
            const unitPlaceholders = accessFilter.params.map((p) => `${addParam(p)}::INTEGER`);
            let unitWhere = accessFilter.whereClause;
            // substitui tokens $X e $Y (se existirem) pelos placeholders gerados
            if (unitPlaceholders[0])
                unitWhere = unitWhere.replace(/\$X/g, unitPlaceholders[0]);
            if (unitPlaceholders[1])
                unitWhere = unitWhere.replace(/\$Y/g, unitPlaceholders[1]);
            whereClauses.push(unitWhere);
        }
        // Montagem final da query
        if (whereClauses.length > 0)
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        query += ` ORDER BY "dataCad" DESC`;
        // Debug: verifique se placeholders e params estão sincronizados
        console.log("DEBUG: FINAL QUERY:", (0, exports.cleanSqlString)(query));
        console.log("DEBUG: FINAL PARAMS:", params);
        // Execução
        const result = await db_1.default.query((0, exports.cleanSqlString)(query), params);
        const dadosProcessados = anonimizarDadosSeNecessario(user, result.rows);
        res.json(dadosProcessados);
    }
    catch (err) {
        console.error("Erro ao listar casos:", err.message);
        res.status(500).json({ message: "Erro ao buscar casos." });
    }
});
// =======================================================================
// ROTA PUT /casos/:id - ATUALIZAR CASO ⭐️ MIDDLEWARE MANTIDO (MODIFICAÇÃO)
// =======================================================================
router.put("/:id", (0, caseAccess_middleware_1.checkCaseAccess)('params', 'id'), async (req, res) => {
    const { id } = req.params;
    const novosDados = req.body;
    const { id: userId, username } = req.user;
    try {
        const resultAtual = await db_1.default.query((0, exports.cleanSqlString)('SELECT dados_completos FROM casos WHERE id = $1'), [id]);
        if (resultAtual.rowCount === 0)
            return res.status(404).json({ message: "Caso não encontrado." });
        const dadosMesclados = { ...resultAtual.rows[0].dados_completos, ...novosDados };
        const dataCad = dadosMesclados.dataCad;
        const tecRef = dadosMesclados.tecRef;
        const nome = dadosMesclados.nome || null;
        await db_1.default.query((0, exports.cleanSqlString)(`UPDATE casos SET "dataCad" = $1, "tecRef" = $2, nome = $3, dados_completos = $4 WHERE id = $5`), [dataCad, tecRef, nome, JSON.stringify(dadosMesclados), id]);
        await (0, logger_1.logAction)({ userId, username, action: 'UPDATE_CASE', details: { casoId: id } });
        res.status(200).json({ message: "Prontuário atualizado com sucesso!", caso: dadosMesclados });
    }
    catch (err) {
        console.error(`Erro ao atualizar caso ${id}:`, err.message);
        res.status(500).json({ message: "Erro interno ao atualizar o prontuário." });
    }
});
// =======================================================================
// PATCH /casos/:id/status ⭐️ MIDDLEWARE MANTIDO (MODIFICAÇÃO)
// =======================================================================
router.patch("/:id/status", (0, caseAccess_middleware_1.checkCaseAccess)('params', 'id'), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const { id: userId, username } = req.user;
    if (!status || !['Ativo', 'Desligado', 'Arquivado'].includes(status)) {
        return res.status(400).json({ message: "Status inválido. Valores permitidos: Ativo, Desligado, Arquivado." });
    }
    try {
        const result = await db_1.default.query((0, exports.cleanSqlString)('UPDATE casos SET status = $1 WHERE id = $2 RETURNING nome'), [status, id]);
        if (result.rowCount === 0)
            return res.status(404).json({ message: 'Caso não encontrado.' });
        await (0, logger_1.logAction)({ userId, username, action: 'UPDATE_CASE_STATUS', details: { casoId: id, nomeVitima: result.rows[0].nome, novoStatus: status } });
        res.status(200).json({ message: `Caso ${id} atualizado para '${status}' com sucesso.` });
    }
    catch (err) {
        console.error(`Erro ao atualizar status do caso ${id}:`, err.message);
        res.status(500).json({ message: "Erro interno ao atualizar o status do caso." });
    }
});
// =======================================================================
// DELETE /casos/:id ⭐️ MIDDLEWARE MANTIDO (MODIFICAÇÃO)
// =======================================================================
router.delete("/:id", (0, caseAccess_middleware_1.checkCaseAccess)('params', 'id'), async (req, res) => {
    const { id } = req.params;
    const { id: userId, username } = req.user;
    try {
        const result = await db_1.default.query((0, exports.cleanSqlString)('DELETE FROM casos WHERE id = $1 RETURNING nome'), [id]);
        if (result.rowCount === 0)
            return res.status(404).json({ message: 'Caso não encontrado.' });
        await (0, logger_1.logAction)({ userId, username, action: 'DELETE_CASE', details: { casoId: id, nomeVitima: result.rows[0].nome } });
        res.status(200).json({ message: 'Caso excluído com sucesso.' });
    }
    catch (err) {
        console.error("Erro ao excluir caso:", err.message);
        res.status(500).json({ message: "Erro ao excluir caso." });
    }
});
// =======================================================================
// GET /casos/:id - DETALHES DO CASO 🛑 MIDDLEWARE REMOVIDO
// =======================================================================
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    try {
        const casoResult = await db_1.default.query((0, exports.cleanSqlString)('SELECT * FROM casos WHERE id = $1'), [id]);
        if (casoResult.rowCount === 0)
            return res.status(404).json({ message: "Caso não encontrado." });
        const casoBase = casoResult.rows[0];
        const demandasQuery = (0, exports.cleanSqlString)(`
            SELECT id, tipo_documento, instituicao_origem, data_recebimento, status
            FROM demandas
            WHERE caso_associado_id = $1
            ORDER BY data_recebimento DESC
        `);
        const demandasResult = await db_1.default.query(demandasQuery, [id]);
        const casoCompleto = {
            ...casoBase.dados_completos,
            id: casoBase.id,
            dataCad: casoBase.dataCad,
            tecRef: casoBase.tecRef,
            nome: casoBase.nome,
            userId: casoBase.userId,
            status: casoBase.status,
            unit_id: casoBase.unit_id,
            demandasVinculadas: demandasResult.rows
        };
        const dadosProcessados = anonimizarDadosSeNecessario(user, casoCompleto);
        res.json(dadosProcessados);
    }
    catch (err) {
        console.error(`Erro ao buscar detalhes do caso ${id}:`, err.message);
        res.status(500).json({ message: "Erro ao buscar detalhes do caso." });
    }
});
// =======================================================================
// GET /casos/:casoId/encaminhamentos 🛑 MIDDLEWARE REMOVIDO
// =======================================================================
router.get("/:casoId/encaminhamentos", async (req, res) => {
    const { casoId } = req.params;
    try {
        const query = (0, exports.cleanSqlString)(`
      SELECT enc.id, enc."servicoDestino", enc."dataEncaminhamento", enc.status,
             enc.observacoes, usr.username AS "tecRef"
      FROM encaminhamentos enc
      LEFT JOIN users usr ON enc."userId" = usr.id
      WHERE enc."casoId" = $1
      ORDER BY enc."dataEncaminhamento" DESC
    `);
        const result = await db_1.default.query(query, [casoId]);
        res.json(result.rows);
    }
    catch (err) {
        console.error(`Erro ao listar encaminhamentos para o caso ${casoId}:`, err.message);
        res.status(500).json({ message: "Erro ao buscar encaminhamentos." });
    }
});
exports.default = router;
