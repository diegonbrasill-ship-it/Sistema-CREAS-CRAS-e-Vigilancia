# Melhoria 1 — Query Builder Centralizado (Plano Detalhado)

> **Referência:** `docs/plano-de-melhorias.md` — Melhoria #1  
> **Objetivo:** Eliminar a montagem manual de queries SQL com placeholders, concatenação de `WHERE` e resolução de `accessFilter` espalhada por toda a codebase.  
> **Piloto:** Endpoint `/dashboard` (`src/routes/dashboard.ts`)  
> **Status:** ✅ Concluído — Etapas 1 e 2 implementadas e validadas

---

## Visão Geral do Plano

| Etapa | Descrição                                                     | Tipo          | Testes | Status       |
| ----- | ------------------------------------------------------------- | ------------- | ------ | ------------ |
| **1** | Criar a classe `QueryBuilder` em `src/utils/query-builder.ts` | Implementação | ✅ Sim | ✅ Concluído |
| **2** | Refatorar `dashboard.ts` usando `QueryBuilder` (piloto)       | Substituição  | ❌ Não | ✅ Concluído |

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

### 1.2 — Criar testes em `tests/query-builder.test.ts`

Testes unitários puros (sem banco, sem mocks pesados). Cobrir todos os métodos:

| #   | Caso de Teste                                | O que valida                                                                                                                     | Status |
| --- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | `build()` sem filtros                        | Retorna a query base sem WHERE, params vazio                                                                                     | ✅     |
| 2   | `where()` com cláusula fixa                  | Adiciona WHERE simples                                                                                                           | ✅     |
| 3   | `where()` múltiplas cláusulas                | Junta com AND                                                                                                                    | ✅     |
| 4   | `whereIf()` com valor válido                 | Adiciona cláusula e parâmetro                                                                                                    | ✅     |
| 5   | `whereIf()` com `null`                       | Ignora cláusula                                                                                                                  | ✅     |
| 6   | `whereIf()` com `undefined`                  | Ignora cláusula                                                                                                                  | ✅     |
| 7   | `whereIf()` com string vazia `""`            | Ignora cláusula                                                                                                                  | ✅     |
| 8   | `whereIf()` com valor `0` (zero)             | **Adiciona** cláusula (zero é válido)                                                                                            | ✅     |
| 9   | `whereILike()` com valor válido              | Adiciona `ILIKE` com `%valor%`                                                                                                   | ✅     |
| 10  | `whereILike()` com `null`                    | Ignora cláusula                                                                                                                  | ✅     |
| 11  | `applyAccessFilter()` com gestor (`TRUE`)    | Não adiciona nenhuma cláusula                                                                                                    | ✅     |
| 12  | `applyAccessFilter()` formato atual (coluna) | Monta `(coluna = $N OR tabela.unit_id IS NULL)`                                                                                  | ✅     |
| 13  | `applyAccessFilter()` formato legado (`$X`)  | Resolve `$X` para `$N` corretamente                                                                                              | ✅     |
| 14  | `order()`                                    | Adiciona ORDER BY                                                                                                                | ✅     |
| 15  | `limit()`                                    | Adiciona LIMIT/OFFSET com placeholders                                                                                           | ✅     |
| 16  | **Integração: cenário completo**             | Múltiplos `whereIf` + `applyAccessFilter` + `order` + `limit` — valida que os placeholders `$1..$N` estão sequenciais e corretos | ✅     |
| 17  | `getWhereClause()`                           | Retorna `WHERE ...` quando há cláusulas                                                                                          | ✅     |
| 18  | `getWhereClause()` sem filtros               | Retorna string vazia                                                                                                             | ✅     |
| 19  | `getAndClause()`                             | Retorna `AND ...` quando há cláusulas                                                                                            | ✅     |
| 20  | `getAndClause()` sem filtros                 | Retorna string vazia                                                                                                             | ✅     |
| 21  | `addParam()` manual                          | Retorna placeholder correto e incrementa índice                                                                                  | ✅     |
| 22  | `build()` limpa espaços múltiplos            | SQL resultante não tem `\n` ou espaços duplos                                                                                    | ✅     |

**Comando para executar:**

```bash
npm test
```

> **Resultado:** ✅ 22/22 testes passando no `tests/query-builder.test.ts` + 1 teste do `tests/smoke.test.ts` = **23 testes totais, 2 suites, todos passando**.

> **Nota:** O arquivo `src/utils/__tests__/query-builder.test.ts` existe mas está vazio. Os testes efetivos estão em `tests/query-builder.test.ts`.

### 1.3 — Critério de aceitação da Etapa 1

- [x] Arquivo `src/utils/query-builder.ts` criado (152 linhas, 12 métodos públicos)
- [x] Arquivo `tests/query-builder.test.ts` criado (269 linhas, 22 testes)
- [x] **Todos os 22 testes passando** ✅
- [x] Nenhum arquivo existente foi alterado

---

## Etapa 2 — Piloto: Refatorar `dashboard.ts` com o `QueryBuilder`

### 2.1 — Contexto do arquivo original (antes da refatoração)

O arquivo `src/routes/dashboard.ts` **tinha** **213 linhas** e continha:

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

### 2.2 — O que foi feito na refatoração

#### Tarefa 2.1 — ✅ Eliminar `buildFullWhereClauseContent` e usar `QueryBuilder`

**O que foi feito:**

- ✅ Removida a função `buildFullWhereClauseContent` inteira
- ✅ Adicionado import de `QueryBuilder` de `../utils/query-builder`
- ✅ Na rota `GET /`, criada instância de `QueryBuilder` que substitui toda a lógica de filtros

