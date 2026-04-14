import express from "express";
import request from "supertest";

import casosRouter from "../src/routes/casos";
import { CasoValidationError } from "../src/routes/casos/casos.contract";
import { CASO_FORM_SCHEMA } from "../src/routes/casos/casos.form-schema";

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
      getCasoById: jest.fn(),
      updateCaso: jest.fn(),
      patchStatus: jest.fn(),
      deleteCaso: jest.fn(),
      getEncaminhamentos: jest.fn(),
    },
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

  it("GET /api/casos chama CasosService.list com accessScope e contrato novo de filtros", async () => {
    (CasosService.list as jest.Mock).mockResolvedValue([{ id: 1 }]);

    const app = makeApp();
    const res = await request(app)
      .get("/api/casos?status=Ativo&mes=2024-01&search=maria&searchBy=q&filters[bairro]=Centro")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);
    expect(CasosService.list).toHaveBeenCalledTimes(1);

    const arg = (CasosService.list as jest.Mock).mock.calls[0][0];
    expect(arg.accessScope).toEqual({ whereClause: "casos.unit_id", params: [42] });
    expect(arg.status).toBe("Ativo");
    expect(arg.mes).toBe("2024-01");
    expect(arg.search).toBe("maria");
    expect(arg.searchBy).toBe("q");
    expect(arg.filters).toEqual({ bairro: "Centro" });
  });

  it("GET /api/casos/schema retorna o schema declarativo alvo do formulário", async () => {
    const app = makeApp();
    const res = await request(app)
      .get("/api/casos/schema")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);
    expect(res.body.schemaKey).toBe("casos.form");
    expect(res.body.version).toBe(CASO_FORM_SCHEMA.version);
    expect(res.body.fields.some((current: any) => current.key === "tiposViolencia")).toBe(true);
    expect(res.body.fields.some((current: any) => current.key === "detalhesViolencia")).toBe(true);
    expect(res.body.groupedOptionSets.detalhes_violencia.FISICA.length).toBeGreaterThan(0);
    expect(CasosService.getCasoById).not.toHaveBeenCalled();
  });

  it("GET /api/casos converte formato legado filtro/valor para o mesmo shape interno", async () => {
    (CasosService.list as jest.Mock).mockResolvedValue([{ id: 1 }]);

    const app = makeApp();
    const res = await request(app)
      .get("/api/casos?filtro=por_bairro&valor=Centro")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);

    const arg = (CasosService.list as jest.Mock).mock.calls[0][0];
    expect(arg.search).toBeUndefined();
    expect(arg.filters).toEqual({ bairro: "Centro" });
  });

  it("GET /api/casos absorve aliases legados de drilldown nos filters[]", async () => {
    (CasosService.list as jest.Mock).mockResolvedValue([{ id: 1 }]);

    const app = makeApp();
    const res = await request(app)
      .get(
        "/api/casos?filters[por_bairro]=Centro&filters[por_canal]=OUTROS&filters[tipo_violencia]=FISICA&filters[corEtnia]=PARDA&filters[reincidentes]=Sim&filters[localOcorrencia]=Jatoba"
      )
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);

    const arg = (CasosService.list as jest.Mock).mock.calls[0][0];
    expect(arg.filters).toEqual({
      bairro: "Jatoba",
      canalDenuncia: "OUTROS",
      tipoViolencia: "FISICA",
      racaCor: "PARDA",
      reincidente: "Sim",
    });
  });

  it("GET /api/casos aceita q e local_ocorrencia como aliases persistentes do drilldown", async () => {
    (CasosService.list as jest.Mock).mockResolvedValue([{ id: 1 }]);

    const app = makeApp();
    const res = await request(app)
      .get("/api/casos?q=maria&local_ocorrencia=Centro")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);

    const arg = (CasosService.list as jest.Mock).mock.calls[0][0];
    expect(arg.search).toBe("maria");
    expect(arg.searchBy).toBe("q");
    expect(arg.filters).toEqual({ bairro: "Centro" });
  });

  it("GET /api/casos converte aliases legados filtro/valor de busca e drilldown", async () => {
    (CasosService.list as jest.Mock).mockResolvedValue([{ id: 1 }]);

    const app = makeApp();

    const byChannel = await request(app)
      .get("/api/casos?filtro=por_canal&valor=OUTROS")
      .set("Authorization", "Bearer x");

    expect(byChannel.status).toBe(200);
    let arg = (CasosService.list as jest.Mock).mock.calls[0][0];
    expect(arg.filters).toEqual({ canalDenuncia: "OUTROS" });

    const byTecRef = await request(app)
      .get("/api/casos?filtro=tecRef&valor=Ana")
      .set("Authorization", "Bearer x");

    expect(byTecRef.status).toBe(200);
    arg = (CasosService.list as jest.Mock).mock.calls[1][0];
    expect(arg.search).toBe("Ana");
    expect(arg.searchBy).toBe("tec_ref");
    expect(arg.filters).toEqual({});
  });

  it("GET /api/casos libera filtros canônicos usados pelos cards do dashboard", async () => {
    (CasosService.list as jest.Mock).mockResolvedValue([{ id: 1 }]);

    const app = makeApp();
    const res = await request(app)
      .get(
        "/api/casos?filters[inseridoPAEFI]=Sim&filters[recebePBF]=Sim&filters[notificacaoSINAN]=Sim&filters[vitimaPCD]=Sim&filters[membroCarcerario]=Sim"
      )
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);

    const arg = (CasosService.list as jest.Mock).mock.calls[0][0];
    expect(arg.filters).toEqual({
      inseridoPAEFI: "Sim",
      recebePBF: "Sim",
      notificacaoSINAN: "Sim",
      vitimaPCD: "Sim",
      membroCarcerario: "Sim",
    });
  });

  it("GET /api/casos retorna 400 para filtro não permitido", async () => {
    const app = makeApp();
    const res = await request(app)
      .get("/api/casos?filters[foo]=bar")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Filtro 'foo' não é permitido." });
    expect(CasosService.list).not.toHaveBeenCalled();
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

  it("GET /api/casos/busca-rapida retorna [] quando q tiver menos de 3 caracteres", async () => {
    const app = makeApp();
    const res = await request(app)
      .get("/api/casos/busca-rapida?q=ma")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(CasosService.getFast).not.toHaveBeenCalled();
  });

  it("GET /api/casos/:id chama CasosService.getCasoById com accessFilter", async () => {
    (CasosService.getCasoById as jest.Mock).mockResolvedValue({ id: 123 });

    const app = makeApp();
    const res = await request(app)
      .get("/api/casos/123")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);
    expect(CasosService.getCasoById).toHaveBeenCalledWith({
      id: "123",
      accessFilter: { whereClause: "casos.unit_id", params: [42] },
    });
  });

  it("PUT /api/casos/:id chama CasosService.updateCaso com payload parcial", async () => {
    (CasosService.updateCaso as jest.Mock).mockResolvedValue({ id: 123 });

    const app = makeApp();
    const res = await request(app)
      .put("/api/casos/123")
      .send({
        data_cad: "2026-03-23",
        dados_completos_payload: { bairro: "Centro" },
      })
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);
    expect(CasosService.updateCaso).toHaveBeenCalledWith(
      "123",
      {
        data_cad: "2026-03-23",
        dados_completos_payload: { bairro: "Centro" },
      },
      expect.objectContaining({ id: 1, unit_id: 42 })
    );
  });

  it("PATCH /api/casos/:id/status chama CasosService.patchStatus", async () => {
    (CasosService.patchStatus as jest.Mock).mockResolvedValue({ id: 123, status: "Arquivado" });

    const app = makeApp();
    const res = await request(app)
      .patch("/api/casos/123/status")
      .send({ status: "Arquivado" })
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);
    expect(CasosService.patchStatus).toHaveBeenCalledWith(
      "123",
      "Arquivado",
      expect.objectContaining({ id: 1, unit_id: 42 })
    );
  });

  it("DELETE /api/casos/:id chama CasosService.deleteCaso", async () => {
    (CasosService.deleteCaso as jest.Mock).mockResolvedValue({ id: 123, deleted: true });

    const app = makeApp();
    const res = await request(app)
      .delete("/api/casos/123")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);
    expect(CasosService.deleteCaso).toHaveBeenCalledWith(
      "123",
      expect.objectContaining({ id: 1, unit_id: 42 })
    );
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

  it("POST /api/casos retorna 400 quando o service rejeita o payload", async () => {
    (CasosService.createCaso as jest.Mock).mockRejectedValue(
      new CasoValidationError("tipoViolencia inválido.")
    );

    const app = makeApp();
    const res = await request(app)
      .post("/api/casos")
      .send({
        dados_completos_payload: {
          tipoViolencia: "INVALIDO",
          tipoViolenciaDescricoes: ["CHUTES"],
        },
      })
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "tipoViolencia inválido." });
  });
});
