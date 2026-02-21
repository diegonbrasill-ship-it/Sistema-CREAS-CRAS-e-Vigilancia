# Contexto do Projeto - Sistema de Gestão Social (CRAS/CREAS)

## 1. Visão Geral

Sistema backend para gestão de serviços sociais (CRAS/CREAS), construído com:

- **Runtime:** Node.js com TypeScript (via tsx)
- **Framework HTTP:** Fastify
- **ORM:** Drizzle ORM com SQLite (better-sqlite3)
- **Autenticação:** JWT (via @fastify/jwt)
- **Upload de arquivos:** @fastify/multipart
- **Migrações:** drizzle-kit
- **Validação:** Zod
- **testes**: para executar os testes use npm test, crie apenas testes unitarios

## 2. Estrutura de Diretórios

```
src/
├── index.ts                  # Entry point - configura Fastify, plugins, CORS, rotas
├── db.ts                     # Conexão com banco SQLite via Drizzle
├── env.ts                    # Validação de variáveis de ambiente com Zod
├── schemas/                  # Definições de tabelas do banco (Drizzle schema)
├── routes/                   # Rotas HTTP organizadas por entidade
├── repositories/             # Camada de acesso a dados (queries)
├── services/                 # Camada de lógica de negócio
├── middlewares/               # Middlewares de autenticação e autorização
├── utils/                    # Utilitários (geração de ID, formatação, etc.)
├── errors/                   # Classes de erro customizadas
└── types/                    # Tipos TypeScript globais
```

## 3. Banco de Dados e Schema

### 3.1 Arquivo de Conexão

- [`src/db.ts`](src/db.ts): Exporta instância `db` do Drizzle conectada ao `database.sqlite`

### 3.2 Entidades (Tabelas)

#### Usuários e Autenticação

- **[`users`](src/schemas/user.ts):** Tabela de usuários do sistema

  - Campos: `id` (text PK), `name`, `email` (unique), `password`, `roleId` (FK para roles), `createdAt`, `updatedAt`
  - Relação: pertence a um `role`

- **[`roles`](src/schemas/roles.ts):** Papéis/perfis de usuário

  - Campos: `id` (text PK), `name`, `description`, `createdAt`, `updatedAt`
  - Relações: tem muitos `users`, tem muitos `rolePermissions`

- **[`permissions`](src/schemas/permissions.ts):** Permissões granulares do sistema

  - Campos: `id` (text PK), `entity` (entidade alvo), `action` (ação: create/read/update/delete/manage), `description`
  - Relações: tem muitos `rolePermissions`

- **[`rolePermissions`](src/schemas/role-permissions.ts):** Tabela pivô Role ↔ Permission (N:N)
  - Campos: `id`, `roleId` (FK), `permissionId` (FK)
  - Constraint unique em `[roleId, permissionId]`

#### Pessoas e Famílias

- **[`people`](src/schemas/person.ts):** Cadastro de pessoas/indivíduos

  - Campos: `id`, `name`, `socialName`, `cpf` (unique), `rg`, `birthDate`, `age`, `sex`, `gender`, `race`, `religion`, `birthPlace`, `nationality`, `phone`, `email`, `address`, `city`, `state`, `neighborhood`, `zipCode`, `referencePoint`, `schooling`, `occupation`, `workLocation`, `income`, `benefits`, `healthConditions`, `medication`, `isPregnant`, `gestationalAge`, `hasDisability`, `disabilityDescription`, `familyId` (FK)
  - Relações: pertence a `family`, tem muitos `demands`, `caseReports`, `attendances`

- **[`families`](src/schemas/family.ts):** Famílias cadastradas
  - Campos: `id`, `familyName`, `responsibleId` (text, referência lógica), `housingType`, `housingCondition`, `waterSupply`, `sewage`, `garbageCollection`, `electricity`, `familyIncome`, `benefitsReceived`, `numberOfMembers`, `observations`, `createdAt`, `updatedAt`
  - Relações: tem muitos `people`

