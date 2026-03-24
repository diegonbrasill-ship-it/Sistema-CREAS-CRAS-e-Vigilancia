import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";

import pool from "../src/db";
import casosRouter from "../src/routes/casos";
import dashboardRouter from "../src/routes/dashboard";

type TestUser = {
  id: number;
  username: string;
  role: string;
  unit_id: number | null;
  role_id: number;
  permissions: string[];
};

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/casos", casosRouter);
  app.use("/api/dashboard", dashboardRouter);
  return app;
}

function makeToken(user: TestUser) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      unit_id: user.unit_id,
      role_id: user.role_id,
      permissions: user.permissions,
    },
    process.env.JWT_SECRET || "seu_segredo_padrao_para_testes",
    { expiresIn: "1h" }
  );
}

async function getRoleId(roleName: string) {
  const result = await pool.query<{ id: number }>("SELECT id FROM roles WHERE name = $1", [roleName]);
  if (result.rowCount !== 1) {
    throw new Error(`Role '${roleName}' não encontrada no banco de teste.`);
  }
  return result.rows[0].id;
}

async function createUser(input: {
  username: string;
  role: string;
  unit_id: number | null;
  nome_completo: string;
}) {
  const role_id = await getRoleId(input.role);
  const result = await pool.query<TestUser>(
    `
      INSERT INTO users (username, password_hash, nome_completo, cargo, role, is_active, unit_id, role_id)
      VALUES ($1, $2, $3, $4, $5, true, $6, $7)
      RETURNING id, username, role, unit_id, role_id
    `,
    [input.username, "hash-de-teste", input.nome_completo, "Tecnico", input.role, input.unit_id, role_id]
  );

  return {
    ...result.rows[0],
    permissions: [],
  } satisfies TestUser;
}

function buildCasoPayload(input: {
  nome: string;
  tec_ref: string;
  data_cad: string;
  status?: "Ativo" | "Desligado" | "Arquivado";
  bairro: string;
  tipoViolencia: "FISICA" | "PSICOLOGICA" | "SEXUAL" | "PATRIMONIAL" | "MORAL";
  idade: string;
  recebePBF?: "Sim" | "Não";
  notificacaoSINAN?: "Sim" | "Não";
}) {
  return {
    data_cad: input.data_cad,
    tec_ref: input.tec_ref,
    status: input.status,
    dados_completos_payload: {
      nome: input.nome,
      bairro: input.bairro,
      idade: input.idade,
      tipoViolencia: input.tipoViolencia,
      tipoViolenciaDescricoes: ["CHUTES"],
      canalDenuncia: "DEMANDA_ESPONTANEA",
      racaCor: "PARDA",
      recebePBF: input.recebePBF ?? "Não",
      notificacaoSINAN: input.notificacaoSINAN ?? "Não",
    },
  };
}

type DashboardCasoInput = {
  nome: string;
  data_cad: string;
  tec_ref: string;
  unit_id: number;
  user_id: number;
  status?: "Ativo" | "Desligado" | "Arquivado";
  bairro: string;
  tipoViolencia: "FISICA" | "PSICOLOGICA" | "SEXUAL" | "PATRIMONIAL" | "MORAL";
  idade: string;
  tipoResidencia?: string;
  escolaridade?: string;
  encaminhamentoDetalhe?: string;
  sexo?: string;
  canalDenuncia?: string;
  racaCor?: string;
  inseridoPAEFI?: "Sim" | "Não";
  reincidente?: "Sim" | "Não";
  recebePBF?: "Sim" | "Não";
  recebeBPC?: "Idoso" | "PCD" | "Não";
  confirmacaoViolencia?: "Confirmada" | "Em análise" | "Não confirmada";
  notificacaoSINAN?: "Sim" | "Não";
  dependeFinanceiro?: "Sim" | "Não";
  vitimaPCD?: "Sim" | "Não";
  membroCarcerario?: "Sim" | "Não";
  membroSocioeducacao?: "Sim" | "Não";
};

