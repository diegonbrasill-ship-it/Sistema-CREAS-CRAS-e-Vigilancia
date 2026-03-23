import pool from "../src/db";
import { CasosService } from "../src/routes/casos/casos.service";
import { CasoValidationError } from "../src/routes/casos/casos.contract";

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

describe("CasosService (queries)", () => {
  it("sanity: suite carregada", () => {
    expect(true).toBe(true);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("list() deve aplicar accessScope sem unit_id IS NULL, filtro whitelisted e ordenação segura", async () => {
    (pool.query as unknown as jest.Mock).mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });

    const rows = await CasosService.list({
      accessScope: { whereClause: "casos.unit_id", params: [42] },
      status: "Ativo",
      search: "maria",
      searchBy: "q",
      mes: "2024-01",
      sortBy: "data_cad",
      sortOrder: "desc",
      filters: { bairro: "Centro" },
    });

    expect(pool.query).toHaveBeenCalledTimes(1);
    const [sql, params] = (pool.query as unknown as jest.Mock).mock.calls[0];

    expect(sql).toContain("FROM casos");
    expect(sql).toContain("deleted_at IS NULL");
    expect(sql).toContain("status = $1");
    expect(sql).toContain("TO_CHAR(data_cad, 'YYYY-MM') = $2");
    expect(sql).toContain("nome ILIKE $3");
    expect(sql).toContain("LOWER(dados_completos->>'bairro') = LOWER($7::TEXT)");
    expect(sql).toContain("(casos.unit_id = $8)");
    expect(sql).toContain("ORDER BY data_cad DESC");
    expect(sql).not.toContain("casos.unit_id IS NULL");
    expect(params).toEqual(["Ativo", "2024-01", "%maria%", "%maria%", "%maria%", "%maria%", "Centro", 42]);
    expect(rows).toEqual([{ id: 1 }]);
  });

  it("list() deve tratar faixaEtariaVitima sem quebrar cast de idade inválida", async () => {
    (pool.query as unknown as jest.Mock).mockResolvedValue({ rows: [{ id: 2 }], rowCount: 1 });

    await CasosService.list({
      accessScope: { whereClause: "casos.unit_id", params: [5] },
      status: "todos",
      sortBy: "nome",
      sortOrder: "asc",
      filters: { faixaEtariaVitima: "Adolescente (12-17)" },
    });

    const [sql, params] = (pool.query as unknown as jest.Mock).mock.calls[0];
    expect(sql).toContain("COALESCE(dados_completos->>'idade', '') ~ '^[0-9]+$'");
    expect(sql).toContain("END = $1::TEXT");
    expect(sql).toContain("(casos.unit_id = $2)");
    expect(sql).toContain("ORDER BY nome ASC");
    expect(params).toEqual(["Adolescente (12-17)", 5]);
  });

  it("getFast() deve limitar a 10 e filtrar status Ativo + accessFilter sem unit_id IS NULL", async () => {
    (pool.query as unknown as jest.Mock).mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });

    const rows = await CasosService.getFast({
      accessFilter: { whereClause: "casos.unit_id", params: [5] },
      q: "maria",
    });

    const [sql, params] = (pool.query as unknown as jest.Mock).mock.calls[0];

    expect(sql).toContain("FROM casos");
    expect(sql).toContain("status = 'Ativo'");
    expect(sql).toContain("deleted_at IS NULL");
    expect(sql).toContain("LIMIT $");
    expect(sql).toContain("OFFSET $");
    expect(sql).toContain("(casos.unit_id = $");
    expect(sql).not.toContain("OR casos.unit_id IS NULL");

    // primeiros params são os wheres da busca, depois unit_id, depois limit/offset
    expect(params).toContain(5);
    expect(params).toContain(10);
    expect(params).toContain(0);
    expect(rows).toEqual([{ id: 1 }]);
  });

  it("getEncaminhamentos() deve mapear alias para c.unit_id no accessFilter", async () => {
    (pool.query as unknown as jest.Mock).mockResolvedValue({ rows: [{ id: 9 }], rowCount: 1 });

    const rows = await CasosService.getEncaminhamentos({
      casoId: "123",
      accessFilter: { whereClause: "casos.unit_id", params: [7] },
    });

    const [sql, params] = (pool.query as unknown as jest.Mock).mock.calls[0];

    expect(sql).toContain("LEFT JOIN casos c");
    expect(sql).toContain("c.deleted_at IS NULL");
    expect(sql).toContain("enc.caso_id = $1");
    expect(sql).toContain("(c.unit_id = $2 OR c.unit_id IS NULL)");
    expect(params).toEqual(["123", 7]);
    expect(rows).toEqual([{ id: 9 }]);
  });

  it("getCasoById() deve aplicar accessFilter e devolver dados_completos canônicos", async () => {
    (pool.query as unknown as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            data_cad: "2026-03-23",
            tec_ref: "tester",
            nome: "Maria",
            status: "Ativo",
            unit_id: 42,
            dados_completos: {
              tipo_violencia: "FISICA",
              canalOrigem: "DISQUE_100_180",
              notificacaoSINAM: "Não",
            },
          },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ id: 99, tipo_documento: "Relatorio" }],
        rowCount: 1,
      });

    const result = await CasosService.getCasoById({
      id: "10",
      accessFilter: { whereClause: "casos.unit_id", params: [42] },
    });

    const [sql, params] = (pool.query as unknown as jest.Mock).mock.calls[0];
    expect(sql).toContain("FROM casos");
    expect(sql).toContain("deleted_at IS NULL");
    expect(sql).toContain("id = $1::INTEGER");
    expect(sql).toContain("(casos.unit_id = $2)");
    expect(params).toEqual(["10", 42]);
    expect(result).toMatchObject({
      id: 10,
      nome: "Maria",
      unit_id: 42,
      dados_completos: {
        tipoViolencia: "FISICA",
        canalDenuncia: "DISQUE_100_180",
        notificacaoSINAN: "Não",
        nome: "Maria",
      },
      demandas_vinculadas: [{ id: 99, tipo_documento: "Relatorio" }],
      demandasVinculadas: [{ id: 99, tipo_documento: "Relatorio" }],
    });
  });

  it("createCaso() deve usar admin.unit_id e normalizar o payload de cadastro", async () => {
    (pool.query as unknown as jest.Mock).mockResolvedValueOnce({
      rows: [{ id: 7, nome: "Maria", unit_id: 42 }],
      rowCount: 1,
    });

    const created = await CasosService.createCaso(
      {
        data_cad: "2026-03-23",
        tec_ref: " Tecnica ",
        dados_completos_payload: {
          nome: " Maria ",
          tipo_violencia: "FISICA",
          tipoViolenciaDescricoes: ["SOCOS", "SOCOS", "CHUTES"],
          canalOrigem: "OUTROS",
          especificacaoOutroCanal: " CRAS ",
          racaCor: "BRANCA",
          vinculoAgressor: "PAI",
          formaOcupacao: "ALUGADA",
          valorAluguel: 200,
        },
      },
      { id: 1, username: "tester", role: "tecnico_superior", unit_id: 42, permissions: [], role_id: 1 }
    );

    expect(pool.query).toHaveBeenCalledTimes(1);
    const [sql, params] = (pool.query as unknown as jest.Mock).mock.calls[0];

    expect(sql).toContain("INSERT INTO casos");
    expect(params[0]).toBe("Maria");
    expect(params[1]).toBe("2026-03-23");
    expect(params[2]).toBe("Tecnica");
    expect(params[3]).toBe("Ativo");
    expect(params[4]).toBe(42);

    const parsedPayload = JSON.parse(params[6]);
    expect(parsedPayload.tipoViolencia).toBe("FISICA");
    expect(parsedPayload.tipoViolenciaDescricoes).toEqual(["ESPANCAMENTO", "CHUTES"]);
    expect(parsedPayload.canalDenuncia).toBe("OUTROS");
    expect(parsedPayload.especificacaoOutroCanal).toBe("CRAS");
    expect(created).toMatchObject({ id: 7, nome: "Maria", unit_id: 42 });
  });

  it("createCaso() deve rejeitar enum inválido antes de consultar o banco", async () => {
    await expect(
      CasosService.createCaso(
        {
          dados_completos_payload: {
            tipoViolencia: "INVALIDO",
            tipoViolenciaDescricoes: ["CHUTES"],
          },
        },
        { id: 1, username: "tester", role: "tecnico_superior", unit_id: 42, permissions: [], role_id: 1 }
      )
    ).rejects.toBeInstanceOf(CasoValidationError);

    expect(pool.query).not.toHaveBeenCalled();
  });

  it("updateCaso() deve fazer merge parcial apenas em dados_completos_payload", async () => {
    (pool.query as unknown as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            data_cad: "2026-03-20",
            tec_ref: "Antiga",
            nome: "Maria",
            dados_completos: {
              nome: "Maria",
              tipoViolencia: "FISICA",
              tipoViolenciaDescricoes: ["CHUTES"],
              bairro: "Centro",
              racaCor: "BRANCA",
            },
          },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            data_cad: "2026-03-23",
            tec_ref: "Nova Tec",
            nome: "Maria",
            dados_completos: {
              nome: "Maria",
              tipoViolencia: "FISICA",
              tipoViolenciaDescricoes: ["CHUTES"],
              bairro: "Jatobá",
              racaCor: "BRANCA",
            },
          },
        ],
        rowCount: 1,
      });

    const updated = await CasosService.updateCaso(
      "10",
      {
        data_cad: "2026-03-23",
        tec_ref: " Nova Tec ",
        dados_completos_payload: {
          bairro: " Jatobá ",
        },
      },
      { id: 1, username: "tester", role: "tecnico_superior", unit_id: 42, permissions: [], role_id: 1 }
    );

    expect(pool.query).toHaveBeenCalledTimes(2);
    const [sql, params] = (pool.query as unknown as jest.Mock).mock.calls[1];
    expect(sql).toContain("UPDATE casos SET");
    expect(sql).toContain("RETURNING *");
    expect(params[0]).toBe("2026-03-23");
    expect(params[1]).toBe("Nova Tec");
    expect(params[2]).toBe("Maria");

    const mergedPayload = JSON.parse(params[3]);
    expect(mergedPayload).toMatchObject({
      nome: "Maria",
      tipoViolencia: "FISICA",
      tipoViolenciaDescricoes: ["CHUTES"],
      bairro: "Jatobá",
      racaCor: "BRANCA",
    });
    expect(mergedPayload.data_cad).toBeUndefined();
    expect(mergedPayload.tec_ref).toBeUndefined();
    expect(updated).toMatchObject({
      id: 10,
      tec_ref: "Nova Tec",
      dados_completos: {
        nome: "Maria",
        bairro: "Jatobá",
        tipoViolencia: "FISICA",
      },
    });
  });

  it("patchStatus() deve atualizar apenas o status e retornar payload resumido", async () => {
    (pool.query as unknown as jest.Mock).mockResolvedValue({
      rows: [{ id: 10, status: "Arquivado", nome: "Maria" }],
      rowCount: 1,
    });

    const result = await CasosService.patchStatus(
      "10",
      "Arquivado",
      { id: 1, username: "tester", role: "tecnico_superior", unit_id: 42, permissions: [], role_id: 1 }
    );

    const [sql, params] = (pool.query as unknown as jest.Mock).mock.calls[0];
    expect(sql).toContain("UPDATE casos SET status = $1");
    expect(sql).toContain("deleted_at IS NULL");
    expect(params).toEqual(["Arquivado", "10"]);
    expect(result).toEqual({ id: 10, status: "Arquivado" });
  });

  it("deleteCaso() deve fazer soft delete e retornar payload resumido", async () => {
    (pool.query as unknown as jest.Mock).mockResolvedValue({
      rows: [{ id: 10, nome: "Maria" }],
      rowCount: 1,
    });

    const result = await CasosService.deleteCaso(
      "10",
      { id: 1, username: "tester", role: "tecnico_superior", unit_id: 42, permissions: [], role_id: 1 }
    );

    const [sql, params] = (pool.query as unknown as jest.Mock).mock.calls[0];
    expect(sql).toContain("UPDATE casos SET deleted_at = CURRENT_TIMESTAMP");
    expect(sql).toContain("deleted_at IS NULL");
    expect(params).toEqual(["10"]);
    expect(result).toEqual({ id: 10, deleted: true });
  });
});
