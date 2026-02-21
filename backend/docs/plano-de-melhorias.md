# Plano de Melhorias — Sistema CREAS/CRAS (MVP)

> **Premissa:** Este é um MVP. O plano foca exclusivamente nas melhorias de maior retorno — aquelas que reduzem bugs, facilitam manutenção e eliminam a complexidade desnecessária que já causa dor hoje.

---

## Diagnóstico: Problemas Identificados

### 🔴 Problema Central: Lógica de banco espalhada, frágil e duplicada

| Sintoma                                                                                                         | Onde ocorre                                                                                                                              | Impacto                                                                                      |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `cleanSqlString()` copiada em **9 arquivos** diferentes                                                         | `casos.controller`, `demandas`, `acompanhamentos`, `encaminhamentos`, `anexos`, `dashboard`, `vigilancia`, `cras`, `mse.routes`          | Função idêntica duplicada por toda a codebase                                                |
| Montagem manual de `WHERE` com concatenação de strings e controle manual de `$1, $2, $N`                        | `casos.controller.ts` (linhas 50–170), `dashboard.ts`, `vigilancia.ts`, `demandas.ts`, `relatorios.ts`, `cras.ts`                        | **Fonte #1 de bugs** — erros de bind, SQL injection parcial, off-by-one nos placeholders     |
| Lógica de `accessFilter` (substituição de `$X`, `$Y` por `$N`) repetida manualmente em **cada rota**            | `casos.controller`, `demandas`, `anexos`, `relatorios`, `vigilancia`, `cras`, `caseAccess.middleware`                                    | 30+ ocorrências do mesmo padrão copy-paste; qualquer correção precisa ser replicada em todos |
| SQL inline nas rotas e controllers — sem camada de repositório                                                  | Todos os arquivos de rota                                                                                                                | Controller sabe detalhes de SQL, impossível testar lógica separada do banco                  |
| Schema do banco definido via `CREATE TABLE IF NOT EXISTS` no `db.ts` (240 linhas de DDL) — sem migrations reais | `src/db.ts`                                                                                                                              | Sem versionamento do schema, impossível evoluir o banco de forma segura                      |
| `buildFilterClause` / `buildFullWhereClauseContent` duplicadas com variações sutis                              | `dashboard.ts`, `vigilancia.ts`                                                                                                          | Mesma lógica com assinaturas diferentes; divergências silenciosas                            |
| Mistura de naming conventions: `camelCase` vs `snake_case` nas colunas                                          | `anexos` (`"nomeOriginal"`, `"casoId"`), `casos` (`data_cad`, `tec_ref`), `encaminhamentos` (`"servicoDestino"`, `"dataEncaminhamento"`) | Obriga uso de aspas duplas em toda query, aumenta chance de erro                             |
| `any` em todo lugar — sem tipagem nos dados que entram/saem do banco                                            | `casos.service.ts`, `users.service.ts`, controllers em geral                                                                             | Zero segurança de tipos; erros só aparecem em produção                                       |

---

## Plano de Ação (Ordenado por Retorno)

### 📌 Melhoria 1 — Query Builder Centralizado (ALTO IMPACTO / ESFORÇO MÉDIO)

**Problema:** A montagem manual de queries com placeholders `$1, $2... $N`, concatenação de `WHERE`, e a resolução de `accessFilter` (`$X → $N`) está espalhada por **todos** os arquivos de rota. Isso é a causa raiz da maioria dos bugs.

**Solução:** Criar uma classe `QueryBuilder` em `src/utils/query-builder.ts` que encapsule:

