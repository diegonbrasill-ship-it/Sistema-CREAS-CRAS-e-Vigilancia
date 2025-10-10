"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/seed.ts
const db_1 = require("./db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// DEFINIÇÃO DA UNIDADE DO USUÁRIO SEED
const COORDENADOR_UNIT_ID = 1;
async function seed() {
    const pool = await (0, db_1.initDb)();
    const client = await pool.connect();
    try {
        // =======================================================================
        // 📌 MUDANÇA CRÍTICA 1: GARANTINDO O ESQUEMA (PATCH)
        // Adiciona as colunas 'role' e 'unit_id' se não existirem, corrigindo o erro 500.
        // =======================================================================
        console.log("🛠️ Verificando e corrigindo o esquema da tabela 'users'...");
        // Tenta adicionar a coluna 'role' (se ela não existir)
        await client.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'users'::regclass AND attname = 'role') THEN
                    ALTER TABLE users ADD COLUMN role VARCHAR(50);
                    RAISE NOTICE 'Coluna role adicionada à tabela users.';
                END IF;
            END $$;
        `);
        // Tenta adicionar a coluna 'unit_id' (se ela não existir)
        await client.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'users'::regclass AND attname = 'unit_id') THEN
                    ALTER TABLE users ADD COLUMN unit_id INTEGER;
                    RAISE NOTICE 'Coluna unit_id adicionada à tabela users.';
                END IF;
            END $$;
        `);
        // 📌 CRÍTICO: Limpando a base para criar o cenário de UM login seguro
        await client.query(`TRUNCATE TABLE users RESTART IDENTITY CASCADE;`);
        console.log(`✅ Tabela 'users' limpa. Criando novo cenário.`);
        // Usuário gestor/coordenador único e seguro
        const username = "gestor"; // Usamos 'gestor' como desejado
        const password = "senha123";
        const nomeCompleto = "Gestor Geral SUAS";
        const cargo = "Gestor";
        const role = "gestor"; // Usamos 'gestor' como role
        // 📌 MUDANÇA CRÍTICA 2: CRIAÇÃO DO ÚNICO USUÁRIO
        const hash = await bcryptjs_1.default.hash(password, 10);
        const insertUser = await client.query(`INSERT INTO users (username, passwordHash, nome_completo, cargo, is_active, role, unit_id)
       VALUES ($1, $2, $3, $4, true, $5, $6)
       RETURNING id`, [username, hash, nomeCompleto, cargo, role, COORDENADOR_UNIT_ID]);
        const userId = insertUser.rows[0].id;
        console.log(`✅ Usuário único '${username}' criado com sucesso (Unit ID ${COORDENADOR_UNIT_ID}).`);
        // Garante que a role exista (embora 'gestor' não precise de user_roles se usarmos a coluna 'role')
        const roleRes = await client.query(`INSERT INTO roles (name, description)
       VALUES ($1, $2)
       ON CONFLICT (name) DO NOTHING
       RETURNING id`, ["GESTOR", "Usuário com perfil de gestão máxima"]);
        let roleId = roleRes.rows[0]?.id;
        if (!roleId) {
            const existingRole = await client.query("SELECT id FROM roles WHERE name = $1", ["GESTOR"]);
            roleId = existingRole.rows[0].id;
        }
        // Vincular user ↔ role (mantido para compatibilidade, mas a coluna 'role' é a fonte de verdade)
        if (userId && roleId) {
            await client.query(`INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`, [userId, roleId]);
            console.log(`🔗 Usuário '${username}' vinculado à role 'GESTOR'.`);
        }
    }
    catch (err) {
        console.error("❌ Erro no seed (verifique se initDb() criou a tabela 'users'):", err);
    }
    finally {
        client.release();
        process.exit(0);
    }
}
seed();