#### Atendimentos e Casos

- **[`attendances`](src/schemas/attendance.ts):** Registros de atendimento

  - Campos: `id`, `personId` (FK), `userId` (FK - quem atendeu), `date`, `time`, `description`, `type`, `notes`, `createdAt`, `updatedAt`
  - Relações: pertence a `person`, pertence a `user` (técnico)

- **[`demands`](src/schemas/demands.ts):** Demandas/necessidades identificadas

  - Campos: `id`, `personId` (FK), `description`, `status` (pendente/em_andamento/concluida/cancelada), `priority` (baixa/media/alta/urgente), `category`, `createdAt`, `updatedAt`
  - Relações: pertence a `person`

- **[`caseReports`](src/schemas/case-reports.ts):** Relatórios de caso / evolução
  - Campos: `id`, `personId` (FK), `title`, `description`, `attachments`, `createdAt`, `updatedAt`
  - Relações: pertence a `person`

#### MSE (Medidas Socioeducativas)

- **[`casosDemandaMSE`](src/schemas/casos-demanda-mse.ts):** Tipos de casos/demandas de MSE
  - Campos: `id` (integer PK autoincrement), `name` (unique), `createdAt`
  - Tabela de lookup/referência para categorizar medidas socioeducativas

#### Notícias

- **[`news`](src/schemas/news.ts):** Notícias/comunicados do sistema
  - Campos: `id`, `title`, `summary`, `content`, `imageUrl`, `link`, `author`, `source`, `isActive`, `publishedAt`, `createdAt`, `updatedAt`

## 4. Padrões Arquiteturais

### 4.1 Padrão de Camadas (Route → Service → Repository)

Cada entidade segue o padrão de 3 camadas:

1. **Route** (`src/routes/`): Define endpoints HTTP, validação de entrada com Zod, chama o service
2. **Service** (`src/services/`): Contém lógica de negócio, validações, tratamento de erros
3. **Repository** (`src/repositories/`): Acesso direto ao banco via Drizzle ORM

**Exemplo de fluxo:**

```
Request → Route (validação Zod) → Service (regras de negócio) → Repository (query DB) → Response
```

### 4.2 Padrão de Registro de Rotas

Todas as rotas são registradas como plugins Fastify no [`src/index.ts`](src/index.ts):

```typescript
app.register(rotaExemplo);
```

Cada arquivo de rota exporta uma função `async (app: FastifyInstance)` que registra os endpoints.

### 4.3 Padrão de IDs

- IDs são gerados com [`makeId()`](src/utils/make-id.ts) que usa `crypto.randomUUID()` (formato UUID v4)
- IDs são armazenados como `text` no SQLite

### 4.4 Padrão de Timestamps

- Campos `createdAt` e `updatedAt` usam `text` com `.default(sql\`CURRENT_TIMESTAMP\`)`
- Formato: timestamp SQL padrão do SQLite

### 4.5 Padrão de Tratamento de Erros

Classes de erro customizadas em [`src/errors/`](src/errors/):

- [`ResourceNotFoundError`](src/errors/resource-not-found-error.ts): Recurso não encontrado (404)
- [`UserAlreadyExistsError`](src/errors/user-already-exists-error.ts): Conflito de email único (409)
- [`InvalidCredentialsError`](src/errors/invalid-credentials-error.ts): Credenciais inválidas (401)
- [`PersonAlreadyExistsError`](src/errors/person-already-exists-error.ts): CPF já cadastrado (409)

Erros são lançados nos services e capturados nas routes com `try/catch`.

### 4.6 Padrão de Validação

Usa **Zod** nas rotas para validar:

- `request.body` (criação/atualização)
- `request.params` (IDs)
- `request.query` (filtros, paginação)

## 5. Sistema de Autenticação e Autorização

### 5.1 Autenticação (JWT)

