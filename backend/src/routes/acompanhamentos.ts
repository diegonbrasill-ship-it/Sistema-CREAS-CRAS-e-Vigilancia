// backend/src/routes/acompanhamentos.ts
import { Router } from "express";
import pool from "../db";
import { authMiddleware } from "../middleware/auth";
import { logAction } from "../services/logger";

const router = Router();

// ROTA PARA BUSCAR TODOS OS ACOMPANHAMENTOS DE UM CASO
router.get("/:casoId", authMiddleware, async (req, res) => {
    const { casoId } = req.params;
    try {
        const result = await pool.query(
            `SELECT a.*, u.username as "tecRef" 
             FROM acompanhamentos a
             JOIN users u ON a."userId" = u.id
             WHERE a."casoId" = $1 
             ORDER BY a.data DESC`,
            [casoId]
        );
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ message: "Erro ao buscar acompanhamentos." });
    }
});

// ROTA PARA CRIAR UM NOVO ACOMPANHAMENTO
router.post("/:casoId", authMiddleware, async (req, res) => {
    const { casoId } = req.params;
    const { texto } = req.body;
    const userId = req.user!.id;

    if (!texto) {
        return res.status(400).json({ message: "O texto do acompanhamento é obrigatório." });
    }

    try {
        const result = await pool.query(
            `INSERT INTO acompanhamentos (texto, "casoId", "userId") VALUES ($1, $2, $3) RETURNING *`,
            [texto, casoId, userId]
        );
        const novoAcompanhamento = result.rows[0];

        await logAction({ userId, username: req.user!.username, action: 'CREATE_ACOMPANHAMENTO', details: { casoId, acompanhamentoId: novoAcompanhamento.id }});

        res.status(201).json(novoAcompanhamento);
    } catch (err: any) {
        res.status(500).json({ message: "Erro ao salvar acompanhamento." });
    }
});

export default router;