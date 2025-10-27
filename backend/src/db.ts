// backend/src/db.ts
// ⭐️ ATUALIZAÇÃO: Adicionadas colunas para a funcionalidade de Benefícios Eventuais (Requerimento/Parecer)

import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Configuração de conexão com PostgreSQL usando variáveis de ambiente
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

// Flag de controle para inicialização única
let isDbInitialized = false;

// ⭐️ CORREÇÃO: Todos os DDLs (CREATE/ALTER) foram movidos para linha única (sem quebras de linha). ⭐️

export async function initDb() {
  if (isDbInitialized) {
    return pool;
  }

  const client = await pool.connect();
  console.log("🐘 Conectado ao PostgreSQL com sucesso!");

  try {
    // --- 1. Tabela unidades ---
    await client.query(`CREATE TABLE IF NOT EXISTS unidades (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, type VARCHAR(50) NOT NULL);`);

    // --- 2. Tabela users (Base) ---
    await client.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, passwordHash TEXT NOT NULL);`);

    // Garante que todas as colunas existem
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS nome_completo TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cargo TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS unit_id INTEGER`); 
    
    // ⭐️ NOVO (B.E.): Adiciona CRESS para o parecer social  ⭐️
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cress VARCHAR(20)`); 
    
    // Ajusta a restrição de FK para SET NULL
    await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_unit_id_fkey`);
    await client.query(`ALTER TABLE users ADD CONSTRAINT users_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES unidades(id) ON DELETE SET NULL`);

    console.log("Tabela 'users' e 'unidades' verificada/atualizada.");

    // --- 3. Tabelas roles e permissions ---
    await client.query(`CREATE TABLE IF NOT EXISTS roles ( id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, description TEXT );`);
    await client.query(`CREATE TABLE IF NOT EXISTS permissions ( id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, description TEXT );`);
    await client.query(`CREATE TABLE IF NOT EXISTS user_roles ( user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE, PRIMARY KEY (user_id, role_id) );`);
    await client.query(`CREATE TABLE IF NOT EXISTS role_permissions ( role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE, permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE, PRIMARY KEY (role_id, permission_id) );`);
    console.log("Tabelas de papéis e permissões verificadas/criadas.");

    // --- 4. Tabela casos ---
    await client.query(`CREATE TABLE IF NOT EXISTS casos (id SERIAL PRIMARY KEY, "dataCad" DATE NOT NULL, "tecRef" TEXT, nome TEXT, status VARCHAR(50) NOT NULL DEFAULT 'Ativo', dados_completos JSONB);`);
    
    // Ajusta FKs para SET NULL
    await client.query(`ALTER TABLE casos ADD COLUMN IF NOT EXISTS "userId" INTEGER`); 
    await client.query(`ALTER TABLE casos ADD COLUMN IF NOT EXISTS unit_id INTEGER`);
    await client.query(`ALTER TABLE casos ALTER COLUMN "tecRef" DROP NOT NULL`); 
    
    await client.query(`ALTER TABLE casos DROP CONSTRAINT IF EXISTS casos_unit_id_fkey`);
    await client.query(`ALTER TABLE casos DROP CONSTRAINT IF EXISTS casos_userId_fkey`);
    
    await client.query(`ALTER TABLE casos ADD CONSTRAINT casos_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES unidades(id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE casos ADD CONSTRAINT casos_userId_fkey FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL`);
    
    console.log("Tabela 'casos' verificada/criada.");

    // --- 5. Tabela registros_mse ---
    await client.query(`CREATE TABLE IF NOT EXISTS registros_mse (id SERIAL PRIMARY KEY, nome_adolescente VARCHAR(255) NOT NULL, data_nascimento DATE, nis VARCHAR(15), responsavel VARCHAR(255), endereco TEXT, contato VARCHAR(20), mse_tipo VARCHAR(50) NOT NULL, mse_data_inicio DATE NOT NULL, mse_duracao_meses INTEGER, situacao VARCHAR(50) NOT NULL, local_descumprimento TEXT, pia_data_elaboracao DATE, pia_status VARCHAR(50) NOT NULL DEFAULT 'Em Análise');`);
    
    // Garante que as colunas de FK existam e não sejam NOT NULL
    await client.query(`ALTER TABLE registros_mse ADD COLUMN IF NOT EXISTS registrado_por_id INTEGER`);
    await client.query(`ALTER TABLE registros_mse ADD COLUMN IF NOT EXISTS unit_id INTEGER`);
    await client.query(`ALTER TABLE registros_mse ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`);
    await client.query(`ALTER TABLE registros_mse ALTER COLUMN unit_id DROP NOT NULL`); 
    await client.query(`ALTER TABLE registros_mse ALTER COLUMN registrado_por_id DROP NOT NULL`); 

    // Ajusta FOREIGN KEY ON DELETE SET NULL
    await client.query(`ALTER TABLE registros_mse DROP CONSTRAINT IF EXISTS registros_mse_registrado_por_id_fkey`);
    await client.query(`ALTER TABLE registros_mse DROP CONSTRAINT IF EXISTS registros_mse_unit_id_fkey`);
    await client.query(`ALTER TABLE registros_mse ADD CONSTRAINT registros_mse_registrado_por_id_fkey FOREIGN KEY (registrado_por_id) REFERENCES users(id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE registros_mse ADD CONSTRAINT registros_mse_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES unidades(id) ON DELETE SET NULL`);

    console.log("Tabela 'registros_mse' verificada/criada.");

    // --- 6. Tabela logs ---
    await client.query(`CREATE TABLE IF NOT EXISTS logs ( id SERIAL PRIMARY KEY, timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, username TEXT, action TEXT NOT NULL, details JSONB );`);
    await client.query(`ALTER TABLE logs ADD COLUMN IF NOT EXISTS "userId" INTEGER`);
    await client.query(`ALTER TABLE logs DROP CONSTRAINT IF EXISTS logs_userId_fkey`);
    await client.query(`ALTER TABLE logs ADD CONSTRAINT logs_userId_fkey FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL`);


    // --- 7. Tabela acompanhamentos ---
    await client.query(`CREATE TABLE IF NOT EXISTS acompanhamentos ( id SERIAL PRIMARY KEY, texto TEXT NOT NULL, data TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, "casoId" INTEGER NOT NULL REFERENCES casos(id) ON DELETE CASCADE, "userId" INTEGER );`);
    
    // ⭐️ REVERSÃO: Linha que adicionava a coluna 'tipo' foi removida. ⭐️
    
    await client.query(`ALTER TABLE acompanhamentos DROP CONSTRAINT IF EXISTS acompanhamentos_userId_fkey`);
    await client.query(`ALTER TABLE acompanhamentos ADD CONSTRAINT acompanhamentos_userId_fkey FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL`);


    // --- 8. Tabela encaminhamentos ---
    await client.query(`CREATE TABLE IF NOT EXISTS encaminhamentos ( id SERIAL PRIMARY KEY, "casoId" INTEGER NOT NULL REFERENCES casos(id) ON DELETE CASCADE, "userId" INTEGER, "servicoDestino" VARCHAR(255) NOT NULL, "dataEncaminhamento" DATE NOT NULL, status VARCHAR(50) NOT NULL DEFAULT 'Pendente', "dataRetorno" DATE, observacoes TEXT, "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP );`);
    await client.query(`ALTER TABLE encaminhamentos DROP CONSTRAINT IF EXISTS encaminhamentos_userId_fkey`);
    await client.query(`ALTER TABLE encaminhamentos ADD CONSTRAINT encaminhamentos_userId_fkey FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL`);


    // --- 9. Tabela demandas (DEVE VIR ANTES DE ANEXOS) ---
    await client.query(`CREATE TABLE IF NOT EXISTS demandas ( id SERIAL PRIMARY KEY, tipo_documento VARCHAR(100) NOT NULL, instituicao_origem TEXT NOT NULL, numero_documento VARCHAR(100), data_recebimento DATE NOT NULL, prazo_resposta DATE, assunto TEXT, status VARCHAR(50) NOT NULL DEFAULT 'Nova', caso_associado_id INTEGER REFERENCES casos(id) ON DELETE SET NULL, tecnico_designado_id INTEGER, registrado_por_id INTEGER, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP );`);
    
    // Garante que as colunas existam antes de manipular suas constraints
    await client.query(`ALTER TABLE demandas ADD COLUMN IF NOT EXISTS unit_id INTEGER`);
    await client.query(`ALTER TABLE demandas ALTER COLUMN registrado_por_id DROP NOT NULL`);
    await client.query(`ALTER TABLE demandas ADD COLUMN IF NOT EXISTS tecnico_designado_id INTEGER`);
    
    // Ajusta FOREIGN KEY ON DELETE SET NULL
    await client.query(`ALTER TABLE demandas DROP CONSTRAINT IF EXISTS demandas_tecnico_designado_id_fkey`);
    await client.query(`ALTER TABLE demandas DROP CONSTRAINT IF EXISTS demandas_registrado_por_id_fkey`);
    await client.query(`ALTER TABLE demandas DROP CONSTRAINT IF EXISTS demandas_unit_id_fkey`);

    await client.query(`ALTER TABLE demandas ADD CONSTRAINT demandas_tecnico_designado_id_fkey FOREIGN KEY (tecnico_designado_id) REFERENCES users(id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE demandas ADD CONSTRAINT demandas_registrado_por_id_fkey FOREIGN KEY (registrado_por_id) REFERENCES users(id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE demandas ADD CONSTRAINT demandas_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES unidades(id) ON DELETE SET NULL`);
    
    
    // --- 10. Tabela anexos ---
    await client.query(`CREATE TABLE IF NOT EXISTS anexos ( id SERIAL PRIMARY KEY, "casoId" INTEGER REFERENCES casos(id) ON DELETE CASCADE, "userId" INTEGER, "nomeOriginal" VARCHAR(255) NOT NULL, "nomeArmazenado" VARCHAR(255) NOT NULL UNIQUE, "caminhoArquivo" VARCHAR(255) NOT NULL, "tipoArquivo" VARCHAR(100) NOT NULL, "tamanhoArquivo" INTEGER NOT NULL, descricao TEXT, "dataUpload" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "demandaId" INTEGER REFERENCES demandas(id) ON DELETE CASCADE );`);
    await client.query(`ALTER TABLE anexos DROP CONSTRAINT IF EXISTS anexos_userId_fkey`);
    await client.query(`ALTER TABLE anexos ADD CONSTRAINT anexos_userId_fkey FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL`);


    // --- 11. Tabela atividades_coletivas (RMA Bloco VI/G) ---
    await client.query(`CREATE TABLE IF NOT EXISTS atividades_coletivas ( id SERIAL PRIMARY KEY, data_atividade DATE NOT NULL, tipo_atividade VARCHAR(100) NOT NULL, tema_grupo VARCHAR(100), publico_alvo VARCHAR(100), numero_participantes INTEGER NOT NULL DEFAULT 0, descricao TEXT, registrado_por_id INTEGER, unit_id INTEGER, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP );`);

    // Garante FKs com ON DELETE SET NULL
    await client.query(`ALTER TABLE atividades_coletivas DROP CONSTRAINT IF EXISTS atividades_coletivas_registrado_por_id_fkey`);
    await client.query(`ALTER TABLE atividades_coletivas DROP CONSTRAINT IF EXISTS atividades_coletivas_unit_id_fkey`);
    await client.query(`ALTER TABLE atividades_coletivas ADD CONSTRAINT atividades_coletivas_registrado_por_id_fkey FOREIGN KEY (registrado_por_id) REFERENCES users(id) ON DELETE SET NULL`);

    await client.query(`ALTER TABLE atividades_coletivas ADD CONSTRAINT atividades_coletivas_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES unidades(id) ON DELETE SET NULL`);
    console.log("Tabela 'atividades_coletivas' verificada/criada.");


    // ⭐️ BLOCO ATUALIZADO (Ação 2 / B.E.) ⭐️
    // --- 12. Tabela beneficios_eventuais (RMA Bloco III / Instrumentais) ---
    // Esta tabela armazena os *requerimentos* e *pareceres*
    await client.query(`CREATE TABLE IF NOT EXISTS beneficios_eventuais (id SERIAL PRIMARY KEY, caso_id INTEGER, tecnico_id INTEGER, unit_id INTEGER, processo_numero VARCHAR(50), data_solicitacao DATE NOT NULL, beneficio_solicitado VARCHAR(100) NOT NULL, breve_relato TEXT, parecer_social TEXT, status_parecer VARCHAR(50) NOT NULL DEFAULT 'Solicitado', valor_concedido DECIMAL(10, 2) DEFAULT 0.00, dados_bancarios TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);`);

    // ⭐️ NOVO (B.E.): Adiciona colunas do Requerimento (baseado no DOCX ) ⭐️
    await client.query(`ALTER TABLE beneficios_eventuais ADD COLUMN IF NOT EXISTS nome_requerente VARCHAR(255)`);
    await client.query(`ALTER TABLE beneficios_eventuais ADD COLUMN IF NOT EXISTS dn_requerente DATE`);
    await client.query(`ALTER TABLE beneficios_eventuais ADD COLUMN IF NOT EXISTS rg_requerente VARCHAR(20)`);
    await client.query(`ALTER TABLE beneficios_eventuais ADD COLUMN IF NOT EXISTS cpf_requerente VARCHAR(14)`);
    await client.query(`ALTER TABLE beneficios_eventuais ADD COLUMN IF NOT EXISTS nis_requerente VARCHAR(15)`);
    await client.query(`ALTER TABLE beneficios_eventuais ADD COLUMN IF NOT EXISTS endereco_requerente TEXT`);
    await client.query(`ALTER TABLE beneficios_eventuais ADD COLUMN IF NOT EXISTS bairro_requerente VARCHAR(100)`);
    await client.query(`ALTER TABLE beneficios_eventuais ADD COLUMN IF NOT EXISTS ponto_referencia_requerente TEXT`);
