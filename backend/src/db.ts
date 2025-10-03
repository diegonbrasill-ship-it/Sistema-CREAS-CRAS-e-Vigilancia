// backend/src/db.ts - VERSÃO FINAL ESTÁVEL E CORRIGIDA

import { Pool } from "pg";

// Configuração de conexão com PostgreSQL
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "postgres",
  password: "senha123",
  port: 5433,
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
    // -------------------------------------------------------------------
    // Ajuste inicial na tabela de usuários
    // -------------------------------------------------------------------
    await client.query(`ALTER TABLE users DROP COLUMN IF EXISTS role`);

    // -------------------------------------------------------------------
    // Tabela unidades
    // -------------------------------------------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS unidades (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL
      )
    `);

    // -------------------------------------------------------------------
    // Tabela users
    // -------------------------------------------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL
      )
    `);

    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS nome_completo TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cargo TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS unidade_id INTEGER REFERENCES unidades(id)`);

    console.log("Tabela 'users' e 'unidades' verificada/atualizada.");

    // -------------------------------------------------------------------
    // Roles e Permissões
    // -------------------------------------------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, role_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      )
    `);

    console.log("Tabelas de papéis e permissões verificadas/criadas.");

    // -------------------------------------------------------------------
    // Tabela casos
    // -------------------------------------------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS casos (
        id SERIAL PRIMARY KEY,
        "dataCad" DATE NOT NULL,
        "tecRef" TEXT NOT NULL,
        nome TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'Ativo',
        dados_completos JSONB,
        "userId" INTEGER NOT NULL REFERENCES users(id)
      )
    `);

    await client.query(`ALTER TABLE casos ADD COLUMN IF NOT EXISTS unidade_id INTEGER REFERENCES unidades(id)`);
    console.log("Tabela 'casos' verificada/criada.");

    // -------------------------------------------------------------------
    // Tabela logs
    // -------------------------------------------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "userId" INTEGER REFERENCES users(id),
        username TEXT,
        action TEXT NOT NULL,
        details JSONB
      )
    `);

    console.log("Tabela 'logs' verificada/criada.");

    // -------------------------------------------------------------------
    // Tabela acompanhamentos
    // -------------------------------------------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS acompanhamentos (
        id SERIAL PRIMARY KEY,
        texto TEXT NOT NULL,
        data TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "casoId" INTEGER NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
        "userId" INTEGER NOT NULL REFERENCES users(id)
      )
    `);

    console.log("Tabela 'acompanhamentos' verificada/criada.");

    // -------------------------------------------------------------------
    // Tabela encaminhamentos
    // -------------------------------------------------------------------
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
      )
    `);

    console.log("Tabela 'encaminhamentos' verificada/criada.");

    // -------------------------------------------------------------------
    // Tabela anexos
    // -------------------------------------------------------------------
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
      )
    `);

    console.log("Tabela 'anexos' verificada/criada.");

    // -------------------------------------------------------------------
    // Tabela demandas
    // -------------------------------------------------------------------
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
      )
    `);

    await client.query(`ALTER TABLE demandas ADD COLUMN IF NOT EXISTS unidade_id INTEGER REFERENCES unidades(id)`);
    console.log("Tabela 'demandas' verificada/criada.");

    // Ajustes extras em anexos
    await client.query(`ALTER TABLE anexos ADD COLUMN IF NOT EXISTS "demandaId" INTEGER REFERENCES demandas(id) ON DELETE CASCADE`);
    await client.query(`ALTER TABLE anexos ALTER COLUMN "casoId" DROP NOT NULL`);

    console.log("Tabela 'anexos' atualizada com 'demandaId' e 'casoId' opcional.");

    // -------------------------------------------------------------------
    // Índice GIN
    // -------------------------------------------------------------------
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_casos_dados_completos_gin
      ON casos USING GIN (dados_completos)
    `);

    console.log("Índice GIN em 'casos.dados_completos' verificado/criado.");

    isDbInitialized = true;
  } catch (err: any) {
    console.error("❌ Erro durante a inicialização do banco de dados:", err);
    throw err;
  } finally {
    client.release();
  }

  return pool;
}

export default pool;