- **Login:** Rota [`POST /login`](src/routes/auth.ts) - valida email/senha, retorna JWT
- **Registro:** Rota [`POST /register`](src/routes/auth.ts) - cria usuário com senha hasheada (bcryptjs)
- **Token:** JWT assinado com secret do `.env`, contém `sub` (userId) e `role`
- **Plugin:** `@fastify/jwt` registrado no Fastify

### 5.2 Middlewares

- [`verifyJwt`](src/middlewares/auth.ts): Verifica se o token JWT é válido (`request.jwtVerify()`)
- [`verifyPermission`](src/middlewares/verify-permission.ts): Verifica se o role do usuário tem a permissão necessária (entity + action)
  - Busca `rolePermissions` com join em `permissions`
  - Compara `entity` e `action` da permissão requerida

### 5.3 Modelo RBAC (Role-Based Access Control)

```
User → Role → RolePermissions → Permissions
```

**Ações possíveis:** `create`, `read`, `update`, `delete`, `manage` (todas)

**Entidades com permissões:** `user`, `family`, `person`, `attendance`, `demand`, `case_report`, `news`, `role`, `permission`, `role_permission`, `dashboard`, `casos_demanda_mse`

### 5.4 Roles Pré-configuradas (via seeds/migrations)

Os seeds nas migrações configuram:

- Permissões para cada entidade × ação
- Associações role ↔ permission para roles padrão

## 6. Entidades e Rotas (CRUD)

### 6.1 Usuários ([`src/routes/users/`](src/routes/users/))

| Método | Rota              | Descrição                  |
| ------ | ----------------- | -------------------------- |
| GET    | `/users`          | Listar usuários (paginado) |
| GET    | `/users/:id`      | Buscar por ID              |
| PUT    | `/users/:id`      | Atualizar usuário          |
| DELETE | `/users/:id`      | Deletar usuário            |
| PATCH  | `/users/:id/role` | Atualizar role do usuário  |

### 6.2 Pessoas ([`src/routes/people/`](src/routes/people/))

| Método | Rota          | Descrição                      |
| ------ | ------------- | ------------------------------ |
| POST   | `/people`     | Criar pessoa                   |
| GET    | `/people`     | Listar com filtros e paginação |
| GET    | `/people/:id` | Buscar por ID                  |
| PUT    | `/people/:id` | Atualizar pessoa               |
| DELETE | `/people/:id` | Deletar pessoa                 |

**Filtros disponíveis:** `name`, `cpf`, `familyId`, com `page` e `limit`

### 6.3 Famílias ([`src/routes/families/`](src/routes/families/))

| Método | Rota            | Descrição                      |
| ------ | --------------- | ------------------------------ |
| POST   | `/families`     | Criar família                  |
| GET    | `/families`     | Listar com filtros e paginação |
| GET    | `/families/:id` | Buscar por ID                  |
| PUT    | `/families/:id` | Atualizar família              |
| DELETE | `/families/:id` | Deletar família                |

### 6.4 Atendimentos ([`src/routes/attendances/`](src/routes/attendances/))

| Método | Rota               | Descrição                      |
| ------ | ------------------ | ------------------------------ |
| POST   | `/attendances`     | Criar atendimento              |
| GET    | `/attendances`     | Listar com filtros e paginação |
| GET    | `/attendances/:id` | Buscar por ID                  |
| PUT    | `/attendances/:id` | Atualizar atendimento          |
| DELETE | `/attendances/:id` | Deletar atendimento            |

**Filtros:** `personId`, `userId`, `type`, `startDate`, `endDate`

### 6.5 Demandas ([`src/routes/demands/`](src/routes/demands/))

| Método | Rota           | Descrição         |
| ------ | -------------- | ----------------- |
| POST   | `/demands`     | Criar demanda     |
| GET    | `/demands`     | Listar (paginado) |
| GET    | `/demands/:id` | Buscar por ID     |
| PUT    | `/demands/:id` | Atualizar demanda |
| DELETE | `/demands/:id` | Deletar demanda   |

