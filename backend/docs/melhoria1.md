# Melhoria 1 — Query Builder Centralizado (Plano Detalhado)

> **Referência:** `docs/plano-de-melhorias.md` — Melhoria #1  
> **Objetivo:** Eliminar a montagem manual de queries SQL com placeholders, concatenação de `WHERE` e resolução de `accessFilter` espalhada por toda a codebase.  
> **Piloto:** Endpoint `/dashboard` (`src/routes/dashboard.ts`)

---

## Visão Geral do Plano

| Etapa | Descrição                                                     | Tipo          | Testes |
| ----- | ------------------------------------------------------------- | ------------- | ------ |
| **1** | Criar a classe `QueryBuilder` em `src/utils/query-builder.ts` | Implementação | ✅ Sim |
| **2** | Refatorar `dashboard.ts` usando `QueryBuilder` (piloto)       | Substituição  | ❌ Não |

---

## Etapa 1 — Criar a classe `QueryBuilder` com testes

### 1.1 — Criar o arquivo `src/utils/query-builder.ts`

A classe deve encapsular toda a lógica de montagem de queries que hoje está espalhada. Baseado na análise da codebase atual, ela precisa lidar com:

**Responsabilidades:**

| Método                              | O que resolve                                                                                              |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `addParam(value)`                   | Gerenciamento automático de placeholders `$1, $2, ...$N`                                                   |
| `where(clause)`                     | Adiciona cláusula WHERE fixa (sem parâmetro)                                                               |
| `whereIf(condition, clauseFactory)` | Adiciona WHERE condicional — só se o valor existir (não `null`, `undefined`, `""`)                         |
| `whereILike(condition, column)`     | Atalho para `WHERE column ILIKE '%valor%'` condicional                                                     |
| `applyAccessFilter(accessFilter)`   | Resolve automaticamente o `accessFilter` do middleware de unidade (`$X → $N`, inclui `OR unit_id IS NULL`) |
| `order(clause)`                     | Adiciona `ORDER BY`                                                                                        |
| `limit(limit, offset)`              | Adiciona `LIMIT $N OFFSET $N` com placeholders seguros                                                     |
| `build()`                           | Retorna `[sqlString, params[]]` pronto para `pool.query()`                                                 |
| `getCurrentParamIndex()`            | Retorna o índice atual do próximo placeholder (útil para queries compostas)                                |
| `getWhere()`                        | Retorna apenas a parte `WHERE ...` montada (para queries que usam `AND` em vez de `WHERE`)                 |

**Formato do `accessFilter` (vindo do `unitAccessMiddleware`):**

```typescript
// Gestor (sem filtro):
{ whereClause: 'TRUE', params: [] }

// Usuário comum (filtrado por unidade):
{ whereClause: 'casos.unit_id', params: [42] }
// O middleware retorna apenas o NOME DA COLUNA no whereClause.
// As rotas fazem manualmente: `${whereClause} = $N` com o param.
```

> ⚠️ **Atenção:** O `plano-de-melhorias.md` descreve o `accessFilter` usando `$X/$Y`, mas o middleware atual (`unitAccessMiddleware`) retorna apenas o nome da coluna (ex: `casos.unit_id`) e um array de params. O `QueryBuilder.applyAccessFilter()` deve tratar **ambos** os formatos para ser robusto, mas priorizar o formato real atual.

**Implementação proposta:**

```typescript
// src/utils/query-builder.ts

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

  /** Adiciona WHERE apenas se o valor existir (não null/undefined/'') */
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
   * Formato atual do middleware:
   *   - whereClause: 'TRUE' (gestor) ou 'casos.unit_id' (nome da coluna)
   *   - params: [] (gestor) ou [unitId] (filtrado)
   *
   * O método monta: `(coluna = $N OR tabela.unit_id IS NULL)`
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
      // É apenas o nome da coluna — montar a comparação
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

  /** Retorna a cláusula AND (para queries que já tem um WHERE fixo) */
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
```

### 1.2 — Criar testes em `tests/query-builder.test.ts`

Testes unitários puros (sem banco, sem mocks pesados). Cobrir todos os métodos:

