// backend/src/seed.ts
import { initDb } from "./db";
import bcrypt from "bcryptjs"; // use o mesmo bcryptjs que está no db.ts

async function seed() {
  const pool = await initDb(); // garante criação das tabelas e seed inicial
  const client = await pool.connect();

  try {
    // Usuário coordenador adicional (exemplo)
    const username = "coordenador";
    const password = "senha123";
    const role = "coordenador";

    // Verifica se já existe
    const res = await client.query("SELECT id FROM users WHERE username = $1", [username]);

    if (res.rowCount === 0) {
      const hash = await bcrypt.hash(password, 10);
      await client.query(
        `INSERT INTO users (username, passwordHash, role) VALUES ($1, $2, $3)`,
        [username, hash, role]
      );
      console.log(`✅ Usuário '${username}' criado.`);
    } else {
      console.log(`ℹ️ Usuário '${username}' já existe, não será recriado.`);
    }
  } catch (err) {
    console.error("❌ Erro no seed:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();