async function insertDashboardCaso(input: DashboardCasoInput) {
  const payload = {
    nome: input.nome,
    bairro: input.bairro,
    idade: input.idade,
    tipoViolencia: input.tipoViolencia,
    tipoViolenciaDescricoes: ["CHUTES"],
    tipoResidencia: input.tipoResidencia ?? "CASA",
    escolaridade: input.escolaridade ?? "EJA",
    encaminhamentoDetalhe: input.encaminhamentoDetalhe ?? "CREAS",
    sexo: input.sexo ?? "FEMININO",
    canalDenuncia: input.canalDenuncia ?? "DEMANDA_ESPONTANEA",
    racaCor: input.racaCor ?? "PARDA",
    inseridoPAEFI: input.inseridoPAEFI ?? "Não",
    reincidente: input.reincidente ?? "Não",
    recebePBF: input.recebePBF ?? "Não",
    recebeBPC: input.recebeBPC ?? "Não",
    confirmacaoViolencia: input.confirmacaoViolencia ?? "Não confirmada",
    notificacaoSINAN: input.notificacaoSINAN ?? "Não",
    dependeFinanceiro: input.dependeFinanceiro ?? "Não",
    vitimaPCD: input.vitimaPCD ?? "Não",
    membroCarcerario: input.membroCarcerario ?? "Não",
    membroSocioeducacao: input.membroSocioeducacao ?? "Não",
  };

  const result = await pool.query<{ id: number }>(
    `
      INSERT INTO casos (nome, data_cad, tec_ref, status, dados_completos, user_id, unit_id)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
      RETURNING id
    `,
    [
      input.nome,
      input.data_cad,
      input.tec_ref,
      input.status ?? "Ativo",
      JSON.stringify(payload),
      input.user_id,
      input.unit_id,
    ]
  );

  return result.rows[0].id;
}

function toYmd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftMonth(base: Date, monthOffset: number) {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + monthOffset, 15));
}

function chartToMap(items: Array<{ name: string; value: number }>) {
  return Object.fromEntries(items.map((item) => [item.name, item.value]));
}

