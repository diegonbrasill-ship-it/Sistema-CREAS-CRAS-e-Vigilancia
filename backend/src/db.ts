// backend/src/db.ts

import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Configuração de conexão com PostgreSQL usando variáveis de ambiente
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // necessário para conexão segura sem exigir CA
  },
});


// Flag de controle para inicialização única
let isDbInitialized = false;

export async function initDb() {
  if (isDbInitialized) {
    return pool;
  }

  const client = await pool.connect();
  console.log("🐘 Conectado ao PostgreSQL com sucesso!");

  try {
    // --- 1. Tabela unidades ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS unidades (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL
      );
    `.trim());

    // --- 2. Tabela users ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL
      );
    `.trim());

    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS nome_completo TEXT`.trim());
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cargo TEXT`.trim());
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`.trim());
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50)`.trim());
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES unidades(id)`.trim());

    console.log("Tabela 'users' e 'unidades' verificada/atualizada.");

    // --- 3. Tabelas roles e permissions ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT
      );
    `.trim());

    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT
      );
    `.trim());

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, role_id)
      );
    `.trim());

    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      );
    `.trim());

    console.log("Tabelas de papéis e permissões verificadas/criadas.");

    // --- 4. Tabela casos ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS casos (
        id SERIAL PRIMARY KEY,
        "dataCad" DATE NOT NULL,
        "tecRef" TEXT NOT NULL,
        nome TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'Ativo',
        dados_completos JSONB,
        "userId" INTEGER NOT NULL REFERENCES users(id)
      );
    `.trim());

    await client.query(`ALTER TABLE casos ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES unidades(id)`.trim());
    console.log("Tabela 'casos' verificada/criada.");

    // --- 5. Tabela registros_mse ---
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
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `.trim());
    console.log("Tabela 'registros_mse' verificada/criada.");

    // --- 6. Tabela logs ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "userId" INTEGER REFERENCES users(id),
        username TEXT,
        action TEXT NOT NULL,
        details JSONB
      );
    `.trim());

    // --- 7. Tabela acompanhamentos ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS acompanhamentos (
        id SERIAL PRIMARY KEY,
        texto TEXT NOT NULL,
        data TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "casoId" INTEGER NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
        "userId" INTEGER NOT NULL REFERENCES users(id)
      );
    `.trim());

    // --- 8. Tabela encaminhamentos ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS encaminhamentos (
        id SERIAL PRIMARY KEY,
        "casoId" INTEGER NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
        "userId" INTEGER NOT NULL REFERENCES users(id),
        "servicoDestino" VARCHAR(255) NOT NULL,
        "dataEncaminhamento" DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Pendente',
        "dataRetorno" DATE,
        observacoes TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `.trim());

    // --- 9. Tabela anexos ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS anexos (
        id SERIAL PRIMARY KEY,
        "casoId" INTEGER REFERENCES casos(id) ON DELETE CASCADE,
        "userId" INTEGER NOT NULL REFERENCES users(id),
        "nomeOriginal" VARCHAR(255) NOT NULL,
        "nomeArmazenado" VARCHAR(255) NOT NULL UNIQUE,
        "caminhoArquivo" VARCHAR(255) NOT NULL,
        "tipoArquivo" VARCHAR(100) NOT NULL,
        "tamanhoArquivo" INTEGER NOT NULL,
        descricao TEXT,
        "dataUpload" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `.trim());

    // --- 10. Tabela demandas ---
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
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `.trim());

    // --- 11. Alterações e índices ---
    await client.query(`ALTER TABLE demandas ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES unidades(id)`.trim());
    await client.query(`ALTER TABLE anexos ADD COLUMN IF NOT EXISTS "demandaId" INTEGER REFERENCES demandas(id) ON DELETE CASCADE`.trim());

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_casos_dados_completos_gin ON casos USING GIN (dados_completos);
    `.trim());

    console.log("✅ Esquema do banco de dados (todas as tabelas) verificado/criado com sucesso.");

    isDbInitialized = true;
  } catch (err: any) {
    console.error("❌ ERRO FATAL: Falha na execução do DDL.", err);
    throw err;
  } finally {
    client.release();
  }

  return pool;
}

export default pool;






