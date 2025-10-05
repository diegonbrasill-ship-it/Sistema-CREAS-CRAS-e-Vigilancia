// backend/src/routes/mse.routes.ts

import { Router, Request, Response } from "express";
import pool from "../db";
import { logAction } from "../services/logger";
import { authorizeCreasOnly } from "../middleware/auth";
import { UNIT_ID_CREAS } from "../utils/constants";
import { QueryResult } from "pg"; // 📌 FIX CRÍTICO 2: Importar QueryResult para tipagem de retorno

const router = Router();

// 📌 FIX CRÍTICO 1: Função de Limpeza SQL introduzida localmente para eliminar erro de módulo.
const cleanSqlString = (sql: string): string => {
    return sql.replace(/\s+/g, ' ').trim();
};

// 📌 Interface de tipos para a nova rota (duplicada aqui para compilação)
interface MseRegistroBody {
    nome_adolescente: string;
    data_nascimento: string; 
    responsavel: string;
    endereco: string;
    contato: string;
    nis: string;
    mse_tipo: 'LA' | 'PSC' | 'LA + PSC';
    mse_data_inicio: string;
    mse_duracao_meses: number;
    situacao: 'CUMPRIMENTO' | 'DESCUMPRIMENTO';
    local_descumprimento?: string;
    pia_data_elaboracao?: string;
    pia_status?: 'Em Análise' | 'Aprovado' | 'Revisão';
}


// Middleware para garantir que todas as rotas de MSE são exclusivas do CREAS
router.use(authorizeCreasOnly); 


/**
 * @route POST /api/mse/registros
 * @desc  Cria um novo registro de Medida Socioeducativa (MSE)
 */
router.post("/registros", async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const {
        nome_adolescente, data_nascimento, responsavel, endereco, contato, nis,
        mse_tipo, mse_data_inicio, mse_duracao_meses, situacao, local_descumprimento,
        pia_data_elaboracao, pia_status
    } = req.body as MseRegistroBody;

    // A unit_id é forçada a ser a do CREAS (ID 1)
    const unit_id = UNIT_ID_CREAS; 

    if (!nome_adolescente || !data_nascimento || !mse_tipo || !mse_data_inicio || !mse_duracao_meses || !situacao) {
        return res.status(400).json({ message: "Campos obrigatórios de MSE estão faltando." });
    }

    try {
        const query = cleanSqlString(`
            INSERT INTO registros_mse (
                nome_adolescente, data_nascimento, responsavel, endereco, contato, nis,
                mse_tipo, mse_data_inicio, mse_duracao_meses, situacao, local_descumprimento,
                pia_data_elaboracao, pia_status, registrado_por_id, unit_id
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
            ) RETURNING id;
        `);
        
        const params = [
            nome_adolescente, data_nascimento, responsavel, endereco, contato, nis,
            mse_tipo, mse_data_inicio, mse_duracao_meses, situacao, local_descumprimento,
            pia_data_elaboracao, pia_status, userId, unit_id
        ];

        // 📌 FIX CRÍTICO 2: Tipar o resultado para acessar 'rows[0].id'
        const result = await pool.query(query, params) as QueryResult<{ id: number }>;
        const novoRegistroId = result.rows[0].id;

        await logAction({ 
            userId, 
            username: req.user!.username, 
            action: 'CREATE_MSE_REGISTRY', 
            details: { registroId: novoRegistroId, adolescente: nome_adolescente, unitId: unit_id } 
        });
        
        res.status(201).json({ message: "Registro de MSE criado com sucesso!", registroId: novoRegistroId });

    } catch (err: any) {
        console.error("Erro ao criar registro MSE:", err.message);
        res.status(500).json({ message: "Erro interno ao registrar MSE." });
    }
});


/**
 * @route GET /api/mse/registros
 * @desc  Lista todos os registros de MSE (Filtrado automaticamente para CREAS)
 */
router.get("/registros", async (req: Request, res: Response) => {
    // O middleware authorizeCreasOnly já garante que req.user.unit_id == UNIT_ID_CREAS
    const unit_id = req.user!.unit_id; 

    try {
        const query = cleanSqlString(`
            SELECT 
                r.id, r.nome_adolescente, r.data_nascimento, r.mse_tipo, r.mse_data_inicio, r.situacao, r.pia_data_elaboracao,
                u.username AS registrado_por,
                EXTRACT(YEAR FROM AGE(r.data_nascimento)) AS idade_atual 
            FROM registros_mse r
            JOIN users u ON r.registrado_por_id = u.id
            WHERE r.unit_id = $1
            ORDER BY r.mse_data_inicio DESC;
        `);
        
        const result = await pool.query(query, [unit_id]);
        
        res.json(result.rows);

    } catch (err: any) {
        console.error("Erro ao listar registros MSE:", err.message);
        res.status(500).json({ message: "Erro interno ao buscar registros MSE." });
    }
});


export default router;