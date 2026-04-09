// backend/src/middleware/unitAccess.middleware.ts

import { Request, Response, NextFunction } from "express";
import { AuthenticatedUser } from "./auth/authenticated.user";

interface UnitAccessOptions {
    allowCrossUnitForVigilancia?: boolean;
}

/**
 * Middleware para gerar a cláusula WHERE de restrição de acesso por Unidade.
 * @param tableName O nome da tabela principal a ser filtrada (ex: 'casos').
 * @param unitIdColumn O nome da coluna de ID da unidade na tabela (ex: 'unit_id').
 * @returns Um middleware do Express.
 */
export const unitAccessMiddleware = (
    tableName: string,
    unitIdColumn: string = 'unit_id',
    options: UnitAccessOptions = {}
) => {

    const tablePrefix = (tableName === 'casos' || tableName === 'users') ? tableName : 'c';

    return (req: Request, res: Response, next: NextFunction) => {

        const user = req.user as AuthenticatedUser;
        
        if (!user) { //verifica se existe usuário
            return res.status(401).json({ message: "Acesso não autorizado: Informação de Usuário ausente." });
        }

        // se for gestor não tem filtros //TODO: trocar ao migrar cargos para talela roles no db
        if (user.role === 'gestor') {
            req.accessFilter = {
                whereClause: 'TRUE',
                params: [],
            };
            return next();
        }

        if (options.allowCrossUnitForVigilancia && user.role === 'vigilancia') {
            req.accessFilter = {
                whereClause: 'TRUE',
                params: [],
            };
            return next();
        }

        //unit_id deve existir para que a filtrafem de segurança funcione
        if (user.unit_id === null || user.unit_id === undefined) {
            console.error(`ERRO DE SEGURANÇA: Usuário sem unit_id.`);
            return res.status(403).json({ message: "Acesso negado. Servidor sem unidade definida." });
        }

        const userUnitId = user.unit_id;
        let unitParams: (string | number)[] = [];
        let unitWhereClause = '';
        
        // O usuário só acessa dados da sua Unidade.
        unitParams.push(userUnitId);
        // unitWhereClause usa o prefixo adaptativo (ex: "casos.unit_id" ou "c.unit_id")
        unitWhereClause = `${tablePrefix}.${unitIdColumn}`;
        // 4. Injeta o filtro na requisição.
        req.accessFilter = {
            whereClause: unitWhereClause,
            params: unitParams,
        };

        next();
    };
};
