"use strict";
// backend/src/routes/encaminhamentos.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth/auth");
const logger_1 = require("../services/logger");
const unitAccess_middleware_1 = require("../middleware/unitAccess.middleware");
const caseAccess_middleware_1 = require("../middleware/caseAccess.middleware"); // Importações das checagens centralizadas
const router = express_1.default.Router();
// 📌 SOLUÇÃO DE LIMPEZA EXTREMA: Essencial para remover o erro 'syntax error at or near " "'
const cleanSqlString = (sql) => {
    return sql.replace(/\s+/g, ' ').trim();
};
// Aplicação do middleware de segurança e filtro de unidade em todas as rotas
router.use(auth_1.authMiddleware, (0, unitAccess_middleware_1.unitAccessMiddleware)('casos', 'unit_id'));
/**
 * @route   POST /api/encaminhamentos
 * @desc    Cria um novo encaminhamento para um caso (Checa acesso ao casoId no body)
 * @access  Private
 */
router.post('/', (0, caseAccess_middleware_1.checkCaseAccess)('body', 'casoId'), async (req, res) => {
    const userId = req.user.id;
    const username = req.user.username;
    const { casoId, servicoDestino, dataEncaminhamento, observacoes } = req.body;
    const userUnitId = req.user.unit_id;
    if (!casoId || !servicoDestino || !dataEncaminhamento) {
        return res.status(400).json({ message: 'Campos obrigatórios estão faltando.' });
    }
    try {
        const query = cleanSqlString(`
      INSERT INTO encaminhamentos
        ("casoId", "userId", "servicoDestino", "dataEncaminhamento", observacoes)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING id, "servicoDestino";
    `);
        const result = await db_1.default.query(query, [casoId, userId, servicoDestino, dataEncaminhamento, observacoes]);
        const novoEncaminhamento = result.rows[0];
        await (0, logger_1.logAction)({
            userId,
            username,
            action: 'CREATE_ENCAMINHAMENTO',
            details: {
                casoId,
                encaminhamentoId: novoEncaminhamento.id,
                servico: novoEncaminhamento.servicoDestino,
                unitId: userUnitId
            }
        });
        res.status(201).json({
            message: 'Encaminhamento registrado com sucesso!',
            encaminhamento: novoEncaminhamento
        });
    }
    catch (err) {
        console.error('Erro ao registrar encaminhamento:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao registrar encaminhamento.' });
    }
});
/**
 * @route   PUT /api/encaminhamentos/:id
 * @desc    Atualiza o status e/ou data de retorno de um encaminhamento (Checa acesso ao casoId via encaminhamentoId)
 * @access  Private
 */
router.put('/:id', (0, caseAccess_middleware_1.checkItemAccessByParentCase)('id', 'encaminhamentos'), async (req, res) => {
    const { id } = req.params;
    const { status, dataRetorno } = req.body;
    const { id: userId, username } = req.user;
    const casoId = req.casoId; // CasoId obtido do middleware
    if (!status) {
        return res.status(400).json({ message: 'O novo status é obrigatório.' });
    }
    try {
        const query = cleanSqlString(`
      UPDATE encaminhamentos
      SET 
        status = $1,
        "dataRetorno" = $2
      WHERE id = $3
      RETURNING id, "casoId", "servicoDestino";
    `);
        const result = await db_1.default.query(query, [status, dataRetorno, id]);
        if (result.rowCount === 0) {
            // Esta checagem é redundante após o middleware, mas mantida como fail-safe
            return res.status(404).json({ message: 'Encaminhamento não encontrado.' });
        }
        const encaminhamentoAtualizado = result.rows[0];
        await (0, logger_1.logAction)({
            userId,
            username,
            action: 'UPDATE_ENCAMINHAMENTO_STATUS',
            details: {
                casoId: casoId,
                encaminhamentoId: encaminhamentoAtualizado.id,
                servico: encaminhamentoAtualizado.servicoDestino,
                novoStatus: status,
                unitId: req.user.unit_id
            }
        });
        res.json({ message: 'Status do encaminhamento atualizado com sucesso!' });
    }
    catch (err) {
        console.error(`Erro ao atualizar encaminhamento ${id}:`, err.message);
        res.status(500).json({ message: 'Erro no servidor ao atualizar encaminhamento.' });
    }
});
// A rota GET /api/casos/:casoId/encaminhamentos está no casos.ts
exports.default = router;
