import { Pool } from "pg";

const useSsl = (process.env.DB_SSL || "").toLowerCase() === "true";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl
    ? {
        rejectUnauthorized: false,
      }
    : undefined,
});

const EXPECTED_SCHEMA: Record<string, string[]> = {
  unidades: ["id", "name", "type", "created_at", "updated_at", "deleted_at"],
  users: [
    "id",
    "username",
    "password_hash",
    "nome_completo",
    "cargo",
    "role",
    "is_active",
    "unit_id",
    "created_at",
    "updated_at",
    "deleted_at",
    "role_id",
  ],
  roles: ["id", "name", "description", "created_at", "updated_at", "deleted_at"],
  permissions: ["id", "name", "description", "created_at", "updated_at", "deleted_at"],
  user_roles: ["user_id", "role_id"],
  role_permissions: ["role_id", "permission_id"],
  casos: [
    "id",
    "data_cad",
    "tec_ref",
    "nome",
    "status",
    "dados_completos",
    "user_id",
    "unit_id",
    "created_at",
    "updated_at",
    "deleted_at",
  ],
  registros_mse: [
    "id",
    "nome_adolescente",
    "data_nascimento",
    "nis",
    "responsavel",
    "endereco",
    "contato",
    "mse_tipo",
    "mse_data_inicio",
    "mse_duracao_meses",
    "situacao",
    "local_descumprimento",
    "pia_data_elaboracao",
    "pia_status",
    "registrado_por_id",
    "unit_id",
    "created_at",
    "updated_at",
    "deleted_at",
  ],
  demandas: [
    "id",
    "tipo_documento",
    "instituicao_origem",
    "numero_documento",
    "data_recebimento",
    "prazo_resposta",
    "assunto",
    "status",
    "caso_associado_id",
    "tecnico_designado_id",
    "registrado_por_id",
    "unit_id",
    "created_at",
    "updated_at",
    "deleted_at",
  ],
  acompanhamentos: ["id", "texto", "caso_id", "user_id", "created_at", "updated_at", "deleted_at"],
  encaminhamentos: [
    "id",
    "caso_id",
    "user_id",
    "servico_destino",
    "data_encaminhamento",
    "status",
    "data_retorno",
    "observacoes",
    "created_at",
    "updated_at",
    "deleted_at",
  ],
  anexos: [
    "id",
    "caso_id",
    "user_id",
    "demanda_id",
    "demandaId",
    "nome_original",
    "nome_armazenado",
    "caminho_arquivo",
    "tipo_arquivo",
    "tamanho_arquivo",
    "descricao",
    "created_at",
    "updated_at",
    "deleted_at",
  ],
  logs: ["id", "timestamp", "user_id", "username", "action", "details"],
};

const REQUIRED_UNIDADES = [
  { id: 1, name: "CREAS", type: "CREAS" },
  { id: 2, name: "CRAS Geralda Medeiros", type: "CRAS" },
  { id: 3, name: "CRAS Mariana Alves", type: "CRAS" },
  { id: 4, name: "CRAS Matheus Leitão", type: "CRAS" },
  { id: 5, name: "CRAS Severina Celestino", type: "CRAS" },
  { id: 6, name: "Vigilancia SocioAssistencial", type: "Vigilancia" },
  { id: 7, name: "Centro POP", type: "Centro POP" },
  { id: 8, name: "Conselho Tutelar Norte", type: "Conselho Tutelar" },
];

const REQUIRED_ROLES = [
  "tecnico_superior",
  "tecnico_medio",
  "coordenador_creas",
  "gestor",
  "vigilancia",
  "coordenador_cras",
  "tecnico_cras",
];