describe("Integração HTTP /api/casos", () => {
  const app = makeApp();
  let tecnicoUnidade2: TestUser;
  let tecnicoUnidade3: TestUser;
  let gestor: TestUser;

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE logs, encaminhamentos, acompanhamentos, demandas, casos, users RESTART IDENTITY CASCADE");

    tecnicoUnidade2 = await createUser({
      username: "tecnico-u2",
      role: "tecnico_superior",
      unit_id: 2,
      nome_completo: "Tecnico Unidade 2",
    });
    tecnicoUnidade3 = await createUser({
      username: "tecnico-u3",
      role: "tecnico_superior",
      unit_id: 3,
      nome_completo: "Tecnico Unidade 3",
    });
    gestor = await createUser({
      username: "gestor-geral",
      role: "gestor",
      unit_id: null,
      nome_completo: "Gestor Geral",
    });
  });

  afterAll(async () => {
    await pool.query("TRUNCATE TABLE logs, encaminhamentos, acompanhamentos, demandas, casos, users RESTART IDENTITY CASCADE");
    await pool.end();
  });

  it("insere caso por HTTP com unit_id derivado do usuário autenticado e bloqueia criação para outra unidade", async () => {
    const token = makeToken(tecnicoUnidade2);

    const created = await request(app)
      .post("/api/casos")
      .set("Authorization", `Bearer ${token}`)
      .send(
        buildCasoPayload({
          nome: "Maria da Unidade 2",
          tec_ref: "Tecnica A",
          data_cad: "2026-03-10",
          bairro: "Centro",
          tipoViolencia: "FISICA",
          idade: "14",
          recebePBF: "Sim",
          notificacaoSINAN: "Sim",
        })
      );

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      nome: "Maria da Unidade 2",
      unit_id: 2,
      status: "Ativo",
    });

    const persisted = await pool.query<{ nome: string; unit_id: number }>(
      "SELECT nome, unit_id FROM casos WHERE id = $1",
      [created.body.id]
    );
    expect(persisted.rows).toEqual([{ nome: "Maria da Unidade 2", unit_id: 2 }]);

    const forbidden = await request(app)
      .post("/api/casos")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...buildCasoPayload({
          nome: "Caso Indevido",
          tec_ref: "Tecnica A",
          data_cad: "2026-03-11",
          bairro: "Centro",
          tipoViolencia: "FISICA",
          idade: "15",
        }),
        unit_id: 3,
      });

    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toEqual({ message: "Você só pode criar casos para a sua própria unidade." });

    const count = await pool.query<{ total: string }>("SELECT COUNT(*)::text AS total FROM casos");
    expect(count.rows[0].total).toBe("1");
  });

  it("aplica filtros reais na listagem e mantém o isolamento por unidade do usuário", async () => {
    const tokenU2 = makeToken(tecnicoUnidade2);
    const tokenU3 = makeToken(tecnicoUnidade3);

    await request(app)
      .post("/api/casos")
      .set("Authorization", `Bearer ${tokenU2}`)
      .send(
        buildCasoPayload({
          nome: "Maria Centro",
          tec_ref: "Tecnica U2",
          data_cad: "2026-03-15",
          bairro: "Centro",
          tipoViolencia: "FISICA",
          idade: "14",
          recebePBF: "Sim",
          notificacaoSINAN: "Sim",
        })
      );

    await request(app)
      .post("/api/casos")
      .set("Authorization", `Bearer ${tokenU2}`)
      .send(
        buildCasoPayload({
          nome: "Joana Jatobá",
          tec_ref: "Tecnica U2",
          data_cad: "2026-03-16",
          bairro: "Jatoba",
          tipoViolencia: "PSICOLOGICA",
          idade: "35",
        })
      );

    await request(app)
      .post("/api/casos")
      .set("Authorization", `Bearer ${tokenU3}`)
      .send(
        buildCasoPayload({
          nome: "Maria Outra Unidade",
          tec_ref: "Tecnica U3",
          data_cad: "2026-03-17",
          bairro: "Centro",
          tipoViolencia: "FISICA",
          idade: "14",
          recebePBF: "Sim",
          notificacaoSINAN: "Sim",
        })
      );

    const filtered = await request(app)
      .get("/api/casos")
      .set("Authorization", `Bearer ${tokenU2}`)
      .query({
        status: "Ativo",
        mes: "2026-03",
        search: "Maria",
        searchBy: "q",
        sortBy: "nome",
        sortOrder: "asc",
        "filters[bairro]": "Centro",
        "filters[tipoViolencia]": "FISICA",
        "filters[faixaEtariaVitima]": "Adolescente (12-17)",
        "filters[recebePBF]": "Sim",
        "filters[notificacaoSINAN]": "Sim",
      });

    expect(filtered.status).toBe(200);
    expect(filtered.body).toEqual([
      expect.objectContaining({
        nome: "Maria Centro",
        bairro: "Centro",
        status: "Ativo",
        unit_id: 2,
      }),
    ]);
  });

  it("permite que gestor veja casos de múltiplas unidades e combine filtros com status=todos", async () => {
    const tokenU2 = makeToken(tecnicoUnidade2);
    const tokenU3 = makeToken(tecnicoUnidade3);
    const gestorToken = makeToken(gestor);

    await request(app)
      .post("/api/casos")
      .set("Authorization", `Bearer ${tokenU2}`)
      .send(
        buildCasoPayload({
          nome: "Caso Centro U2",
          tec_ref: "Tecnica U2",
          data_cad: "2026-03-05",
          bairro: "Centro",
          tipoViolencia: "FISICA",
          idade: "14",
          status: "Arquivado",
        })
      );

    await request(app)
      .post("/api/casos")
      .set("Authorization", `Bearer ${tokenU3}`)
      .send(
        buildCasoPayload({
          nome: "Caso Centro U3",
          tec_ref: "Tecnica U3",
          data_cad: "2026-03-06",
          bairro: "Centro",
          tipoViolencia: "FISICA",
          idade: "16",
        })
      );

    const response = await request(app)
      .get("/api/casos")
      .set("Authorization", `Bearer ${gestorToken}`)
      .query({
        status: "todos",
        sortBy: "nome",
        sortOrder: "asc",
        "filters[bairro]": "Centro",
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.map((item: any) => item.nome)).toEqual(["Caso Centro U2", "Caso Centro U3"]);
    expect(response.body.map((item: any) => item.unit_id)).toEqual([2, 3]);
    expect(response.body.map((item: any) => item.status)).toEqual(["Arquivado", "Ativo"]);
  });

  it("bloqueia por HTTP o acesso ao detalhe de caso que pertence a outra unidade", async () => {
    const tokenU3 = makeToken(tecnicoUnidade3);
    const tokenU2 = makeToken(tecnicoUnidade2);

    const created = await request(app)
      .post("/api/casos")
      .set("Authorization", `Bearer ${tokenU3}`)
      .send(
        buildCasoPayload({
          nome: "Caso Restrito U3",
          tec_ref: "Tecnica U3",
          data_cad: "2026-03-20",
          bairro: "Centro",
          tipoViolencia: "FISICA",
          idade: "13",
        })
      );

    expect(created.status).toBe(201);

    const forbidden = await request(app)
      .get(`/api/casos/${created.body.id}`)
      .set("Authorization", `Bearer ${tokenU2}`);

    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toEqual({
      message: "Acesso Proibido. Você não tem permissão para interagir com este caso (Unit ID).",
    });
  });

  describe("GET /api/dashboard", () => {
    it("agrega corretamente os dados canônicos da unidade do usuário autenticado", async () => {
      const tokenU2 = makeToken(tecnicoUnidade2);
      const now = new Date();
      const currentMonthDate = toYmd(shiftMonth(now, 0));
      const previousMonthDate = toYmd(shiftMonth(now, -1));

      await insertDashboardCaso({
        nome: "Caso U2 Centro 1",
        data_cad: currentMonthDate,
        tec_ref: "Tecnica Ana",
        unit_id: 2,
        user_id: tecnicoUnidade2.id,
        bairro: "Centro",
        tipoViolencia: "FISICA",
        idade: "14",
        tipoResidencia: "CASA",
        escolaridade: "EJA",
        encaminhamentoDetalhe: "CREAS",
        sexo: "FEMININO",
        canalDenuncia: "DEMANDA_ESPONTANEA",
        racaCor: "PARDA",
        inseridoPAEFI: "Sim",
        reincidente: "Sim",
        recebePBF: "Sim",
        recebeBPC: "PCD",
        confirmacaoViolencia: "Confirmada",
        notificacaoSINAN: "Sim",
        dependeFinanceiro: "Sim",
        vitimaPCD: "Sim",
        membroSocioeducacao: "Sim",
      });

      await insertDashboardCaso({
        nome: "Caso U2 Centro 2",
        data_cad: currentMonthDate,
        tec_ref: "Tecnica Ana",
        unit_id: 2,
        user_id: tecnicoUnidade2.id,
        bairro: "Centro",
        tipoViolencia: "FISICA",
        idade: "35",
        tipoResidencia: "CASA",
        escolaridade: "EJA",
        encaminhamentoDetalhe: "CRAS",
        sexo: "FEMININO",
        canalDenuncia: "DISQUE_100_180",
        racaCor: "PARDA",
        recebePBF: "Não",
        recebeBPC: "Não",
        confirmacaoViolencia: "Não confirmada",
        notificacaoSINAN: "Não",
        dependeFinanceiro: "Não",
        vitimaPCD: "Não",
        membroCarcerario: "Sim",
        membroSocioeducacao: "Não",
      });

      await insertDashboardCaso({
        nome: "Caso U2 Jatoba",
        data_cad: previousMonthDate,
        tec_ref: "Tecnico Bruno",
        unit_id: 2,
        user_id: tecnicoUnidade2.id,
        bairro: "Jatoba",
        tipoViolencia: "PSICOLOGICA",
        idade: "65",
        tipoResidencia: "APARTAMENTO",
        escolaridade: "SUPERIOR_COMPLETO",
        encaminhamentoDetalhe: "CREAS",
        sexo: "MASCULINO",
        canalDenuncia: "DISQUE_100_180",
        racaCor: "BRANCA",
        inseridoPAEFI: "Sim",
        reincidente: "Não",
        recebePBF: "Sim",
        recebeBPC: "Idoso",
        confirmacaoViolencia: "Confirmada",
        notificacaoSINAN: "Sim",
        dependeFinanceiro: "Sim",
        vitimaPCD: "Não",
        membroCarcerario: "Não",
        membroSocioeducacao: "Não",
      });

      await insertDashboardCaso({
        nome: "Caso U3 Ignorado",
        data_cad: currentMonthDate,
        tec_ref: "Tecnica Ana",
        unit_id: 3,
        user_id: tecnicoUnidade3.id,
        bairro: "Centro",
        tipoViolencia: "MORAL",
        idade: "17",
        tipoResidencia: "CASA",
        escolaridade: "EJA",
        encaminhamentoDetalhe: "CREAS",
        sexo: "FEMININO",
        canalDenuncia: "DEMANDA_ESPONTANEA",
        racaCor: "PARDA",
        notificacaoSINAN: "Sim",
      });

      const response = await request(app)
        .get("/api/dashboard")
        .set("Authorization", `Bearer ${tokenU2}`);

      expect(response.status).toBe(200);
      expect(response.body.dados.indicadores).toMatchObject({
        totalAtendimentos: 3,
        novosNoMes: 2,
        inseridosPAEFI: 2,
        reincidentes: 1,
        recebemBolsaFamilia: 2,
        recebemBPC: 2,
        violenciaConfirmada: 2,
        notificadosSINAN: 2,
      });
      expect(response.body.dados.indicadores.contextoFamiliar).toEqual({
        dependenciaFinanceira: "2",
        vitimaPCD: "1",
        membroCarcerario: "1",
        membroSocioeducacao: "1",
      });

      expect(response.body.dados.principais).toEqual({
        moradiaPrincipal: "CASA",
        escolaridadePrincipal: "EJA",
        violenciaPrincipal: "FISICA",
        localPrincipal: "Centro",
      });

      expect(chartToMap(response.body.dados.graficos.casosPorBairro)).toEqual({
        Centro: 2,
        Jatoba: 1,
      });
      expect(chartToMap(response.body.dados.graficos.tiposViolacao)).toEqual({
        FISICA: 2,
        PSICOLOGICA: 1,
      });
      expect(chartToMap(response.body.dados.graficos.encaminhamentosTop5)).toEqual({
        CREAS: 2,
        CRAS: 1,
      });
      expect(chartToMap(response.body.dados.graficos.casosPorSexo)).toEqual({
        FEMININO: 2,
        MASCULINO: 1,
      });
      expect(chartToMap(response.body.dados.graficos.canalDenuncia)).toEqual({
        DISQUE_100_180: 2,
        DEMANDA_ESPONTANEA: 1,
      });
      expect(chartToMap(response.body.dados.graficos.casosPorCor)).toEqual({
        PARDA: 2,
        BRANCA: 1,
      });
      expect(chartToMap(response.body.dados.graficos.casosPorFaixaEtaria)).toEqual({
        "Adolescente (12-17)": 1,
        "Adulto (30-59)": 1,
        "Idoso (60+)": 1,
      });

      expect(response.body.opcoesFiltro.meses).toEqual([currentMonthDate.slice(0, 7), previousMonthDate.slice(0, 7)]);
      expect(response.body.opcoesFiltro.tecnicos).toEqual(["Tecnica Ana", "Tecnico Bruno"]);
      expect(response.body.opcoesFiltro.bairros).toEqual(["Centro", "Jatoba"]);
    });

    it("aplica os filtros de mes, tec_ref e bairro nas agregações do dashboard", async () => {
      const gestorToken = makeToken(gestor);
      const now = new Date();
      const currentMonthDate = toYmd(shiftMonth(now, 0));
      const previousMonthDate = toYmd(shiftMonth(now, -1));
      const currentMonth = currentMonthDate.slice(0, 7);

      await insertDashboardCaso({
        nome: "Caso Filtro U2 A",
        data_cad: currentMonthDate,
        tec_ref: "Tecnica Ana",
        unit_id: 2,
        user_id: tecnicoUnidade2.id,
        bairro: "Centro",
        tipoViolencia: "FISICA",
        idade: "12",
        tipoResidencia: "CASA",
        escolaridade: "EJA",
        encaminhamentoDetalhe: "CREAS",
        sexo: "FEMININO",
        canalDenuncia: "DEMANDA_ESPONTANEA",
        racaCor: "PARDA",
        inseridoPAEFI: "Sim",
        recebePBF: "Sim",
        confirmacaoViolencia: "Confirmada",
        notificacaoSINAN: "Sim",
      });

      await insertDashboardCaso({
        nome: "Caso Filtro U3 B",
        data_cad: currentMonthDate,
        tec_ref: "Tecnica Ana",
        unit_id: 3,
        user_id: tecnicoUnidade3.id,
        bairro: "Centro",
        tipoViolencia: "FISICA",
        idade: "17",
        tipoResidencia: "CASA",
        escolaridade: "EJA",
        encaminhamentoDetalhe: "CREAS",
        sexo: "FEMININO",
        canalDenuncia: "DISQUE_100_180",
        racaCor: "PARDA",
        inseridoPAEFI: "Sim",
        recebePBF: "Não",
        confirmacaoViolencia: "Confirmada",
        notificacaoSINAN: "Não",
      });

      await insertDashboardCaso({
        nome: "Caso Fora do Bairro",
        data_cad: currentMonthDate,
        tec_ref: "Tecnica Ana",
        unit_id: 2,
        user_id: tecnicoUnidade2.id,
        bairro: "Jatoba",
        tipoViolencia: "PSICOLOGICA",
        idade: "30",
      });

      await insertDashboardCaso({
        nome: "Caso Fora do Tecnico",
        data_cad: currentMonthDate,
        tec_ref: "Tecnico Bruno",
        unit_id: 2,
        user_id: tecnicoUnidade2.id,
        bairro: "Centro",
        tipoViolencia: "MORAL",
        idade: "40",
      });

      await insertDashboardCaso({
        nome: "Caso Fora do Mes",
        data_cad: previousMonthDate,
        tec_ref: "Tecnica Ana",
        unit_id: 2,
        user_id: tecnicoUnidade2.id,
        bairro: "Centro",
        tipoViolencia: "SEXUAL",
        idade: "22",
      });

      const response = await request(app)
        .get("/api/dashboard")
        .query({
          mes: currentMonth,
          tec_ref: "Tecnica Ana",
          bairro: "Centro",
        })
        .set("Authorization", `Bearer ${gestorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.dados.indicadores).toMatchObject({
        totalAtendimentos: 2,
        novosNoMes: 2,
        inseridosPAEFI: 2,
        recebemBolsaFamilia: 1,
        violenciaConfirmada: 2,
        notificadosSINAN: 1,
      });
      expect(response.body.dados.principais).toEqual({
        moradiaPrincipal: "CASA",
        escolaridadePrincipal: "EJA",
        violenciaPrincipal: "FISICA",
        localPrincipal: "Centro",
      });
      expect(chartToMap(response.body.dados.graficos.tiposViolacao)).toEqual({
        FISICA: 2,
      });
      expect(chartToMap(response.body.dados.graficos.canalDenuncia)).toEqual({
        DEMANDA_ESPONTANEA: 1,
        DISQUE_100_180: 1,
      });
      expect(response.body.opcoesFiltro.meses).toEqual([currentMonth]);
      expect(response.body.opcoesFiltro.tecnicos).toEqual(["Tecnica Ana"]);
      expect(response.body.opcoesFiltro.bairros).toEqual(["Centro"]);
    });
  });
});
