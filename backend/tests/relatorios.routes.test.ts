import express from "express";
import request from "supertest";

import relatoriosRouter from "../src/routes/relatorios";
import { RelatorioValidationError } from "../src/routes/relatorios/relatorios.contract";

jest.mock("../src/middleware/auth/auth", () => {
  return {
    __esModule: true,
    authMiddleware: (req: any, _res: any, next: any) => {
      req.user = { id: 1, username: "tester", role: "tecnico_superior", unit_id: 42, permissions: [], role_id: 1 };
      next();
    },
  };
});

jest.mock("../src/middleware/unitAccess.middleware", () => {
  return {
    __esModule: true,
    unitAccessMiddleware: () => (req: any, _res: any, next: any) => {
      req.accessFilter = { whereClause: "casos.unit_id", params: [42] };
      next();
    },
  };
});

jest.mock("../src/routes/relatorios/relatorios.service", () => {
  return {
    __esModule: true,
    RelatoriosService: {
      generateGeneralReport: jest.fn(),
      generateDashboardReport: jest.fn(),
    },
  };
});

import { RelatoriosService } from "../src/routes/relatorios/relatorios.service";

function binaryParser(res: any, callback: (err: Error | null, body: Buffer) => void) {
  const chunks: Buffer[] = [];
  res.on("data", (chunk: Buffer) => chunks.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
}

describe("Rotas /api/relatorios", () => {
  const makeApp = () => {
    const app = express();
    app.use(express.json());
    app.use("/api/relatorios", relatoriosRouter);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("POST /api/relatorios/geral chama RelatoriosService.generateGeneralReport com input normalizado", async () => {
    (RelatoriosService.generateGeneralReport as jest.Mock).mockResolvedValue(Buffer.from("pdf"));

    const app = makeApp();
    const res = await request(app)
      .post("/api/relatorios/geral")
      .set("Authorization", "Bearer x")
      .buffer(true)
      .parse(binaryParser)
      .send({ startDate: "2026-03-01", endDate: "2026-03-31" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toContain("attachment; filename=relatorio-geral-");
    expect(res.body).toBeInstanceOf(Buffer);
    expect((RelatoriosService.generateGeneralReport as jest.Mock).mock.calls[0][0]).toEqual({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      accessScope: { whereClause: "casos.unit_id", params: [42] },
      requestedBy: { id: 1, username: "tester", role: "tecnico_superior", unit_id: 42, permissions: [], role_id: 1 },
    });
  });

  it("POST /api/relatorios/geral retorna 404 quando o service não encontra casos", async () => {
    (RelatoriosService.generateGeneralReport as jest.Mock).mockResolvedValue(null);

    const app = makeApp();
    const res = await request(app)
      .post("/api/relatorios/geral")
      .set("Authorization", "Bearer x")
      .send({ startDate: "2026-03-01", endDate: "2026-03-31" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Nenhum caso encontrado no período selecionado para sua unidade." });
  });

  it("POST /api/relatorios/geral retorna 400 para payload inválido", async () => {
    const app = makeApp();
    const res = await request(app)
      .post("/api/relatorios/geral")
      .set("Authorization", "Bearer x")
      .send({ startDate: "2026-03-31", endDate: "2026-03-01" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "startDate não pode ser maior que endDate." });
    expect(RelatoriosService.generateGeneralReport).not.toHaveBeenCalled();
  });

  it("POST /api/relatorios/geral propaga falha de validação do service", async () => {
    (RelatoriosService.generateGeneralReport as jest.Mock).mockRejectedValue(
      new RelatorioValidationError("Relatório inválido.", 422)
    );

    const app = makeApp();
    const res = await request(app)
      .post("/api/relatorios/geral")
      .set("Authorization", "Bearer x")
      .send({ startDate: "2026-03-01", endDate: "2026-03-31" });

    expect(res.status).toBe(422);
    expect(res.body).toEqual({ message: "Relatório inválido." });
  });

  it("GET /api/relatorios/dashboard chama RelatoriosService.generateDashboardReport com filtros da query", async () => {
    (RelatoriosService.generateDashboardReport as jest.Mock).mockResolvedValue(Buffer.from("dashboard-pdf"));

    const app = makeApp();
    const res = await request(app)
      .get("/api/relatorios/dashboard?mes=2026-03&tec_ref=Ana&bairro=Centro")
      .set("Authorization", "Bearer x")
      .buffer(true)
      .parse(binaryParser);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toContain("attachment; filename=relatorio-dashboard-");
    expect((RelatoriosService.generateDashboardReport as jest.Mock).mock.calls[0][0]).toEqual({
      filters: { mes: "2026-03", tec_ref: "Ana", bairro: "Centro" },
      accessScope: { whereClause: "casos.unit_id", params: [42] },
      requestedBy: { id: 1, username: "tester", role: "tecnico_superior", unit_id: 42, permissions: [], role_id: 1 },
    });
  });

  it("GET /api/relatorios/dashboard retorna 400 para mes inválido", async () => {
    const app = makeApp();
    const res = await request(app)
      .get("/api/relatorios/dashboard?mes=03-2026")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "mes deve estar no formato YYYY-MM." });
    expect(RelatoriosService.generateDashboardReport).not.toHaveBeenCalled();
  });
});
