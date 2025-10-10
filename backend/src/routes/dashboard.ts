// backend/src/routes/dashboard.ts

import { Router, Request, Response, NextFunction } from "express"; 
import pool from "../db";
import { authMiddleware } from "../middleware/auth";
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware"; 
import { QueryResult } from "pg";

const router = Router();

// 📌 SOLUÇÃO DE LIMPEZA EXTREMA: Remove quebras de linha e múltiplos espaços.
const cleanSqlString = (sql: string): string => {
    // Essencial para remover caracteres invisíveis que causam o erro 42601
    return sql.replace(/\s+/g, ' ').trim();
};

/**
 * Função utilitária para gerar o filtro WHERE e sincronizar os parâmetros.
 * Retorna APENAS O CONTEÚDO do WHERE, limpo.
 */
const buildFullWhereClauseContent = ( 
    filters: { mes?: string, tecRef?: string, bairro?: string },
    accessFilter: { whereClause: string, params: any[] },
    startParamIndex: number
): [string, any[]] => {
    
    const whereClauses: string[] = [];
    let params: any[] = [];
    let paramIndex = startParamIndex;

    // 1. Adicionar filtros existentes (mes, tecRef, bairro)
    if (filters.mes) {
        params.push(filters.mes);
        whereClauses.push(`TO_CHAR(casos."dataCad", 'YYYY-MM') = $${paramIndex++}`);
    }
    if (filters.tecRef) {
        params.push(filters.tecRef);
        whereClauses.push(`casos."tecRef" ILIKE $${paramIndex++}`);
    }
    if (filters.bairro) {
        params.push(filters.bairro);
        whereClauses.push(`LOWER(casos.dados_completos->>'bairro') = LOWER($${paramIndex++})`);
    }

    // 2. Adicionar filtro de Unidade (CORREÇÃO DE VISIBILIDADE)
    let unitWhere = accessFilter.whereClause;
    
    // Substituir placeholders do unitAccessMiddleware ($X, $Y) por números reais ($N, $N+1...)
    if (accessFilter.params.length === 1) {
        unitWhere = unitWhere.replace('$X', `$${paramIndex++}`);
    } else if (accessFilter.params.length === 2) {
        unitWhere = unitWhere.replace('$X', `$${paramIndex++}`).replace('$Y', `$${paramIndex++}`);
    }
    
    // Adicionar os parâmetros da unidade à lista principal de parâmetros
    params = params.concat(accessFilter.params); 
    
    // ⭐️ CORREÇÃO ESSENCIAL: Inclui casos onde unit_id é NULL, se não for TRUE (Gestor Geral)
    if (unitWhere !== 'TRUE') {
        unitWhere = `(${unitWhere} OR casos.unit_id IS NULL)`;
    }

    // Adicionar a cláusula de unidade ao conjunto de cláusulas WHERE
    whereClauses.push(unitWhere);


    if (whereClauses.length === 0) {
        return ['', []]; 
    }

    // Retorna APENAS O CONTEÚDO do WHERE, limpo.
    return [whereClauses.join(' AND ').trim(), params];
};


// =======================================================================
// 📌 APLICAÇÃO GERAL DOS MIDDLEWARES DE SEGURANÇA NA ROTA
// =======================================================================
router.use(authMiddleware, unitAccessMiddleware('casos', 'unit_id'));


