// backend/src/index.ts
import express from "express";
import 'dotenv/config';
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import path from "path";
import { initDb } from "./db";

// Importações das Rotas
import loginRoutes from "./routes/login/login";
import usersRoutes from "./routes/users";
import casosRoutes from "./routes/casos";

import mseRoutes from "./routes/mse.routes";
import dashboardRoutes from './routes/dashboard';
import acompanhamentosRoutes from "./routes/acompanhamentos";
import relatoriosRoutes from "./routes/relatorios";
import vigilanciaRoutes from './routes/vigilancia';
import encaminhamentosRoutes from "./routes/encaminhamentos";
import anexosRoutes from "./routes/anexos";
import crasRouter from './routes/cras';
import demandasRoutes from "./routes/demandas";

const app = express();

// Configuração de CORS e outros middlewares
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

const PORT = process.env.PORT || 2000;

(async function start() {
  try {
    await initDb();

    // Rotas de Autenticação e Gerenciamento
    app.use("/api/login", loginRoutes);
    app.use("/api/users", usersRoutes);
    app.use("/api/mse", mseRoutes);
    app.use("/api/casos", casosRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/vigilancia', vigilanciaRoutes);
    app.use("/api/acompanhamentos", acompanhamentosRoutes);
    app.use("/api/relatorios", relatoriosRoutes);
    app.use("/api/encaminhamentos", encaminhamentosRoutes);
    app.use("/api/anexos", anexosRoutes);
    app.use('/api/cras', crasRouter);
    // 2. REGISTRO da nova rota de demandas
    app.use("/api/demandas", demandasRoutes);

  } catch (err) {
    console.error("Erro ao iniciar backend:", err);
    process.exit(1);
  }
})();