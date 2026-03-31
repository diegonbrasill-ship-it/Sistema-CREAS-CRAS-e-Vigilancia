import {
  parseRelatorioDashboardInput,
  parseRelatorioGeralInput,
  RelatorioValidationError,
} from "../src/routes/relatorios/relatorios.contract";

describe("relatorios.contract", () => {
  const accessScope = { whereClause: "casos.unit_id", params: [42] as (string | number)[] };
  const requestedBy = {
    id: 1,
    username: "tester",
    role: "tecnico_superior",
    unit_id: 42,
    role_id: 9,
    permissions: ["screen.relatorios.access"],
  };

  it("parseRelatorioGeralInput normaliza o payload válido", () => {
    const parsed = parseRelatorioGeralInput(
      { startDate: "2026-03-01", endDate: "2026-03-31" },
      accessScope,
      requestedBy
    );

    expect(parsed).toEqual({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      accessScope,
      requestedBy,
    });
  });

  it("parseRelatorioGeralInput rejeita body que não é objeto", () => {
    expect(() => parseRelatorioGeralInput(null, accessScope, requestedBy)).toThrow(RelatorioValidationError);
    expect(() => parseRelatorioGeralInput(null, accessScope, requestedBy)).toThrow(
      "Body da requisição deve ser um objeto."
    );
  });

  it("parseRelatorioGeralInput rejeita datas fora do formato", () => {
    expect(() =>
      parseRelatorioGeralInput({ startDate: "01/03/2026", endDate: "2026-03-31" }, accessScope, requestedBy)
    ).toThrow("startDate deve estar no formato YYYY-MM-DD.");
  });

  it("parseRelatorioGeralInput rejeita intervalo invertido", () => {
    expect(() =>
      parseRelatorioGeralInput({ startDate: "2026-03-31", endDate: "2026-03-01" }, accessScope, requestedBy)
    ).toThrow("startDate não pode ser maior que endDate.");
  });

  it("parseRelatorioGeralInput exige accessScope e usuário autenticado", () => {
    expect(() =>
      parseRelatorioGeralInput({ startDate: "2026-03-01", endDate: "2026-03-31" }, undefined, requestedBy)
    ).toThrow("Escopo de acesso do relatório é obrigatório.");

    expect(() =>
      parseRelatorioGeralInput({ startDate: "2026-03-01", endDate: "2026-03-31" }, accessScope, undefined)
    ).toThrow("Usuário autenticado é obrigatório.");
  });

  it("parseRelatorioDashboardInput normaliza filtros opcionais da query", () => {
    const parsed = parseRelatorioDashboardInput(
      { mes: "2026-03", tec_ref: " Ana ", bairro: " Centro " },
      accessScope,
      requestedBy
    );

    expect(parsed).toEqual({
      filters: {
        mes: "2026-03",
        tec_ref: "Ana",
        bairro: "Centro",
      },
      accessScope,
      requestedBy,
    });
  });

  it("parseRelatorioDashboardInput rejeita mes inválido", () => {
    expect(() =>
      parseRelatorioDashboardInput({ mes: "03/2026" }, accessScope, requestedBy)
    ).toThrow("mes deve estar no formato YYYY-MM.");
  });
});