// =======================================================================
// ROTA PRINCIPAL: GET / (Busca Dados do Dashboard)
// =======================================================================
router.get("/", async (req: Request, res: Response) => {
    try {
        const accessFilter = req.accessFilter!; 
        
        const { mes, tecRef, bairro } = req.query as { mes?: string, tecRef?: string, bairro?: string };
        
        // 1. Gera o conteúdo e os parâmetros (Inicia a contagem em $1)
        const [whereContent, params] = buildFullWhereClauseContent({ mes, tecRef, bairro }, accessFilter, 1);

        // 2. Monta as cláusulas WHERE/AND de forma EXPLICITA e segura
        const whereClause = whereContent.length > 0 ? ` WHERE ${whereContent}` : '';
        const andClause = whereContent.length > 0 ? ` AND ${whereContent}` : ''; 
        
        // Lógica para excluir valores nulos/vazios/sem rótulo nos agrupamentos
        const appendNonNullFilter = (jsonbKey: string): string => {
            const jsonbField = `dados_completos->>'${jsonbKey}'`;
            const baseClause = whereContent.length > 0 ? andClause : ' WHERE TRUE ';
            
            // Filtro rigoroso: exclui NULL, espaços em branco e valores comuns de fallback.
            return ` ${baseClause} 
                     AND ${jsonbField} IS NOT NULL 
                     AND TRIM(${jsonbField}) <> '' 
                     AND LOWER(TRIM(${jsonbField})) NOT IN ('n/i', 'não informado', 'null', 'undefined') `;
        }
        
        // Função para garantir que campos que seriam NULOS tenham o rótulo "Não Informado"
        const getGroupedFieldName = (jsonbKey: string): string => {
            const jsonbField = `dados_completos->>'${jsonbKey}'`;
            const trimmedField = `TRIM(${jsonbField})`;
            
            // COALESCE(NULLIF(NULLIF(TRIM(campo), ''), 'N/I'), 'Não Informado')
            return `COALESCE(NULLIF(NULLIF(${trimmedField}, ''), 'N/I'), 'Não Informado')`;
        }

        const queries = [
            // 0 - Indicadores: Total de Atendimentos 
            pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos ${whereClause}`), params),
            
            // 1. Novos no Mês (A query base tem WHERE, usa andClause)
            pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos WHERE "dataCad" >= date_trunc('month', CURRENT_DATE) ${andClause}`), params),

            // 2 - 4 (Queries que usam andClause)
            pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'inseridoPAEFI' = 'Sim' ${andClause}`), params),
            pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'reincidente' = 'Sim' ${andClause}`), params),
            pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'recebePBF' = 'Sim' ${andClause}`), params),
            
            // 5 - Indicadores: Recebem BPC (CORREÇÃO DE VALORES: Usando OR explícito)
            pool.query(cleanSqlString(`
                SELECT COUNT(id) AS total FROM casos 
                WHERE (dados_completos->>'recebeBPC' = 'Idoso' OR dados_completos->>'recebeBPC' = 'PCD')
                ${andClause}
            `), params),
            
            // 6-7 (Queries que usam andClause)
            pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'confirmacaoViolencia' = 'Confirmada' ${andClause}`), params),
            pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'notificacaoSINAM' = 'Sim' ${andClause}`), params),
            
            // 8 - Indicadores: Contexto Familiar (Não precisa de GROUP BY)
            pool.query(cleanSqlString(`SELECT
                COUNT(*) FILTER (WHERE dados_completos->>'dependeFinanceiro' = 'Sim') AS "dependenciaFinanceira",
                COUNT(*) FILTER (WHERE dados_completos->>'vitimaPCD' = 'Sim') AS "vitimaPCD",
                COUNT(*) FILTER (WHERE dados_completos->>'membroCarcerario' = 'Sim') AS "membroCarcerario",
                COUNT(*) FILTER (WHERE dados_completos->>'membroSocioeducacao' = 'Sim') AS "membroSocioeducacao"
                FROM casos ${whereClause}`), params),
            
            // 9 - 12 (Principais: Reforçando checagem TRIM() )
            pool.query(cleanSqlString(`SELECT dados_completos->>'tipoMoradia' AS name FROM casos ${whereClause} AND dados_completos->>'tipoMoradia' IS NOT NULL AND TRIM(dados_completos->>'tipoMoradia') <> '' GROUP BY dados_completos->>'tipoMoradia' ORDER BY COUNT(*) DESC LIMIT 1`), params),
            pool.query(cleanSqlString(`SELECT dados_completos->>'escolaridade' AS name FROM casos ${whereClause} AND dados_completos->>'escolaridade' IS NOT NULL AND TRIM(dados_completos->>'escolaridade') <> '' GROUP BY dados_completos->>'escolaridade' ORDER BY COUNT(*) DESC LIMIT 1`), params),
            pool.query(cleanSqlString(`SELECT dados_completos->>'tipoViolencia' AS name FROM casos ${whereClause} AND dados_completos->>'tipoViolencia' IS NOT NULL AND TRIM(dados_completos->>'tipoViolencia') <> '' GROUP BY dados_completos->>'tipoViolencia' ORDER BY COUNT(*) DESC LIMIT 1`), params),
            pool.query(cleanSqlString(`SELECT dados_completos->>'localOcorrencia' AS name FROM casos ${whereClause} AND dados_completos->>'localOcorrencia' IS NOT NULL AND TRIM(dados_completos->>'localOcorrencia') <> '' GROUP BY dados_completos->>'localOcorrencia' ORDER BY COUNT(*) DESC LIMIT 1`), params),
            
            // 13 a 19 - Gráficos (USANDO A FUNÇÃO getGroupedFieldName)
            pool.query(cleanSqlString(`SELECT ${getGroupedFieldName('bairro')} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC LIMIT 5`), params),
            pool.query(cleanSqlString(`SELECT ${getGroupedFieldName('tipoViolencia')} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC`), params),
            pool.query(cleanSqlString(`SELECT ${getGroupedFieldName('encaminhamentoDetalhe')} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC LIMIT 5`), params),
            pool.query(cleanSqlString(`SELECT ${getGroupedFieldName('sexo')} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC`), params),
            pool.query(cleanSqlString(`SELECT ${getGroupedFieldName('canalDenuncia')} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC`), params),
            pool.query(cleanSqlString(`SELECT ${getGroupedFieldName('corEtnia')} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC`), params),
            // Faixa Etária (Tratamento especial no agrupamento)
            pool.query(cleanSqlString(`SELECT CASE WHEN (dados_completos->>'idade')::integer BETWEEN 0 AND 11 THEN 'Criança (0-11)' WHEN (dados_completos->>'idade')::integer BETWEEN 12 AND 17 THEN 'Adolescente (12-17)' WHEN (dados_completos->>'idade')::integer BETWEEN 18 AND 29 THEN 'Jovem (18-29)' WHEN (dados_completos->>'idade')::integer BETWEEN 30 AND 59 THEN 'Adulto (30-59)' WHEN (dados_completos->>'idade')::integer >= 60 THEN 'Idoso (60+)' ELSE 'Não informado' END as name, COUNT(*) as value FROM casos ${whereClause} AND dados_completos->>'idade' IS NOT NULL AND TRIM(dados_completos->>'idade') <> '' GROUP BY name ORDER BY value DESC`), params),
            
            // 20, 21, 22 - Opções para os Filtros (Reforçando checagem TRIM() )
            pool.query(cleanSqlString(`SELECT DISTINCT TO_CHAR("dataCad", 'YYYY-MM') AS mes FROM casos ${whereClause} AND "dataCad" IS NOT NULL GROUP BY mes ORDER BY mes DESC`), params),
            pool.query(cleanSqlString(`SELECT DISTINCT "tecRef" FROM casos ${whereClause} AND "tecRef" IS NOT NULL GROUP BY "tecRef" ORDER BY "tecRef" ASC`), params),
            pool.query(cleanSqlString(`SELECT DISTINCT dados_completos->>'bairro' AS bairro FROM casos ${whereClause} AND dados_completos->>'bairro' IS NOT NULL AND TRIM(dados_completos->>'bairro') <> '' GROUP BY bairro ORDER BY bairro ASC`), params)
        ];

        const results: QueryResult[] = await Promise.all(queries);

        const responsePayload = {
            dados: {
                indicadores: { 
                    totalAtendimentos: parseInt(results[0].rows[0]?.total || 0, 10),
                    novosNoMes: parseInt(results[1].rows[0]?.total || 0, 10),
                    inseridosPAEFI: parseInt(results[2].rows[0]?.total || 0, 10),
                    reincidentes: parseInt(results[3].rows[0]?.total || 0, 10),
                    recebemBolsaFamilia: parseInt(results[4].rows[0]?.total || 0, 10),
                    recebemBPC: parseInt(results[5].rows[0]?.total || 0, 10),
                    violenciaConfirmada: parseInt(results[6].rows[0]?.total || 0, 10),
                    notificadosSINAN: parseInt(results[7].rows[0]?.total || 0, 10),
                    contextoFamiliar: results[8].rows[0] || {},
                },
                principais: { 
                    moradiaPrincipal: results[9].rows[0]?.name || "N/I",
                    escolaridadePrincipal: results[10].rows[0]?.name || "N/I",
                    violenciaPrincipal: results[11].rows[0]?.name || "N/I",
                    localPrincipal: results[12].rows[0]?.name || "N/I"
                },
                graficos: {
                    casosPorBairro: results[13].rows.map((r: any) => ({...r, value: parseInt(r.value, 10)})),
                    tiposViolacao: results[14].rows.map((r: any) => ({...r, value: parseInt(r.value, 10)})),
                    encaminhamentosTop5: results[15].rows.map((r: any) => ({...r, value: parseInt(r.value, 10)})),
                    casosPorSexo: results[16].rows.map((r: any) => ({...r, value: parseInt(r.value, 10)})),
                    canalDenuncia: results[17].rows.map((r: any) => ({...r, value: parseInt(r.value, 10)})),
                    casosPorCor: results[18].rows.map((r: any) => ({...r, value: parseInt(r.value, 10)})),
                    casosPorFaixaEtaria: results[19].rows.map((r: any) => ({...r, value: parseInt(r.value, 10)}))
                }
            },
            opcoesFiltro: {
                meses: results[20].rows.map((r: any) => r.mes),
                tecnicos: results[21].rows.map((r: any) => r.tecRef),
                bairros: results[22].rows.map((r: any) => r.bairro),
            }
        };
        res.json(responsePayload);

    } catch (err: any) {
      console.error("Erro na rota unificada do dashboard:", err.message);
      res.status(500).json({ message: "Erro ao buscar dados do dashboard." });
    }
});


export default router;