| #   | Caso de Teste                                | O que valida                                                                                                                     |
| --- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `build()` sem filtros                        | Retorna a query base sem WHERE, params vazio                                                                                     |
| 2   | `where()` com cláusula fixa                  | Adiciona WHERE simples                                                                                                           |
| 3   | `where()` múltiplas cláusulas                | Junta com AND                                                                                                                    |
| 4   | `whereIf()` com valor válido                 | Adiciona cláusula e parâmetro                                                                                                    |
| 5   | `whereIf()` com `null`                       | Ignora cláusula                                                                                                                  |
| 6   | `whereIf()` com `undefined`                  | Ignora cláusula                                                                                                                  |
| 7   | `whereIf()` com string vazia `""`            | Ignora cláusula                                                                                                                  |
| 8   | `whereIf()` com valor `0` (zero)             | **Adiciona** cláusula (zero é válido)                                                                                            |
| 9   | `whereILike()` com valor válido              | Adiciona `ILIKE` com `%valor%`                                                                                                   |
| 10  | `whereILike()` com `null`                    | Ignora cláusula                                                                                                                  |
| 11  | `applyAccessFilter()` com gestor (`TRUE`)    | Não adiciona nenhuma cláusula                                                                                                    |
| 12  | `applyAccessFilter()` formato atual (coluna) | Monta `(coluna = $N OR tabela.unit_id IS NULL)`                                                                                  |
| 13  | `applyAccessFilter()` formato legado (`$X`)  | Resolve `$X` para `$N` corretamente                                                                                              |
| 14  | `order()`                                    | Adiciona ORDER BY                                                                                                                |
| 15  | `limit()`                                    | Adiciona LIMIT/OFFSET com placeholders                                                                                           |
| 16  | **Integração: cenário completo**             | Múltiplos `whereIf` + `applyAccessFilter` + `order` + `limit` — valida que os placeholders `$1..$N` estão sequenciais e corretos |
| 17  | `getWhereClause()`                           | Retorna `WHERE ...` quando há cláusulas                                                                                          |
| 18  | `getWhereClause()` sem filtros               | Retorna string vazia                                                                                                             |
| 19  | `getAndClause()`                             | Retorna `AND ...` quando há cláusulas                                                                                            |
| 20  | `getAndClause()` sem filtros                 | Retorna string vazia                                                                                                             |
| 21  | `addParam()` manual                          | Retorna placeholder correto e incrementa índice                                                                                  |
| 22  | `build()` limpa espaços múltiplos            | SQL resultante não tem `\n` ou espaços duplos                                                                                    |

**Comando para executar:**

```bash
npx jest tests/query-builder.test.ts
```

### 1.3 — Critério de aceitação da Etapa 1

- [x] Arquivo `src/utils/query-builder.ts` criado
- [x] Arquivo `tests/query-builder.test.ts` criado
- [x] **Todos os 22 testes passando** ✅
- [x] Nenhum arquivo existente foi alterado

---

## Etapa 2 — Piloto: Refatorar `dashboard.ts` com o `QueryBuilder`

### 2.1 — Contexto do arquivo atual

O arquivo `src/routes/dashboard.ts` atualmente tem **213 linhas** e contém:

1. **`buildFullWhereClauseContent()`** (linhas 17-68) — Função de 50 linhas que:

   - Monta cláusulas WHERE para `mes`, `tec_ref`, `bairro`
   - Resolve `$X/$Y` do `accessFilter` manualmente
   - Adiciona `OR casos.unit_id IS NULL`
   - Gerencia `paramIndex` manualmente

2. **Rota `GET /`** (linhas 83-210) — Handler de 130 linhas que:
   - Chama `buildFullWhereClauseContent()`
   - Monta `whereClause` e `andClause` separadamente
   - Executa **23 queries** em paralelo usando `Promise.all`
   - Usa `cleanSqlString()` em cada query (importada de `sqlUtils`)

### 2.2 — Tarefas de substituição

#### Tarefa 2.1 — Eliminar `buildFullWhereClauseContent` e usar `QueryBuilder`

**O que fazer:**

- Remover a função `buildFullWhereClauseContent` inteira (linhas 17-68)
- Na rota `GET /`, criar uma instância de `QueryBuilder` que substitua toda a lógica de filtros
- Adicionar import do `QueryBuilder`

**Antes:**

```typescript
const [whereContent, params] = buildFullWhereClauseContent(
  { mes, tec_ref, bairro },
  accessFilter,
  1
);
const whereClause = whereContent.length > 0 ? ` WHERE ${whereContent}` : "";
const andClause = whereContent.length > 0 ? ` AND ${whereContent}` : "";
```

**Depois:**

