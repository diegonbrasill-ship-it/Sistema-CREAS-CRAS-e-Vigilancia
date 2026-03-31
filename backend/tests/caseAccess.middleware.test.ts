import pool from "../src/db";
import { checkItemAccessByParentCase } from "../src/middleware/caseAccess.middleware";

jest.mock("../src/db", () => {
  return {
    __esModule: true,
    default: {
      query: jest.fn(),
    },
  };
});

function makeResponse() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("checkItemAccessByParentCase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("busca caso_id no schema real antes de validar acesso por unidade", async () => {
    (pool.query as unknown as jest.Mock)
      .mockResolvedValueOnce({
        rows: [{ casoId: 123 }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ id: 123 }],
        rowCount: 1,
      });

    const req: any = {
      params: { id: "9" },
      accessFilter: { whereClause: "casos.unit_id", params: [42] },
    };
    const res = makeResponse();
    const next = jest.fn();

    await checkItemAccessByParentCase("id", "encaminhamentos")(req, res as any, next);

    const [lookupSql, lookupParams] = (pool.query as unknown as jest.Mock).mock.calls[0];
    expect(lookupSql).toContain('SELECT caso_id AS "casoId" FROM encaminhamentos WHERE id = $1 AND deleted_at IS NULL');
    expect(lookupParams).toEqual([9]);

    const [checkSql, checkParams] = (pool.query as unknown as jest.Mock).mock.calls[1];
    expect(checkSql).toContain("SELECT id FROM casos WHERE id = $1::INTEGER AND deleted_at IS NULL AND casos.unit_id = $2");
    expect(checkParams).toEqual([123, 42]);

    expect(req.casoId).toBe(123);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("libera gestor com accessFilter TRUE sem exigir params de unidade", async () => {
    (pool.query as unknown as jest.Mock).mockResolvedValueOnce({
      rows: [{ casoId: 555 }],
      rowCount: 1,
    });

    const req: any = {
      params: { id: "12" },
      accessFilter: { whereClause: "TRUE", params: [] },
    };
    const res = makeResponse();
    const next = jest.fn();

    await checkItemAccessByParentCase("id", "encaminhamentos")(req, res as any, next);

    expect((pool.query as unknown as jest.Mock).mock.calls).toHaveLength(1);
    const [lookupSql, lookupParams] = (pool.query as unknown as jest.Mock).mock.calls[0];
    expect(lookupSql).toContain('SELECT caso_id AS "casoId" FROM encaminhamentos WHERE id = $1 AND deleted_at IS NULL');
    expect(lookupParams).toEqual([12]);

    expect(req.casoId).toBe(555);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
