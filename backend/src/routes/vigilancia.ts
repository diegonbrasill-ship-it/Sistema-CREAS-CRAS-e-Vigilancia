// backend/src/routes/vigilancia.ts

import express, { Router, Request, Response, NextFunction } from "express";
import pool from "../db";
import { authMiddleware } from "../middleware/auth/auth";
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware";

const router = express.Router();

/**
 * Função de Limpeza SQL Extrema: Remove quebras de linha e múltiplos espaços.
 */
const cleanSqlString = (sql: string): string => {
    return sql.replace(/\s+/g, ' ').trim();
};

/**
 * Função utilitária para gerar o filtro WHERE de acesso (unidade e visibilidade).
 */
const buildFilterClause = (
    accessFilter: { whereClause: string, params: any[] },
    existingParamsCount: number = 0 // Parâmetros que já existem na query base
): [string, any[]] => {

    let params: any[] = [];
    let paramIndex = existingParamsCount + 1;

    let unitWhere = accessFilter.whereClause;

    // 1. Substituir placeholders ($X, $Y) por números reais ($N+1, $N+2...)
    if (accessFilter.params.length === 1) {
        unitWhere = unitWhere.replace('$X', `$${paramIndex++}`);
    } else if (accessFilter.params.length === 2) {
        unitWhere = unitWhere.replace('$X', `$${paramIndex++}`).replace('$Y', `$${paramIndex++}`);
    }

    params.push(...accessFilter.params);

    // Inclui casos do Gestor Principal
    if (unitWhere !== 'TRUE') {
        unitWhere = `(${unitWhere} OR casos.unit_id IS NULL)`;
    }

    // Retorna APENAS O CONTEÚDO do WHERE, limpo.
    return [unitWhere.trim(), params];
};


// =======================================================================
// ROTAS DO PAINEL DE VIGILÂNCIA (KPIs e GRÁFICOS)
// =======================================================================