**Status:** `pendente`, `em_andamento`, `concluida`, `cancelada`
**Prioridade:** `baixa`, `media`, `alta`, `urgente`

### 6.6 Relatórios de Caso ([`src/routes/case-reports/`](src/routes/case-reports/))

| Método | Rota                | Descrição           |
| ------ | ------------------- | ------------------- |
| POST   | `/case-reports`     | Criar relatório     |
| GET    | `/case-reports`     | Listar (paginado)   |
| GET    | `/case-reports/:id` | Buscar por ID       |
| PUT    | `/case-reports/:id` | Atualizar relatório |
| DELETE | `/case-reports/:id` | Deletar relatório   |

### 6.7 Notícias ([`src/routes/news/`](src/routes/news/))

| Método | Rota        | Descrição         |
| ------ | ----------- | ----------------- |
| POST   | `/news`     | Criar notícia     |
| GET    | `/news`     | Listar notícias   |
| GET    | `/news/:id` | Buscar por ID     |
| PUT    | `/news/:id` | Atualizar notícia |
| DELETE | `/news/:id` | Deletar notícia   |

- Usa fallback de [news-fallback.json](news-fallback.json) para dados padrão
- Suporte a upload de imagem via multipart

### 6.8 Roles ([`src/routes/roles/`](src/routes/roles/))

| Método | Rota         | Descrição      |
| ------ | ------------ | -------------- |
| POST   | `/roles`     | Criar role     |
| GET    | `/roles`     | Listar roles   |
| GET    | `/roles/:id` | Buscar por ID  |
| PUT    | `/roles/:id` | Atualizar role |
| DELETE | `/roles/:id` | Deletar role   |

### 6.9 Permissions ([`src/routes/permissions/`](src/routes/permissions/))

| Método | Rota               | Descrição         |
| ------ | ------------------ | ----------------- |
| POST   | `/permissions`     | Criar permissão   |
| GET    | `/permissions`     | Listar permissões |
| GET    | `/permissions/:id` | Buscar por ID     |

### 6.10 Role Permissions ([`src/routes/role-permissions/`](src/routes/role-permissions/))

| Método | Rota                             | Descrição                    |
| ------ | -------------------------------- | ---------------------------- |
| POST   | `/role-permissions`              | Associar permissão a role    |
| GET    | `/role-permissions`              | Listar associações           |
| GET    | `/role-permissions/role/:roleId` | Listar permissões de um role |
| DELETE | `/role-permissions/:id`          | Remover associação           |

### 6.11 Dashboard ([`src/routes/dashboard/`](src/routes/dashboard/))

| Método | Rota         | Descrição                   |
| ------ | ------------ | --------------------------- |
| GET    | `/dashboard` | Retorna contagens agregadas |

Retorna: `totalFamilies`, `totalPeople`, `totalAttendances`, `totalDemands`, `totalCaseReports`

### 6.12 Casos Demanda MSE ([`src/routes/casos-demanda-mse/`](src/routes/casos-demanda-mse/))

| Método | Rota                     | Descrição          |
| ------ | ------------------------ | ------------------ |
| POST   | `/casos-demanda-mse`     | Criar caso MSE     |
| GET    | `/casos-demanda-mse`     | Listar casos MSE   |
| GET    | `/casos-demanda-mse/:id` | Buscar por ID      |
| PUT    | `/casos-demanda-mse/:id` | Atualizar caso MSE |
| DELETE | `/casos-demanda-mse/:id` | Deletar caso MSE   |

## 7. Padrões de Código Recorrentes

### 7.1 Repository Pattern

Todos os repositories seguem a mesma estrutura:

