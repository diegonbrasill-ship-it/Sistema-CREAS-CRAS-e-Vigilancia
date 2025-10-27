// backend/src/index.ts

import 'dotenv/config'; // Mantenha a configuração de ambiente aqui
import app from "./app"; // ⭐️ IMPORTAÇÃO DO NOVO ARQUIVO app.ts (que contém a instância Express)
import { initDb } from "./db";


const PORT = process.env.PORT || 4000;

/**
 * Função assíncrona para iniciar o backend.
 * 1. Inicializa a conexão com o banco de dados.
 * 2. Inicia o servidor Express.
 */
(async function start() {
  try {
    // 1. Inicializa o DB (Função initDb está no db.ts)
    await initDb();

    // O app (Express) foi importado de ./app, já com todas as rotas configuradas.
    
    // 2. O Servidor escuta a porta
    app.listen(PORT, () => console.log(`✅ Backend rodando em http://localhost:${PORT}`));
  } catch (err) {
    console.error("Erro ao iniciar backend:", err);
    process.exit(1);
  }
})();



