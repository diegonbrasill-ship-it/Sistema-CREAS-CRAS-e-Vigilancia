// backend/src/middleware/unitAccess.middleware.ts

import { Request, Response, NextFunction } from "express";
import { UNIT_ID_CREAS, UNIT_ID_VIGILANCIA } from "../utils/constants";
import pool from "../db";
import { AuthenticatedUser } from "./auth/authenticated.user";

/**
 * Middleware para gerar a cláusula WHERE de restrição de acesso por Unidade.
 * @param tableName O nome da tabela principal a ser filtrada (ex: 'casos').
 * @param unitIdColumn O nome da coluna de ID da unidade na tabela (ex: 'unit_id').
 * @returns Um middleware do Express.
 */

export const unitAccessMiddleware = (tableName: string, unitIdColumn: string = 'unit_id') => {

    const tablePrefix = (tableName === 'casos' || tableName === 'users') ? tableName : 'c';

    return (req: Request, res: Response, next: NextFunction) => {

        // req.user é tratado como tipo AuthenticatedUser
        const user = req.user as AuthenticatedUser | undefined;

        // 1. Checagem de Segurança
        if (!user) {
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
        //unit_id deve existir para que a filtrafem de segurança funcione
        if (user.unit_id === null || user.unit_id === undefined) {
            console.error(`ERRO DE SEGURANÇA: Usuário não-gestor sem unit_id. Role: ${user.role}`);
            return res.status(403).json({ message: "Acesso negado. Servidor sem unidade de lotação definida." });
        }

        const userUnitId = user.unit_id;
        let unitParams: (string | number)[] = [];
        let unitWhereClause = '';

        // Variável local para evitar o erro TS2367 //TODO: trocar dados estaticos para backend
        const creasIdAsNumber: number = UNIT_ID_CREAS;

        // 2. REGRA PADRÃO: O usuário só acessa dados da sua Unidade.
        unitParams.push(userUnitId);
        // unitWhereClause usa o prefixo adaptativo (ex: "casos.unit_id" ou "c.unit_id")
        unitWhereClause = `${tablePrefix}.${unitIdColumn} = $1`;

        //3. REGRA DE EXCEÇÃO CRÍTICA: Vigilância (UNIT_ID_VIGILANCIA) acessa CREAS (UNIT_ID_CREAS).
        if (userUnitId === UNIT_ID_VIGILANCIA) {

            if (UNIT_ID_VIGILANCIA !== creasIdAsNumber) {

                unitParams.push(UNIT_ID_CREAS);
                unitWhereClause = `(${tablePrefix}."${unitIdColumn}" = $2 OR ${tablePrefix}."${unitIdColumn}" = $3)`;
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