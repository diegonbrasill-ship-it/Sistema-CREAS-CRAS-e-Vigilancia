// backend/src/app.ts

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import path from "path";
// NOTA: 'dotenv/config' é mantido no index.ts que roda o app, ou no jest.setup.ts
// Para o app.ts que será testado, apenas configuramos o necessário.

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
import crasRouter from './routes/cras';
import demandasRoutes from "./routes/demandas"; 
import atividadesRoutes from "./routes/atividades";
import rmaRoutes from "./routes/rma"; 
// ⭐️ NOVO (Ação 2.3): Importa a rota de Benefícios Eventuais ⭐️
import beneficiosRoutes from "./routes/beneficios";

const app = express();

// Configuração de CORS e outros middlewares
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
// NOTE: Em ambiente de teste, usaremos 'undefined' para simular a origem
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());
// Garante que o caminho seja relativo ao dist/src no ambiente de execução ou teste
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'))); 


// Registro das Rotas
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
app.use('/api/cras', crasRouter);
app.use("/api/demandas", demandasRoutes);
app.use("/api/atividades", atividadesRoutes);
app.use("/api/rma", rmaRoutes);
// ⭐️ REGISTRO DA NOVA ROTA (Benefícios Eventuais) ⭐️
app.use("/api/beneficios", beneficiosRoutes);


// ⭐️ EXPORTAÇÃO CRÍTICA PARA TESTES ⭐️
export default app;