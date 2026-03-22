// backend/src/db.ts

import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

let isDbInitialized = false;

export async function initDb() {
  if (isDbInitialized) {  
    return pool;
  }

  const client = await pool.connect();
  console.log("🐘 Banco de Dados: Conectado com sucesso.");

  try {
    // --- 1. UNIDADES ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS unidades (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ
      );
    `.trim());

    // --- 2. USERS ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nome_completo TEXT,
        cargo TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        role VARCHAR(50),
        unit_id INTEGER REFERENCES unidades(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ
      );
    `.trim());

    // --- 3. ROLES & PERMISSIONS ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ
      );
    `.trim());

    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ
      );
    `.trim());

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, role_id)
      );
    `.trim());

    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      );
    `.trim());

    // --- 4. CASOS ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS casos (
        id SERIAL PRIMARY KEY,
        data_cad DATE NOT NULL,
        tec_ref TEXT NOT NULL,
        nome TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'Ativo',
        dados_completos JSONB,
        user_id INTEGER NOT NULL REFERENCES users(id),
        unit_id INTEGER NOT NULL REFERENCES unidades(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ
      );
    `.trim());

    // --- 5. REGISTROS MSE ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS registros_mse (
        id SERIAL PRIMARY KEY,
        nome_adolescente VARCHAR(255) NOT NULL,
        data_nascimento DATE NOT NULL,
        nis VARCHAR(11),
        responsavel VARCHAR(255),
        endereco TEXT,
        contato VARCHAR(50),
        mse_tipo VARCHAR(50) NOT NULL,
        mse_data_inicio DATE NOT NULL,
        mse_duracao_meses INTEGER NOT NULL,
        situacao VARCHAR(50) NOT NULL,
        local_descumprimento TEXT,
        pia_data_elaboracao DATE,
        pia_status VARCHAR(50) NOT NULL DEFAULT 'Em Análise',
        registrado_por_id INTEGER NOT NULL REFERENCES users(id),
        unit_id INTEGER NOT NULL DEFAULT 1 REFERENCES unidades(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ
      );
    `.trim());

    // --- 6. DEMANDAS ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS demandas (
        id SERIAL PRIMARY KEY,
        tipo_documento VARCHAR(100) NOT NULL,
        instituicao_origem TEXT NOT NULL,
        numero_documento VARCHAR(100),
        data_recebimento DATE NOT NULL,
        prazo_resposta DATE,
        assunto TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'Nova',
        caso_associado_id INTEGER REFERENCES casos(id) ON DELETE SET NULL,
        tecnico_designado_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        registrado_por_id INTEGER NOT NULL REFERENCES users(id),
        unit_id INTEGER REFERENCES unidades(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ
      );
    `.trim());

    // --- 7. ACOMPANHAMENTOS ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS acompanhamentos (
        id SERIAL PRIMARY KEY,
        texto TEXT NOT NULL,
        caso_id INTEGER NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ
      );
    `.trim());

    // --- 8. ENCAMINHAMENTOS ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS encaminhamentos (
        id SERIAL PRIMARY KEY,
        caso_id INTEGER NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        servico_destino VARCHAR(255) NOT NULL,
        data_encaminhamento DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Pendente',
        data_retorno DATE,
        observacoes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ
      );
    `.trim());

    // --- 9. ANEXOS ---
    // Nota: Mantido 'demandaId' e 'demanda_id' conforme o modelo fornecido
    await client.query(`
      CREATE TABLE IF NOT EXISTS anexos (
        id SERIAL PRIMARY KEY,
        caso_id INTEGER REFERENCES casos(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        demanda_id INTEGER REFERENCES demandas(id) ON DELETE CASCADE,
        "demandaId" INTEGER REFERENCES demandas(id) ON DELETE CASCADE,
        nome_original VARCHAR(255) NOT NULL,
        nome_armazenado VARCHAR(255) UNIQUE NOT NULL,
        caminho_arquivo VARCHAR(255) NOT NULL,
        tipo_arquivo VARCHAR(100) NOT NULL,
        tamanho_arquivo INTEGER NOT NULL,
        descricao TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ
      );
    `.trim());

    // --- 10. LOGS ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER REFERENCES users(id),
        username TEXT,
        action TEXT NOT NULL,
        details JSONB
      );
    `.trim());

    // --- ÍNDICES E AJUSTES FINAIS ---
    await client.query(`CREATE INDEX IF NOT EXISTS idx_casos_dados_completos_gin ON casos USING GIN (dados_completos);`.trim());

    // Script de migração para colunas faltantes em tabelas existentes
    const tablesToUpdate = ['unidades', 'users', 'roles', 'permissions', 'casos', 'registros_mse', 'demandas', 'acompanhamentos', 'encaminhamentos', 'anexos'];
    for (const table of tablesToUpdate) {
      await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`.trim());
      await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`.trim());
    }

    console.log("✅ Banco de Dados: Modelo de dados (auditoria e snake_case) sincronizado.");
    isDbInitialized = true;
  } catch (err: any) {
    console.error("❌ Banco de Dados: Erro na inicialização.", err);
    throw err;
  } finally {
    client.release();
  }

  return pool;
}

export default pool;