const REQUIRED_PERMISSIONS = [
  "users.create",
  "users.read",
  "users.edit",
  "users.delete",
  "users.archive",
  "units.create",
  "units.read",
  "units.edit",
  "units.delete",
  "units.archive",
  "casos.create",
  "casos.read",
  "casos.edit",
  "casos.delete",
  "casos.archive",
  "mse.create",
  "mse.read",
  "mse.edit",
  "mse.delete",
  "mse.archive",
  "demandas.create",
  "demandas.read",
  "demandas.edit",
  "demandas.delete",
  "demandas.archive",
  "anexos.create",
  "anexos.read",
  "anexos.edit",
  "anexos.delete",
  "anexos.archive",
  "encaminhamentos.create",
  "encaminhamentos.read",
  "encaminhamentos.edit",
  "encaminhamentos.delete",
  "encaminhamentos.archive",
  "screen.dashboard.access",
  "screen.vigilancia.access",
  "screen.integrations.access",
  "screen.relatorios.access",
];

const EXPECTED_ROLE_PERMISSION_COUNTS: Record<string, number> = {
  gestor: 39,
  coordenador_creas: 35,
  coordenador_cras: 35,
  vigilancia: 4,
  tecnico_superior: 30,
  tecnico_medio: 30,
  tecnico_cras: 30,
};

describe("Schema e dados obrigatorios", () => {
  beforeAll(async () => {
    if (process.env.APP_ENV === "prod") {
      throw new Error("A suite de schema foi bloqueada em producao.");
    }

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL ausente para a suite de schema.");
    }

    try {
      await pool.query("SELECT 1");
    } catch (error) {
      throw new Error(
        "Banco indisponivel para a suite de schema. Use o mesmo ambiente do banco que voce quer validar, por exemplo: npm run test:schema:dev ou npm run test:schema:test"
      );
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it("cria todas as tabelas esperadas", async () => {
    const result = await pool.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `);

    const actualTables = new Set(result.rows.map((row) => row.table_name));

    for (const tableName of Object.keys(EXPECTED_SCHEMA)) {
      expect(actualTables.has(tableName)).toBe(true);
    }
  });

  it("cria todas as colunas esperadas em cada tabela", async () => {
    for (const [tableName, expectedColumns] of Object.entries(EXPECTED_SCHEMA)) {
      const result = await pool.query<{ column_name: string }>(
        `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = $1
          ORDER BY ordinal_position
        `,
        [tableName]
      );

      expect(result.rows.map((row) => row.column_name)).toEqual(expectedColumns);
    }
  });

  it("insere as unidades obrigatorias", async () => {
    const result = await pool.query<{ id: number; name: string; type: string }>(`
      SELECT id, name, type
      FROM unidades
      WHERE id BETWEEN 1 AND 8
      ORDER BY id
    `);

    expect(result.rows).toEqual(REQUIRED_UNIDADES);
  });

  it("insere os cargos obrigatorios", async () => {
    const result = await pool.query<{ name: string }>(
      `
        SELECT name
        FROM roles
        WHERE name = ANY($1)
        ORDER BY name
      `,
      [REQUIRED_ROLES]
    );

    expect(result.rows.map((row) => row.name)).toEqual([...REQUIRED_ROLES].sort());
  });

  it("insere as permissoes obrigatorias", async () => {
    const result = await pool.query<{ name: string }>(
      `
        SELECT name
        FROM permissions
        WHERE name = ANY($1)
        ORDER BY name
      `,
      [REQUIRED_PERMISSIONS]
    );

    expect(result.rows.map((row) => row.name)).toEqual([...REQUIRED_PERMISSIONS].sort());
  });

  it("associa as permissoes obrigatorias por role", async () => {
    const result = await pool.query<{ role_name: string; permission_count: string }>(
      `
        SELECT r.name AS role_name, COUNT(rp.permission_id)::text AS permission_count
        FROM roles r
        LEFT JOIN role_permissions rp ON rp.role_id = r.id
        WHERE r.name = ANY($1)
        GROUP BY r.name
        ORDER BY r.name
      `,
      [Object.keys(EXPECTED_ROLE_PERMISSION_COUNTS)]
    );

    const actual = Object.fromEntries(
      result.rows.map((row) => [row.role_name, Number(row.permission_count)])
    );

    expect(actual).toEqual(EXPECTED_ROLE_PERMISSION_COUNTS);
  });
});
