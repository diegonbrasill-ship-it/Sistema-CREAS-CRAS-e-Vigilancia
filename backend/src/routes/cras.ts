// backend/src/routes/cras.ts 

import express, { Router, Request, Response } from "express";
import pool from "../db";
import { authMiddleware } from "../middleware/auth";
// Importamos unitAccessMiddleware, mas removemos ele do router.use para esta rota
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware"; 

const router = express.Router();

// Função de Limpeza SQL (Importada ou definida localmente)
const cleanSqlString = (sql: string): string => sql.replace(/\s+/g, ' ').trim();

// Aplicamos o authMiddleware (Obrigatório)
router.use(authMiddleware); 

// 📌 ROTA PRINCIPAL: GET /cras/casos (Listagem e Busca de Prontuário)
// 🛑 Implementa a Segregação Estrita e Estabiliza a Listagem (Risco A/B.2) 🛑
// =======================================================================
router.get("/casos", async (req: Request, res: Response) => {
    // Removemos a referência a 'req.accessFilter!' por ser obsoleta.
    const user = (req as any).user;
    
    // 🛑 NOVO: Capturamos um filtro unitId da query (se o Gestor quer ver um CRAS específico)
    const { unitId: queryUnitId } = req.query as { unitId?: string };

    const isGestorGeral = user.role.toLowerCase() === 'gestor';
    const userUnitId = user.unit_id; // unit_id do usuário logado

    let finalWhereClause = 'WHERE status = $1';
    let finalParams: (string | number)[] = ['Ativo']; // Status sempre ativo
    let paramIndex = 2; 

    // 1. FILTRO BASE DE SEGURANÇA (Implementação estrita por perfil)
    if (!isGestorGeral) {
        // Usuários Comuns (CREAS/CRAS)
        if (userUnitId !== null) {
            // Servidor CRAS/CREAS: Vê APENAS os casos da sua unidade.
            // A listagem CRAS é primariamente para unidades CRAS (IDs 2, 3, 4, 5).
            // Se for CREAS (ID 1), a listagem deve ser vazia (ou tratada em outra rota).
            
            // Filtro: O unit_id do caso deve ser igual ao unit_id do usuário
            finalWhereClause += ` AND casos.unit_id = $${paramIndex++}`;
            finalParams.push(userUnitId);
        } else {
            // Usuário comum sem lotação: Acesso negado.
            finalWhereClause += ' AND 1 = 0'; // Força resultado vazio
        }
    }
    // 2. FILTRO DO GESTOR GERAL (Visão total do CRAS com opção de Drill-Down)
    else {
        // Opção 2.1: Se o Gestor passou um unitId na query (clicou no submenu), filtra EXATAMENTE por ele.
        if (queryUnitId) {
            finalWhereClause += ` AND casos.unit_id = $${paramIndex++}`;
            finalParams.push(queryUnitId);
        }
        // Opção 2.2: Se o Gestor está na tela de consulta geral (sem filtro na query), ele vê todos os CRAS + NULL.
        else {
            const crasIds = [2, 3, 4, 5];
            // O gestor deve ver todos os CRAS (IDs 2,3,4,5) OU casos sem lotação (NULL).
            const placeholders = crasIds.map(() => `$${paramIndex++}`).join(', ');
            finalWhereClause += ` AND (casos.unit_id IN (${placeholders}) OR casos.unit_id IS NULL)`;
            finalParams.push(...crasIds);
        }
    }


    // Campos a serem buscados para a listagem 
    const baseFields = `id, "dataCad", "tecRef", nome, status, unit_id, dados_completos->>'bairro' AS bairro`;
    
    // Montagem da Query
    const query = cleanSqlString(`
        SELECT ${baseFields} 
        FROM casos
        ${finalWhereClause}
        ORDER BY "dataCad" DESC
    `);
    
    try {
        // EXECUÇÃO DA QUERY COM OS PARÂMETROS CORRETOS 
        const result = await pool.query(query, finalParams); 

        res.json(result.rows); 

    } catch (err: any) {
        console.error("Erro ao listar casos do CRAS:", err.message);
        res.status(500).json({ message: "Erro ao buscar casos do CRAS." });
    }
});

export default router;