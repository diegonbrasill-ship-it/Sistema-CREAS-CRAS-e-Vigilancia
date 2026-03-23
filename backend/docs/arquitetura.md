# Contexto do Projeto - Sistema de Gestão Social (CRAS/CREAS)

## 1. Visão Geral

Sistema backend para gestão de serviços sociais (CRAS/CREAS), construído com:

- **Runtime:** Node.js com TypeScript
- **Framework HTTP:** Express
- **Banco de dados:** PostgreSQL (driver `pg`)
- **Infra de banco local:** Docker Compose com PostgreSQL 15 para `dev` e `test`
- **Autenticação:** JWT (via `jsonwebtoken`) + middleware (`authMiddleware`)
- **Uploads:** Multer
- **Testes:** Jest

> Observação: este repositório contém documentação e trechos legados citando Fastify/Drizzle/SQLite.
> A implementação atual do backend (pasta `src/`) está baseada em Express + PostgreSQL.

## 2. Estrutura de Diretórios

```
src/
├── index.ts                  # Entry point - testa conexão com DB e registra rotas Express
├── db.ts                     # Pool do PostgreSQL + initDb (somente conexão)
├── config/
│   └── loadEnv.ts            # Carrega .env por ambiente
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

migrations/
├── 1770000000000_initial-schema.js        # Schema inicial completo
├── 1770407643908_add-column-to-users.js   # Adiciona users.role_id + FK
├── 1770441755520_seed-permissions-by-entity.js # Seed de roles + permissions
├── 1770500000000_seed-unidades.js         # Seed de unidades obrigatórias
└── ...                                    # Migrations legadas/corretivas

tests/
├── casos.routes.test.ts      # Testes de rota (Express + Supertest)
├── casos.service.test.ts     # Testes unitários de service (SQL + params)
├── query-builder.test.ts
├── smoke.test.ts
└── schema.integration.ts     # Verifica schema e dados obrigatórios em DB real

scripts/
└── run-with-env.cjs          # Injeta variáveis do .env no processo filho

docker-compose.yml            # PostgreSQL local para dev e test
docs/
└── casos/
    ├── arquitetura_caso.md
    ├── cadastro_models.md
    ├── casos-rotas-analise.md
    └── plano-melhoria-cadastro-rotas.md
```

## 3. Banco de Dados e Schema

### 3.1 Conexão

- `src/db.ts`: exporta o `pool` do `pg` e `initDb()` apenas para validar conectividade.
- A criação de tabelas não acontece mais no boot da API.
- O schema inicial agora é responsabilidade das migrations.

### 3.2 Fonte de Verdade do Schema

- O schema inicial completo está em `migrations/1770000000000_initial-schema.js`.
- A coluna `users.role_id` é adicionada em `migrations/1770407643908_add-column-to-users.js`.
- O seed estrutural de `roles` e `permissions` está em `migrations/1770441755520_seed-permissions-by-entity.js`.
- O seed estrutural de `unidades` está em `migrations/1770500000000_seed-unidades.js`.
- O vínculo entre roles e permissões está em `migrations/1770695829460_seed-role-permissions-table.js`.
- O backfill de `users.role_id` é feito por `migrations/1770836325429_update-users-role-id.js`.

Regras atuais:

- `db.ts` não cria nem altera schema.
- Schema e dados estruturais obrigatórios sobem por migration.
- `seed.ts` ficou como seed auxiliar de ambiente, não como bootstrap oficial do banco.

### 3.3 Dados Estruturais Obrigatórios

Hoje o projeto considera obrigatórios para um banco funcional recém-criado:

- tabelas base do sistema (`users`, `roles`, `permissions`, `casos`, `demandas`, etc.)
- `roles`:
  - `tecnico_superior`
  - `tecnico_medio`
  - `coordenador_creas`
  - `gestor`
  - `vigilancia`
  - `coordenador_cras`
  - `tecnico_cras`
- `permissions` por entidade e de telas (`screen.*`)
- `unidades` padrão com IDs 1 a 8
- `role_permissions` derivadas por `roles.name`, não por IDs fixos

### 3.4 Docker para Banco Local

O projeto usa `docker-compose.yml` apenas para o PostgreSQL local:

- `postgres-dev`
  - imagem `postgres:15`
  - porta `5432`
  - banco `vigilancia_dev`
- `postgres-test`
  - imagem `postgres:15`
  - porta `5433`
  - banco `vigilancia_test`

Objetivo:

- ambiente reproduzível para desenvolvimento
- banco isolado para testes
- reset rápido por volume Docker

### 3.5 Ambientes

Arquivos suportados:

- `.env.dev`
- `.env.test`
- `.env.prod`

Variáveis relevantes:

- `APP_ENV=dev|test|prod`
- `DATABASE_URL`
- `DB_SSL`
- `PORT`
- `JWT_SECRET`

### 3.6 Entidade: `casos`

- Tabela `casos` (ver migration inicial):
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

### 4.1.1 Documentacao da entidade `casos`

A documentacao especifica de `casos` foi centralizada em:

- `docs/casos/arquitetura_caso.md`
- `docs/casos/cadastro_models.md`
- `docs/casos/casos-rotas-analise.md`
- `docs/casos/plano-melhoria-cadastro-rotas.md`

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

