// backend/src/routes/mse.routes.ts

import { Router, Request, Response } from "express";
import pool from "../db";
import { logAction } from "../services/logger";
import { authorizeCreasOnly, authMiddleware } from "../middleware/auth";
import { UNIT_ID_CREAS } from "../utils/constants";
import { QueryResult } from "pg"; 

const router = Router();

// SOLUÇÃO DE LIMPEZA EXTREMA
const cleanSqlString = (sql: string): string => {
    return sql.replace(/\s+/g, ' ').trim();
};

// Interface de tipos para a nova rota
interface MseRegistroBody {
    nome_adolescente: string; data_nascimento: string; responsavel: string; endereco: string; contato: string; nis: string;
    mse_tipo: 'LA' | 'PSC' | 'LA + PSC'; mse_data_inicio: string; mse_duracao_meses: number; situacao: 'CUMPRIMENTO' | 'DESCUMPRIMENTO';
    local_descumprimento?: string; pia_data_elaboracao?: string; pia_status?: 'Em Análise' | 'Aprovado' | 'Revisão' | 'Não Elaborado';
}


// Aplica middlewares de segurança na ordem correta
router.use(authMiddleware); 
router.use(authorizeCreasOnly);


/**
 * @route POST /api/mse/registros
 * @desc  Cria um novo registro de Medida Socioeducativa (MSE)
 */
router.post("/registros", async (req: Request, res: Response) => {
    const userId = req.user!.id;
    // Usa a unidade do usuário, com fallback para CREAS (ID 1)
    const unit_id = req.user!.unit_id ?? UNIT_ID_CREAS; 

    const {
        nome_adolescente, data_nascimento, responsavel, endereco, contato, nis,
        mse_tipo, mse_data_inicio, mse_duracao_meses, situacao, local_descumprimento,
        pia_data_elaboracao, pia_status
    } = req.body as MseRegistroBody;

    if (!nome_adolescente || !data_nascimento || !mse_tipo || !mse_data_inicio || !mse_duracao_meses || !situacao) {
        return res.status(400).json({ message: "Campos obrigatórios de MSE estão faltando." });
    }

    // 📌 FIX DE DADOS: Limpeza e garantia de tamanho máximo (resolve o erro 'value too long')
    const cleanNis = nis ? nis.replace(/[^\d]/g, '').substring(0, 15) : null; // Aumentado para 15 caracteres (NIS/CPF)
    const cleanContato = contato ? contato.replace(/[^\d]/g, '').substring(0, 20) : null; // Aumentado para 20 caracteres

    // 📌 FIX DE STATUS: Garantir um valor padrão para o DB se o Front-end não enviar nada
    const finalPiaStatus = pia_status ?? 'Em Análise';


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
            nome_adolescente, data_nascimento, responsavel, endereco, cleanContato, cleanNis, 
            mse_tipo, mse_data_inicio, mse_duracao_meses, situacao, local_descumprimento,
            pia_data_elaboracao, finalPiaStatus, userId, unit_id // Usa finalPiaStatus
        ];

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
 * @desc  Lista todos os registros de MSE e KPIs (Exclusivo CREAS)
 */
router.get("/registros", async (req: Request, res: Response) => {
    const unit_id = req.user!.unit_id ?? UNIT_ID_CREAS; 
    const { q } = req.query; 
    
    const durationSql = 'r.mse_data_inicio + interval \'1 month\' * r.mse_duracao_meses';

    const params: (string | number)[] = [unit_id]; 
    let listWhere = `r.unit_id = $1`;
    let qPlaceholderIndex = 2;
    
    if (q && typeof q === 'string') {
        const searchTerm = `%${q}%`;
        params.push(searchTerm, searchTerm); 
        listWhere += cleanSqlString(`
             AND (r.nome_adolescente ILIKE $${qPlaceholderIndex++} OR r.nis ILIKE $${qPlaceholderIndex++})
        `);
    }

    try {
        const listQuery = cleanSqlString(`
            SELECT 
                r.id, r.nome_adolescente, r.data_nascimento, r.mse_tipo, r.mse_data_inicio, r.situacao, r.pia_data_elaboracao,
                u.username AS registrado_por,
                EXTRACT(YEAR FROM AGE(r.data_nascimento)) AS idade_atual,
                (${durationSql}) AS mse_data_final 
            FROM registros_mse r
            JOIN users u ON r.registrado_por_id = u.id
            WHERE ${listWhere}
            ORDER BY r.mse_data_inicio DESC;
        `);
        
        const kpiQuery = cleanSqlString(`
            SELECT
                COUNT(r.id) AS total_medidas,
                COUNT(r.id) FILTER (WHERE r.situacao = 'CUMPRIMENTO') AS total_cumprimento,
                COUNT(r.id) FILTER (WHERE r.situacao = 'DESCUMPRIMENTO') AS total_descumprimento,
                COUNT(r.id) FILTER (
                    WHERE r.situacao = 'CUMPRIMENTO' 
                    AND (${durationSql}) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
                ) AS expirando_em_60_dias
            FROM registros_mse r
            WHERE r.unit_id = $1;
        `);
        
        const [registrosResult, kpiResult] = await Promise.all([
            pool.query(listQuery, params), 
            pool.query(kpiQuery, [unit_id]), 
        ]);
        
        const responseData = {
            registros: registrosResult.rows,
            kpis: kpiResult.rows[0]
        };

        res.json(responseData);

    } catch (err: any) {
        console.error("Erro ao listar registros MSE:", err.message);
        res.status(500).json({ message: "Erro interno ao buscar registros MSE." });
    }
});


export default router;