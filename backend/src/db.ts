// backend/src/db.ts

import { Pool } from "pg";
import "./config/loadEnv";

const useSsl = (process.env.DB_SSL || "").toLowerCase() === "true";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl
    ? {
        rejectUnauthorized: false,
      }
    : undefined,
});

export async function initDb() {
  const client = await pool.connect();

  try {
    await client.query("SELECT 1");
    console.log("🐘 Banco de Dados: Conectado com sucesso.");
  } catch (err: any) {
    console.error("❌ Banco de Dados: Erro na conexão.", err);
    throw err;
  } finally {
    client.release();
  }

  return pool;
}

export default pool;