A listagem de casos (`CasosService.list`) agora compoe filtros com input normalizado no controller e query builder no service.

Contrato principal:

- `search`
- `searchBy`
- `status`
- `mes`
- `page`
- `limit`
- `sortBy`
- `sortOrder`
- `filters[...]`

Compatibilidade temporaria mantida:

- `filtro`
- `valor`

Os filtros funcionais passam por whitelist em `casos.contract.ts`, enquanto o filtro de unidade segue separado em `accessScope`.

Campos e comportamentos mantidos na listagem:

- `status` (por padrão `Ativo`, exceto quando `status=todos`)
- `mes` (via `TO_CHAR(data_cad, 'YYYY-MM')`)
- busca textual por `search/searchBy`
- filtros específicos vindos de `filters[...]`
- flags legadas ainda aceitas quando mapeadas para o contrato novo
- filtro de unidade via `applyAccessFilter(..., { allowNullUnit: false })`
- ordenação via whitelist
- paginação opcional: `page` + `limit` (limit limitado a 200)
- exclusão de registros com `deleted_at IS NOT NULL`

### 4.5 Busca rápida: `GET /api/casos/busca-rapida?q=...`

- Requer `q` com no mínimo 3 caracteres (evita consultas amplas com `ILIKE '%a%'`).
- Aplica `status = 'Ativo'`, `deleted_at IS NULL`, accessFilter por unidade e `LIMIT 10`.

## 5. Testes

### 5.1 Testes unitários (SQL/params)

- `tests/casos.service.test.ts`: mocka `pool.query` e valida:
  - SQL gerado contém filtros esperados
  - ordem e conteúdo do array `params`

### 5.2 Testes de rota (Express)

- `tests/casos.routes.test.ts`: usa `supertest` e um app Express mínimo para validar:
  - o router executa middlewares mockados (`authMiddleware`, `unitAccessMiddleware`, `checkCaseAccess`)
  - o controller chama os métodos do `CasosService` com os argumentos esperados (body, querystring, `req.user`, `req.accessFilter`)

### 5.3 Testes de Schema em Banco Real

- `tests/schema.integration.ts`: valida schema e dados obrigatórios em um PostgreSQL real.
- Essa suíte verifica:
  - existência de todas as tabelas esperadas
  - existência de todas as colunas esperadas
  - presença de `users.role_id`
  - presença das `unidades` obrigatórias
  - presença das `roles` obrigatórias
  - presença das `permissions` obrigatórias
  - quantidade esperada de `role_permissions` por role

Restrições:

- a suíte não deve rodar em produção
- a suíte bloqueia execução quando `APP_ENV=prod`
- a suíte depende de um banco já existente e migrado

### 5.4 Scripts Principais

Banco e servidor:

- `npm run db:dev:up`: sobe PostgreSQL de desenvolvimento no Docker
- `npm run db:test:up`: sobe PostgreSQL de teste no Docker
- `npm run db:down`: derruba containers do compose
- `npm run dev`: sobe a API usando `.env.dev`
- `npm run build`
- `npm run start:prod`: sobe a API com `.env.prod`

Migrations:

- `npm run migrate:up:dev`
- `npm run migrate:down:dev`
- `npm run migrate:up:test`
- `npm run migrate:down:test`
- `npm run migrate:up:prod`

Testes:

- `npm run test`: suíte padrão unitária/rota
- `npm run test:schema`: alias para schema em `dev`
- `npm run test:schema:dev`
- `npm run test:schema:test`

### 5.5 Fluxos Recomendados

Desenvolvimento local com banco novo:

```bash
npm run db:dev:up
npm run migrate:up:dev
npm run dev
```

Validação de schema no banco de desenvolvimento:

```bash
npm run test:schema:dev
```

Validação de schema no banco de teste:

```bash
npm run db:test:up
npm run migrate:up:test
npm run test:schema:test
```

Reset completo do banco Docker:

```bash
docker compose down -v
```

Depois do reset, as migrations devem ser reaplicadas.

## 6. Rotas principais (Resumo)

### Casos (`/api/casos`)

| Método | Rota                                 | Descrição                                      |
| ------ | ------------------------------------ | ---------------------------------------------- |
| POST   | `/api/casos`                         | Criar caso                                     |
| GET    | `/api/casos`                         | Listar casos (filtros + segurança por unidade) |
| GET    | `/api/casos/busca-rapida`            | Busca rápida por `q` (min 3 chars)             |
| GET    | `/api/casos/:id`                     | Buscar caso por ID                             |
| PUT    | `/api/casos/:id`                     | Atualizar caso por merge parcial               |
| PATCH  | `/api/casos/:id/status`              | Atualizar somente o status do caso             |
| DELETE | `/api/casos/:id`                     | Soft delete do caso                            |
| GET    | `/api/casos/:casoId/encaminhamentos` | Listar encaminhamentos do caso                 |

### Dashboard (`/api/dashboard`)

- `GET /api/dashboard`: monta filtros com `QueryBuilder` e executa um conjunto de queries agregadas.

<!-- Conteúdo legado abaixo pode existir e deve ser revisado/atualizado conforme necessário. -->

## 7. (Legado) Conteúdo anterior

...existing content...