router.get("/fluxo-demanda", authMiddleware, unitAccessMiddleware('casos', 'unit_id'), async (req: Request, res: Response) => {
    const accessFilter = req.accessFilter!;

    try {
        const [unitFilterContent, unitParams] = buildFilterClause(accessFilter, 0);
        const andClause = unitFilterContent.length > 0 ? ` AND ${unitFilterContent}` : '';

        const queryBase = `SELECT COUNT(id) AS "total" FROM casos WHERE "dataCad" >= CURRENT_DATE - INTERVAL '30 days'`;

        const finalQuery = cleanSqlString(queryBase + andClause);
        const result = await pool.query(finalQuery, unitParams);

        res.json({ casosNovosUltimos30Dias: parseInt(result.rows[0].total, 10) });
    } catch (err: any) {
        console.error("Erro ao buscar fluxo de demanda (filtrado):", err.message);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});

router.get("/sobrecarga-equipe", authMiddleware, unitAccessMiddleware('casos', 'unit_id'), async (req: Request, res: Response) => {
    const accessFilter = req.accessFilter!;

    const [unitFilterContent, unitParams] = buildFilterClause(accessFilter, 0);
    const whereClause = unitFilterContent.length > 0 ? ` WHERE ${unitFilterContent}` : '';

    try {
        const totalCasosBase = `SELECT COUNT(*) AS total FROM casos`;
        const totalTecnicosBase = `SELECT COUNT(DISTINCT "tecRef") AS total FROM casos`;

        const [casosResult, tecnicosResult] = await Promise.all([
            pool.query(cleanSqlString(totalCasosBase + whereClause), unitParams),
            pool.query(cleanSqlString(totalTecnicosBase + whereClause), unitParams),
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
    } catch (err: any) {
        console.error("Erro ao calcular sobrecarga da equipe (filtrado):", err.message);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});


router.get("/incidencia-bairros", authMiddleware, unitAccessMiddleware('casos', 'unit_id'), async (req: Request, res: Response) => {
    const accessFilter = req.accessFilter!;

    const [unitFilterContent, unitParams] = buildFilterClause(accessFilter, 0);
    const whereClause = unitFilterContent.length > 0 ? ` WHERE ${unitFilterContent}` : '';

    try {
        const queryBase = `SELECT dados_completos->>'bairro' AS bairro, COUNT(id)::int AS casos FROM casos`;

        const finalQuery = cleanSqlString(`
            ${queryBase} ${whereClause}
            AND dados_completos->>'bairro' IS NOT NULL 
            AND dados_completos->>'bairro' <> ''
            GROUP BY bairro
            ORDER BY casos DESC;
        `);

        const result = await pool.query(finalQuery, unitParams);

        res.json(result.rows);
    } catch (err: any) {
        console.error("Erro ao buscar incidência por bairros (filtrado):", err.message);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});

router.get("/fontes-acionamento", authMiddleware, unitAccessMiddleware('casos', 'unit_id'), async (req: Request, res: Response) => {
    const accessFilter = req.accessFilter!;

    const [unitFilterContent, unitParams] = buildFilterClause(accessFilter, 0);
    const whereClause = unitFilterContent.length > 0 ? ` WHERE ${unitFilterContent}` : '';

    try {
        const queryBase = `SELECT dados_completos->>'canalDenuncia' AS fonte, COUNT(id)::int AS quantidade FROM casos`;

        const finalQuery = cleanSqlString(`
            ${queryBase} ${whereClause}
            AND dados_completos->>'canalDenuncia' IS NOT NULL 
            AND dados_completos->>'canalDenuncia' <> ''
            GROUP BY fonte
            ORDER BY quantidade DESC;
        `);

        const result = await pool.query(finalQuery, unitParams);

        res.json(result.rows);
    } catch (err: any) {
        console.error("Erro ao buscar fontes de acionamento (filtrado):", err.message);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});

router.get("/taxa-reincidencia", authMiddleware, unitAccessMiddleware('casos', 'unit_id'), async (req: Request, res: Response) => {
    const accessFilter = req.accessFilter!;

    const [unitFilterContent, unitParams] = buildFilterClause(accessFilter, 0);
    const andClause = unitFilterContent.length > 0 ? ` AND ${unitFilterContent}` : '';

    try {
        const queryBase = `SELECT COUNT(id) AS "totalCasos", COUNT(id) FILTER (WHERE dados_completos->>'reincidente' = 'Sim') AS "casosReincidentes" FROM casos WHERE "dataCad" >= NOW() - INTERVAL '1 year'`;

        const finalQuery = cleanSqlString(queryBase + andClause);
        const result = await pool.query(finalQuery, unitParams);

        const total = parseInt(result.rows[0].totalCasos, 10);
        const reincidentes = parseInt(result.rows[0].casosReincidentes, 10);
        const taxa = total > 0 ? (reincidentes / total) * 100 : 0;

        res.json({ taxaReincidencia: parseFloat(taxa.toFixed(1)) });
    } catch (err: any) {
        console.error("Erro ao calcular taxa de reincidência (filtrado):", err.message);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});

router.get("/perfil-violacoes", authMiddleware, unitAccessMiddleware('casos', 'unit_id'), async (req: Request, res: Response) => {
    const accessFilter = req.accessFilter!;

    const [unitFilterContent, unitParams] = buildFilterClause(accessFilter, 0);
    const whereClause = unitFilterContent.length > 0 ? ` WHERE ${unitFilterContent}` : '';

    try {
        const queryBase = `SELECT dados_completos->>'tipoViolencia' AS tipo, COUNT(id)::int AS quantidade FROM casos`;

        const finalQuery = cleanSqlString(`
            ${queryBase} ${whereClause}
            AND dados_completos->>'tipoViolencia' IS NOT NULL 
            AND dados_completos->>'tipoViolencia' <> ''
            GROUP BY tipo
            ORDER BY quantidade DESC;
        `);

        const result = await pool.query(finalQuery, unitParams);

        res.json(result.rows);
    } catch (err: any) {
        console.error("Erro ao buscar perfil de violações (filtrado):", err.message);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});

/**
 * ⭐️ NOVA ROTA: GET /casos-filtrados (Endpoint para Drill-Down do Painel)
 * @desc Recebe filtro e valor da query string para listar casos detalhadamente.
 */
router.get("/casos-filtrados", authMiddleware, unitAccessMiddleware('casos', 'unit_id'), async (req: Request, res: Response) => {
    const accessFilter = req.accessFilter!;

    // ⭐️ CORREÇÃO: Trata a query string como potencial array de filtros
    const { filtro, valor } = req.query;
    const filtros = Array.isArray(filtro) ? filtro : (filtro ? [filtro] : []);
    const valores = Array.isArray(valor) ? valor : (valor ? [valor] : []);

    try {
        // 1. Constrói a cláusula WHERE de segurança e visibilidade
        const [unitFilterContent, unitParams] = buildFilterClause(accessFilter, 0);
        const whereClauses: string[] = unitFilterContent.length > 0 ? [`${unitFilterContent}`] : [];
        const params: any[] = [...unitParams];

        const addParam = (val: any) => {
            params.push(val);
            return `$${params.length}`;
        };

        // 2. Aplicar TODOS os filtros fornecidos (COM PRIORIDADE DE DATA)
        for (let i = 0; i < filtros.length; i++) {
            const jsonKey = filtros[i];
            const val = valores[i];

            if (!jsonKey || !val) continue;

            // ⭐️ LÓGICA CORRIGIDA: Usa SWITCH/CASE para forçar a avaliação da data
            switch (jsonKey) {
                case 'dataCad':
                case 'ultimos_30_dias': // Adiciona a checagem 'ultimos_30_dias' como chave aqui
                    // CRÍTICO: Se a chave é 'dataCad' e o valor é 'ultimos_30_dias', aplica a lógica SQL de data
                    if (val === 'ultimos_30_dias') {
                        // ✅ CORREÇÃO: Usa a lógica de data correta.
                        whereClauses.push(`"dataCad" >= CURRENT_DATE - INTERVAL '30 days'`);
                    } else {
                        // Fallback para caso não seja o filtro de 30 dias (incomum, mas seguro)
                        const ph = addParam(val);
                        whereClauses.push(`dados_completos->>'${jsonKey}' = ${ph}::TEXT`);
                    }
                    break;
                case 'status':
                    // Filtro de Status (Colunas SQL)
                    const phStatus = addParam(val);
                    whereClauses.push(`status = ${phStatus}::VARCHAR`);
                    break;
                case 'reincidentes':
                    // Filtros JSONB Sim/Não
                    if (val === 'Sim') whereClauses.push(`dados_completos->>'reincidente' = 'Sim'`);
                    break;
                case 'por_bairro':
                case 'por_canal':
                case 'por_violencia':
                    // Filtros de Gráfico (valor exato)
                    const ph = addParam(val);
                    const targetKey = jsonKey.replace('por_', '');
                    whereClauses.push(`dados_completos->>'${targetKey}' = ${ph}::TEXT`);
                    break;
                default:
                    // Filtro genérico (fallback)
                    const phGeneric = addParam(val);
                    whereClauses.push(`dados_completos->>'${jsonKey}' = ${phGeneric}::TEXT`);
                    break;
            }
        }

        // Montagem final da query
        let finalQuery = `
            SELECT id, "dataCad", "tecRef", nome, status, unit_id, dados_completos->>'bairro' AS bairro
            FROM casos
        `;

        if (whereClauses.length > 0) {
            finalQuery += ` WHERE ${whereClauses.join(' AND ')} `;
        }

        finalQuery += ` ORDER BY "dataCad" DESC`;

        const result = await pool.query(cleanSqlString(finalQuery), params);

        res.json(result.rows);

    } catch (err: any) {
        console.error("Erro ao listar casos filtrados para o Painel de Vigilância:", err.message);
        res.status(500).json({ message: "Erro ao buscar lista detalhada." });
    }
});


export default router;