```typescript
// src/utils/query-builder.ts

export class QueryBuilder {
  private baseQuery: string;
  private whereClauses: string[] = [];
  private params: any[] = [];
  private orderBy: string = "";
  private limitOffset: string = "";

  constructor(baseSelect: string) {
    this.baseQuery = baseSelect;
  }

  /** Adiciona um parâmetro e retorna o placeholder $N */
  addParam(value: any): string {
    this.params.push(value);
    return `$${this.params.length}`;
  }

  /** Adiciona uma cláusula WHERE condicional */
  where(clause: string): this {
    this.whereClauses.push(clause);
    return this;
  }

  /** Adiciona WHERE apenas se o valor existir */
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
    if (condition) {
      const ph = this.addParam(`%${condition}%`);
      this.whereClauses.push(`${column} ILIKE ${ph}`);
    }
    return this;
  }

  /** Injeta o accessFilter do middleware de unidade */
  applyAccessFilter(accessFilter: {
    whereClause: string;
    params: any[];
  }): this {
    if (accessFilter.whereClause === "TRUE") return this;

    let unitWhere = accessFilter.whereClause;

    // Resolve placeholders $X, $Y automaticamente
    for (const param of accessFilter.params) {
      const ph = this.addParam(param);
      unitWhere = unitWhere.replace(/\$[XY]/, ph);
    }

    // Inclui casos do Gestor Principal (unit_id IS NULL)
    this.whereClauses.push(`(${unitWhere} OR casos.unit_id IS NULL)`);
    return this;
  }

  order(clause: string): this {
    this.orderBy = `ORDER BY ${clause}`;
    return this;
  }

  limit(limit: number, offset: number): this {
    const phLimit = this.addParam(limit);
    const phOffset = this.addParam(offset);
    this.limitOffset = `LIMIT ${phLimit} OFFSET ${phOffset}`;
    return this;
  }

  /** Retorna [queryString, params] pronto para pool.query() */
  build(): [string, any[]] {
    let sql = this.baseQuery;
    if (this.whereClauses.length > 0) {
      sql += ` WHERE ${this.whereClauses.join(" AND ")}`;
    }
    if (this.orderBy) sql += ` ${this.orderBy}`;
    if (this.limitOffset) sql += ` ${this.limitOffset}`;
    return [sql.replace(/\s+/g, " ").trim(), this.params];
  }
}
```

**Exemplo de uso — ANTES vs DEPOIS:**

```typescript
// ❌ ANTES (casos.controller.ts — 60+ linhas de montagem manual)
let query = CASOS_SQL.SELECT_BASE;
const params: any[] = [];
const whereClauses: string[] = [];
const addParam = (val: any) => {
  params.push(val);
  return `$${params.length}`;
};
if (status !== "todos") {
  const idx = addParam(status);
  whereClauses.push(`status = ${idx}::VARCHAR`);
}
// ... 50 linhas de if/else para filtros ...
if (reqParams.length === 1) {
  const idx = addParam(reqParams[0]);
  whereClauses.push(`${accessFilter.whereClause} = ${idx}`);
}
if (whereClauses.length > 0) query += ` WHERE ${whereClauses.join(" AND ")}`;
query += ` ORDER BY data_cad DESC`;
const result = await pool.query(CASOS_SQL.CLEAN(query), params);

// ✅ DEPOIS (mesma funcionalidade, 10 linhas)
const qb = new QueryBuilder(CASOS_SQL.SELECT_BASE)
  .whereIf(
    status !== "todos" ? status : null,
    (ph) => `status = ${ph}::VARCHAR`
  )
  .whereIf(mes, (ph) => `TO_CHAR(data_cad, 'YYYY-MM') = ${ph}::VARCHAR`)
  .whereILike(searchTerm, "nome")
  .applyAccessFilter(accessFilter)
  .order("data_cad DESC");

const [sql, params] = qb.build();
const result = await pool.query(sql, params);
```

**Arquivos impactados (refatorar gradualmente, um por vez):**

1. `casos.controller.ts` — maior benefício, +150 linhas podem ser reduzidas
2. `dashboard.ts` — elimina `buildFullWhereClauseContent` inteiro
3. `vigilancia.ts` — elimina `buildFilterClause` inteiro
4. `demandas.ts` — simplifica montagem de queries
5. `relatorios.ts` — simplifica resolução de accessFilter
6. `cras.ts` — simplifica resolução de accessFilter
7. `anexos.ts` — simplifica `checkAnexoAccess`

---

### 📌 Melhoria 2 — Extrair Repositórios para Casos e Demandas (ALTO IMPACTO / ESFORÇO MÉDIO)

**Problema:** O `casos.controller.ts` (448 linhas) mistura lógica HTTP (req/res), lógica de negócio, e SQL. O `casos.service.ts` existe mas quase não é usado (apenas `createCaso`). O resto do CRUD está direto no controller.

**Solução:** Criar `src/repositories/casos.repository.ts` com todas as queries, e mover a lógica de negócio para `casos.service.ts`.

**Estrutura proposta:**

```
src/repositories/
├── casos.repository.ts      # Todas as queries de casos
├── demandas.repository.ts   # Todas as queries de demandas
├── mse.repository.ts        # Queries de MSE
└── base.repository.ts       # (Opcional) Utilitários compartilhados
```

**Exemplo de repositório:**

