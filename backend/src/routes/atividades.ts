// backend/src/routes/atividades.ts
// ⭐️ NOVO MÓDULO: Rota para Atividades Coletivas (RMA Bloco G) ⭐️

import { Router, Request, Response } from "express";
import pool from "../db";
import { authMiddleware } from "../middleware/auth";
import { logAction } from "../services/logger";
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware"; 
import { AuthenticatedUser } from '../middleware/auth'; 

const router = Router();

// Limpeza de SQL
const cleanSqlString = (sql: string): string => {
    return sql.replace(/\s+/g, ' ').trim();
};

// Aplica segurança base (autenticação e injeção de acesso)
router.use(authMiddleware, unitAccessMiddleware('atividades_coletivas', 'unit_id'));


/**
 * @route   POST /api/atividades
 * @desc    Registra uma nova atividade coletiva (Palestra, Grupo PAIF, SCFV)
 * @access  Private (Operacional CREAS/CRAS)
 */
router.post("/", async (req: Request, res: Response) => {
    const user = req.user as AuthenticatedUser;
    const { 
        data_atividade, 
        tipo_atividade, 
        tema_grupo, 
        publico_alvo, 
        numero_participantes, 
        descricao 
    } = req.body;
    
    const registrado_por_id = user.id;
    const unit_id = user.unit_id; // Unidade do técnico que está registrando

    if (!data_atividade || !tipo_atividade || !numero_participantes) {
        return res.status(400).json({ message: "Data, Tipo da Atividade e N° de Participantes são obrigatórios." });
    }

    try {
        const query = cleanSqlString(`
            INSERT INTO atividades_coletivas (
                data_atividade, tipo_atividade, tema_grupo, publico_alvo, 
                numero_participantes, descricao, registrado_por_id, unit_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
        `);
        
        const result = await pool.query(query, [
            data_atividade, tipo_atividade, tema_grupo, publico_alvo,
            numero_participantes, descricao, registrado_por_id, unit_id
        ]);
        
        const novaAtividadeId = result.rows[0].id;
        
        await logAction({ 
            userId: registrado_por_id, 
            username: user.username, 
            action: 'CREATE_ATIVIDADE_COLETIVA', 
            details: { atividadeId: novaAtividadeId, tipo: tipo_atividade, unitId: unit_id } 
        });
        
        res.status(201).json({ message: "Atividade coletiva registrada com sucesso!", atividadeId: novaAtividadeId });

    } catch (err: any) {
        console.error(`Erro ao registrar atividade coletiva: ${err.message}`);
        res.status(500).json({ message: "Erro interno ao registrar a atividade." });
    }
});

/**
 * @route   GET /api/atividades
 * @desc    Lista atividades coletivas (filtrado por unidade e mês)
 * @access  Private
 */
router.get("/", async (req: Request, res: Response) => {
    const access = req.access!;
    const { mes, ano } = req.query; // Ex: ?mes=09&ano=2025

    try {
        let whereClause = 'TRUE';
        const params: any[] = [];
        let paramIndex = 1;

        // 1. Filtro de Segurança (Unidade)
        if (!access.isGestorGeral && !access.isVigilancia) {
             // Operacional (CRAS/CREAS) só vê sua unidade
            if (access.userUnitId) {
                params.push(access.userUnitId);
                whereClause += ` AND a.unit_id = $${paramIndex++}`;
            } else {
                return res.json([]); // Bloqueia se não for gestor e não tiver lotação
            }
        }
        // Gestor/Vigilância veem todas as unidades (sem filtro de unidade)

        // 2. Filtro de Data (Mês/Ano)
        if (mes && ano) {
            const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`;
            params.push(startDate);
            whereClause += ` AND a.data_atividade >= $${paramIndex++}`;
            params.push(startDate);
            // Calcula o próximo mês para o limite final
            whereClause += ` AND a.data_atividade < ($${paramIndex++}::date + interval '1 month')`;
        }
        
        const query = cleanSqlString(`
            SELECT a.*, u.username as "registrado_por"
            FROM atividades_coletivas a
            LEFT JOIN users u ON a.registrado_por_id = u.id
            WHERE ${whereClause}
            ORDER BY a.data_atividade DESC
        `);
        
        const result = await pool.query(query, params);
        res.json(result.rows);
        
    } catch (err: any) {
        console.error(`Erro ao listar atividades coletivas: ${err.message}`);
        res.status(500).json({ message: "Erro interno ao buscar atividades." });
    }
});


export default router;