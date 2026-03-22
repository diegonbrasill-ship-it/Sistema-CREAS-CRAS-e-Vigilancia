import express from "express";
import request from "supertest";

import casosRouter from "../src/routes/casos";

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
  };
});

jest.mock("../src/routes/casos/casos.service", () => {
  return {
    __esModule: true,
    CasosService: {
      createCaso: jest.fn(),
      list: jest.fn(),
      getFast: jest.fn(),
      getEncaminhamentos: jest.fn(),
    },
  };
});

jest.mock("../src/routes/casos/casos.middleware", () => {
  return {
    __esModule: true,
    anonimizarDadosSeNecessario: (_user: any, data: any) => data,
  };
});

import { CasosService } from "../src/routes/casos/casos.service";

describe("Rotas /api/casos", () => {
  it("sanity: suite carregada", () => {
    expect(true).toBe(true);
  });

  const makeApp = () => {
    const app = express();
    app.use(express.json());
    app.use("/api/casos", casosRouter);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/casos chama CasosService.list com accessFilter e querystring", async () => {
    (CasosService.list as jest.Mock).mockResolvedValue([{ id: 1 }]);

    const app = makeApp();
    const res = await request(app)
      .get("/api/casos?status=Ativo&mes=2024-01")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);
    expect(CasosService.list).toHaveBeenCalledTimes(1);

    const arg = (CasosService.list as jest.Mock).mock.calls[0][0];
    expect(arg.accessFilter).toEqual({ whereClause: "casos.unit_id", params: [42] });
    expect(arg.status).toBe("Ativo");
    expect(arg.mes).toBe("2024-01");
  });

  it("GET /api/casos/busca-rapida chama CasosService.getFast", async () => {
    (CasosService.getFast as jest.Mock).mockResolvedValue([{ id: 10 }]);

    const app = makeApp();
    const res = await request(app)
      .get("/api/casos/busca-rapida?q=maria")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);
    expect(CasosService.getFast).toHaveBeenCalledTimes(1);
    expect((CasosService.getFast as jest.Mock).mock.calls[0][0]).toEqual({
      accessFilter: { whereClause: "casos.unit_id", params: [42] },
      q: "maria",
    });
  });

  it("GET /api/casos/:casoId/encaminhamentos chama CasosService.getEncaminhamentos", async () => {
    (CasosService.getEncaminhamentos as jest.Mock).mockResolvedValue([{ id: 99 }]);

    const app = makeApp();
    const res = await request(app)
      .get("/api/casos/123/encaminhamentos")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);
    expect(CasosService.getEncaminhamentos).toHaveBeenCalledTimes(1);
    expect((CasosService.getEncaminhamentos as jest.Mock).mock.calls[0][0]).toEqual({
      casoId: "123",
      accessFilter: { whereClause: "casos.unit_id", params: [42] },
    });
  });

  it("POST /api/casos chama CasosService.createCaso com body e req.user", async () => {
    (CasosService.createCaso as jest.Mock).mockResolvedValue({ id: 7 });

    const app = makeApp();
    const res = await request(app)
      .post("/api/casos")
      .send({ nome: "X", tec_ref: "Y" })
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(201);
    expect(CasosService.createCaso).toHaveBeenCalledTimes(1);

    const [bodyArg, userArg] = (CasosService.createCaso as jest.Mock).mock.calls[0];
    expect(bodyArg).toEqual({ nome: "X", tec_ref: "Y" });
    expect(userArg).toMatchObject({ id: 1, username: "tester", unit_id: 42 });
  });
});
