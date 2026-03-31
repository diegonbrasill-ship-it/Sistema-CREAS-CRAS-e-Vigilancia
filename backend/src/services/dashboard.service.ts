import { QueryResult } from "pg";
import pool from "../db";
import { QueryBuilder } from "../utils/query-builder";
import { cleanSqlString } from "../utils/sqlUtils";

export type DashboardAccessScope = { whereClause: string; params: (string | number)[] };

export type DashboardFilters = {
  mes?: string;
  tec_ref?: string;
  bairro?: string;
};

export type DashboardResponsePayload = {
  dados: {
    indicadores: {
      totalAtendimentos: number;
      novosNoMes: number;
      inseridosPAEFI: number;
      reincidentes: number;
      recebemBolsaFamilia: number;
      recebemBPC: number;
      violenciaConfirmada: number;
      notificadosSINAN: number;
      contextoFamiliar: {
        dependenciaFinanceira?: string;
        vitimaPCD?: string;
        membroCarcerario?: string;
        membroSocioeducacao?: string;
      };
    };
    principais: {
      moradiaPrincipal: string;
      escolaridadePrincipal: string;
      violenciaPrincipal: string;
      localPrincipal: string;
    };
    graficos: {
      casosPorBairro: Array<{ name: string; value: number }>;
      tiposViolacao: Array<{ name: string; value: number }>;
      encaminhamentosTop5: Array<{ name: string; value: number }>;
      casosPorSexo: Array<{ name: string; value: number }>;
      canalDenuncia: Array<{ name: string; value: number }>;
      casosPorCor: Array<{ name: string; value: number }>;
      casosPorFaixaEtaria: Array<{ name: string; value: number }>;
    };
  };
  opcoesFiltro: {
    meses: string[];
    tecnicos: string[];
    bairros: string[];
  };
};

