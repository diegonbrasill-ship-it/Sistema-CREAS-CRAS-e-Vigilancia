// backend/src/middleware/unitAccess.middleware.ts
// VERSÃO CORRIGIDA PARA VISIBILIDADE DE CASOS NULL (CREAS/CRAS)

import { Request, Response, NextFunction } from "express";
import { UNIT_ID_CREAS, UNIT_ID_VIGILANCIA } from "../utils/constants"; 
import pool from "../db"; 
// 📌 FIX CRÍTICO: Importamos a tipagem do usuário autenticado de onde ela é definida.
import { AuthenticatedUser } from "./auth"; 

// Extensão da tipagem Request para incluir nosso filtro (acessível nas rotas)
declare global {
    namespace Express {
        interface Request {
            // A tipagem de 'user' já é herdada de auth.ts
            accessFilter?: {
                whereClause: string;
                params: (string | number)[];
            };
        }
    }
}


/**
 * Middleware para gerar a cláusula WHERE de restrição de acesso por Unidade.
 * CORRIGIDO: Garante que o usuário restrito (CREAS/CRAS) veja sua unidade E casos NULL.
 * @param tableName O nome da tabela principal a ser filtrada (ex: 'casos').
 * @param unitIdColumn O nome da coluna de ID da unidade na tabela (ex: 'unit_id').
 * @returns Um middleware do Express.
 */
export const unitAccessMiddleware = (tableName: string, unitIdColumn: string = 'unit_id') => {
    
    const tablePrefix = (tableName === 'casos' || tableName === 'users') ? tableName : 'c'; 
    const unitIdFull = `${tablePrefix}."${unitIdColumn}"`;
    
    return (req: Request, res: Response, next: NextFunction) => {
        // 📌 FIX: Garantimos que o req.user seja tratado como o tipo correto (AuthenticatedUser)
        const user = req.user as AuthenticatedUser | undefined;
        
        // 1. Checagem de Segurança
        if (!user) {
            return res.status(401).json({ message: "Acesso não autorizado: Informação de Usuário ausente." });
        }
        
        // 1a. REGRA MESTRE: Gestor e Vigilância têm acesso total (TRUE).
        if (user.role === 'gestor' || user.role === 'vigilancia') {
            req.accessFilter = {
                whereClause: 'TRUE', 
                params: [],
            };
            return next();
        }

        // 2. VERIFICAÇÃO DE SEGURANÇA para usuários restritos.
        if (user.unit_id === null || user.unit_id === undefined) {
             console.error(`ERRO DE SEGURANÇA: Usuário não-gestor sem unit_id. Role: ${user.role}`);
             return res.status(403).json({ message: "Acesso negado. Servidor sem unidade de lotação definida." });
        }
        
        // 3. REGRA RESTRITA: O usuário só acessa sua Unidade E casos NULL.
        const userUnitId = user.unit_id;
        let unitParams: (string | number)[] = [userUnitId];
        
        // 🛑 CORREÇÃO DE VISIBILIDADE CREAS/CRAS (LINHAS 69-70) 🛑
        // Adiciona o OR IS NULL na cláusula WHERE.
        const unitWhereClause = `(${unitIdFull} = $X OR ${unitIdFull} IS NULL)`; 

        // 4. Injeta o filtro na requisição.
        req.accessFilter = {
            whereClause: unitWhereClause,
            params: unitParams,
        };

        next();
    };
};