import pool from "../src/db";
import { DashboardService } from "../src/services/dashboard.service";
import { renderDashboardReportPdf, renderGeneralReportPdf } from "../src/services/report.service";
import { RelatoriosService } from "../src/routes/relatorios/relatorios.service";

jest.mock("../src/db", () => {
  return {
    __esModule: true,
    default: {
      query: jest.fn(),
    },
  };
});

jest.mock("../src/services/report.service", () => {
  return {
    __esModule: true,
    renderGeneralReportPdf: jest.fn(),
    renderDashboardReportPdf: jest.fn(),
  };
});

jest.mock("../src/services/dashboard.service", () => {
  return {
    __esModule: true,
    DashboardService: {
      getDashboardData: jest.fn(),
    },
  };
});

describe("RelatoriosService", () => {
  const input = {
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    accessScope: { whereClause: "casos.unit_id", params: [42] as (string | number)[] },
    requestedBy: {
      id: 1,
      username: "tester",
      role: "tecnico_superior",
      unit_id: 42,
      role_id: 1,
      permissions: [],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("listGeneralCases aplica período, soft delete e accessFilter sem unit_id nulo", async () => {
    (pool.query as unknown as jest.Mock).mockResolvedValue({
      rows: [{ id: 1, data_cad: "2026-03-10", tec_ref: "Ana", nome: "Maria", bairro: "Centro", tipoViolencia: "FISICA" }],
      rowCount: 1,
    });

    const rows = await RelatoriosService.listGeneralCases(input);

    expect(pool.query).toHaveBeenCalledTimes(1);
    const [sql, params] = (pool.query as unknown as jest.Mock).mock.calls[0];

    expect(sql).toContain("FROM casos");
    expect(sql).toContain("deleted_at IS NULL");
    expect(sql).toContain("data_cad >= $1::DATE");
    expect(sql).toContain("data_cad <= $2::DATE");
    expect(sql).toContain("(casos.unit_id = $3)");
    expect(sql).toContain("ORDER BY data_cad ASC");
    expect(sql).not.toContain("casos.unit_id IS NULL");
    expect(params).toEqual(["2026-03-01", "2026-03-31", 42]);
    expect(rows).toEqual([
      { id: 1, data_cad: "2026-03-10", tec_ref: "Ana", nome: "Maria", bairro: "Centro", tipoViolencia: "FISICA" },
    ]);
  });

  it("generateGeneralReport renderiza o PDF quando houver dados", async () => {
    const pdfBuffer = Buffer.from("fake-pdf");

    (pool.query as unknown as jest.Mock).mockResolvedValue({
      rows: [{ id: 1, data_cad: "2026-03-10", tec_ref: "Ana", nome: "Maria", bairro: "Centro", tipoViolencia: "FISICA" }],
      rowCount: 1,
    });
    (renderGeneralReportPdf as jest.Mock).mockResolvedValue(pdfBuffer);

    const result = await RelatoriosService.generateGeneralReport(input);

    expect(renderGeneralReportPdf).toHaveBeenCalledWith([
      { id: 1, data_cad: "2026-03-10", tec_ref: "Ana", nome: "Maria", bairro: "Centro", tipoViolencia: "FISICA" },
    ]);
    expect(result).toBe(pdfBuffer);
  });

  it("generateGeneralReport retorna null quando não houver casos", async () => {
    (pool.query as unknown as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

    const result = await RelatoriosService.generateGeneralReport(input);

    expect(result).toBeNull();
    expect(renderGeneralReportPdf).not.toHaveBeenCalled();
  });

  it("generateDashboardReport usa o payload do DashboardService e renderiza PDF", async () => {
    const pdfBuffer = Buffer.from("dashboard-pdf");

    (DashboardService.getDashboardData as jest.Mock).mockResolvedValue({
      dados: {
        indicadores: {
          totalAtendimentos: 10,
          novosNoMes: 2,
          inseridosPAEFI: 1,
          reincidentes: 0,
          recebemBolsaFamilia: 3,
          recebemBPC: 1,
          violenciaConfirmada: 4,
          notificadosSINAN: 2,
          contextoFamiliar: {},
        },
        principais: {
          moradiaPrincipal: "CASA",
          escolaridadePrincipal: "EJA",
          violenciaPrincipal: "FISICA",
          localPrincipal: "Centro",
        },
        graficos: {
          casosPorBairro: [],
          tiposViolacao: [],
          encaminhamentosTop5: [],
          casosPorSexo: [],
          canalDenuncia: [],
          casosPorCor: [],
          casosPorFaixaEtaria: [],
        },
      },
      opcoesFiltro: {
        meses: ["2026-03"],
        tecnicos: ["Ana"],
        bairros: ["Centro"],
      },
    });
    (renderDashboardReportPdf as jest.Mock).mockResolvedValue(pdfBuffer);

    const result = await RelatoriosService.generateDashboardReport({
      filters: { mes: "2026-03", tec_ref: "Ana", bairro: "Centro" },
      accessScope: { whereClause: "casos.unit_id", params: [42] },
      requestedBy: {
        id: 1,
        username: "tester",
        role: "tecnico_superior",
        unit_id: 42,
        role_id: 1,
        permissions: [],
      },
    });

    expect(DashboardService.getDashboardData).toHaveBeenCalledWith({
      accessScope: { whereClause: "casos.unit_id", params: [42] },
      mes: "2026-03",
      tec_ref: "Ana",
      bairro: "Centro",
    });
    expect(renderDashboardReportPdf).toHaveBeenCalledTimes(1);
    expect(result).toBe(pdfBuffer);
  });
});
