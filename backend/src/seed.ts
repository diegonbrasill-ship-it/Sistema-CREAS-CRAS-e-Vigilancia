// backend/src/seed.ts
import pool from "./db";
import bcrypt from "bcryptjs";

const TEST_MANAGER_ACCOUNT = {
    username: "admin",
    password: "admin",
    role: "gestor",
    nome_completo: "admin",
    cargo: "Gestor",
    unit_id: 1,
};

async function seed() {
    const client = await pool.connect();
    try {
        console.log("🌱 Iniciando seed do usuário admin de teste...");

        const gestorRoleResult = await client.query<{ id: number }>(`
            SELECT id
            FROM roles
            WHERE name = $1
            LIMIT 1
        `, [TEST_MANAGER_ACCOUNT.role]);

        if (gestorRoleResult.rowCount === 0) {
            throw new Error("Role 'gestor' não encontrada. Rode as migrations antes da seed.");
        }

        const passwordHash = await bcrypt.hash(TEST_MANAGER_ACCOUNT.password, 10);
        const gestorRoleId = gestorRoleResult.rows[0].id;

        await client.query(`
            INSERT INTO users (
                username,
                password_hash,
                nome_completo,
                cargo,
                role,
                is_active,
                unit_id,
                role_id,
                deleted_at
            )
            VALUES ($1, $2, $3, $4, $5, true, $6, $7, NULL)
            ON CONFLICT (username) DO UPDATE SET
                password_hash = EXCLUDED.password_hash,
                nome_completo = EXCLUDED.nome_completo,
                cargo = EXCLUDED.cargo,
                role = EXCLUDED.role,
                is_active = EXCLUDED.is_active,
                unit_id = EXCLUDED.unit_id,
                role_id = EXCLUDED.role_id,
                deleted_at = EXCLUDED.deleted_at
        `, [
            TEST_MANAGER_ACCOUNT.username,
            passwordHash,
            TEST_MANAGER_ACCOUNT.nome_completo,
            TEST_MANAGER_ACCOUNT.cargo,
            TEST_MANAGER_ACCOUNT.role,
            TEST_MANAGER_ACCOUNT.unit_id,
            gestorRoleId,
        ]);
        console.log("✅ Usuário admin de teste inserido/atualizado.");

        console.log("🚀 Seed finalizado com sucesso!");
    } catch (err) {
        console.error("❌ Erro ao rodar o seed:", err);
    } finally {
        client.release();
        process.exit();
    }
}

seed();
