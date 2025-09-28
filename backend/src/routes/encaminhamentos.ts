import express, { Request, Response } from 'express';
import pool from '../db';
import { authMiddleware } from '../middleware/auth';
import { logAction } from '../services/logger';

const router = express.Router();

/**
 * @route   POST /api/encaminhamentos
 * @desc    Cria um novo encaminhamento para um caso
 * @access  Private
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const username = req.user!.username;
  const { casoId, servicoDestino, dataEncaminhamento, observacoes } = req.body;

  if (!casoId || !servicoDestino || !dataEncaminhamento) {
    return res.status(400).json({ message: 'Campos obrigatórios estão faltando.' });
  }

  try {
    const query = `
      INSERT INTO encaminhamentos
        ("casoId", "userId", "servicoDestino", "dataEncaminhamento", observacoes)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING id, "servicoDestino";
    `;
    const result = await pool.query(query, [ casoId, userId, servicoDestino, dataEncaminhamento, observacoes ]);
    const novoEncaminhamento = result.rows[0];

    await logAction({
      userId,
      username,
      action: 'CREATE_ENCAMINHAMENTO',
      details: { casoId, encaminhamentoId: novoEncaminhamento.id, servico: novoEncaminhamento.servicoDestino }
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

// =======================================================================
// NOVA ROTA PARA ATUALIZAR O STATUS DE UM ENCAMINHAMENTO
// =======================================================================
/**
 * @route   PUT /api/encaminhamentos/:id
 * @desc    Atualiza o status e/ou data de retorno de um encaminhamento
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params; // ID do encaminhamento a ser atualizado
  const { status, dataRetorno } = req.body; // Dados que o frontend enviará
  const { id: userId, username } = req.user!;

  if (!status) {
    return res.status(400).json({ message: 'O novo status é obrigatório.' });
  }

  try {
    const query = `
      UPDATE encaminhamentos
      SET 
        status = $1,
        "dataRetorno" = $2
      WHERE id = $3
      RETURNING id, "casoId", "servicoDestino";
    `;
    const result = await pool.query(query, [status, dataRetorno, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Encaminhamento não encontrado.' });
    }

    const encaminhamentoAtualizado = result.rows[0];

    // Registra a atualização no log de auditoria
    await logAction({
      userId,
      username,
      action: 'UPDATE_ENCAMINHAMENTO_STATUS',
      details: {
        casoId: encaminhamentoAtualizado.casoId,
        encaminhamentoId: encaminhamentoAtualizado.id,
        servico: encaminhamentoAtualizado.servicoDestino,
        novoStatus: status
      }
    });

    res.json({ message: 'Status do encaminhamento atualizado com sucesso!' });

  } catch (err: any) {
    console.error(`Erro ao atualizar encaminhamento ${id}:`, err.message);
    res.status(500).json({ message: 'Erro no servidor ao atualizar encaminhamento.' });
  }
});


export default router;