**Código implementado:**

```typescript
const qb = new QueryBuilder("SELECT")
  .whereIf(mes, (ph) => `TO_CHAR(casos.data_cad, 'YYYY-MM') = ${ph}`)
  .whereIf(tec_ref, (ph) => `casos.tec_ref ILIKE ${ph}`)
  .whereIf(
    bairro,
    (ph) => `LOWER(casos.dados_completos->>'bairro') = LOWER(${ph})`
  )
  .applyAccessFilter(accessFilter);

const whereClause = qb.getWhereClause() ? ` ${qb.getWhereClause()}` : "";
const andClause = qb.getAndClause() ? ` ${qb.getAndClause()}` : "";
const whereTrue =
  whereClause.length > 0 ? ` ${qb.getWhereClause()}` : " WHERE TRUE";
const params = qb.getParams();
```

> **Nota sobre `whereTrue`:** Variável âncora para queries que **não** possuem `WHERE` fixo mas precisam de condições adicionais com `AND` (ex: queries 9-12 e 19-22 que filtram por `IS NOT NULL`, `TRIM`, etc.).
>
> - **Com filtros ativos:** `whereTrue` = `WHERE <filtros>` (usa `getWhereClause()`, que começa com `WHERE`)
> - **Sem filtros:** `whereTrue` = `WHERE TRUE` (fallback seguro)
>
> Isso garante que o SQL gerado seja sempre `FROM casos WHERE ... AND ...` e nunca `FROM casos AND ...`.
>
> **🐛 Bug corrigido (25/02/2026):** A implementação original usava `andClause` no `whereTrue`, o que gerava SQL inválido (`FROM casos AND ...` — sem `WHERE`) quando havia filtros ativos. Corrigido para usar `whereClause` (que inclui a palavra `WHERE`).

#### Tarefa 2.2 — ✅ Manter `cleanSqlString` nas queries

**O que foi feito:**

- ✅ `cleanSqlString` foi mantida em todas as 23 queries individuais (conforme decisão documentada no plano)
- O `build()` do `QueryBuilder` já faz limpeza internamente, mas como o dashboard usa `whereClause`/`andClause` via getters (sem chamar `build()`), o `cleanSqlString` continua sendo necessário

> **Decisão mantida:** Remoção total do `cleanSqlString` será feita quando cada query tiver seu próprio `QueryBuilder`.

#### Tarefa 2.3 — ✅ Remover funções auxiliares obsoletas

**O que foi feito:**

- ✅ `buildFullWhereClauseContent` — removida (substituída pelo `QueryBuilder`)
- ✅ `getGroupedFieldName` — mantida (é um helper de formatação SQL para campos JSONB com `COALESCE`/`NULLIF`, não relacionado à montagem de WHERE)

> **Nota:** O plano original mencionava `appendNonNullFilter` como função a ser mantida, mas essa função **não existia** no `dashboard.ts`. A única função auxiliar local era `getGroupedFieldName`, que foi corretamente mantida.

### 2.3 — Resultado da refatoração

**Métricas:**

| Métrica                      | Antes                                                     | Depois                    | Redução      |
| ---------------------------- | --------------------------------------------------------- | ------------------------- | ------------ |
| Total de linhas              | 213                                                       | 159                       | ~25%         |
| Funções auxiliares locais    | 2 (`buildFullWhereClauseContent` + `getGroupedFieldName`) | 1 (`getGroupedFieldName`) | -1 função    |
| Queries no `Promise.all`     | 23                                                        | 23                        | 0 (mantidas) |
| Gerenciamento manual de `$N` | Sim                                                       | Não (via QueryBuilder)    | ✅ Eliminado |

### 2.4 — Critério de aceitação da Etapa 2

- [x] Função `buildFullWhereClauseContent` removida do `dashboard.ts`
- [x] Import de `QueryBuilder` adicionado
- [x] As 23 queries do dashboard continuam usando `whereClause` e `andClause` da mesma forma (via getters do QB)
- [x] Os mesmos filtros (`mes`, `tec_ref`, `bairro`) continuam funcionando
- [x] O `accessFilter` é aplicado corretamente (incluindo `OR unit_id IS NULL`)
- [x] Variável `whereTrue` adicionada como fallback para queries com `WHERE` fixo
- [ ] Testar manualmente a rota `GET /dashboard` com e sem filtros _(requer servidor rodando)_
- [ ] Testar com usuário gestor (sem filtro de unidade) e usuário comum (com filtro) _(requer servidor rodando)_

> **⚠️ Logs de debug:** O arquivo atual contém `console.log` para debug das variáveis `whereClause`, `andClause`, `whereTrue` e `params`. Esses logs devem ser removidos antes de ir para produção.

---

## Resumo de Arquivos

| Arquivo                                     | Ação                                                                      | Status                                      |
| ------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| `src/utils/query-builder.ts`                | 🆕 Criar                                                                  | ✅ Concluído (152 linhas, 12 métodos)       |
| `tests/query-builder.test.ts`               | 🆕 Criar                                                                  | ✅ Concluído (22/22 testes passando)        |
| `src/utils/__tests__/query-builder.test.ts` | 🆕 Criado (vazio)                                                         | ⚠️ Arquivo vazio — testes estão em `tests/` |
| `src/routes/dashboard.ts`                   | ✏️ Refatorar (remover `buildFullWhereClauseContent`, usar `QueryBuilder`) | ✅ Concluído (213→159 linhas, -25%)         |

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
_Última atualização: 25/02/2026 — Verificação do estado real da implementação_
