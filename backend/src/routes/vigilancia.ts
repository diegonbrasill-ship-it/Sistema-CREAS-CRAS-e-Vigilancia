// backend/src/routes/vigilancia.ts

import express, { Router, Request, Response, NextFunction } from "express";
import pool from "../db";
import { authMiddleware } from "../middleware/auth";
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware"; 

const router = express.Router();

/**
 * Função de Limpeza SQL Extrema: Remove quebras de linha e múltiplos espaços.
 * @param sql String SQL suja.
 */
const cleanSqlString = (sql: string): string => {
    return sql.replace(/\s+/g, ' ').trim();
};

/**
 * Função utilitária para gerar o filtro WHERE e sincronizar os parâmetros.
 * Retorna APENAS O CONTEÚDO do WHERE, limpo.
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
router.get("/fluxo-demanda", authMiddleware, unitAccessMiddleware('casos', 'unit_id'), async (req: Request, res: Response) => {
    const accessFilter = req.accessFilter!;
    
    try {
        const queryBase = `SELECT COUNT(id) AS "total" FROM casos WHERE "dataCad" >= CURRENT_DATE - INTERVAL '30 days'`;

        const [unitFilterContent, unitParams] = buildFilterClause(accessFilter, 0); 
        const andClause = unitFilterContent.length > 0 ? ` AND ${unitFilterContent}` : '';

        const finalQuery = cleanSqlString(queryBase + andClause);
        const result = await pool.query(finalQuery, unitParams);

        res.json({ casosNovosUltimos30Dias: parseInt(result.rows[0].total, 10) });
    } catch (err: any) {
        console.error("Erro ao buscar fluxo de demanda (filtrado):", err.message);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});

/**
 * @route   GET /sobrecarga-equipe
 * @desc    Média de casos por técnico (FILTRADO POR UNIDADE)
 */
router.get("/sobrecarga-equipe", authMiddleware, unitAccessMiddleware('casos', 'unit_id'), async (req: Request, res: Response) => {
    const accessFilter = req.accessFilter!;
    
    // Gerar filtro. existingParamsCount = 0. unitParams contém os IDs de filtro ($1, $2...)
    const [unitFilterContent, unitParams] = buildFilterClause(accessFilter, 0);
    const whereClause = unitFilterContent.length > 0 ? ` WHERE ${unitFilterContent}` : '';
    
    try {
        // FIX: Query base limpa
        const totalCasosBase = `SELECT COUNT(*) AS total FROM casos`;
        const totalTecnicosBase = `SELECT COUNT(DISTINCT "tecRef") AS total FROM casos`;
        
        // 📌 FIX CRÍTICO: Não precisamos de variáveis intermediárias. Injetamos a query e os unitParams.
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


/**
 * @route   GET /incidencia-bairros
 * @desc    Casos por bairro (FILTRADO POR UNIDADE)
 */
router.get("/incidencia-bairros", authMiddleware, unitAccessMiddleware('casos', 'unit_id'), async (req: Request, res: Response) => {
    const accessFilter = req.accessFilter!;
    
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
        
        const result = await pool.query(finalQuery, unitParams);

        res.json(result.rows);
    } catch (err: any) {
        console.error("Erro ao buscar incidência por bairros (filtrado):", err.message);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});

/**
 * @route   GET /fontes-acionamento
 * @desc    Canais de denúncia (FILTRADO POR UNIDADE)
 */
router.get("/fontes-acionamento", authMiddleware, unitAccessMiddleware('casos', 'unit_id'), async (req: Request, res: Response) => {
    const accessFilter = req.accessFilter!;
    
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

        const result = await pool.query(finalQuery, unitParams);

        res.json(result.rows);
    } catch (err: any) {
        console.error("Erro ao buscar fontes de acionamento (filtrado):", err.message);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});

/**
 * @route   GET /taxa-reincidencia
 * @desc    Taxa de reincidência nos últimos 12 meses (FILTRADO POR UNIDADE)
 */
router.get("/taxa-reincidencia", authMiddleware, unitAccessMiddleware('casos', 'unit_id'), async (req: Request, res: Response) => {
    const accessFilter = req.accessFilter!;
    
    const [unitFilterContent, unitParams] = buildFilterClause(accessFilter, 0);
    const andClause = unitFilterContent.length > 0 ? ` AND ${unitFilterContent}` : '';
    
    try {
        // FIX: Query base limpa
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

/**
 * @route   GET /perfil-violacoes
 * @desc    Perfil dos tipos de violência (FILTRADO POR UNIDADE)
 */
router.get("/perfil-violacoes", authMiddleware, unitAccessMiddleware('casos', 'unit_id'), async (req: Request, res: Response) => {
    const accessFilter = req.accessFilter!;
    
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

        const result = await pool.query(finalQuery, unitParams);

        res.json(result.rows);
    } catch (err: any) {
        console.error("Erro ao buscar perfil de violações (filtrado):", err.message);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});


export default router;
