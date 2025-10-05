// backend/src/middleware/unitAccess.middleware.ts

import { Request, Response, NextFunction } from "express";
import { UNIT_ID_CREAS, UNIT_ID_VIGILANCIA } from "../utils/constants"; 
import pool from "../db"; 

// 📌 É necessário garantir que esta interface corresponda à sua TokenPayload em auth.ts
interface AuthenticatedUser {
    id: number;
    username: string;
    role: string;
    unit_id: number;
}

// Extensão da tipagem Request para incluir nosso filtro (acessível nas rotas)
declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser; 
            accessFilter?: {
                whereClause: string;
                params: (string | number)[];
            };
        }
    }
}


/**
 * Middleware para gerar a cláusula WHERE de restrição de acesso por Unidade.
 * * @param tableName O nome da tabela principal a ser filtrada (ex: 'casos').
 * @param unitIdColumn O nome da coluna de ID da unidade na tabela (ex: 'unit_id').
 * @returns Um middleware do Express.
 */
export const unitAccessMiddleware = (tableName: string, unitIdColumn: string = 'unit_id') => {
    
    // 📌 CORREÇÃO CRÍTICA DE ALIAS: Determina o prefixo correto para a cláusula WHERE.
    // - Se a rota é para 'casos', usamos 'casos' (ou seja, casos.unit_id).
    // - Se a rota é para um módulo filho que usa JOIN (ex: 'demandas', 'acompanhamentos'), 
    //   assumimos o alias 'c' para a tabela 'casos' no JOIN (ex: c.unit_id).
    const tablePrefix = (tableName === 'casos' || tableName === 'users') ? tableName : 'c'; 
    
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;
        
        // 1. Checagem de Segurança
        if (!user || !user.unit_id) {
            console.error("ERRO CRÍTICO: Usuário ou unit_id ausente após autenticação.");
            return res.status(401).json({ message: "Acesso não autorizado: Informação de Unidade ausente." });
        }

        const userUnitId = user.unit_id;
        let unitParams: (string | number)[] = [];
        let unitWhereClause = '';

        // Variável local para evitar o erro TS2367
        const creasIdAsNumber: number = UNIT_ID_CREAS;

        // 2. REGRA PADRÃO: O usuário só acessa sua Unidade.
        unitParams.push(userUnitId);
        // unitWhereClause agora usa o prefixo adaptativo (ex: "casos.unit_id" ou "c.unit_id")
        unitWhereClause = `${tablePrefix}."${unitIdColumn}" = $X`; 

        // 3. REGRA DE EXCEÇÃO CRÍTICA: Vigilância (UNIT_ID_VIGILANCIA) acessa CREAS (UNIT_ID_CREAS).
        if (userUnitId === UNIT_ID_VIGILANCIA) {
            
            if (UNIT_ID_VIGILANCIA !== creasIdAsNumber) {
                
                unitParams.push(UNIT_ID_CREAS);
                unitWhereClause = `(${tablePrefix}."${unitIdColumn}" = $X OR ${tablePrefix}."${unitIdColumn}" = $Y)`;
            }
        }
        
        // 4. Injeta o filtro na requisição.
        req.accessFilter = {
            whereClause: unitWhereClause,
            params: unitParams,
        };

        next();
    };
};