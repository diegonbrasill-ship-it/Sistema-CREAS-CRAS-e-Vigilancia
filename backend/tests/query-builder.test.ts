// filepath: tests/query-builder.test.ts

import { QueryBuilder } from "../src/utils/query-builder";

describe("QueryBuilder", () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. build() sem filtros
  // ─────────────────────────────────────────────────────────────────────────────
  it("1 - build() sem filtros retorna a query base sem WHERE e params vazio", () => {
    const qb = new QueryBuilder("SELECT * FROM casos");
    const [sql, params] = qb.build();
    expect(sql).toBe("SELECT * FROM casos");
    expect(params).toEqual([]);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. where() com cláusula fixa
  // ─────────────────────────────────────────────────────────────────────────────
  it("2 - where() adiciona WHERE simples", () => {
    const [sql, params] = new QueryBuilder("SELECT * FROM casos")
      .where("casos.ativo = TRUE")
      .build();
    expect(sql).toBe("SELECT * FROM casos WHERE casos.ativo = TRUE");
    expect(params).toEqual([]);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. where() múltiplas cláusulas junta com AND
  // ─────────────────────────────────────────────────────────────────────────────
  it("3 - where() múltiplas cláusulas junta com AND", () => {
    const [sql] = new QueryBuilder("SELECT * FROM casos")
      .where("casos.ativo = TRUE")
      .where("casos.arquivado = FALSE")
      .build();
    expect(sql).toBe(
      "SELECT * FROM casos WHERE casos.ativo = TRUE AND casos.arquivado = FALSE"
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. whereIf() com valor válido
  // ─────────────────────────────────────────────────────────────────────────────
  it("4 - whereIf() com valor válido adiciona cláusula e parâmetro", () => {
    const [sql, params] = new QueryBuilder("SELECT * FROM casos")
      .whereIf("2024-01", (ph) => `TO_CHAR(casos.data_cad, 'YYYY-MM') = ${ph}`)
      .build();
    expect(sql).toBe(
      "SELECT * FROM casos WHERE TO_CHAR(casos.data_cad, 'YYYY-MM') = $1"
    );
    expect(params).toEqual(["2024-01"]);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. whereIf() com null — ignora
  // ─────────────────────────────────────────────────────────────────────────────
  it("5 - whereIf() com null ignora a cláusula", () => {
    const [sql, params] = new QueryBuilder("SELECT * FROM casos")
      .whereIf(null, (ph) => `casos.tec_ref = ${ph}`)
      .build();
    expect(sql).toBe("SELECT * FROM casos");
    expect(params).toEqual([]);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. whereIf() com undefined — ignora
  // ─────────────────────────────────────────────────────────────────────────────
  it("6 - whereIf() com undefined ignora a cláusula", () => {
    const [sql, params] = new QueryBuilder("SELECT * FROM casos")
      .whereIf(undefined, (ph) => `casos.tec_ref = ${ph}`)
      .build();
    expect(sql).toBe("SELECT * FROM casos");
    expect(params).toEqual([]);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. whereIf() com string vazia — ignora
  // ─────────────────────────────────────────────────────────────────────────────
  it('7 - whereIf() com string vazia "" ignora a cláusula', () => {
    const [sql, params] = new QueryBuilder("SELECT * FROM casos")
      .whereIf("", (ph) => `casos.tec_ref = ${ph}`)
      .build();
    expect(sql).toBe("SELECT * FROM casos");
    expect(params).toEqual([]);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. whereIf() com valor 0 (zero) — ADICIONA (zero é válido)
  // ─────────────────────────────────────────────────────────────────────────────
  it("8 - whereIf() com valor 0 (zero) ADICIONA a cláusula", () => {
    const [sql, params] = new QueryBuilder("SELECT * FROM casos")
      .whereIf(0, (ph) => `casos.status = ${ph}`)
      .build();
    expect(sql).toBe("SELECT * FROM casos WHERE casos.status = $1");
    expect(params).toEqual([0]);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. whereILike() com valor válido
  // ─────────────────────────────────────────────────────────────────────────────
  it("9 - whereILike() com valor válido adiciona ILIKE com %valor%", () => {
    const [sql, params] = new QueryBuilder("SELECT * FROM casos")
      .whereILike("maria", "casos.nome")
      .build();
    expect(sql).toBe("SELECT * FROM casos WHERE casos.nome ILIKE $1");
    expect(params).toEqual(["%maria%"]);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. whereILike() com null — ignora
  // ─────────────────────────────────────────────────────────────────────────────
  it("10 - whereILike() com null ignora a cláusula", () => {
    const [sql, params] = new QueryBuilder("SELECT * FROM casos")
      .whereILike(null, "casos.nome")
      .build();
    expect(sql).toBe("SELECT * FROM casos");
    expect(params).toEqual([]);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. applyAccessFilter() com gestor (TRUE) — não adiciona nenhuma cláusula
  // ─────────────────────────────────────────────────────────────────────────────
  it("11 - applyAccessFilter() com gestor (TRUE) não adiciona cláusula", () => {
    const [sql, params] = new QueryBuilder("SELECT * FROM casos")
      .applyAccessFilter({ whereClause: "TRUE", params: [] })
      .build();
    expect(sql).toBe("SELECT * FROM casos");
    expect(params).toEqual([]);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. applyAccessFilter() formato atual (apenas nome da coluna)
  // ─────────────────────────────────────────────────────────────────────────────
  it("12 - applyAccessFilter() formato atual monta (coluna = $N OR tabela.unit_id IS NULL)", () => {
    const [sql, params] = new QueryBuilder("SELECT * FROM casos")
      .applyAccessFilter({ whereClause: "casos.unit_id", params: [42] })
      .build();
    expect(sql).toBe(
      "SELECT * FROM casos WHERE (casos.unit_id = $1 OR casos.unit_id IS NULL)"
    );
    expect(params).toEqual([42]);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 13. applyAccessFilter() formato legado ($X) — resolve para $N
  // ─────────────────────────────────────────────────────────────────────────────
  it("13 - applyAccessFilter() formato legado ($X) resolve placeholder para $N", () => {
    const [sql, params] = new QueryBuilder("SELECT * FROM casos")
      .applyAccessFilter({
        whereClause: "casos.unit_id = $X",
        params: [99],
      })
      .build();
    expect(sql).toBe(
      "SELECT * FROM casos WHERE (casos.unit_id = $1 OR casos.unit_id IS NULL)"
    );
    expect(params).toEqual([99]);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 14. order()
  // ─────────────────────────────────────────────────────────────────────────────
  it("14 - order() adiciona ORDER BY", () => {
    const [sql] = new QueryBuilder("SELECT * FROM casos")
      .order("casos.data_cad DESC")
      .build();
    expect(sql).toBe("SELECT * FROM casos ORDER BY casos.data_cad DESC");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 15. limit()
  // ─────────────────────────────────────────────────────────────────────────────
  it("15 - limit() adiciona LIMIT/OFFSET com placeholders seguros", () => {
    const [sql, params] = new QueryBuilder("SELECT * FROM casos")
      .limit(10, 20)
      .build();
    expect(sql).toBe("SELECT * FROM casos LIMIT $1 OFFSET $2");
    expect(params).toEqual([10, 20]);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 16. Integração: cenário completo — placeholders $1..$N sequenciais
  // ─────────────────────────────────────────────────────────────────────────────
  it("16 - Integração: múltiplos whereIf + applyAccessFilter + order + limit com placeholders sequenciais", () => {
    const [sql, params] = new QueryBuilder("SELECT * FROM casos")
      .whereIf("2024-01", (ph) => `TO_CHAR(casos.data_cad, 'YYYY-MM') = ${ph}`)
      .whereIf("João", (ph) => `casos.tec_ref ILIKE ${ph}`)
      .applyAccessFilter({ whereClause: "casos.unit_id", params: [5] })
      .order("casos.data_cad DESC")
      .limit(10, 0)
      .build();

    expect(sql).toBe(
      "SELECT * FROM casos" +
        " WHERE TO_CHAR(casos.data_cad, 'YYYY-MM') = $1" +
        " AND casos.tec_ref ILIKE $2" +
        " AND (casos.unit_id = $3 OR casos.unit_id IS NULL)" +
        " ORDER BY casos.data_cad DESC" +
        " LIMIT $4 OFFSET $5"
    );
    expect(params).toEqual(["2024-01", "João", 5, 10, 0]);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 17. getWhereClause() com cláusulas
  // ─────────────────────────────────────────────────────────────────────────────
  it("17 - getWhereClause() retorna WHERE ... quando há cláusulas", () => {
    const qb = new QueryBuilder("SELECT * FROM casos").whereIf(
      "abc",
      (ph) => `casos.tec_ref = ${ph}`
    );
    expect(qb.getWhereClause()).toBe("WHERE casos.tec_ref = $1");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 18. getWhereClause() sem filtros
  // ─────────────────────────────────────────────────────────────────────────────
  it("18 - getWhereClause() sem filtros retorna string vazia", () => {
    const qb = new QueryBuilder("SELECT * FROM casos");
    expect(qb.getWhereClause()).toBe("");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 19. getAndClause() com cláusulas
  // ─────────────────────────────────────────────────────────────────────────────
  it("19 - getAndClause() retorna AND ... quando há cláusulas", () => {
    const qb = new QueryBuilder("SELECT * FROM casos").whereIf(
      "abc",
      (ph) => `casos.tec_ref = ${ph}`
    );
    expect(qb.getAndClause()).toBe("AND casos.tec_ref = $1");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 20. getAndClause() sem filtros
  // ─────────────────────────────────────────────────────────────────────────────
  it("20 - getAndClause() sem filtros retorna string vazia", () => {
    const qb = new QueryBuilder("SELECT * FROM casos");
    expect(qb.getAndClause()).toBe("");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 21. addParam() manual
  // ─────────────────────────────────────────────────────────────────────────────
  it("21 - addParam() retorna placeholder correto e incrementa índice", () => {
    const qb = new QueryBuilder("SELECT * FROM casos");
    expect(qb.getCurrentParamIndex()).toBe(1);
    const ph1 = qb.addParam("valor1");
    expect(ph1).toBe("$1");
    expect(qb.getCurrentParamIndex()).toBe(2);
    const ph2 = qb.addParam("valor2");
    expect(ph2).toBe("$2");
    expect(qb.getCurrentParamIndex()).toBe(3);
    expect(qb.getParams()).toEqual(["valor1", "valor2"]);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 22. build() limpa espaços múltiplos e newlines
  // ─────────────────────────────────────────────────────────────────────────────
  it("22 - build() limpa espaços múltiplos e newlines do SQL resultante", () => {
    const [sql] = new QueryBuilder(
      `SELECT   *
       FROM   casos`
    ).build();
    expect(sql).toBe("SELECT * FROM casos");
    expect(sql).not.toMatch(/\n/);
    expect(sql).not.toMatch(/  /);
  });
});
