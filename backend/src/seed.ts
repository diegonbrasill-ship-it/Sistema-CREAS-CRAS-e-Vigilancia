// backend/src/seed.ts
import pool from "./db";

const UNIDADES_DISPONIVEIS = [
    { id: 1, name: 'CREAS', type: 'CREAS' },
    { id: 2, name: 'CRAS Geralda Medeiros', type: 'CRAS' },
    { id: 3, name: 'CRAS Mariana Alves', type: 'CRAS' },
    { id: 4, name: 'CRAS Matheus Leitão', type: 'CRAS' },
    { id: 5, name: 'CRAS Severina Celestino', type: 'CRAS' },
    { id: 6, name: 'Vigilancia SocioAssistencial', type: 'Vigilancia' },
    { id: 7, name: 'Centro POP', type: 'Centro POP' },
    { id: 8, name: 'Conselho Tutelar Norte', type: 'Conselho Tutelar' },
];

const PROFILE_OPTIONS = [
    { name: "tecnico_superior", description: "Técnico de Nível Superior" },
    { name: "tecnico_medio", description: "Técnico de Nível Médio" },
    { name: "coordenador", description: "Coordenador(a) CREAS" },
    { name: "gestor", description: "Secretário(a) / Gestor Geral" },
    { name: "vigilancia", description: "Vigilância Socioassistencial" },
    { name: "coordenador_cras", description: "Coordenador(a) CRAS" },
    { name: "tecnico_cras", description: "Técnico(a) CRAS" },
];

async function seed() {
    const client = await pool.connect();
    try {
        console.log("🌱 Iniciando o seed de dados...");

        // 1. Inserindo Unidades
        for (const unidade of UNIDADES_DISPONIVEIS) {
            await client.query(`
        INSERT INTO unidades (id, name, type)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE 
        SET name = EXCLUDED.name, type = EXCLUDED.type
      `, [unidade.id, unidade.name, unidade.type]);
        }
        console.log("✅ Unidades inseridas/atualizadas.");

        // 2. Inserindo Roles (Cargos/Perfis)
        for (const role of PROFILE_OPTIONS) {
            await client.query(`
        INSERT INTO roles (name, description)
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE 
        SET description = EXCLUDED.description
      `, [role.name, role.description]);
        }
        console.log("✅ Cargos (roles) inseridos/atualizados.");

        console.log("🚀 Seed finalizado com sucesso!");
    } catch (err) {
        console.error("❌ Erro ao rodar o seed:", err);
    } finally {
        client.release();
        process.exit();
    }
}

seed();