// backend/src/db.ts
import { Pool } from "pg";
import bcrypt from "bcryptjs";

// Sua configuração de conexão
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'senha123',
  port: 5433,
});

// Sua lógica de inicialização
let isDbInitialized = false;

export async function initDb() {
  if (isDbInitialized) {
    return pool;
  }

  const client = await pool.connect();
  console.log("🐘 Conectado ao PostgreSQL com sucesso!");

  try {
    // Tabela 'users'
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        role TEXT NOT NULL
      );
    `);
    
    // Adicionando as colunas de perfil
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS nome_completo TEXT;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cargo TEXT;`);
    
    // ========================================================
    // 📌 1. ADICIONANDO A NOVA COLUNA DE STATUS À TABELA 'users'
    // ========================================================
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;`);
    console.log("Tabela 'users' verificada/atualizada com a coluna 'is_active'.");
    
    // Tabela 'casos'
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
    `);
    console.log("Tabela 'casos' verificada/criada.");

    // Tabela 'logs'
    await client.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "userId" INTEGER REFERENCES users(id),
        username TEXT,
        action TEXT NOT NULL,
        details JSONB
      );
    `);
    console.log("Tabela 'logs' verificada/criada.");
    
    // Tabela 'acompanhamentos'
    await client.query(`
      CREATE TABLE IF NOT EXISTS acompanhamentos (
        id SERIAL PRIMARY KEY,
        texto TEXT NOT NULL,
        data TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "casoId" INTEGER NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
        "userId" INTEGER NOT NULL REFERENCES users(id)
      );
    `);
    console.log("Tabela 'acompanhamentos' verificada/criada.");

    // Tabela 'encaminhamentos'
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
    `);
    console.log("Tabela 'encaminhamentos' verificada/criada.");

    // Tabela 'anexos'
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
    `);
    console.log("Tabela 'anexos' verificada/criada.");
    
    // Tabela 'demandas'
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
    `);
    console.log("Tabela 'demandas' verificada/criada.");

    // Ajustes na tabela 'anexos'
    await client.query(`ALTER TABLE anexos ADD COLUMN IF NOT EXISTS "demandaId" INTEGER REFERENCES demandas(id) ON DELETE CASCADE;`);
    await client.query(`ALTER TABLE anexos ALTER COLUMN "casoId" DROP NOT NULL;`);
    console.log("Tabela 'anexos' atualizada: 'casoId' agora permite nulos e 'demandaId' existe.");

    // ÍNDICE GIN
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_casos_dados_completos_gin
      ON casos USING GIN (dados_completos);
    `);
    console.log("Índice GIN em 'casos.dados_completos' verificado/criado.");

    // ========================================================
    // 📌 2. ATUALIZAÇÃO DO SEED DE USUÁRIOS COM O CAMPO 'is_active'
    // ========================================================
    const seeds = [
      { username: "coordenador", password: "senha123", role: "coordenador", nome_completo: "Maria Souza", cargo: "Coordenadora do CREAS" },
      { username: "gestor", password: "senha123", role: "gestor", nome_completo: "Carlos Andrade", cargo: "Gestor da Proteção Social" },
      { username: "tecnico", password: "senha123", role: "tecnico", nome_completo: "João Paulo", cargo: "Psicólogo" },
      { username: "vigilancia", password: "senha123", role: "vigilancia", nome_completo: "Ana Costa", cargo: "Vigilância Socioassistencial" }
    ];

    for (const s of seeds) {
      const res = await client.query("SELECT id FROM users WHERE username = $1", [s.username]);
      if (res.rowCount === 0) {
        const hash = await bcrypt.hash(s.password, 10);
        await client.query(
          // Adicionado 'is_active' na criação do usuário
          `INSERT INTO users (username, passwordHash, role, nome_completo, cargo, is_active) 
           VALUES ($1, $2, $3, $4, $5, true)`, 
          [s.username, hash, s.role, s.nome_completo, s.cargo]
        );
        console.log(`Usuário '${s.username}' criado.`);
      } else {
        // Garante que usuários existentes também tenham nome e cargo (sem alterar is_active)
        await client.query(
          `UPDATE users SET nome_completo = $1, cargo = $2 
           WHERE username = $3 AND (nome_completo IS NULL OR cargo IS NULL)`,
          [s.nome_completo, s.cargo, s.username]
        );
      }
    }
    console.log("Seed de usuários verificado/atualizado.");


    isDbInitialized = true;
  } catch (err: any) {
    console.error("Erro durante a inicialização do banco de dados:", err);
    throw err;
  } finally {
    client.release();
  }

  return pool;
}

export default pool;




