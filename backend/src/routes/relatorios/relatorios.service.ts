import pool from "../../db";
import { DashboardService } from "../../services/dashboard.service";
import { CasoParaRelatorio, renderDashboardReportPdf, renderGeneralReportPdf } from "../../services/report.service";
import { QueryBuilder } from "../../utils/query-builder";
import { RelatorioDashboardInput, RelatorioGeralInput } from "./relatorios.contract";

export class RelatoriosService {
  static async generateGeneralReport(input: RelatorioGeralInput): Promise<Buffer | null> {
    const casos = await this.listGeneralCases(input);
    if (casos.length === 0) {
      return null;
    }

    return renderGeneralReportPdf(casos);
  }

  static async listGeneralCases(input: RelatorioGeralInput): Promise<CasoParaRelatorio[]> {
    const { startDate, endDate, accessScope } = input;

    const qb = new QueryBuilder(`
      SELECT id, data_cad, tec_ref, nome,
             dados_completos->>'bairro' AS bairro,
             dados_completos->>'tipoViolencia' AS "tipoViolencia",
             unit_id
      FROM casos
    `);

    qb.where("deleted_at IS NULL");
    qb.whereIf(startDate, (ph) => `data_cad >= ${ph}::DATE`);
    qb.whereIf(endDate, (ph) => `data_cad <= ${ph}::DATE`);
    qb.applyAccessFilter(accessScope, { allowNullUnit: false });
    qb.order("data_cad ASC");

    const [sql, params] = qb.build();
    const result = await pool.query(sql, params);
    return result.rows;
  }

  static async generateDashboardReport(input: RelatorioDashboardInput): Promise<Buffer> {
    const payload = await DashboardService.getDashboardData({
      accessScope: input.accessScope,
      ...input.filters,
    });

    return renderDashboardReportPdf(payload, {
      filters: input.filters,
      generatedBy: input.requestedBy.username,
    });
  }
}
