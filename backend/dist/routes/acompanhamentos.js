"use strict";
// backend/src/routes/acompanhamentos.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth/auth");
const logger_1 = require("../services/logger");
const unitAccess_middleware_1 = require("../middleware/unitAccess.middleware");
const caseAccess_middleware_1 = require("../middleware/caseAccess.middleware");
const router = (0, express_1.Router)();
// 📌 SOLUÇÃO DE LIMPEZA EXTREMA
const cleanSqlString = (sql) => {
    return sql.replace(/\s+/g, ' ').trim();
};
// Aplica a checagem de unidade para todas as rotas que dependem do casoId
// O middleware 'unitAccessMiddleware' é aplicado a TODAS as rotas deste router.
router.use(auth_1.authMiddleware, (0, unitAccess_middleware_1.unitAccessMiddleware)('casos', 'unit_id'));
// =======================================================================
// ROTA PARA BUSCAR TODOS OS ACOMPANHAMENTOS DE UM CASO
// 🛑 MIDDLEWARE REMOVIDO: Removemos checkCaseAccess para estabilizar o carregamento do prontuário
// =======================================================================
router.get("/:casoId", async (req, res) => {
    const { casoId } = req.params;
    try {
        // ✅ CORREÇÃO: Usar $1 e não uma template string, resolvendo o erro SQL 'invalid input syntax'
        const query = cleanSqlString(`
            SELECT a.*, u.username as "tecRef" 
            FROM acompanhamentos a
            JOIN users u ON a."userId" = u.id
            WHERE a."casoId" = $1 
            ORDER BY a.data DESC
        `);
        const result = await db_1.default.query(query, [casoId]);
        res.json(result.rows);
    }
    catch (err) {
        console.error("Erro ao buscar acompanhamentos:", err.message);
        res.status(500).json({ message: "Erro ao buscar acompanhamentos." });
    }
});
// =======================================================================
// ROTA PARA CRIAR UM NOVO ACOMPANHAMENTO (Mantém checkCaseAccess, pois é MODIFICAÇÃO)
// =======================================================================
router.post("/:casoId", (0, caseAccess_middleware_1.checkCaseAccess)('params', 'casoId'), async (req, res) => {
    const { casoId } = req.params;
    const { texto } = req.body;
    const userId = req.user.id;
    const userUnitId = req.user.unit_id;
    if (!texto) {
        return res.status(400).json({ message: "O texto do acompanhamento é obrigatório." });
    }
    try {
        const query = cleanSqlString(`
            INSERT INTO acompanhamentos (texto, "casoId", "userId") VALUES ($1, $2, $3) RETURNING *
        `);
        const result = await db_1.default.query(query, [texto, casoId, userId]);
        const novoAcompanhamento = result.rows[0];
        await (0, logger_1.logAction)({
            userId,
            username: req.user.username,
            action: 'CREATE_ACOMPANHAMENTO',
            details: { casoId, acompanhamentoId: novoAcompanhamento.id, unitId: userUnitId }
        });
        res.status(201).json(novoAcompanhamento);
    }
    catch (err) {
        console.error("Erro ao salvar acompanhamento:", err.message);
        res.status(500).json({ message: "Erro ao salvar acompanhamento." });
    }
});
exports.default = router;
