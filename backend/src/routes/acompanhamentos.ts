// backend/src/routes/acompanhamentos.ts
// ⭐️ ATUALIZAÇÃO: Rota POST revertida para salvar apenas (texto) ⭐️

import { Router, Request, Response, NextFunction } from "express";
import pool from "../db";
import { authMiddleware } from "../middleware/auth";
import { logAction } from "../services/logger";
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware"; 
import { checkCaseAccess } from "../middleware/caseAccess.middleware"; 

// Constantes locais para garantir a execução (como corrigido anteriormente)
const CREAS_UNIT_ID = 1; 
const CRAS_UNIT_IDS = [3, 4, 5, 6]; 
// --------------------------------------------------------------------------

const router = Router();

// 📌 SOLUÇÃO DE LIMPEZA EXTREMA
const cleanSqlString = (sql: string): string => {
    return sql.replace(/\s+/g, ' ').trim();
};


// Aplica a checagem de unidade para todas as rotas que dependem do casoId
router.use(authMiddleware, unitAccessMiddleware('casos', 'unit_id')); 


// =======================================================================
// ROTA PARA BUSCAR TODOS OS ACOMPANHAMENTOS DE UM CASO (CORRIGIDO SEGURANÇA)
// =======================================================================
router.get("/:casoId", async (req: Request, res: Response) => {
    const { casoId } = req.params;
    const access = req.access!; 

    try {
        // 1. REGRAS DE SEGURANÇA (Para o caso em questão)
        let unitFilterClause = `c.id = $1`;
        const params: any[] = [casoId];
        
        // Lógica de filtro reescrita de forma segura
        if (!access.isGestorGeral && !access.isVigilancia) {
            // Servidor CRAS/CREAS: Vê APENAS a sua unidade (e nulos)
            if (access.userUnitId) {
                params.push(access.userUnitId); // $2
                // Adiciona o ESPAÇO ANTES da cláusula limpa
                unitFilterClause += " " + cleanSqlString(`
                    AND (c.unit_id = $2 OR c.unit_id IS NULL)
                `);
            } else {
                return res.status(403).json({ message: "Acesso negado." });
            }
        } else if (access.isVigilancia) {
             const allUnits = [CREAS_UNIT_ID, ...CRAS_UNIT_IDS];
             const placeholders = allUnits.map(() => `$${params.length + 1}`).join(', ');
             params.push(...allUnits);
             
             // Adiciona o ESPAÇO ANTES da cláusula limpa
             unitFilterClause += " " + cleanSqlString(`
                AND (c.unit_id IN (${placeholders}) OR c.unit_id IS NULL)
             `);
        }
        
        // 2. EXECUÇÃO DA BUSCA
        const query = cleanSqlString(`
            SELECT a.*, u.username as "tecRef" 
            FROM acompanhamentos a
            JOIN users u ON a."userId" = u.id
            JOIN casos c ON a."casoId" = c.id
            WHERE ${unitFilterClause}
            ORDER BY a.data DESC
        `);
        
        const result = await pool.query(query, params);
        
        if (result.rowCount === 0) {
            return res.json([]); 
        }

        res.json(result.rows);
    } catch (err: any) {
        console.error("Erro ao buscar acompanhamentos:", err.message);
        res.status(500).json({ message: "Erro ao buscar acompanhamentos." });
    }
});

// =======================================================================
// ROTA PARA CRIAR UM NOVO ACOMPANHAMENTO (⭐️ REVERTIDA PELA ORDEM ⭐️)
// =======================================================================
router.post("/:casoId", checkCaseAccess('params', 'casoId'), async (req, res) => {
    const { casoId } = req.params;
    // ⭐️ REVERSÃO: Captura apenas o 'texto' do body ⭐️
    const { texto } = req.body; 
    const userId = req.user!.id;
    const userUnitId = req.user!.unit_id;

section:
    if (!texto) { // ⭐️ Validação revertida
        return res.status(400).json({ message: "O texto do acompanhamento é obrigatório." });
    }

    try {
        // ⭐️ REVERSÃO: Remove a coluna 'tipo' no INSERT ⭐️
        const query = cleanSqlString(`
            INSERT INTO acompanhamentos (texto, "casoId", "userId") 
section:            VALUES ($1, $2, $3) 
            RETURNING *
        `);
        
        // ⭐️ REVERSÃO: Remove 'tipo' dos parâmetros ⭐️
        const result = await pool.query(query, [texto, casoId, userId]);
        const novoAcompanhamento = result.rows[0];

        await logAction({ 
            userId, 
            username: req.user!.username, 
            action: 'CREATE_ACOMPANHAMENTO', 
            // ⭐️ REVERSÃO: Remove 'tipo' do log ⭐️
            details: { casoId, acompanhamentoId: novoAcompanhamento.id, unitId: userUnitId }
        });

        res.status(201).json(novoAcompanhamento);
    } catch (err: any) {
        console.error("Erro ao salvar acompanhamento:", err.message);
        res.status(500).json({ message: "Erro ao salvar acompanhamento." });
    }
});

export default router;