"use strict";
// backend/src/routes/vigilancia.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const unitAccess_middleware_1 = require("../middleware/unitAccess.middleware");
const router = express_1.default.Router();
/**
 * Função de Limpeza SQL Extrema: Remove quebras de linha e múltiplos espaços.
 * @param sql String SQL suja.
 */
const cleanSqlString = (sql) => {
    return sql.replace(/\s+/g, ' ').trim();
};
/**
 * Função utilitária para gerar o filtro WHERE e sincronizar os parâmetros.
 * Retorna APENAS O CONTEÚDO do WHERE, limpo.
 */
const buildFilterClause = (accessFilter, existingParamsCount = 0 // Parâmetros que já existem na query base
) => {
    let params = [];
    let paramIndex = existingParamsCount + 1;
    let unitWhere = accessFilter.whereClause;
    // 1. Substituir placeholders ($X, $Y) por números reais ($N+1, $N+2...)
    if (accessFilter.params.length === 1) {
        unitWhere = unitWhere.replace('$X', `$${paramIndex++}`);
    }
    else if (accessFilter.params.length === 2) {
        unitWhere = unitWhere.replace('$X', `$${paramIndex++}`).replace('$Y', `$${paramIndex++}`);
    }
    params.push(...accessFilter.params);
    // Retorna APENAS O CONTEÚDO do WHERE, limpo.
    return [unitWhere.trim(), params];
};
// =======================================================================
// ROTAS DO PAINEL DE VIGILÂNCIA (COM LIMPEZA EXTREMA APLICADA)
// =======================================================================
// Aplicamos o middleware em cada rota para garantir a execução.
/**
 * @route   GET /fluxo-demanda
 * @desc    Casos novos nos últimos 30 dias (FILTRADO POR UNIDADE)
 */