CV:     await client.query(`ALTER TABLE beneficios_eventuais ADD COLUMN IF NOT EXISTS cidade_requerente VARCHAR(100) DEFAULT 'Patos'`);
    await client.query(`ALTER TABLE beneficios_eventuais ADD COLUMN IF NOT EXISTS telefone_requerente VARCHAR(20)`);
    await client.query(`ALTER TABLE beneficios_eventuais ADD COLUMN IF NOT EXISTS possui_cadastro_cras BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE beneficios_eventuais ADD COLUMN IF NOT EXISTS beneficio_subtipo VARCHAR(100)`); // Ex: 'Ajuda de Custo' [cite: 32]
    await client.query(`ALTER TABLE beneficios_eventuais ADD COLUMN IF NOT EXISTS observacao TEXT`); // [cite: 36]

    // Garante FKs com ON DELETE SET NULL (para a "ligação")
    await client.query(`ALTER TABLE beneficios_eventuais DROP CONSTRAINT IF EXISTS beneficios_eventuais_caso_id_fkey`);
    await client.query(`ALTER TABLE beneficios_eventuais DROP CONSTRAINT IF EXISTS beneficios_eventuais_tecnico_id_fkey`);
    await client.query(`ALTER TABLE beneficios_eventuais DROP CONSTRAINT IF EXISTS beneficios_eventuais_unit_id_fkey`);
    
    await client.query(`ALTER TABLE beneficios_eventuais ADD CONSTRAINT beneficios_eventuais_caso_id_fkey FOREIGN KEY (caso_id) REFERENCES casos(id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE beneficios_eventuais ADD CONSTRAINT beneficios_eventuais_tecnico_id_fkey FOREIGN KEY (tecnico_id) REFERENCES users(id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE beneficios_eventuais ADD CONSTRAINT beneficios_eventuais_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES unidades(id) ON DELETE SET NULL`);

    console.log("Tabela 'beneficios_eventuais' verificada/criada.");


    // --- 13. Índices --- (Antigo Bloco 12)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_casos_dados_completos_gin ON casos USING GIN (dados_completos);`);

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