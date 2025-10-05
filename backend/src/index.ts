// backend/src/index.ts
import express from "express";
import 'dotenv/config';
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import path from "path";
import { initDb } from "./db";

// Importações das Rotas
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import mseRoutes from "./routes/mse.routes";
import casosRoutes from "./routes/casos";
import dashboardRoutes from './routes/dashboard';
import acompanhamentosRoutes from "./routes/acompanhamentos";
import relatoriosRoutes from "./routes/relatorios";
import vigilanciaRoutes from './routes/vigilancia';
import encaminhamentosRoutes from "./routes/encaminhamentos";
import anexosRoutes from "./routes/anexos";
// 1. IMPORTAÇÃO da nova rota de demandas
import demandasRoutes from "./routes/demandas"; 



const app = express();

// Configuração de CORS e outros middlewares
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

const PORT = process.env.PORT || 4000;

(async function start() {
  try {
    await initDb();

    // Rotas de Autenticação e Gerenciamento
    app.use("/auth", authRoutes);
    app.use("/api/users", usersRoutes);
    app.use("/api/mse", mseRoutes);
    app.use("/api/casos", casosRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/vigilancia', vigilanciaRoutes);
    app.use("/api/acompanhamentos", acompanhamentosRoutes);
    app.use("/api/relatorios", relatoriosRoutes);
    app.use("/api/encaminhamentos", encaminhamentosRoutes);
    app.use("/api/anexos", anexosRoutes);
    // 2. REGISTRO da nova rota de demandas
    app.use("/api/demandas", demandasRoutes);

    app.listen(PORT, () => console.log(`✅ Backend rodando em http://localhost:${PORT}`));
  } catch (err) {
    console.error("Erro ao iniciar backend:", err);
    process.exit(1);
  }
})();