```typescript
// src/repositories/casos.repository.ts
import pool from '../db';
import { QueryBuilder } from '../utils/query-builder';
import { CASOS_SQL } from '../routes/casos/casos.sql';

export class CasosRepository {

  static async findById(id: number) {
    const [sql, params] = new QueryBuilder(CASOS_SQL.SELECT_BY_ID)
      .where(`id = ${/* placeholder */}`)
      .build();
    const result = await pool.query(sql, params);
    return result.rows[0] || null;
  }

  static async list(filters: CasosFilters, accessFilter: AccessFilter) {
    const qb = new QueryBuilder(CASOS_SQL.SELECT_BASE)
      .whereIf(filters.status, ph => `status = ${ph}::VARCHAR`)
      .whereIf(filters.mes, ph => `TO_CHAR(data_cad, 'YYYY-MM') = ${ph}`)
      .whereILike(filters.searchTerm, 'nome')
      .applyAccessFilter(accessFilter)
      .order('data_cad DESC');

    const [sql, params] = qb.build();
    return (await pool.query(sql, params)).rows;
  }

  static async create(data: CreateCasoInput) {
    const result = await pool.query(CASOS_SQL.INSERT, [...]);
    return result.rows[0];
  }

  // ... update, delete, updateStatus
}
```

**Benefícios:**

- Controller fica com ~50 linhas por método (parse request → chama service → envia response)
- Queries ficam testáveis isoladamente
- Reutilização entre rotas (ex: `vigilancia.ts` pode usar `CasosRepository.list()`)

---

### 📌 Melhoria 3 — Interfaces/Tipos para Dados do Banco (ALTO IMPACTO / ESFORÇO BAIXO)

**Problema:** O sistema inteiro usa `any` para dados que entram e saem do banco. Erros de typo em nomes de campo só aparecem em runtime.

**Solução:** Criar tipos em `src/types/` para as entidades principais.

```typescript
// src/types/caso.ts
export interface Caso {
  id: number;
  data_cad: string;
  tec_ref: string;
  nome: string | null;
  status: "Ativo" | "Desligado" | "Arquivado";
  user_id: number;
  unit_id: number;
  dados_completos: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateCasoInput {
  nome?: string;
  data_cad?: string;
  tec_ref?: string;
  status?: string;
  unit_id?: number;
  dados_completos_payload: Record<string, any>;
}

export interface CasosFilters {
  status?: string;
  mes?: string;
  searchTerm?: string;
  filtro?: string;
  valor?: string;
}
```

```typescript
// src/types/access-filter.ts
export interface AccessFilter {
  whereClause: string;
  params: (string | number)[];
}
```

**Arquivos para criar:**

- `src/types/caso.ts`
- `src/types/demanda.ts`
- `src/types/user.ts`
- `src/types/mse-registro.ts`
- `src/types/access-filter.ts`

**Benefício imediato:** O TypeScript começa a pegar erros de campo errado em tempo de compilação.

---

### 📌 Melhoria 4 — Eliminar Duplicação de `cleanSqlString` (BAIXO ESFORÇO / RETORNO RÁPIDO)

**Problema:** A função `cleanSqlString` está definida **localmente em 9 arquivos** e já existe em `src/utils/sqlUtils.ts`.

**Solução:** Remover todas as definições locais e importar de `sqlUtils.ts`.

**Arquivos para corrigir (remover definição local, adicionar import):**

1. `src/routes/casos/casos.sql.ts` (método `CLEAN`)
2. `src/routes/casos/casos.controller.ts`
3. `src/routes/demandas.ts`
4. `src/routes/acompanhamentos.ts`
5. `src/routes/encaminhamentos.ts`
6. `src/routes/anexos.ts`
7. `src/routes/dashboard.ts`
8. `src/routes/vigilancia.ts`
9. `src/routes/cras.ts`
10. `src/routes/mse.routes.ts`
11. `src/routes/users/users.sql.ts` (método `CLEAN`)

**Tempo estimado:** 30 minutos. **Redução:** ~50 linhas de código duplicado.

---

### 📌 Melhoria 5 — Centralizar Resolução do `accessFilter` (ALTO IMPACTO / ESFORÇO BAIXO)

**Problema:** O padrão de resolver `$X → $N` do `accessFilter` é feito **manualmente em cada rota**. São 30+ ocorrências do mesmo código:

```typescript
// Este bloco de 5-10 linhas aparece em CADA rota
if (accessFilter.params.length === 1) {
  unitWhere = unitWhere.replace("$X", `$${params.length + 1}`);
  params.push(accessFilter.params[0]);
} else if (accessFilter.params.length === 2) {
  unitWhere = unitWhere
    .replace("$X", `$${params.length + 1}`)
    .replace("$Y", `$${params.length + 2}`);
  params.push(accessFilter.params[0], accessFilter.params[1]);
}
```

**Solução:** Se a Melhoria 1 (QueryBuilder) for implementada, isso já é resolvido pelo método `applyAccessFilter()`. Caso contrário, criar uma função utilitária:

```typescript
// src/utils/access-filter.helper.ts
export function resolveAccessFilter(
  accessFilter: AccessFilter,
  existingParams: any[]
): { clause: string; params: any[] } {
  if (accessFilter.whereClause === "TRUE") {
    return { clause: "TRUE", params: [] };
  }

  let clause = accessFilter.whereClause;
  const newParams: any[] = [];

  for (const param of accessFilter.params) {
    const idx = existingParams.length + newParams.length + 1;
    clause = clause.replace(/\$[XY]/, `$${idx}`);
    newParams.push(param);
  }

  return {
    clause: `(${clause} OR casos.unit_id IS NULL)`,
    params: newParams,
  };
}
```

---

### 📌 Melhoria 6 — Migrar Schema do `db.ts` para Migration Files (MÉDIO IMPACTO / ESFORÇO MÉDIO)

**Problema:** O `db.ts` tem **240 linhas** de `CREATE TABLE IF NOT EXISTS` executadas em toda inicialização. As "migrações" na pasta `migrations/` são apenas seeds. Não há versionamento real do schema — alterar uma coluna requer editar o `db.ts` e torcer para não quebrar dados existentes.

**Solução:**

1. Extrair todo o DDL de `db.ts` para um arquivo `migrations/0001_initial_schema.sql`
2. Criar uma função simples de migration runner que rastreie quais migrações já foram aplicadas (tabela `_migrations`)
3. O `db.ts` passa a ter apenas a conexão do pool e a chamada ao migration runner

**Estrutura:**

```
migrations/
├── 0001_initial_schema.sql          # Todo o DDL atual do db.ts
├── 0002_seed_permissions.sql        # Seeds existentes
├── ...
```

**Benefício:** Permite evoluir o schema de forma controlada (adicionar colunas, índices, etc.) sem risco de perder dados.

---

## Ordem de Execução Recomendada

| Fase  | Melhoria                                     | Esforço  | Impacto  | Risco    |
| ----- | -------------------------------------------- | -------- | -------- | -------- |
| **1** | **#4** — Eliminar `cleanSqlString` duplicada | 🟢 30min | 🟡 Médio | 🟢 Zero  |
| **2** | **#3** — Criar tipos/interfaces              | 🟢 2h    | 🟡 Médio | 🟢 Zero  |
| **3** | **#1** — QueryBuilder centralizado           | 🟡 4-6h  | 🔴 Alto  | 🟡 Baixo |
| **4** | **#5** — Centralizar accessFilter            | 🟢 1h    | 🟡 Médio | 🟢 Zero  |
| **5** | **#2** — Extrair repositórios                | 🟡 6-8h  | 🔴 Alto  | 🟡 Médio |
| **6** | **#6** — Migrar schema para migrations       | 🟡 4h    | 🟡 Médio | 🟡 Médio |

> **Fases 1 e 2** podem ser feitas em uma tarde sem risco.  
> **Fase 3** é a de maior retorno — resolve o problema central de queries frágeis.  
> **Fases 4 e 5** são consequência natural da Fase 3.  
> **Fase 6** pode ser feita a qualquer momento, independente das outras.

---

## O que NÃO fazer agora (decisões conscientes para o MVP)

| Prática                                     | Por que NÃO agora                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Migrar para Drizzle ORM / Prisma            | Reescrita grande demais; o QueryBuilder resolve 80% do problema com 20% do esforço                 |
| Testes automatizados completos              | Sem repositórios separados, testar é caro. Fazer **depois** da Melhoria #2                         |
| Padronizar naming (snake_case vs camelCase) | Requer migração de dados + alteração no frontend. Risco alto para o MVP                            |
| Separar monolito em módulos/microserviços   | Complexidade prematura para o tamanho atual                                                        |
| Implementar cache (Redis)                   | Sem métricas de performance que justifiquem                                                        |
| Substituir Express por Fastify              | O `arquitetura.md` menciona Fastify, mas o código usa Express. A troca agora seria reescrita total |

---

## Métricas de Sucesso

Após implementar as melhorias 1–5:

- [ ] Zero ocorrências de `cleanSqlString` definida localmente (apenas import de `sqlUtils.ts`)
- [ ] Zero ocorrências de resolução manual de `$X/$Y` do accessFilter fora do QueryBuilder
- [ ] Nenhum `pool.query()` chamado diretamente em arquivos de rota/controller
- [ ] Todos os métodos de service/repository tipados (sem `any` nos parâmetros e retornos)
- [ ] `casos.controller.ts` reduzido de ~450 linhas para ~150 linhas
- [ ] `dashboard.ts` reduzido de ~220 linhas para ~80 linhas

---

_Documento criado em: Fevereiro/2026_  
_Última atualização: Fevereiro/2026_
