"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/index.ts
const express_1 = __importDefault(require("express"));
require("dotenv/config");
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
// Importações das Rotas
const login_1 = __importDefault(require("./routes/login/login"));
const users_1 = __importDefault(require("./routes/users"));
const casos_1 = __importDefault(require("./routes/casos"));
const mse_routes_1 = __importDefault(require("./routes/mse.routes"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const acompanhamentos_1 = __importDefault(require("./routes/acompanhamentos"));
const relatorios_1 = __importDefault(require("./routes/relatorios"));
const vigilancia_1 = __importDefault(require("./routes/vigilancia"));
const encaminhamentos_1 = __importDefault(require("./routes/encaminhamentos"));
const anexos_1 = __importDefault(require("./routes/anexos"));
const cras_1 = __importDefault(require("./routes/cras"));
const demandas_1 = __importDefault(require("./routes/demandas"));
const app = (0, express_1.default)();
// Configuração de CORS e outros middlewares
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
app.use((0, cors_1.default)({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(body_parser_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '..', 'uploads')));
const PORT = process.env.PORT || 4000;
(async function start() {
    try {
        await (0, db_1.initDb)();
        // Rotas de Autenticação e Gerenciamento
        app.use("/api/login", login_1.default);
        app.use("/api/users", users_1.default);
        app.use("/api/mse", mse_routes_1.default);
        app.use("/api/casos", casos_1.default);
        app.use('/api/dashboard', dashboard_1.default);
        app.use('/api/vigilancia', vigilancia_1.default);
        app.use("/api/acompanhamentos", acompanhamentos_1.default);
        app.use("/api/relatorios", relatorios_1.default);
        app.use("/api/encaminhamentos", encaminhamentos_1.default);
        app.use("/api/anexos", anexos_1.default);
        app.use('/api/cras', cras_1.default);
        // 2. REGISTRO da nova rota de demandas
        app.use("/api/demandas", demandas_1.default);
        app.listen(PORT, () => console.log(`✅ Backend rodando em http://localhost:${PORT}`));
    }
    catch (err) {
        console.error("Erro ao iniciar backend:", err);
        process.exit(1);
    }
})();
