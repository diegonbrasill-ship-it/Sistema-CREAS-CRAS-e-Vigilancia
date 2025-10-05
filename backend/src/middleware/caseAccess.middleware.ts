// backend/src/middleware/caseAccess.middleware.ts

import { Request, Response, NextFunction } from "express";
import pool from "../db";

// Assumindo que a tipagem de Express.Request com req.user e req.accessFilter já existe globalmente,
// ou foi definida em auth.ts e unitAccess.middleware.ts.

/**
 * Middleware auxiliar que checa se o usuário tem permissão de unidade para
 * interagir com um Caso específico (GET, PUT, POST, DELETE).
 * * O ID do caso pode vir de req.params.id, req.params.casoId ou req.body.caso_associado_id.
 * * @param idLocation Onde encontrar o ID na requisição ('params' ou 'body').
 * @param idName O nome do campo do ID ('id', 'casoId', 'caso_associado_id').
 */
export const checkCaseAccess = (idLocation: 'params' | 'body', idName: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // ID do Caso a ser verificado
        const casoId = (req as any)[idLocation][idName]; 
        
        // Se a rota for POST sem casoId (ex: criando um caso novo), deve passar. 
        // Se a rota é para um item filho (acompanhamento/demanda/encaminhamento), o casoId é obrigatório.
        if (!casoId) {
            // Em rotas POST, podemos permitir que o controller lide com a ausência do casoId
            // ou retornar um erro 400 se o casoId for esperado. Vamos presumir que é esperado.
            // Para manter o foco na segurança:
            if (idLocation === 'params' || req.method !== 'POST') {
                return res.status(400).json({ message: "ID do Caso é obrigatório para esta operação." });
            }
            return next();
        }

        const accessFilter = req.accessFilter!;
        
        // 1. RESOLVER PLACEHOLDERS E PARÂMETROS
        const params: (string | number)[] = [casoId]; 
        let unitWhere = accessFilter.whereClause;
        
        if (accessFilter.params.length === 1) {
            unitWhere = unitWhere.replace('$X', `$${params.length + 1}`);
            params.push(accessFilter.params[0]);
        } else if (accessFilter.params.length === 2) {
            unitWhere = unitWhere.replace('$X', `$${params.length + 1}`).replace('$Y', `$${params.length + 2}`);
            params.push(accessFilter.params[0], accessFilter.params[1]);
        }

        // 2. CONSULTA DE VERIFICAÇÃO DE PERMISSÃO
        const query = `SELECT id FROM casos WHERE id = $1 AND ${unitWhere}`;
        
        try {
            const result = await pool.query(query, params);

            if (result.rowCount === 0) {
                return res.status(403).json({ message: "Acesso Proibido. Você não tem permissão para interagir com este caso (Unit ID)." });
            }
            
            // Armazena o casoId na requisição para uso posterior (log, etc.)
            (req as any).casoId = casoId;
            next(); 
        } catch (error) {
            console.error("Erro na checagem de acesso centralizada:", error);
            res.status(500).json({ message: "Erro de validação de acesso." });
        }
    };
};

/**
 * Middleware específico para rotas PUT/PATCH que usam o ID de um ITEM FILHO (Encaminhamento, etc.).
 * Primeiro busca o casoId associado ao item filho, e depois checa o acesso à unidade do caso.
 */
export const checkItemAccessByParentCase = (itemIdName: string, itemTableName: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const itemId = req.params[itemIdName]; 
        const accessFilter = req.accessFilter!;
        
        try {
            // 1. Encontra o casoId associado ao item filho
            const casoResult = await pool.query(`SELECT "casoId" FROM ${itemTableName} WHERE id = $1`, [itemId]);
            if (casoResult.rowCount === 0) {
                return res.status(404).json({ message: `${itemTableName} não encontrado.` });
            }
            const casoId = casoResult.rows[0].casoId;
            
            // 2. Resolve Placeholders (igual ao checkCaseAccess)
            const params: (string | number)[] = [casoId];
            let unitWhere = accessFilter.whereClause;
            
            if (accessFilter.params.length === 1) {
                unitWhere = unitWhere.replace('$X', `$${params.length + 1}`);
                params.push(accessFilter.params[0]);
            } else if (accessFilter.params.length === 2) {
                unitWhere = unitWhere.replace('$X', `$${params.length + 1}`).replace('$Y', `$${params.length + 2}`);
                params.push(accessFilter.params[0], accessFilter.params[1]);
            }
            
            // 3. Checa a permissão de unidade para o caso
            const checkQuery = `SELECT id FROM casos WHERE id = $1 AND ${unitWhere}`;
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