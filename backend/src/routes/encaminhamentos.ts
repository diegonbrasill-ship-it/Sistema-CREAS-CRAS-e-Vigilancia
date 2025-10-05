// backend/src/routes/encaminhamentos.ts

import express, { Router, Request, Response, NextFunction } from 'express';
import pool from '../db';
import { authMiddleware } from '../middleware/auth';
import { logAction } from '../services/logger';
import { unitAccessMiddleware } from '../middleware/unitAccess.middleware';
import { checkCaseAccess, checkItemAccessByParentCase } from '../middleware/caseAccess.middleware'; // Importações das checagens centralizadas

const router = express.Router();

// 📌 SOLUÇÃO DE LIMPEZA EXTREMA: Essencial para remover o erro 'syntax error at or near " "'
const cleanSqlString = (sql: string): string => {
    return sql.replace(/\s+/g, ' ').trim();
};


// Aplicação do middleware de segurança e filtro de unidade em todas as rotas
router.use(authMiddleware, unitAccessMiddleware('casos', 'unit_id')); 


/**
 * @route   POST /api/encaminhamentos
 * @desc    Cria um novo encaminhamento para um caso (Checa acesso ao casoId no body)
 * @access  Private
 */
router.post('/', checkCaseAccess('body', 'casoId'), async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const username = req.user!.username;
  const { casoId, servicoDestino, dataEncaminhamento, observacoes } = req.body;
  const userUnitId = req.user!.unit_id;
 
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
    const result = await pool.query(query, [ casoId, userId, servicoDestino, dataEncaminhamento, observacoes ]);
    const novoEncaminhamento = result.rows[0];

    await logAction({
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
  } catch (err: any) {
    console.error('Erro ao registrar encaminhamento:', err.message);
    res.status(500).json({ message: 'Erro no servidor ao registrar encaminhamento.' });
  }
});

/**
 * @route   PUT /api/encaminhamentos/:id
 * @desc    Atualiza o status e/ou data de retorno de um encaminhamento (Checa acesso ao casoId via encaminhamentoId)
 * @access  Private
 */
router.put('/:id', checkItemAccessByParentCase('id', 'encaminhamentos'), async (req: Request, res: Response) => { 
  const { id } = req.params;
  const { status, dataRetorno } = req.body;
  const { id: userId, username } = req.user!;
  const casoId = (req as any).casoId; // CasoId obtido do middleware

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
    const result = await pool.query(query, [status, dataRetorno, id]);

    if (result.rowCount === 0) {
        // Esta checagem é redundante após o middleware, mas mantida como fail-safe
      return res.status(404).json({ message: 'Encaminhamento não encontrado.' }); 
    }

    const encaminhamentoAtualizado = result.rows[0];

    await logAction({
      userId,
      username,
      action: 'UPDATE_ENCAMINHAMENTO_STATUS',
      details: {
        casoId: casoId, 
        encaminhamentoId: encaminhamentoAtualizado.id,
        servico: encaminhamentoAtualizado.servicoDestino,
        novoStatus: status,
        unitId: req.user!.unit_id 
      }
    });

    res.json({ message: 'Status do encaminhamento atualizado com sucesso!' });

  } catch (err: any) {
    console.error(`Erro ao atualizar encaminhamento ${id}:`, err.message);
    res.status(500).json({ message: 'Erro no servidor ao atualizar encaminhamento.' });
  }
});

// A rota GET /api/casos/:casoId/encaminhamentos está no casos.ts

export default router;