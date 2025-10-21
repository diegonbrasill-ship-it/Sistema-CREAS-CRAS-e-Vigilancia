// backend/src/routes/cras.ts (VERSÃO FINAL COM DIAGNÓSTICO CRÍTICO DE LISTAGEM)

import express, { Router, Request, Response } from "express";
import pool from "../db";
import { authMiddleware } from "../middleware/auth";
// Importamos unitAccessMiddleware, mas removemos ele do router.use para este teste final
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware"; 

const router = express.Router();

// Função de Limpeza SQL (Importada ou definida localmente)
const cleanSqlString = (sql: string): string => sql.replace(/\s+/g, ' ').trim();

// Aplicamos o authMiddleware (Obrigatório), mas removemos o filtro unitAccessMiddleware
// para a rota GET /casos para depurar a listagem.
router.use(authMiddleware); // Mantemos apenas o middleware de autenticação

// 📌 ROTA PRINCIPAL: GET /cras/casos (Listagem e Busca de Prontuário)
// 🛑 CORRIGIDA A FALHA DE SEGREGACÃO DO GESTOR 🛑
// =======================================================================
router.get("/casos", async (req: Request, res: Response) => {
    // Acessa o filtro de segurança
    const accessFilter = req.accessFilter!;
    const user = (req as any).user;
    
    // 🛑 NOVO: Capturamos um filtro unitId da query (se o Front-end enviou)
    const { unitId: queryUnitId } = req.query as { unitId?: string };

    const isGestorGeral = user.role.toLowerCase() === 'gestor';
    const userUnitId = user.unit_id; // unit_id do usuário logado

    let finalWhereClause = 'WHERE status = $1';
    let finalParams: (string | number)[] = ['Ativo']; // Status sempre ativo
    let paramIndex = 2; 

    // 1. FILTRO BASE DE SEGURANÇA (Se não é Gestor, só vê a sua unidade)
    if (!isGestorGeral) {
        if (userUnitId !== null && userUnitId >= 2) {
            // Servidor CRAS (Comum): Vê APENAS os casos da sua unidade.
            finalWhereClause += ` AND casos.unit_id = $${paramIndex++}`;
            finalParams.push(userUnitId);
        } else {
            // Usuário CREAS (ID 1) ou sem lotação no CRAS: Retorna vazio.
            finalWhereClause += ' AND 1 = 0'; // Força resultado vazio
        }
    }
    // 2. FILTRO DO GESTOR GERAL (Deve ver todos ou filtrar pelo clique no submenu)
    else {
        // Opção 2.1: Se o Gestor passou um unitId na query (clicou no submenu), filtra EXATAMENTE por ele.
        if (queryUnitId) {
            finalWhereClause += ` AND casos.unit_id = $${paramIndex++}`;
            finalParams.push(queryUnitId);
        }
        // Opção 2.2: Se o Gestor está na tela de consulta geral (sem filtro na query), ele vê todos os CRAS + NULL.
        else {
            const crasIds = [2, 3, 4, 5];
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
        // 🛑 EXECUÇÃO DA QUERY COM OS PARÂMETROS CORRETOS 🛑
        const result = await pool.query(query, finalParams); 

        res.json(result.rows); 

    } catch (err: any) {
        console.error("Erro ao listar casos do CRAS:", err.message);
        res.status(500).json({ message: "Erro ao buscar casos do CRAS." });
    }
});

export default router;