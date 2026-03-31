import express from "express";
import request from "supertest";

import pool from "../src/db";
import encaminhamentosRouter from "../src/routes/encaminhamentos";
import { logAction } from "../src/services/logger";

jest.mock("../src/db", () => {
  return {
    __esModule: true,
    default: {
      query: jest.fn(),
    },
  };
});

jest.mock("../src/services/logger", () => {
  return {
    __esModule: true,
    logAction: jest.fn(),
  };
});

jest.mock("../src/middleware/auth/auth", () => {
  return {
    __esModule: true,
    authMiddleware: (req: any, _res: any, next: any) => {
      req.user = { id: 1, username: "tester", role: "tecnico", unit_id: 42, permissions: [], role_id: 1 };
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

jest.mock("../src/middleware/caseAccess.middleware", () => {
  return {
    __esModule: true,
    checkCaseAccess: () => (_req: any, _res: any, next: any) => next(),
    checkItemAccessByParentCase: () => (req: any, _res: any, next: any) => {
      req.casoId = 123;
      next();
    },
  };
});

describe("Rotas /api/encaminhamentos", () => {
  const makeApp = () => {
    const app = express();
    app.use(express.json());
    app.use("/api/encaminhamentos", encaminhamentosRouter);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("POST /api/encaminhamentos insere usando colunas snake_case do schema", async () => {
    (pool.query as unknown as jest.Mock).mockResolvedValue({
      rows: [{ id: 7, servicoDestino: "CREAS" }],
      rowCount: 1,
    });

    const app = makeApp();
    const response = await request(app)
      .post("/api/encaminhamentos")
      .send({
        casoId: 123,
        servicoDestino: "CREAS",
        dataEncaminhamento: "2026-03-31",
        observacoes: "Primeiro contato",
      })
      .set("Authorization", "Bearer x");

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message: "Encaminhamento registrado com sucesso!",
      encaminhamento: { id: 7, servicoDestino: "CREAS" },
    });

    const [sql, params] = (pool.query as unknown as jest.Mock).mock.calls[0];
    expect(sql).toContain("INSERT INTO encaminhamentos");
    expect(sql).toContain("(caso_id, user_id, servico_destino, data_encaminhamento, observacoes)");
    expect(sql).toContain('RETURNING id, servico_destino AS "servicoDestino"');
    expect(params).toEqual([123, 1, "CREAS", "2026-03-31", "Primeiro contato"]);

    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CREATE_ENCAMINHAMENTO",
        details: expect.objectContaining({
          casoId: 123,
          encaminhamentoId: 7,
          servico: "CREAS",
        }),
      })
    );
  });

  it("PUT /api/encaminhamentos/:id atualiza usando data_retorno e aliases compatíveis", async () => {
    (pool.query as unknown as jest.Mock).mockResolvedValue({
      rows: [{ id: 9, casoId: 123, servicoDestino: "CRAS" }],
      rowCount: 1,
    });

    const app = makeApp();
    const response = await request(app)
      .put("/api/encaminhamentos/9")
      .send({
        status: "Concluido",
        dataRetorno: "2026-04-02",
      })
      .set("Authorization", "Bearer x");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Status do encaminhamento atualizado com sucesso!",
    });

    const [sql, params] = (pool.query as unknown as jest.Mock).mock.calls[0];
    expect(sql).toContain("UPDATE encaminhamentos");
    expect(sql).toContain("data_retorno = $2");
    expect(sql).toContain('RETURNING id, caso_id AS "casoId", servico_destino AS "servicoDestino"');
    expect(params).toEqual(["Concluido", "2026-04-02", "9"]);

    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATE_ENCAMINHAMENTO_STATUS",
        details: expect.objectContaining({
          casoId: 123,
          encaminhamentoId: 9,
          servico: "CRAS",
          novoStatus: "Concluido",
        }),
      })
    );
  });
});
