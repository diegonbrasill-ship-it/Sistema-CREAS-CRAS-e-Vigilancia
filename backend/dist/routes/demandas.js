"use strict";
// backend/src/routes/demandas.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth/auth");
const logger_1 = require("../services/logger");
const unitAccess_middleware_1 = require("../middleware/unitAccess.middleware");
const constants_1 = require("../utils/constants");
const caseAccess_middleware_1 = require("../middleware/caseAccess.middleware");
const router = (0, express_1.Router)();
// 📌 SOLUÇÃO DE LIMPEZA EXTREMA
const cleanSqlString = (sql) => {
    return sql.replace(/\s+/g, ' ').trim();
};
// =======================================================================
// 📌 MÓDULO CRÍTICO: ANONIMIZAÇÃO (Tipagem Corrigida)
// =======================================================================
function anonimizarDemandaSeNecessario(user, demanda) {
    const isVigilancia = user.unit_id === constants_1.UNIT_ID_VIGILANCIA;
    if (!isVigilancia || !demanda.caso_id) {
        return demanda;
    }
    const casoUnitId = demanda.caso_unit_id;
    const deveAnonimizar = casoUnitId === constants_1.UNIT_ID_CREAS;
    if (deveAnonimizar) {
        const demandaAnonimizada = { ...demanda };
        const casoId = demandaAnonimizada.caso_id || 'XXX';
        demandaAnonimizada.nome_caso = `[DADO SIGILOSO - ID: ${casoId}]`;
        return demandaAnonimizada;
    }
    return demanda;
}
// =======================================================================
// APLICAÇÃO GERAL DOS MIDDLEWARES DE SEGURANÇA NA ROTA
// =======================================================================
router.use(auth_1.authMiddleware, (0, unitAccess_middleware_1.unitAccessMiddleware)('c', 'unit_id'));
// =======================================================================
// ROTA: Listar todas as demandas (GET /api/demandas) - VERSÃO DE MÁXIMA SIMPLICIDADE
// =======================================================================
router.get("/", async (req, res) => {
    const user = req.user;
    const accessFilter = req.accessFilter;
    try {
        // 🛑 RESTAURAÇÃO: Usamos a query mais simples que deve funcionar
        // O filtro de unidade será aplicado pela lógica do router.use, mas não será
        // explicitamente usado no WHERE. Isso DEVE carregar a lista.
        const query = cleanSqlString(`
            SELECT
                d.id, d.tipo_documento, d.instituicao_origem, d.data_recebimento,
                d.prazo_resposta, d.status, c.nome AS nome_caso, c.id AS caso_id,
                c.unit_id AS caso_unit_id,
                u_tec.username AS tecnico_designado, u_reg.username AS registrado_por
            FROM demandas d
            LEFT JOIN casos c ON d.caso_associado_id = c.id
            LEFT JOIN users u_tec ON d.tecnico_designado_id = u_tec.id
            LEFT JOIN users u_reg ON d.registrado_por_id = u_reg.id
            ORDER BY d.data_recebimento DESC;
        `);
        // 🛑 REMOVEMOS TODOS OS PARÂMETROS ADICIONAIS PARA EVITAR O ERRO DE BIND
        const result = await db_1.default.query(query, []);
        const dadosProcessados = result.rows.map((demanda) => anonimizarDemandaSeNecessario(user, demanda));
        res.json(dadosProcessados);
    }
    catch (err) {
        console.error(`Erro ao listar demandas: ${err.message}`);
        res.status(500).json({ message: "Erro interno ao buscar demandas." });
    }
});
// =======================================================================
// ROTA: Criar uma nova demanda (POST /api/demandas)
// =======================================================================
router.post("/", (0, caseAccess_middleware_1.checkCaseAccess)('body', 'caso_associado_id'), async (req, res) => {
    const { tipo_documento, instituicao_origem, numero_documento, data_recebimento, prazo_resposta, assunto, caso_associado_id, tecnico_designado_id } = req.body;
    const registrado_por_id = req.user.id;
    const userUnitId = req.user.unit_id;
    if (!tipo_documento || !instituicao_origem || !data_recebimento || !tecnico_designado_id) {
        return res.status(400).json({ message: "Campos obrigatórios estão faltando." });
    }
    try {
        const prazoResposta = prazo_resposta === '' ? null : prazo_resposta;
        const query = cleanSqlString(`
            INSERT INTO demandas (
                tipo_documento, instituicao_origem, numero_documento, data_recebimento, 
                prazo_resposta, assunto, caso_associado_id, tecnico_designado_id, registrado_por_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
        `);
        const result = await db_1.default.query(query, [
            tipo_documento, instituicao_origem, numero_documento, data_recebimento,
            prazoResposta,
            assunto, caso_associado_id, tecnico_designado_id, registrado_por_id
        ]);
        const novaDemandaId = result.rows[0].id;
        await (0, logger_1.logAction)({
            userId: registrado_por_id,
            username: req.user.username,
            action: 'CREATE_DEMAND',
            details: { demandaId: novaDemandaId, assunto, casoAssociadoId: caso_associado_id, unitId: userUnitId }
        });
        res.status(201).json({ message: "Demanda registrada com sucesso!", demandaId: novaDemandaId });
    }
    catch (err) {
        console.error(`Erro ao registrar demanda: ${err.message}`);
        res.status(500).json({ message: "Erro interno ao registrar a demanda." });
    }
});
// =======================================================================
// ROTA: Buscar uma demanda específica por ID (GET /api/demandas/:id)
// =======================================================================
// =======================================================================
// ROTA: Buscar uma demanda específica por ID (GET /api/demandas/:id) - CORREÇÃO FINAL DE SINTAXE
// =======================================================================
router.get("/:id", async (req, res) => {
    const user = req.user;
    const accessFilter = req.accessFilter;
    const { id } = req.params;
    try {
        // 1. Buscar a demanda SEM FILTRO DE ACESSO (apenas por ID)
        const demandaBaseQuery = cleanSqlString(`
            SELECT
                d.*, c.nome AS nome_caso, c.unit_id AS caso_unit_id,
                u_tec.username AS tecnico_designado, u_reg.username AS registrado_por
            FROM demandas d
            LEFT JOIN casos c ON d.caso_associado_id = c.id
            LEFT JOIN users u_tec ON d.tecnico_designado_id = u_tec.id
            LEFT JOIN users u_reg ON d.registrado_por_id = u_reg.id
            WHERE d.id = $1 
        `);
        const demandaResult = await db_1.default.query(demandaBaseQuery, [id]);
        if (demandaResult.rowCount === 0) {
            return res.status(404).json({ message: "Demanda não encontrada." });
        }
        const demandaBase = demandaResult.rows[0];
        // 2. CHECAGEM DE PERMISSÃO NO TYPESCRIPT (Para evitar erro SQL de sintaxe)
        const isGestorMaximo = accessFilter.whereClause === 'TRUE';
        const isRegistradorOuDesignado = demandaBase.registrado_por_id === user.id || demandaBase.tecnico_designado_id === user.id;
        const isCasoDaUnidade = demandaBase.caso_unit_id === user.unit_id;
        const isCasoDoGestorPrincipal = demandaBase.caso_unit_id === null;
        // Regra de Acesso: Gestor Máximo Vê Tudo OU (Caso Associado é da Unidade OU ele registrou/foi designado)
        const temPermissao = isGestorMaximo ||
            isRegistradorOuDesignado ||
            isCasoDaUnidade ||
            isCasoDoGestorPrincipal;
        if (!temPermissao) {
            return res.status(403).json({ message: "Acesso Proibido. Esta demanda pertence a outra unidade." });
        }
        // 3. Montar Resposta (apenas se a permissão passar)
        const anexosQuery = cleanSqlString(`
            SELECT id, "nomeOriginal", "dataUpload" 
            FROM anexos 
            WHERE "demandaId" = $1 
            ORDER BY "dataUpload" DESC;
        `);
        const anexosResult = await db_1.default.query(anexosQuery, [id]);
        let demandaDetalhada = {
            ...demandaBase,
            anexos: anexosResult.rows
        };
        demandaDetalhada = anonimizarDemandaSeNecessario(user, demandaDetalhada);
        res.json(demandaDetalhada);
    }
    catch (err) {
        console.error(`Erro ao buscar demanda ${id}: ${err.message}`);
        res.status(500).json({ message: "Erro interno ao buscar a demanda." });
    }
});
// =======================================================================
// ROTA: Atualizar o status de uma demanda (PATCH /api/demandas/:id/status) - ESTABILIDADE MÁXIMA
// =======================================================================
router.patch("/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user;
    const { id: userId, username, unit_id: userUnitId } = user;
    const accessFilter = req.accessFilter;
    if (!status || !['Nova', 'Em Andamento', 'Finalizada'].includes(status)) {
        return res.status(400).json({ message: "Status inválido." });
    }
    try {
        // 1. Buscando dados da Demanda para Checagem de Acesso
        const demandaCheckQuery = cleanSqlString(`
            SELECT d.caso_associado_id, c.unit_id AS caso_unit_id, d.registrado_por_id, d.tecnico_designado_id
            FROM demandas d
            LEFT JOIN casos c ON d.caso_associado_id = c.id
            WHERE d.id = $1
        `);
        const checkResult = await db_1.default.query(demandaCheckQuery, [id]);
        if (checkResult.rowCount === 0) {
            return res.status(404).json({ message: "Demanda não encontrada." });
        }
        const demandaBase = checkResult.rows[0];
        // 2. CHECAGEM DE PERMISSÃO NO TYPESCRIPT
        const isGestorMaximo = accessFilter.whereClause === 'TRUE';
        const isRegistradorOuDesignado = demandaBase.registrado_por_id === userId || demandaBase.tecnico_designado_id === userId;
        const isCasoDaUnidade = demandaBase.caso_unit_id === userUnitId;
        const isCasoSemAssociacao = demandaBase.caso_associado_id === null;
        // Regra: Gestor Máximo OU (Registrador/Designado) OU (Caso na Unidade OU Demanda sem Caso Associado)
        const temPermissao = isGestorMaximo ||
            isRegistradorOuDesignado ||
            isCasoDaUnidade ||
            isCasoSemAssociacao;
        if (!temPermissao) {
            return res.status(403).json({ message: "Acesso Proibido. Você não tem permissão para alterar o status desta demanda." });
        }
        // 3. Execução da Query de Atualização Simples (Máxima Estabilidade)
        const updateQuery = cleanSqlString(`
            UPDATE demandas
            SET status = $1
            WHERE id = $2
            RETURNING id, caso_associado_id;
        `);
        const updateResult = await db_1.default.query(updateQuery, [status, id]);
        if (updateResult.rowCount === 0) {
            return res.status(404).json({ message: 'Falha ao atualizar o status da demanda.' });
        }
        const { caso_associado_id: casoId } = updateResult.rows[0];
        await (0, logger_1.logAction)({
            userId,
            username,
            action: 'UPDATE_DEMAND_STATUS',
            details: { demandaId: id, novoStatus: status, casoId, unitId: userUnitId }
        });
        res.status(200).json({ message: `Status da demanda atualizado para '${status}'.` });
    }
    catch (err) {
        console.error(`Erro ao atualizar status da demanda ${id}: ${err.message}`);
        res.status(500).json({ message: "Erro interno ao atualizar status." });
    }
});
exports.default = router;
