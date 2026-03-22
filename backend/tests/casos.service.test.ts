import pool from "../src/db";
import { CasosService } from "../src/routes/casos/casos.service";

jest.mock("../src/db", () => {
  return {
    __esModule: true,
    default: {
      query: jest.fn(),
    },
  };
});

describe("CasosService (queries)", () => {
  it("sanity: suite carregada", () => {
    expect(true).toBe(true);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("list() deve aplicar accessFilter (inclui unit_id IS NULL), status e order DESC", async () => {
    (pool.query as unknown as jest.Mock).mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });

    const rows = await CasosService.list({
      accessFilter: { whereClause: "casos.unit_id", params: [42] },
      status: "Ativo",
    });

    expect(pool.query).toHaveBeenCalledTimes(1);
    const [sql, params] = (pool.query as unknown as jest.Mock).mock.calls[0];

    expect(sql).toContain("FROM casos");
    expect(sql).toContain("status = $1");
    expect(sql).toContain("(casos.unit_id = $2 OR casos.unit_id IS NULL)");
    expect(sql).toContain("ORDER BY data_cad DESC");
    expect(params).toEqual(["Ativo", 42]);
    expect(rows).toEqual([{ id: 1 }]);
  });

  it("getFast() deve limitar a 10 e filtrar status Ativo + accessFilter", async () => {
    (pool.query as unknown as jest.Mock).mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });

    const rows = await CasosService.getFast({
      accessFilter: { whereClause: "casos.unit_id", params: [5] },
      q: "maria",
    });

    const [sql, params] = (pool.query as unknown as jest.Mock).mock.calls[0];

    expect(sql).toContain("FROM casos");
    expect(sql).toContain("status = 'Ativo'");
    expect(sql).toContain("LIMIT $");
    expect(sql).toContain("OFFSET $");
    expect(sql).toContain("(casos.unit_id = $");
    expect(sql).toContain("OR casos.unit_id IS NULL");

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
    expect(sql).toContain("enc.caso_id = $1");
    expect(sql).toContain("(c.unit_id = $2 OR c.unit_id IS NULL)");
    expect(params).toEqual(["123", 7]);
    expect(rows).toEqual([{ id: 9 }]);
  });
});