```typescript
const qb = new QueryBuilder("SELECT") // base descartável, usamos apenas getters
  .whereIf(mes, (ph) => `TO_CHAR(casos.data_cad, 'YYYY-MM') = ${ph}`)
  .whereIf(tec_ref, (ph) => `casos.tec_ref ILIKE ${ph}`)
  .whereIf(
    bairro,
    (ph) => `LOWER(casos.dados_completos->>'bairro') = LOWER(${ph})`
  )
  .applyAccessFilter(accessFilter);

const whereClause = qb.getWhereClause() ? ` ${qb.getWhereClause()}` : "";
const andClause = qb.getAndClause() ? ` ${qb.getAndClause()}` : "";
const params = qb.getParams();
```

> **Nota:** O `dashboard.ts` usa um padrão especial onde **todas as 23 queries compartilham os mesmos `params`**, mas algumas usam `WHERE` e outras usam `AND` (porque já têm um `WHERE` fixo na query). O `QueryBuilder` suporta isso via `getWhereClause()` e `getAndClause()`.

#### Tarefa 2.2 — Remover `cleanSqlString` das queries

**O que fazer:**

- O `build()` do `QueryBuilder` já faz `.replace(/\s+/g, ' ').trim()` internamente
- Para as queries que usam `whereClause`/`andClause` diretamente (sem `build()`), manter o `cleanSqlString` nessas queries OU aplicar limpeza ao montar o `whereClause`/`andClause`
- Nesse caso, como o dashboard usa o padrão de queries com `whereClause` interpolado, manter o `cleanSqlString` nas queries individuais por segurança

> **Decisão:** Manter `cleanSqlString` no dashboard por enquanto (já importada de `sqlUtils`). A remoção total será feita quando cada query tiver seu próprio `QueryBuilder`.

#### Tarefa 2.3 — Remover funções auxiliares locais que ficam obsoletas

**O que fazer:**

- Remover `buildFullWhereClauseContent` (substituída pelo `QueryBuilder`)
- Manter `appendNonNullFilter` e `getGroupedFieldName` (são helpers de formatação SQL, não de montagem de WHERE)

### 2.3 — Critério de aceitação da Etapa 2

- [x] Função `buildFullWhereClauseContent` removida do `dashboard.ts`
- [x] Import de `QueryBuilder` adicionado
- [x] As 23 queries do dashboard continuam usando `whereClause` e `andClause` da mesma forma (via getters do QB)
- [x] Os mesmos filtros (`mes`, `tec_ref`, `bairro`) continuam funcionando
- [x] O `accessFilter` é aplicado corretamente (incluindo `OR unit_id IS NULL`)
- [ ] Testar manualmente a rota `GET /dashboard` com e sem filtros _(requer servidor rodando)_
- [ ] Testar com usuário gestor (sem filtro de unidade) e usuário comum (com filtro) _(requer servidor rodando)_

---

## Resumo de Arquivos

| Arquivo                       | Ação                                                                      | Status                               |
| ----------------------------- | ------------------------------------------------------------------------- | ------------------------------------ |
| `src/utils/query-builder.ts`  | 🆕 Criar                                                                  | ✅ Concluído                         |
| `tests/query-builder.test.ts` | 🆕 Criar                                                                  | ✅ Concluído (23/23 testes passando) |
| `src/routes/dashboard.ts`     | ✏️ Refatorar (remover `buildFullWhereClauseContent`, usar `QueryBuilder`) | ✅ Concluído                         |

---

## Próximos Passos (fora deste plano)

Após validar o piloto no `dashboard.ts`, aplicar o mesmo padrão nos demais arquivos, cada um como uma tarefa independente (conforme `plano-de-melhorias.md`):

| #   | Arquivo                                   | O que eliminar                                             |
| --- | ----------------------------------------- | ---------------------------------------------------------- |
| 3   | `src/routes/vigilancia.ts`                | Eliminar `buildFilterClause` + resolução manual de `$X/$Y` |
| 4   | `src/routes/casos/casos.controller.ts`    | Eliminar montagem manual de WHERE (150+ linhas)            |
| 5   | `src/routes/demandas.ts`                  | Simplificar montagem de queries                            |
| 6   | `src/routes/relatorios.ts`                | Simplificar resolução de `accessFilter`                    |
| 7   | `src/routes/cras.ts`                      | Simplificar resolução de `accessFilter`                    |
| 8   | `src/routes/anexos.ts`                    | Simplificar `checkAnexoAccess`                             |
| 9   | `src/middleware/caseAccess.middleware.ts` | Simplificar resolução de `accessFilter`                    |
| 10  | `src/routes/users/middleware.ts`          | Simplificar resolução de `accessFilter`                    |
| 11  | `src/routes/mse.routes.ts`                | Simplificar montagem de queries                            |

---

_Documento criado em: Fevereiro/2026_
