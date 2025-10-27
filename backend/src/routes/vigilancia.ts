// backend/src/routes/vigilancia.ts

import express, { Router, Request, Response, NextFunction } from "express";
import pool from "../db";
import { authMiddleware } from "../middleware/auth";
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware"; 

const router = express.Router();

// ⭐️ CONSTANTE CRÍTICA PARA SEGREGACÃO (CREAS/PAEFI) ⭐️
const CREAS_UNIT_ID = 1;

/**
 * Função de Limpeza SQL Extrema: Remove quebras de linha e múltiplos espaços.
 */
const cleanSqlString = (sql: string): string => {
    return sql.replace(/\s+/g, ' ').trim();
};

/**
 * Função utilitária para gerar o filtro WHERE de acesso (unidade e visibilidade).
 * Esta função foi REFATORADA para receber o objeto de acesso simples e INJETAR 
* o Filtro Fiel CREAS/PAEFI.
 * @param access - Objeto de acesso simples (req.access) do novo middleware.
* @returns [whereContent, params] - A string do conteúdo WHERE e o array de parâmetros.
 */
const buildFilterClause = (
    access: Request['access'], // Recebe o novo objeto simples
    existingParamsCount: number = 0 // Parâmetros que já existem na query base
): [string, any[]] => {
    
    if (!access) {
        throw new Error("Erro de segurança: Acesso do usuário indisponível.");
    }

    let params: any[] = []; 
    let whereClauses: string[] = [];
    let paramIndex = existingParamsCount + 1;

    // 🛑 1. FILTRO CRÍTICO DE FIDELIDADE (CREAS/PAEFI) 🛑
    // Garante que APENAS dados do CREAS (ID 1) ou Casos NÃO lotados (NULL) sejam contados/listados.
    const creasIdParam = `$${paramIndex++}`;
    params.push(CREAS_UNIT_ID); // Valor 1

    // Filtro CREAS: Apenas unidade 1 ou NULL
    whereClauses.push(`(casos.unit_id = ${creasIdParam} OR casos.unit_id IS NULL)`);

    
    // 2. ELIMINAR O FILTRO OBSOLETO: Não é mais necessário o acessoFilter.whereClause e a 
    // substituição de $X e $Y. A segregação agora é responsabilidade da rota.
    // Como esta é uma rota de VIGILÂNCIA/BI (exclusivo CREAS), o filtro no item 1 é suficiente.
    
    // Se um usuário CRAS acessar (unit_id != 1), ele só verá dados do CREAS (1) ou NULL.
    // Isso é o comportamento de BI esperado e seguro.

    // Retorna APENAS O CONTEÚDO do WHERE e os parâmetros
    return [whereClauses.join(' AND ').trim(), params];
};


// =======================================================================
// ROTAS DO PAINEL DE VIGILÂNCIA (KPIs e GRÁFICOS)
// =======================================================================

// O unitAccessMiddleware injeta o novo req.access
router.use(authMiddleware, unitAccessMiddleware('casos', 'unit_id'));


