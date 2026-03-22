// backend/src/routes/dashboard.ts

import { Router, Request, Response } from "express";
import pool from "../db";
import { authMiddleware } from "../middleware/auth/auth";
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware";
import { QueryResult } from "pg";
import { cleanSqlString } from "../utils/sqlUtils";
import { QueryBuilder } from "../utils/query-builder";

const router = Router();

router.use(authMiddleware, unitAccessMiddleware('casos', 'unit_id'));

// =======================================================================
// ROTA PRINCIPAL: GET / (Busca Dados do Dashboard)
// =======================================================================
router.get("/", async (req: Request, res: Response) => {
    try {
        const accessFilter = req.accessFilter!;

        const { mes, tec_ref, bairro } = req.query as { mes?: string, tec_ref?: string, bairro?: string };

        // 1. Monta os filtros com QueryBuilder
        const queryBuilder = new QueryBuilder("SELECT")
            .whereIf(mes, (placeholder) => `TO_CHAR(casos.data_cad, 'YYYY-MM') = ${placeholder}`)
            .whereIf(tec_ref, (placeholder) => `casos.tec_ref ILIKE ${placeholder}`)
            .whereIf(bairro, (placeholder) => `LOWER(casos.dados_completos->>'bairro') = LOWER(${placeholder})`)
            .applyAccessFilter(accessFilter);

        // 2. Monta as cláusulas WHERE/AND de forma EXPLICITA e segura
        const whereClause = queryBuilder.getWhereClause() ? ` ${queryBuilder.getWhereClause()}` : '';
        const andClause = queryBuilder.getAndClause() ? ` ${queryBuilder.getAndClause()}` : '';
        // whereTrue: âncora segura para queries que NÃO têm WHERE fixo mas precisam
        // de WHERE + AND adicionais (ex: queries 9-12, 19-22).
        // Sempre começa com WHERE — quando há filtros usa "WHERE <filtros>",
        // quando não há filtros usa "WHERE TRUE" como fallback.
        const whereTrue = whereClause.length > 0 ? ` ${queryBuilder.getWhereClause()}` : ' WHERE TRUE';
        const params = queryBuilder.getParams();

        console.log('rota dashboard')
        console.log('whereClause')
        console.log(whereClause ?? "vazia")
        console.log('andClause')
        console.log(andClause ?? "vazia")
        console.log('whereTRUE')
        console.log(whereTrue ?? "vazia")
        console.log('params')
        console.log(params ?? "vazios")
        
        


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
            pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos WHERE data_cad >= date_trunc('month', CURRENT_DATE) ${andClause}`), params),

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
            pool.query(cleanSqlString(`SELECT dados_completos->>'tipoMoradia' AS name FROM casos ${whereTrue} AND dados_completos->>'tipoMoradia' IS NOT NULL AND TRIM(dados_completos->>'tipoMoradia') <> '' GROUP BY dados_completos->>'tipoMoradia' ORDER BY COUNT(*) DESC LIMIT 1`), params),
            pool.query(cleanSqlString(`SELECT dados_completos->>'escolaridade' AS name FROM casos ${whereTrue} AND dados_completos->>'escolaridade' IS NOT NULL AND TRIM(dados_completos->>'escolaridade') <> '' GROUP BY dados_completos->>'escolaridade' ORDER BY COUNT(*) DESC LIMIT 1`), params),
            pool.query(cleanSqlString(`SELECT dados_completos->>'tipo_violencia' AS name FROM casos ${whereTrue} AND dados_completos->>'tipo_violencia' IS NOT NULL AND TRIM(dados_completos->>'tipo_violencia') <> '' GROUP BY dados_completos->>'tipo_violencia' ORDER BY COUNT(*) DESC LIMIT 1`), params),
            pool.query(cleanSqlString(`SELECT dados_completos->>'localOcorrencia' AS name FROM casos ${whereTrue} AND dados_completos->>'localOcorrencia' IS NOT NULL AND TRIM(dados_completos->>'localOcorrencia') <> '' GROUP BY dados_completos->>'localOcorrencia' ORDER BY COUNT(*) DESC LIMIT 1`), params),

            // 13 a 19 - Gráficos (USANDO A FUNÇÃO getGroupedFieldName)
            pool.query(cleanSqlString(`SELECT ${getGroupedFieldName('bairro')} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC LIMIT 5`), params),
            pool.query(cleanSqlString(`SELECT ${getGroupedFieldName('tipo_violencia')} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC`), params),
            pool.query(cleanSqlString(`SELECT ${getGroupedFieldName('encaminhamentoDetalhe')} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC LIMIT 5`), params),
            pool.query(cleanSqlString(`SELECT ${getGroupedFieldName('sexo')} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC`), params),
            pool.query(cleanSqlString(`SELECT ${getGroupedFieldName('canalDenuncia')} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC`), params),
            pool.query(cleanSqlString(`SELECT ${getGroupedFieldName('corEtnia')} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC`), params),

            // Faixa Etária (Tratamento especial no agrupamento)
            pool.query(cleanSqlString(`SELECT CASE WHEN (dados_completos->>'idade')::integer BETWEEN 0 AND 11 THEN 'Criança (0-11)' WHEN (dados_completos->>'idade')::integer BETWEEN 12 AND 17 THEN 'Adolescente (12-17)' WHEN (dados_completos->>'idade')::integer BETWEEN 18 AND 29 THEN 'Jovem (18-29)' WHEN (dados_completos->>'idade')::integer BETWEEN 30 AND 59 THEN 'Adulto (30-59)' WHEN (dados_completos->>'idade')::integer >= 60 THEN 'Idoso (60+)' ELSE 'Não informado' END as name, COUNT(*) as value FROM casos ${whereTrue} AND dados_completos->>'idade' IS NOT NULL AND TRIM(dados_completos->>'idade') <> '' GROUP BY name ORDER BY value DESC`), params),

            // 20, 21, 22 - Opções para os Filtros (Reforçando checagem TRIM() )
            pool.query(cleanSqlString(`SELECT DISTINCT TO_CHAR(data_cad, 'YYYY-MM') AS mes FROM casos ${whereTrue} AND data_cad IS NOT NULL GROUP BY mes ORDER BY mes DESC`), params),
            pool.query(cleanSqlString(`SELECT DISTINCT tec_ref FROM casos ${whereTrue} AND tec_ref IS NOT NULL GROUP BY tec_ref ORDER BY tec_ref ASC`), params),
            pool.query(cleanSqlString(`SELECT DISTINCT dados_completos->>'bairro' AS bairro FROM casos ${whereTrue} AND dados_completos->>'bairro' IS NOT NULL AND TRIM(dados_completos->>'bairro') <> '' GROUP BY bairro ORDER BY bairro ASC`), params)
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
                    casosPorBairro: results[13].rows.map((r: any) => ({ ...r, value: parseInt(r.value, 10) })),
                    tiposViolacao: results[14].rows.map((r: any) => ({ ...r, value: parseInt(r.value, 10) })),
                    encaminhamentosTop5: results[15].rows.map((r: any) => ({ ...r, value: parseInt(r.value, 10) })),
                    casosPorSexo: results[16].rows.map((r: any) => ({ ...r, value: parseInt(r.value, 10) })),
                    canalDenuncia: results[17].rows.map((r: any) => ({ ...r, value: parseInt(r.value, 10) })),
                    casosPorCor: results[18].rows.map((r: any) => ({ ...r, value: parseInt(r.value, 10) })),
                    casosPorFaixaEtaria: results[19].rows.map((r: any) => ({ ...r, value: parseInt(r.value, 10) }))
                }
            },
            opcoesFiltro: {
                meses: results[20].rows.map((r: any) => r.mes),
                tecnicos: results[21].rows.map((r: any) => r.tec_ref),
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