router.get("/fluxo-demanda", auth_1.authMiddleware, (0, unitAccess_middleware_1.unitAccessMiddleware)('casos', 'unit_id'), async (req, res) => {
    const accessFilter = req.accessFilter;
    try {
        const queryBase = `SELECT COUNT(id) AS "total" FROM casos WHERE "dataCad" >= CURRENT_DATE - INTERVAL '30 days'`;
        const [unitFilterContent, unitParams] = buildFilterClause(accessFilter, 0);
        const andClause = unitFilterContent.length > 0 ? ` AND ${unitFilterContent}` : '';
        const finalQuery = cleanSqlString(queryBase + andClause);
        const result = await db_1.default.query(finalQuery, unitParams);
        res.json({ casosNovosUltimos30Dias: parseInt(result.rows[0].total, 10) });
    }
    catch (err) {
        console.error("Erro ao buscar fluxo de demanda (filtrado):", err.message);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});
/**
 * @route   GET /sobrecarga-equipe
 * @desc    Média de casos por técnico (FILTRADO POR UNIDADE)
 */
router.get("/sobrecarga-equipe", auth_1.authMiddleware, (0, unitAccess_middleware_1.unitAccessMiddleware)('casos', 'unit_id'), async (req, res) => {
    const accessFilter = req.accessFilter;
    // Gerar filtro. existingParamsCount = 0. unitParams contém os IDs de filtro ($1, $2...)
    const [unitFilterContent, unitParams] = buildFilterClause(accessFilter, 0);
    const whereClause = unitFilterContent.length > 0 ? ` WHERE ${unitFilterContent}` : '';
    try {
        // FIX: Query base limpa
        const totalCasosBase = `SELECT COUNT(*) AS total FROM casos`;
        const totalTecnicosBase = `SELECT COUNT(DISTINCT "tecRef") AS total FROM casos`;
        // 📌 FIX CRÍTICO: Não precisamos de variáveis intermediárias. Injetamos a query e os unitParams.
        const [casosResult, tecnicosResult] = await Promise.all([
            db_1.default.query(cleanSqlString(totalCasosBase + whereClause), unitParams),
            db_1.default.query(cleanSqlString(totalTecnicosBase + whereClause), unitParams),
        ]);
        const totalCasosAtivos = parseInt(casosResult.rows[0].total, 10);
        const totalTecnicos = parseInt(tecnicosResult.rows[0].total, 10);
        const mediaCasos = totalTecnicos > 0 ? totalCasosAtivos / totalTecnicos : 0;
        res.json({
            mediaCasosPorTecnico: parseFloat(mediaCasos.toFixed(1)),
            totalCasosAtivos,
            totalTecnicos,
            limiteRecomendado: 50,
        });
    }
    catch (err) {
        console.error("Erro ao calcular sobrecarga da equipe (filtrado):", err.message);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});
/**
 * @route   GET /incidencia-bairros
 * @desc    Casos por bairro (FILTRADO POR UNIDADE)
 */
router.get("/incidencia-bairros", auth_1.authMiddleware, (0, unitAccess_middleware_1.unitAccessMiddleware)('casos', 'unit_id'), async (req, res) => {
    const accessFilter = req.accessFilter;
    const [unitFilterContent, unitParams] = buildFilterClause(accessFilter, 0);
    const whereClause = unitFilterContent.length > 0 ? ` WHERE ${unitFilterContent}` : '';
    try {
        // FIX: Query base limpa
        const queryBase = `SELECT dados_completos->>'bairro' AS bairro, COUNT(id)::int AS casos FROM casos`;
        const finalQuery = cleanSqlString(`
            ${queryBase} ${whereClause}
            AND dados_completos->>'bairro' IS NOT NULL 
            AND dados_completos->>'bairro' <> ''
            GROUP BY bairro
            ORDER BY casos DESC;
        `);
        const result = await db_1.default.query(finalQuery, unitParams);
        res.json(result.rows);
    }
    catch (err) {
        console.error("Erro ao buscar incidência por bairros (filtrado):", err.message);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});
/**
 * @route   GET /fontes-acionamento
 * @desc    Canais de denúncia (FILTRADO POR UNIDADE)
 */
router.get("/fontes-acionamento", auth_1.authMiddleware, (0, unitAccess_middleware_1.unitAccessMiddleware)('casos', 'unit_id'), async (req, res) => {
    const accessFilter = req.accessFilter;
    const [unitFilterContent, unitParams] = buildFilterClause(accessFilter, 0);
    const whereClause = unitFilterContent.length > 0 ? ` WHERE ${unitFilterContent}` : '';
    try {
        // FIX: Query base limpa
        const queryBase = `SELECT dados_completos->>'canalDenuncia' AS fonte, COUNT(id)::int AS quantidade FROM casos`;
        const finalQuery = cleanSqlString(`
            ${queryBase} ${whereClause}
            AND dados_completos->>'canalDenuncia' IS NOT NULL 
            AND dados_completos->>'canalDenuncia' <> ''
            GROUP BY fonte
            ORDER BY quantidade DESC;
        `);
        const result = await db_1.default.query(finalQuery, unitParams);
        res.json(result.rows);
    }
    catch (err) {
        console.error("Erro ao buscar fontes de acionamento (filtrado):", err.message);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});
/**
 * @route   GET /taxa-reincidencia
 * @desc    Taxa de reincidência nos últimos 12 meses (FILTRADO POR UNIDADE)
 */
router.get("/taxa-reincidencia", auth_1.authMiddleware, (0, unitAccess_middleware_1.unitAccessMiddleware)('casos', 'unit_id'), async (req, res) => {
    const accessFilter = req.accessFilter;
    const [unitFilterContent, unitParams] = buildFilterClause(accessFilter, 0);
    const andClause = unitFilterContent.length > 0 ? ` AND ${unitFilterContent}` : '';
    try {
        // FIX: Query base limpa
        const queryBase = `SELECT COUNT(id) AS "totalCasos", COUNT(id) FILTER (WHERE dados_completos->>'reincidente' = 'Sim') AS "casosReincidentes" FROM casos WHERE "dataCad" >= NOW() - INTERVAL '1 year'`;
        const finalQuery = cleanSqlString(queryBase + andClause);
        const result = await db_1.default.query(finalQuery, unitParams);
        const total = parseInt(result.rows[0].totalCasos, 10);
        const reincidentes = parseInt(result.rows[0].casosReincidentes, 10);
        const taxa = total > 0 ? (reincidentes / total) * 100 : 0;
        res.json({ taxaReincidencia: parseFloat(taxa.toFixed(1)) });
    }
    catch (err) {
        console.error("Erro ao calcular taxa de reincidência (filtrado):", err.message);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});
/**
 * @route   GET /perfil-violacoes
 * @desc    Perfil dos tipos de violência (FILTRADO POR UNIDADE)
 */
router.get("/perfil-violacoes", auth_1.authMiddleware, (0, unitAccess_middleware_1.unitAccessMiddleware)('casos', 'unit_id'), async (req, res) => {
    const accessFilter = req.accessFilter;
    const [unitFilterContent, unitParams] = buildFilterClause(accessFilter, 0);
    const whereClause = unitFilterContent.length > 0 ? ` WHERE ${unitFilterContent}` : '';
    try {
        // FIX: Query base limpa
        const queryBase = `SELECT dados_completos->>'tipoViolencia' AS tipo, COUNT(id)::int AS quantidade FROM casos`;
        const finalQuery = cleanSqlString(`
            ${queryBase} ${whereClause}
            AND dados_completos->>'tipoViolencia' IS NOT NULL 
            AND dados_completos->>'tipoViolencia' <> ''
            GROUP BY tipo
            ORDER BY quantidade DESC;
        `);
        const result = await db_1.default.query(finalQuery, unitParams);
        res.json(result.rows);
    }
    catch (err) {
        console.error("Erro ao buscar perfil de violações (filtrado):", err.message);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});
exports.default = router;