router.get("/fluxo-demanda", async (req: Request, res: Response) => {
    // 🛑 MUDANÇA CRÍTICA: Usando o novo objeto 'access' 🛑
    const access = req.access!;
    
    try {
        // O existingParamsCount é 0, pois esta é a primeira cláusula WHERE/AND da query.
        const [unitFilterContent, unitParams] = buildFilterClause(access, 0); 
        const andClause = unitFilterContent.length > 0 ? ` AND ${unitFilterContent}` : '';

        const queryBase = `SELECT COUNT(id) AS "total" FROM casos WHERE "dataCad" >= CURRENT_DATE - INTERVAL '30 days'`;
        
        const finalQuery = cleanSqlString(queryBase + andClause);
        // console.log("Fluxo Query:", finalQuery); // Para depuração
        // console.log("Fluxo Params:", unitParams); // Para depuração
        const result = await pool.query(finalQuery, unitParams);

        res.json({ casosNovosUltimos30Dias: parseInt(result.rows[0]?.total || 0, 10) });
    } catch (err: any) {
        console.error("Erro ao buscar fluxo de demanda (filtrado):", err.message);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});

router.get("/sobrecarga-equipe", async (req: Request, res: Response) => {
    // 🛑 MUDANÇA CRÍTICA: Usando o novo objeto 'access' 🛑
    const access = req.access!;
    
    // Usamos existingParamsCount = 0 para a primeira query.
    const [unitFilterContent, unitParams] = buildFilterClause(access, 0);
    const whereClause = unitFilterContent.length > 0 ? ` WHERE ${unitFilterContent}` : '';
    
    // Clonamos os parâmetros, pois eles serão consumidos duas vezes em paralelo pelo Promise.all
    const unitParamsForSecondQuery = [...unitParams]; 

    try {
        const totalCasosBase = `SELECT COUNT(*) AS total FROM casos`;
        // NOTE: Contamos apenas técnicos que LOTARAM casos no CREAS/PAEFI ou casos NULL
        const totalTecnicosBase = `SELECT COUNT(DISTINCT "tecRef") AS total FROM casos`;
        
        const [casosResult, tecnicosResult] = await Promise.all([
            pool.query(cleanSqlString(totalCasosBase + whereClause), unitParams),
            pool.query(cleanSqlString(totalTecnicosBase + whereClause), unitParamsForSecondQuery), // Reutiliza params
        ]);

        const totalCasosAtivos = parseInt(casosResult.rows[0]?.total || 0, 10);
        const totalTecnicos = parseInt(tecnicosResult.rows[0]?.total || 0, 10);

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


router.get("/incidencia-bairros", async (req: Request, res: Response) => {
    // 🛑 MUDANÇA CRÍTICA: Usando o novo objeto 'access' 🛑
    const access = req.access!;
    
    const [unitFilterContent, unitParams] = buildFilterClause(access, 0);
    const whereClause = unitFilterContent.length > 0 ? ` WHERE ${unitFilterContent}` : '';
    
    try {
        const queryBase = `SELECT dados_completos->>'bairro' AS bairro, COUNT(id)::int AS casos FROM casos`;
        
        const finalQuery = cleanSqlString(`
            ${queryBase} ${whereClause}
            AND dados_completos->>'bairro' IS NOT NULL 
            AND TRIM(dados_completos->>'bairro') <> ''
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

router.get("/fontes-acionamento", async (req: Request, res: Response) => {
    // 🛑 MUDANÇA CRÍTICA: Usando o novo objeto 'access' 🛑
    const access = req.access!;
    
    const [unitFilterContent, unitParams] = buildFilterClause(access, 0);
    const whereClause = unitFilterContent.length > 0 ? ` WHERE ${unitFilterContent}` : '';
    
    try {
        const queryBase = `SELECT dados_completos->>'canalDenuncia' AS fonte, COUNT(id)::int AS quantidade FROM casos`;
        
        const finalQuery = cleanSqlString(`
            ${queryBase} ${whereClause}
            AND dados_completos->>'canalDenuncia' IS NOT NULL 
            AND TRIM(dados_completos->>'canalDenuncia') <> ''
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

router.get("/taxa-reincidencia", async (req: Request, res: Response) => {
    // 🛑 MUDANÇA CRÍTICA: Usando o novo objeto 'access' 🛑
    const access = req.access!;
    
    const [unitFilterContent, unitParams] = buildFilterClause(access, 0);
    const andClause = unitFilterContent.length > 0 ? ` AND ${unitFilterContent}` : '';
    
    try {
        const queryBase = `SELECT COUNT(id) AS "totalCasos", COUNT(id) FILTER (WHERE dados_completos->>'reincidente' = 'Sim') AS "casosReincidentes" FROM casos WHERE "dataCad" >= NOW() - INTERVAL '1 year'`;

        const finalQuery = cleanSqlString(queryBase + andClause); 
        const result = await pool.query(finalQuery, unitParams);

        const total = parseInt(result.rows[0]?.totalCasos || 0, 10);
        const reincidentes = parseInt(result.rows[0]?.casosReincidentes || 0, 10);
        const taxa = total > 0 ? (reincidentes / total) * 100 : 0;

        res.json({ taxaReincidencia: parseFloat(taxa.toFixed(1)) });
    } catch (err: any) {
        console.error("Erro ao calcular taxa de reincidência (filtrado):", err.message);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});

router.get("/perfil-violacoes", async (req: Request, res: Response) => {
    // 🛑 MUDANÇA CRÍTICA: Usando o novo objeto 'access' 🛑
    const access = req.access!;
    
    const [unitFilterContent, unitParams] = buildFilterClause(access, 0);
    const whereClause = unitFilterContent.length > 0 ? ` WHERE ${unitFilterContent}` : '';
    
    try {
        const queryBase = `SELECT dados_completos->>'tipoViolencia' AS tipo, COUNT(id)::int AS quantidade FROM casos`;
        
        const finalQuery = cleanSqlString(`
            ${queryBase} ${whereClause}
            AND dados_completos->>'tipoViolencia' IS NOT NULL 
            AND TRIM(dados_completos->>'tipoViolencia') <> ''
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
router.get("/casos-filtrados", async (req: Request, res: Response) => {
    // 🛑 MUDANÇA CRÍTICA: Usando o novo objeto 'access' 🛑
    const access = req.access!;
    
    // Trata a query string como potencial array de filtros
    const { filtro, valor } = req.query;
    const filtros = Array.isArray(filtro) ? filtro : (filtro ? [filtro] : []);
    const valores = Array.isArray(valor) ? valor : (valor ? [valor] : []);

    try {
        // 1. Constrói a cláusula WHERE de segurança e visibilidade (Filtro CREAS/PAEFI)
        // O existingParamsCount é 0, pois esta é a primeira cláusula WHERE/AND da query.
        const [unitFilterContent, unitParams] = buildFilterClause(access, 0);
        const whereClauses: string[] = unitFilterContent.length > 0 ? [`${unitFilterContent}`] : [];
        const params: any[] = [...unitParams]; // Inicializa os parâmetros com o ID do CREAS
        
        const addParam = (val: any) => {
            params.push(val);
            return `$${params.length}`; // O próximo índice é o tamanho atual do array
        };

        // 2. Aplicar TODOS os filtros fornecidos (COM PRIORIDADE DE DATA)
        for (let i = 0; i < filtros.length; i++) {
            const jsonKey = filtros[i];
            const val = valores[i];

            if (!jsonKey || !val) continue;

            // LÓGICA CORRIGIDA: Usa SWITCH/CASE para forçar a avaliação da data
            switch (jsonKey) {
                case 'dataCad':
                case 'ultimos_30_dias': 
                    if (val === 'ultimos_30_dias') {
                        // ✅ CORREÇÃO: Usa a lógica de data correta.
                        whereClauses.push(`"dataCad" >= CURRENT_DATE - INTERVAL '30 days'`);
                    } else {
                         // Fallback para caso não seja o filtro de 30 dias (incomum, mas seguro)
                         const ph = addParam(val);
                         // Assumindo que filtros de jsonKey serão baseados em dados_completos
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