export class DashboardService {
  static async getDashboardData(input: DashboardFilters & { accessScope: DashboardAccessScope }): Promise<DashboardResponsePayload> {
    const { accessScope, mes, tec_ref, bairro } = input;

    const queryBuilder = new QueryBuilder("SELECT")
      .whereIf(mes, (placeholder) => `TO_CHAR(casos.data_cad, 'YYYY-MM') = ${placeholder}`)
      .whereIf(tec_ref, (placeholder) => `casos.tec_ref ILIKE ${placeholder}`)
      .whereIf(bairro, (placeholder) => `LOWER(casos.dados_completos->>'bairro') = LOWER(${placeholder})`)
      .applyAccessFilter(accessScope);

    const whereClause = queryBuilder.getWhereClause() ? ` ${queryBuilder.getWhereClause()}` : "";
    const andClause = queryBuilder.getAndClause() ? ` ${queryBuilder.getAndClause()}` : "";
    const whereTrue = whereClause.length > 0 ? ` ${queryBuilder.getWhereClause()}` : " WHERE TRUE";
    const params = queryBuilder.getParams();

    const getGroupedFieldName = (jsonbKey: string): string => {
      const jsonbField = `dados_completos->>'${jsonbKey}'`;
      const trimmedField = `TRIM(${jsonbField})`;
      return `COALESCE(NULLIF(NULLIF(${trimmedField}, ''), 'N/I'), 'Não Informado')`;
    };

    const queries = [
      pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos ${whereClause}`), params),
      pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos WHERE data_cad >= date_trunc('month', CURRENT_DATE) ${andClause}`), params),
      pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'inseridoPAEFI' = 'Sim' ${andClause}`), params),
      pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'reincidente' = 'Sim' ${andClause}`), params),
      pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'recebePBF' = 'Sim' ${andClause}`), params),
      pool.query(cleanSqlString(`
        SELECT COUNT(id) AS total FROM casos
        WHERE (dados_completos->>'recebeBPC' = 'Idoso' OR dados_completos->>'recebeBPC' = 'PCD')
        ${andClause}
      `), params),
      pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'confirmacaoViolencia' = 'Confirmada' ${andClause}`), params),
      pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'notificacaoSINAN' = 'Sim' ${andClause}`), params),
      pool.query(cleanSqlString(`SELECT
        COUNT(*) FILTER (WHERE dados_completos->>'dependeFinanceiro' = 'Sim') AS "dependenciaFinanceira",
        COUNT(*) FILTER (WHERE dados_completos->>'vitimaPCD' = 'Sim') AS "vitimaPCD",
        COUNT(*) FILTER (WHERE dados_completos->>'membroCarcerario' = 'Sim') AS "membroCarcerario",
        COUNT(*) FILTER (WHERE dados_completos->>'membroSocioeducacao' = 'Sim') AS "membroSocioeducacao"
        FROM casos ${whereClause}`), params),
      pool.query(cleanSqlString(`SELECT dados_completos->>'tipoResidencia' AS name FROM casos ${whereTrue} AND dados_completos->>'tipoResidencia' IS NOT NULL AND TRIM(dados_completos->>'tipoResidencia') <> '' GROUP BY dados_completos->>'tipoResidencia' ORDER BY COUNT(*) DESC LIMIT 1`), params),
      pool.query(cleanSqlString(`SELECT dados_completos->>'escolaridade' AS name FROM casos ${whereTrue} AND dados_completos->>'escolaridade' IS NOT NULL AND TRIM(dados_completos->>'escolaridade') <> '' GROUP BY dados_completos->>'escolaridade' ORDER BY COUNT(*) DESC LIMIT 1`), params),
      pool.query(cleanSqlString(`SELECT dados_completos->>'tipoViolencia' AS name FROM casos ${whereTrue} AND dados_completos->>'tipoViolencia' IS NOT NULL AND TRIM(dados_completos->>'tipoViolencia') <> '' GROUP BY dados_completos->>'tipoViolencia' ORDER BY COUNT(*) DESC LIMIT 1`), params),
      pool.query(cleanSqlString(`SELECT dados_completos->>'bairro' AS name FROM casos ${whereTrue} AND dados_completos->>'bairro' IS NOT NULL AND TRIM(dados_completos->>'bairro') <> '' GROUP BY dados_completos->>'bairro' ORDER BY COUNT(*) DESC LIMIT 1`), params),
      pool.query(cleanSqlString(`SELECT ${getGroupedFieldName("bairro")} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC LIMIT 5`), params),
      pool.query(cleanSqlString(`SELECT ${getGroupedFieldName("tipoViolencia")} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC`), params),
      pool.query(cleanSqlString(`SELECT ${getGroupedFieldName("encaminhamentoDetalhe")} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC LIMIT 5`), params),
      pool.query(cleanSqlString(`SELECT ${getGroupedFieldName("sexo")} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC`), params),
      pool.query(cleanSqlString(`SELECT ${getGroupedFieldName("canalDenuncia")} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC`), params),
      pool.query(cleanSqlString(`SELECT ${getGroupedFieldName("racaCor")} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC`), params),
      pool.query(cleanSqlString(`SELECT CASE WHEN (dados_completos->>'idade')::integer BETWEEN 0 AND 11 THEN 'Criança (0-11)' WHEN (dados_completos->>'idade')::integer BETWEEN 12 AND 17 THEN 'Adolescente (12-17)' WHEN (dados_completos->>'idade')::integer BETWEEN 18 AND 29 THEN 'Jovem (18-29)' WHEN (dados_completos->>'idade')::integer BETWEEN 30 AND 59 THEN 'Adulto (30-59)' WHEN (dados_completos->>'idade')::integer >= 60 THEN 'Idoso (60+)' ELSE 'Não informado' END as name, COUNT(*) as value FROM casos ${whereTrue} AND dados_completos->>'idade' IS NOT NULL AND TRIM(dados_completos->>'idade') <> '' GROUP BY name ORDER BY value DESC`), params),
      pool.query(cleanSqlString(`SELECT DISTINCT TO_CHAR(data_cad, 'YYYY-MM') AS mes FROM casos ${whereTrue} AND data_cad IS NOT NULL GROUP BY mes ORDER BY mes DESC`), params),
      pool.query(cleanSqlString(`SELECT DISTINCT tec_ref FROM casos ${whereTrue} AND tec_ref IS NOT NULL GROUP BY tec_ref ORDER BY tec_ref ASC`), params),
      pool.query(cleanSqlString(`SELECT DISTINCT dados_completos->>'bairro' AS bairro FROM casos ${whereTrue} AND dados_completos->>'bairro' IS NOT NULL AND TRIM(dados_completos->>'bairro') <> '' GROUP BY bairro ORDER BY bairro ASC`), params),
    ];

    const results: QueryResult[] = await Promise.all(queries);

    return {
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
          localPrincipal: results[12].rows[0]?.name || "N/I",
        },
        graficos: {
          casosPorBairro: results[13].rows.map((r: any) => ({ ...r, value: parseInt(r.value, 10) })),
          tiposViolacao: results[14].rows.map((r: any) => ({ ...r, value: parseInt(r.value, 10) })),
          encaminhamentosTop5: results[15].rows.map((r: any) => ({ ...r, value: parseInt(r.value, 10) })),
          casosPorSexo: results[16].rows.map((r: any) => ({ ...r, value: parseInt(r.value, 10) })),
          canalDenuncia: results[17].rows.map((r: any) => ({ ...r, value: parseInt(r.value, 10) })),
          casosPorCor: results[18].rows.map((r: any) => ({ ...r, value: parseInt(r.value, 10) })),
          casosPorFaixaEtaria: results[19].rows.map((r: any) => ({ ...r, value: parseInt(r.value, 10) })),
        },
      },
      opcoesFiltro: {
        meses: results[20].rows.map((r: any) => r.mes),
        tecnicos: results[21].rows.map((r: any) => r.tec_ref),
        bairros: results[22].rows.map((r: any) => r.bairro),
      },
    };
  }
}
