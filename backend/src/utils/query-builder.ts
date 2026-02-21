// filepath: src/utils/query-builder.ts

/**
 * QueryBuilder — Centraliza a montagem de queries SQL com placeholders seguros.
 *
 * Elimina a necessidade de gerenciar índices de parâmetros ($1, $2...) manualmente
 * e resolve automaticamente o accessFilter do unitAccessMiddleware.
 */
export class QueryBuilder {
  private baseQuery: string;
  private whereClauses: string[] = [];
  private params: any[] = [];
  private orderByClause: string = "";
  private limitOffsetClause: string = "";

  constructor(baseSelect: string) {
    this.baseQuery = baseSelect;
  }

  /** Adiciona um parâmetro e retorna o placeholder $N */
  addParam(value: any): string {
    this.params.push(value);
    return `$${this.params.length}`;
  }

  /** Retorna o índice que o próximo parâmetro teria */
  getCurrentParamIndex(): number {
    return this.params.length + 1;
  }

  /** Adiciona uma cláusula WHERE fixa (sem parâmetro) */
  where(clause: string): this {
    this.whereClauses.push(clause);
    return this;
  }

  /**
   * Adiciona WHERE apenas se o valor existir (não null/undefined/'').
   * Atenção: o valor 0 (zero numérico) é considerado válido.
   */
  whereIf(
    condition: any,
    clauseFactory: (placeholder: string) => string
  ): this {
    if (condition !== undefined && condition !== null && condition !== "") {
      const ph = this.addParam(condition);
      this.whereClauses.push(clauseFactory(ph));
    }
    return this;
  }

  /** Adiciona WHERE com ILIKE apenas se o valor existir */
  whereILike(condition: any, column: string): this {
    if (condition !== undefined && condition !== null && condition !== "") {
      const ph = this.addParam(`%${condition}%`);
      this.whereClauses.push(`${column} ILIKE ${ph}`);
    }
    return this;
  }

  /**
   * Injeta o accessFilter do unitAccessMiddleware.
   *
   * Formatos suportados:
   *   - Gestor: { whereClause: 'TRUE', params: [] } → nenhuma cláusula adicionada
   *   - Atual:  { whereClause: 'casos.unit_id', params: [42] } → apenas nome da coluna
   *   - Legado: { whereClause: 'casos.unit_id = $X', params: [42] } → com placeholder $X/$Y
   *
   * Sempre monta: `(coluna = $N OR tabela.unit_id IS NULL)`
   */
  applyAccessFilter(accessFilter: {
    whereClause: string;
    params: any[];
  }): this {
    if (accessFilter.whereClause === "TRUE") return this;

    let unitWhere = accessFilter.whereClause;

    // Formato atual: whereClause é apenas o nome da coluna (ex: "casos.unit_id")
    // Precisamos montar: "casos.unit_id = $N"
    if (!unitWhere.includes("$") && !unitWhere.includes("=")) {
      const ph = this.addParam(accessFilter.params[0]);
      unitWhere = `${unitWhere} = ${ph}`;
    } else {
      // Formato legado com $X/$Y — resolver os placeholders
      for (const param of accessFilter.params) {
        const ph = this.addParam(param);
        unitWhere = unitWhere.replace(/\$[XY]/, ph);
      }
    }

    // Inclui casos do Gestor Principal (unit_id IS NULL)
    // Extrai o prefixo da tabela (ex: "casos" de "casos.unit_id")
    const columnRef = accessFilter.whereClause;
    const tablePrefixMatch = columnRef.match(/^(\w+)\./);
    const nullCheck = tablePrefixMatch
      ? `${tablePrefixMatch[1]}.unit_id IS NULL`
      : "unit_id IS NULL";

    this.whereClauses.push(`(${unitWhere} OR ${nullCheck})`);
    return this;
  }

  /** Adiciona ORDER BY */
  order(clause: string): this {
    this.orderByClause = `ORDER BY ${clause}`;
    return this;
  }

  /** Adiciona LIMIT e OFFSET com placeholders seguros */
  limit(limit: number, offset: number): this {
    const phLimit = this.addParam(limit);
    const phOffset = this.addParam(offset);
    this.limitOffsetClause = `LIMIT ${phLimit} OFFSET ${phOffset}`;
    return this;
  }

  /** Retorna apenas o conteúdo do WHERE (sem a palavra "WHERE") */
  getWhereContent(): string {
    if (this.whereClauses.length === 0) return "";
    return this.whereClauses.join(" AND ");
  }

  /** Retorna a cláusula WHERE completa (com "WHERE") ou string vazia */
  getWhereClause(): string {
    if (this.whereClauses.length === 0) return "";
    return `WHERE ${this.whereClauses.join(" AND ")}`;
  }

  /** Retorna a cláusula AND (para queries que já têm um WHERE fixo) */
  getAndClause(): string {
    if (this.whereClauses.length === 0) return "";
    return `AND ${this.whereClauses.join(" AND ")}`;
  }

  /** Retorna os parâmetros acumulados */
  getParams(): any[] {
    return [...this.params];
  }

  /** Retorna [queryString, params] pronto para pool.query() */
  build(): [string, any[]] {
    let sql = this.baseQuery;
    if (this.whereClauses.length > 0) {
      sql += ` WHERE ${this.whereClauses.join(" AND ")}`;
    }
    if (this.orderByClause) sql += ` ${this.orderByClause}`;
    if (this.limitOffsetClause) sql += ` ${this.limitOffsetClause}`;
    return [sql.replace(/\s+/g, " ").trim(), [...this.params]];
  }
}