```typescript
// Criação
async create(data) {
  const id = makeId();
  await db.insert(tabela).values({ id, ...data });
  return buscarPorId(id);
}

// Listagem com paginação
async findAll(page, limit, filters?) {
  const offset = (page - 1) * limit;
  const query = db.select().from(tabela).limit(limit).offset(offset);
  // aplicar filtros com where() e like()
}

// Busca por ID
async findById(id) {
  return db.select().from(tabela).where(eq(tabela.id, id));
}

// Atualização
async update(id, data) {
  await db.update(tabela).set({ ...data, updatedAt: new Date() }).where(eq(tabela.id, id));
}

// Deleção
async delete(id) {
  await db.delete(tabela).where(eq(tabela.id, id));
}
```

### 7.2 Service Pattern

```typescript
async execute(params) {
  // 1. Validações de negócio
  // 2. Verificar existência de recurso (lança ResourceNotFoundError)
  // 3. Verificar unicidade (lança ConflictError)
  // 4. Chamar repository
  // 5. Retornar resultado
}
```

### 7.3 Route Pattern

```typescript
async function route(app: FastifyInstance) {
  app.post('/rota', { onRequest: [verifyJwt] }, async (request, reply) => {
    const schema = z.object({ /* validação */ });
    const data = schema.parse(request.body);
    try {
      const result = await service.execute(data);
      return reply.status(201).send(result);
    } catch (error) {
      if (error instanceof SomeError) {
        return reply.status(4xx).send({ message: error.message });
      }
      throw error;
    }
  });
}
```

### 7.4 Paginação

Padrão uniforme em todas as listagens:

- Query params: `page` (default: 1), `limit` (default: 10)
- Cálculo: `offset = (page - 1) * limit`
- Resposta inclui: `data`, `total`, `page`, `limit`, `totalPages`

## 8. Configurações

### 8.1 Variáveis de Ambiente ([`src/env.ts`](src/env.ts))

Validadas com Zod:

- `JWT_SECRET`: Secret para assinatura JWT
- `DATABASE_URL`: Caminho do arquivo SQLite
- `PORT`: Porta do servidor (default: 3333)

### 8.2 CORS ([`src/index.ts`](src/index.ts))

- Configurado via `@fastify/cors`
- Permite todas as origens (`origin: true`) — desenvolvimento

### 8.3 Uploads

- Diretório: [`uploads/`](uploads/)
- Servido como estático via `@fastify/static`
- Usado para imagens de notícias

## 9. Migrações

Localizadas em [`migrations/`](migrations/):

1. Adicionar coluna `roleId` a users
2. Seed de permissões por entidade
3. Seeds adicionais de permissões
4. Seed de role-permissions
5. Atualizar roleId de usuários existentes
6. Seed de casos/demandas MSE

Executadas via `drizzle-kit` com `npx drizzle-kit migrate`.

## 10. Scripts do Projeto ([`package.json`](package.json))

```json
{
  "dev": "tsx watch src/index.ts", // Desenvolvimento com hot reload
  "build": "tsup src", // Build de produção
  "start": "node dist/index.js", // Produção
  "db:generate": "drizzle-kit generate", // Gerar migrações
  "db:migrate": "drizzle-kit migrate", // Executar migrações
  "db:studio": "drizzle-kit studio" // Interface visual do banco
}
```

## 11. Regras de Negócio Importantes

1. **CPF único:** Cada pessoa deve ter CPF único no sistema
2. **Email único:** Cada usuário deve ter email único
3. **Responsável familiar:** Uma família tem um `responsibleId` referenciando uma pessoa
4. **Atendimento vinculado:** Todo atendimento deve estar vinculado a uma pessoa e a um usuário (técnico)
5. **Demandas com status:** Fluxo de status: pendente → em_andamento → concluida/cancelada
6. **Permissões granulares:** Cada ação em cada entidade é controlada individualmente por role
7. **Senha hasheada:** Senhas são armazenadas com bcryptjs (hash de 6 rounds)
8. **JWT no sub:** O ID do usuário vai no campo `sub` do token, e o `role` é incluído no payload
