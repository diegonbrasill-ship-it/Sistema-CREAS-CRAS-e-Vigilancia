# Contexto do Projeto - Sistema de Gestão Social (CRAS/CREAS)

## 1. Visão Geral

Sistema backend para gestão de serviços sociais (CRAS/CREAS), construído com:

- **Runtime:** Node.js com TypeScript
- **Framework HTTP:** Express
- **Banco de dados:** PostgreSQL (driver `pg`)
- **Autenticação:** JWT (via `jsonwebtoken`) + middleware (`authMiddleware`)
- **Uploads:** Multer
- **Testes:** Jest

> Observação: este repositório contém documentação e trechos legados citando Fastify/Drizzle/SQLite.
> A implementação atual do backend (pasta `src/`) está baseada em Express + PostgreSQL.

## 2. Estrutura de Diretórios

```
src/
├── index.ts                  # Entry point - inicializa DB e registra rotas Express
├── db.ts                     # Pool do PostgreSQL + initDb (criação de tabelas)
├── middleware/               # Middlewares (auth, unitAccess, caseAccess, upload)
├── routes/                   # Rotas organizadas por entidade
│   ├── dashboard.ts
│   └── casos/
│       ├── index.ts          # Router /api/casos
│       ├── casos.controller.ts
│       ├── casos.service.ts
│       └── casos.sql.ts
├── services/                 # Serviços utilitários (logger, report)
├── utils/
│   ├── query-builder.ts      # Montagem segura de SQL (placeholders) + filtro de unidade
│   └── sqlUtils.ts

tests/
├── casos.routes.test.ts      # Testes de rota (Express + Supertest)
├── casos.service.test.ts     # Testes unitários de service (SQL + params)
├── query-builder.test.ts
└── smoke.test.ts
```

## 3. Banco de Dados e Schema

### 3.1 Conexão

- `src/db.ts`: exporta o `pool` do `pg` e a função `initDb()` que faz a inicialização (CREATE TABLE IF NOT EXISTS ...).

### 3.2 Entidade: `casos`

- Tabela `casos` (ver `src/db.ts`):
  - Campos principais: `id`, `data_cad`, `tec_ref`, `nome`, `status`, `dados_completos` (JSONB), `user_id`, `unit_id`, timestamps.

## 4. Padrões Arquiteturais

### 4.1 Camadas (Route → Controller → Service)

Para algumas entidades (ex.: `casos`) a arquitetura segue o fluxo:

```
Request → Router (Express) → Controller → Service → DB (pg/pool.query)
```

- **Router** (`src/routes/<entidade>/index.ts`): registra endpoints e middlewares.
- **Controller** (`*.controller.ts`): camada HTTP (lê `req`, chama service, retorna `res`).
- **Service** (`*.service.ts`): concentra a montagem de query, aplicação de filtros e acesso ao banco.

### 4.2 Montagem segura de SQL com `QueryBuilder`

Utilitário em `src/utils/query-builder.ts`.

Objetivos:

- Centralizar a construção de SQL com placeholders (`$1`, `$2`, ...), evitando concatenação de valores.
- Reduzir bugs de índice de parâmetros.
- Padronizar aplicação do filtro de acesso por unidade.

Funcionalidades principais:

- `where(clause)` adiciona cláusulas fixas.
- `whereIf(value, factory)` adiciona cláusula apenas se `value` existir.
- `addParam(value)` adiciona param e retorna o placeholder correspondente.
- `order(...)` e `limit(limit, offset)` para ordenação/paginação.

### 4.3 Segurança por Unidade: `unitAccessMiddleware` + `applyAccessFilter`

- O middleware `src/middleware/unitAccess.middleware.ts` injeta em `req.accessFilter`:

  - Gestor: `{ whereClause: 'TRUE', params: [] }`
  - Demais: `{ whereClause: 'casos.unit_id', params: [<unit_id>] }` (ou alias equivalente)

- No service, `QueryBuilder.applyAccessFilter(accessFilter)` adiciona:

```
(<coluna_unit_id> = $N OR <tabela>.unit_id IS NULL)
```

Isso garante:

- Usuários comuns veem apenas dados de sua unidade.
- Registros globais (`unit_id IS NULL`) também são visíveis (ex.: gestor principal).

### 4.4 Filtros implementados em `GET /api/casos`

A listagem de casos (`CasosService.list`) compõe filtros com `AND`:

- `status` (por padrão `Ativo`, exceto quando `status=todos`)
- `mes` (via `TO_CHAR(data_cad, 'YYYY-MM')`)
- busca geral (`filtro=q` + `valor`) ou por `tec_ref`, usando `ILIKE` em múltiplos campos
- filtros específicos (`por_bairro`, `por_violencia`, `por_faixa_etaria`, `recebeBPC`, e genéricos em `dados_completos`)
- flags: `confirmedViolence=true`, `socioeducacao=true`
- filtro de unidade via `applyAccessFilter`
- ordenação: `ORDER BY data_cad DESC`
- paginação opcional: `page` + `limit` (limit limitado a 200)

### 4.5 Busca rápida: `GET /api/casos/busca-rapida?q=...`

- Requer `q` com no mínimo 3 caracteres (evita consultas amplas com `ILIKE '%a%'`).
- Aplica `status = 'Ativo'`, acessFilter por unidade e `LIMIT 10`.

## 5. Testes

### 5.1 Testes unitários (SQL/params)

- `tests/casos.service.test.ts`: mocka `pool.query` e valida:
  - SQL gerado contém filtros esperados
  - ordem e conteúdo do array `params`

### 5.2 Testes de rota (Express)

- `tests/casos.routes.test.ts`: usa `supertest` e um app Express mínimo para validar:
  - o router executa middlewares mockados (`authMiddleware`, `unitAccessMiddleware`, `checkCaseAccess`)
  - o controller chama os métodos do `CasosService` com os argumentos esperados (body, querystring, `req.user`, `req.accessFilter`)

## 6. Rotas principais (Resumo)

### Casos (`/api/casos`)

| Método | Rota                                 | Descrição                                      |
| ------ | ------------------------------------ | ---------------------------------------------- |
| POST   | `/api/casos`                         | Criar caso                                     |
| GET    | `/api/casos`                         | Listar casos (filtros + segurança por unidade) |
| GET    | `/api/casos/busca-rapida`            | Busca rápida por `q` (min 3 chars)             |
| GET    | `/api/casos/:id`                     | Buscar caso por ID                             |
| GET    | `/api/casos/:casoId/encaminhamentos` | Listar encaminhamentos do caso                 |

### Dashboard (`/api/dashboard`)

- `GET /api/dashboard`: monta filtros com `QueryBuilder` e executa um conjunto de queries agregadas.

<!-- Conteúdo legado abaixo pode existir e deve ser revisado/atualizado conforme necessário. -->

## 7. (Legado) Conteúdo anterior

...existing content...
