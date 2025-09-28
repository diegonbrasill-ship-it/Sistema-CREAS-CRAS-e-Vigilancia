// backend/src/routes/dashboard.ts

import { Router, Request, Response } from "express";
import pool from "../db";
import { authMiddleware } from "../middleware/auth";
import { QueryResult } from "pg";

const router = Router();

const buildWhereClause = (filters: { mes?: string, tecRef?: string, bairro?: string }): [string, any[]] => {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters.mes) {
        params.push(filters.mes);
        whereClauses.push(`TO_CHAR(casos."dataCad", 'YYYY-MM') = $${params.length}`);
    }
    if (filters.tecRef) {
        params.push(filters.tecRef);
        whereClauses.push(`casos."tecRef" ILIKE $${params.length}`);
    }
    if (filters.bairro) {
        params.push(filters.bairro);
        whereClauses.push(`LOWER(casos.dados_completos->>'bairro') = LOWER($${params.length})`);
    }

    if (whereClauses.length === 0) {
        return ['', []];
    }

    return [`WHERE ${whereClauses.join(' AND ')}`, params];
};


router.get("/", authMiddleware, async (req: Request, res: Response) => {
    try {
        const { mes, tecRef, bairro } = req.query as { mes?: string, tecRef?: string, bairro?: string };
        const [whereClause, params] = buildWhereClause({ mes, tecRef, bairro });

        const andClause = whereClause.length > 0 ? `AND ${whereClause.substring(6)}` : '';

        const queries = [
            // 0 - Indicadores: Total de Atendimentos
            pool.query(`SELECT COUNT(id) AS total FROM casos ${whereClause}`, params),
            
            // 1. CORREÇÃO: A query para "Novos no Mês" agora também aplica os filtros
            pool.query(`SELECT COUNT(id) AS total FROM casos WHERE "dataCad" >= date_trunc('month', CURRENT_DATE) ${andClause}`, params),

            // 2 - Indicadores: Inseridos no PAEFI
            pool.query(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'inseridoPAEFI' = 'Sim' ${andClause}`, params),
            // 3 - Indicadores: Reincidentes
            pool.query(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'reincidente' = 'Sim' ${andClause}`, params),
            // 4 - Indicadores: Recebem Bolsa Família
            pool.query(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'recebePBF' = 'Sim' ${andClause}`, params),
            // 5 - Indicadores: Recebem BPC
            pool.query(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'recebeBPC' IN ('Idoso', 'PCD') ${andClause}`, params),
            // 6 - Indicadores: Violência Confirmada
            pool.query(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'confirmacaoViolencia' = 'Confirmada' ${andClause}`, params),
            // 7 - Indicadores: Notificados no SINAN
            pool.query(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'notificacaoSINAM' = 'Sim' ${andClause}`, params),
            // 8 - Indicadores: Contexto Familiar
            pool.query(`SELECT
                COUNT(*) FILTER (WHERE dados_completos->>'dependeFinanceiro' = 'Sim') AS "dependenciaFinanceira",
                COUNT(*) FILTER (WHERE dados_completos->>'vitimaPCD' = 'Sim') AS "vitimaPCD",
                COUNT(*) FILTER (WHERE dados_completos->>'membroCarcerario' = 'Sim') AS "membroCarcerario",
                COUNT(*) FILTER (WHERE dados_completos->>'membroSocioeducacao' = 'Sim') AS "membroSocioeducacao"
                FROM casos ${whereClause}`, params),
            // 9 - Principais: Moradia
            pool.query(`SELECT dados_completos->>'tipoMoradia' AS name FROM casos ${whereClause} GROUP BY name ORDER BY COUNT(*) DESC LIMIT 1`, params),
            // 10 - Principais: Escolaridade
            pool.query(`SELECT dados_completos->>'escolaridade' AS name FROM casos ${whereClause} GROUP BY name ORDER BY COUNT(*) DESC LIMIT 1`, params),
            // 11 - Principais: Violência
            pool.query(`SELECT dados_completos->>'tipoViolencia' AS name FROM casos ${whereClause} GROUP BY name ORDER BY COUNT(*) DESC LIMIT 1`, params),
            // 12 - Principais: Local
            pool.query(`SELECT dados_completos->>'localOcorrencia' AS name FROM casos ${whereClause} GROUP BY name ORDER BY COUNT(*) DESC LIMIT 1`, params),
            
            // 13 a 19 - Gráficos
            pool.query(`SELECT dados_completos->>'bairro' as name, COUNT(*) as value FROM casos ${whereClause.length > 0 ? whereClause + " AND dados_completos->>'bairro' IS NOT NULL AND dados_completos->>'bairro' <> ''" : "WHERE dados_completos->>'bairro' IS NOT NULL AND dados_completos->>'bairro' <> ''"} GROUP BY name ORDER BY value DESC LIMIT 5`, params),
            pool.query(`SELECT dados_completos->>'tipoViolencia' as name, COUNT(*) as value FROM casos ${whereClause.length > 0 ? whereClause + " AND dados_completos->>'tipoViolencia' IS NOT NULL AND dados_completos->>'tipoViolencia' <> ''" : "WHERE dados_completos->>'tipoViolencia' IS NOT NULL AND dados_completos->>'tipoViolencia' <> ''"} GROUP BY name ORDER BY value DESC`, params),
            pool.query(`SELECT dados_completos->>'encaminhamentoDetalhe' as name, COUNT(*) as value FROM casos ${whereClause.length > 0 ? whereClause + " AND dados_completos->>'encaminhamentoDetalhe' IS NOT NULL AND dados_completos->>'encaminhamentoDetalhe' <> ''" : "WHERE dados_completos->>'encaminhamentoDetalhe' IS NOT NULL AND dados_completos->>'encaminhamentoDetalhe' <> ''"} GROUP BY name ORDER BY value DESC LIMIT 5`, params),
            pool.query(`SELECT dados_completos->>'sexo' as name, COUNT(*) as value FROM casos ${whereClause.length > 0 ? whereClause + " AND dados_completos->>'sexo' IS NOT NULL AND dados_completos->>'sexo' <> ''" : "WHERE dados_completos->>'sexo' IS NOT NULL AND dados_completos->>'sexo' <> ''"} GROUP BY name ORDER BY value DESC`, params),
            pool.query(`SELECT dados_completos->>'canalDenuncia' as name, COUNT(*) as value FROM casos ${whereClause.length > 0 ? whereClause + " AND dados_completos->>'canalDenuncia' IS NOT NULL AND dados_completos->>'canalDenuncia' <> ''" : "WHERE dados_completos->>'canalDenuncia' IS NOT NULL AND dados_completos->>'canalDenuncia' <> ''"} GROUP BY name ORDER BY value DESC`, params),
            pool.query(`SELECT dados_completos->>'corEtnia' as name, COUNT(*) as value FROM casos ${whereClause.length > 0 ? whereClause + " AND dados_completos->>'corEtnia' IS NOT NULL AND dados_completos->>'corEtnia' <> ''" : "WHERE dados_completos->>'corEtnia' IS NOT NULL AND dados_completos->>'corEtnia' <> ''"} GROUP BY name ORDER BY value DESC`, params),
            pool.query(`SELECT CASE WHEN (dados_completos->>'idade')::integer BETWEEN 0 AND 11 THEN 'Criança (0-11)' WHEN (dados_completos->>'idade')::integer BETWEEN 12 AND 17 THEN 'Adolescente (12-17)' WHEN (dados_completos->>'idade')::integer BETWEEN 18 AND 29 THEN 'Jovem (18-29)' WHEN (dados_completos->>'idade')::integer BETWEEN 30 AND 59 THEN 'Adulto (30-59)' WHEN (dados_completos->>'idade')::integer >= 60 THEN 'Idoso (60+)' ELSE 'Não informado' END as name, COUNT(*) as value FROM casos ${whereClause.length > 0 ? whereClause + ` AND dados_completos->>'idade' ~ '^\\d+$'` : `WHERE dados_completos->>'idade' ~ '^\\d+$'`} GROUP BY name ORDER BY value DESC`, params),
            
            // 20, 21, 22 - Opções para os Filtros
            pool.query(`SELECT DISTINCT TO_CHAR("dataCad", 'YYYY-MM') AS mes FROM casos WHERE "dataCad" IS NOT NULL ORDER BY mes DESC`),
            pool.query(`SELECT DISTINCT "tecRef" FROM casos WHERE "tecRef" IS NOT NULL ORDER BY "tecRef" ASC`),
            pool.query(`SELECT DISTINCT dados_completos->>'bairro' AS bairro FROM casos WHERE dados_completos->>'bairro' IS NOT NULL AND dados_completos->>'bairro' <> '' ORDER BY bairro ASC`)
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