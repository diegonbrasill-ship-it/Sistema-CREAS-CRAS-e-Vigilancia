// backend/src/seed.ts
import { initDb } from "./db";
import bcrypt from "bcryptjs"; // use o mesmo bcryptjs que está no db.ts

async function seed() {
  const pool = await initDb(); // garante criação das tabelas
  const client = await pool.connect();

  try {
    // Usuário coordenador adicional (exemplo)
    const username = "coordenador";
    const password = "senha123";
    const nomeCompleto = "Coordenador Geral";
    const cargo = "Coordenador";

    // Verifica se já existe o usuário
    const res = await client.query("SELECT id FROM users WHERE username = $1", [username]);

    let userId: number | undefined;

    if (res.rowCount === 0) {
      const hash = await bcrypt.hash(password, 10);
      const insertUser = await client.query(
        `INSERT INTO users (username, passwordHash, nome_completo, cargo, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id`,
        [username, hash, nomeCompleto, cargo]
      );
      userId = insertUser.rows[0].id;
      console.log(`✅ Usuário '${username}' criado.`);
    } else {
      userId = res.rows[0].id;
      console.log(`ℹ️ Usuário '${username}' já existe, não será recriado.`);
    }

    // Garantir que a role "COORDENADOR" existe
    const roleRes = await client.query(
      `INSERT INTO roles (name, description)
       VALUES ($1, $2)
       ON CONFLICT (name) DO NOTHING
       RETURNING id`,
      ["COORDENADOR", "Usuário com perfil de coordenação"]
    );

    let roleId: number | undefined = roleRes.rows[0]?.id;

    // Se já existia a role, buscar o id
    if (!roleId) {
      const existingRole = await client.query("SELECT id FROM roles WHERE name = $1", ["COORDENADOR"]);
      roleId = existingRole.rows[0].id;
    }

    // Vincular user ↔ role
    if (userId && roleId) {
      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [userId, roleId]
      );
      console.log(`🔗 Usuário '${username}' vinculado à role 'COORDENADOR'.`);
    }
  } catch (err) {
    console.error("❌ Erro no seed:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();


