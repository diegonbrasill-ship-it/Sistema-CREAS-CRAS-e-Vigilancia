// backend/src/middleware/caseAccess.middleware.ts

import { Request, Response, NextFunction } from "express";
import pool from "../db";
// 🛑 REMOVIDA A IMPORTAÇÃO PROBLEMÁTICA DE CONSTANTES

// ⭐️ CORREÇÃO LOCAL: Declarando constantes para resolver erro de exportação ⭐️
const CREAS_UNIT_ID = 1; 
const CRAS_UNIT_IDS = [3, 4, 5, 6]; 
// --------------------------------------------------------------------------

/**
 * Função auxiliar para montar a cláusula WHERE de segregação de unidade,
 * baseada no perfil do usuário (Gestor/Vigilância/Operacional).
 * * @param access O objeto req.access injetado pelo unitAccessMiddleware.
 * @param startParamIndex O índice inicial para os placeholders ($N).
 * @returns [whereClause, params]
 */
const buildUnitAccessFilter = (access: Request['access'], startParamIndex: number): [string, any[]] => {
    if (!access) return ['FALSE', []]; // Falha na segurança base

    let whereClauses: string[] = [];
    let params: any[] = [];
    let paramIndex = startParamIndex;

    const userUnitId = access.userUnitId;

    if (access.isGestorGeral || access.isVigilancia) {
        // Gestor Geral e Vigilância (BI/Visão Ampla): Veem todos os CRAS/CREAS e casos NULL.
        const allUnits = [CREAS_UNIT_ID, ...CRAS_UNIT_IDS];
        const placeholders = allUnits.map(unitId => {
            params.push(unitId);
            return `$${paramIndex++}`;
        }).join(', ');

        whereClauses.push(`(unit_id IN (${placeholders}) OR unit_id IS NULL)`);

    } else if (userUnitId !== null && userUnitId !== undefined) {
        // Servidor Operacional (CREAS/CRAS): Vê APENAS a sua unidade (e nulos).
        params.push(userUnitId);
        whereClauses.push(`(unit_id = $${paramIndex++} OR unit_id IS NULL)`);
    } else {
        // Usuário sem lotação (e não Gestor/Vigilância) não pode ver nada.
        return ['FALSE', []];
    }

    return [whereClauses.join(' AND '), params];
};


/**
 * Middleware auxiliar que checa se o usuário tem permissão de unidade para
 * interagir com um Caso específico (GET, PUT, POST, DELETE). (REFATORADO)
 * @param idLocation Onde encontrar o ID na requisição ('params' ou 'body').
 * @param idName O nome do campo do ID ('id', 'casoId', 'caso_associado_id').
 */
export const checkCaseAccess = (idLocation: 'params' | 'body', idName: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const rawId = (req as any)?.[idLocation]?.[idName]; 
        const casoIdString = rawId ? String(rawId) : undefined;
        const access = req.access; // ⭐️ NOVO OBJETO DE ACESSO ⭐️
        
        if (!casoIdString) {
            if (idLocation === 'params' || req.method !== 'POST') {
                return res.status(400).json({ message: "ID do Caso é obrigatório para esta operação." });
            }
            return next();
        }

        const casoId = parseInt(casoIdString, 10);
        
        if (isNaN(casoId)) {
            console.error("ID de Caso inválido detectado (NaN). Bloqueando acesso para evitar erro SQL.");
            return res.status(400).json({ message: "ID do Caso inválido (não é um número válido)." });
        }

        // 1. CONSTRÓI O FILTRO DE PERMISSÃO COM O NOVO OBJETO DE ACESSO
        // O primeiro parâmetro do buildUnitAccessFilter será o $2 da query final
        const [unitFilterContent, unitFilterParams] = buildUnitAccessFilter(access, 2);

        // 2. MONTAGEM FINAL DA QUERY DE CHECAGEM
        // O casoId ($1) é o primeiro parâmetro
        const params: (string | number)[] = [casoId, ...unitFilterParams]; 
        
        // A query verifica se o caso existe E se sua unit_id se enquadra na permissão do usuário
        // Substituímos 'unit_id' por 'casos.unit_id' para garantir a segurança em JOINs futuros (melhor prática)
        const query = `SELECT id FROM casos WHERE id = $1 AND ${unitFilterContent.replace(/unit_id/g, 'casos.unit_id')}`;
        
        try {
            const result = await pool.query(query, params);

            if (result.rowCount === 0) {
                return res.status(403).json({ message: "Acesso Proibido. Você não tem permissão para interagir com este caso (Unit ID)." });
            }
            
            (req as any).casoId = casoId;
            next(); 
        } catch (error) {
            console.error("Erro na checagem de acesso centralizada:", error);
            res.status(500).json({ message: "Erro de validação de acesso." });
        }
    };
};

/**
 * Middleware específico para rotas PUT/PATCH que usam o ID de um ITEM FILHO (Encaminhamento, etc.). (REFATORADO)
 */
export const checkItemAccessByParentCase = (itemIdName: string, itemTableName: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const rawId = req.params[itemIdName]; 
        const itemIdString = rawId ? String(rawId) : undefined;
        const access = req.access; // ⭐️ NOVO OBJETO DE ACESSO ⭐️
        
        const itemId = parseInt(itemIdString || '', 10);
        
        if (isNaN(itemId)) {
            console.error(`ID de ${itemTableName} inválido detectado (NaN). Bloqueando acesso.`);
            return res.status(400).json({ message: `ID do ${itemTableName} inválido (não é um número válido).` });
        }


        try {
            // 1. Encontra o casoId associado ao item filho
            const casoResult = await pool.query(`SELECT "casoId" FROM ${itemTableName} WHERE id = $1`, [itemId]);
            if (casoResult.rowCount === 0) {
                return res.status(404).json({ message: `${itemTableName} não encontrado.` });
            }
            const casoId = casoResult.rows[0].casoId; 
            
            // 2. CONSTRÓI O FILTRO DE PERMISSÃO COM O NOVO OBJETO DE ACESSO
            const [unitFilterContent, unitFilterParams] = buildUnitAccessFilter(access, 2);
            
            const params: (string | number)[] = [casoId, ...unitFilterParams];
            
            // 3. Checa a permissão de unidade para o caso
            // Precisamos que a query de checagem faça JOIN implícito com a tabela casos.
            const checkQuery = `SELECT id FROM casos WHERE id = $1 AND ${unitFilterContent}`;
            const checkResult = await pool.query(checkQuery, params);

            if (checkResult.rowCount === 0) {
                return res.status(403).json({ message: "Acesso Proibido. Você não pode atualizar este item de um caso fora da sua unidade." });
            }

            // Armazena o casoId na requisição para uso no log, etc.
            (req as any).casoId = casoId;
            next();

        } catch (error) {
            console.error(`Erro na checagem de acesso de ${itemTableName}:`, error);
            res.status(500).json({ message: "Erro de validação de acesso." });
        }
    };
};