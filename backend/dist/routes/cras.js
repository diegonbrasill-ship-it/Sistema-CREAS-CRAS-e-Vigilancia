"use strict";
// backend/src/routes/cras.ts (Novo Arquivo)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const unitAccess_middleware_1 = require("../middleware/unitAccess.middleware");
// Importar tipos auxiliares, se necessário
// import { anonimizarDadosSeNecessario } from './casos'; 
const router = express_1.default.Router();
// Função de Limpeza SQL (Importada ou definida localmente)
const cleanSqlString = (sql) => sql.replace(/\s+/g, ' ').trim();
// Aplicamos o filtro de unidade para todas as rotas do CRAS
// 'casos' é a tabela base, 'unit_id' é a coluna de filtro
router.use(auth_1.authMiddleware, (0, unitAccess_middleware_1.unitAccessMiddleware)('casos', 'unit_id'));
// =======================================================================
// 📌 ROTA PRINCIPAL: GET /cras/casos (Listagem e Busca de Prontuário)
// =======================================================================
router.get("/casos", async (req, res) => {
    // Acessa o filtro de segurança e o usuário logado
    const accessFilter = req.accessFilter;
    const user = req.user;
    // Campos a serem buscados para a listagem (adaptados do seu casos.ts)
    const baseFields = `id, "dataCad", "tecRef", nome, status, unit_id, dados_completos->>'bairro' AS bairro`;
    // Constrói o filtro de acesso (Visibilidade Gestor + Unidade CRAS)
    let unitParams = [...accessFilter.params];
    let unitWhere = accessFilter.whereClause;
    // Substitui placeholders do accessFilter
    let paramIndex = 1;
    if (accessFilter.params.length === 1) {
        unitWhere = unitWhere.replace('$X', `$${paramIndex++}`);
    }
    else if (accessFilter.params.length === 2) {
        unitWhere = unitWhere.replace('$X', `$${paramIndex++}`).replace('$Y', `$${paramIndex++}`);
    }
    // Filtro de Visibilidade: CRAS/Gestor Máximo/Gestor Criador
    // Adicionamos a checagem 'OR casos.unit_id IS NULL' para o Gestor Máximo
    const finalUnitWhere = accessFilter.whereClause === 'TRUE' ? 'TRUE' : `(${unitWhere} OR casos.unit_id IS NULL)`;
    // Montagem da Query
    const query = cleanSqlString(`
        SELECT ${baseFields} 
        FROM casos
        WHERE ${finalUnitWhere}
        ORDER BY "dataCad" DESC
    `);
    try {
        const result = await db_1.default.query(query, unitParams);
        // NOTE: A anonimização deve ser tratada aqui, se necessário (Vigilância acessando CRAS)
        // Por enquanto, apenas devolvemos os dados filtrados.
        res.json(result.rows);
    }
    catch (err) {
        console.error("Erro ao listar casos do CRAS:", err.message);
        res.status(500).json({ message: "Erro ao buscar casos do CRAS." });
    }
});
exports.default = router;
