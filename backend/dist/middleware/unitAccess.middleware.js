"use strict";
// backend/src/middleware/unitAccess.middleware.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitAccessMiddleware = void 0;
const constants_1 = require("../utils/constants");
// 📌 REMOVEMOS A INTERFACE AuthenticatedUser local para evitar o conflito TS2717.
// Extensão da tipagem Request para incluir nosso filtro (acessível nas rotas)
/**
 * Middleware para gerar a cláusula WHERE de restrição de acesso por Unidade.
 * @param tableName O nome da tabela principal a ser filtrada (ex: 'casos').
 * @param unitIdColumn O nome da coluna de ID da unidade na tabela (ex: 'unit_id').
 * @returns Um middleware do Express.
 */
const unitAccessMiddleware = (tableName, unitIdColumn = 'unit_id') => {
    const tablePrefix = (tableName === 'casos' || tableName === 'users') ? tableName : 'c';
    return (req, res, next) => {
        // 📌 FIX: Garantimos que o req.user seja tratado como o tipo correto (AuthenticatedUser)
        const user = req.user;
        // 1. Checagem de Segurança
        if (!user) {
            return res.status(401).json({ message: "Acesso não autorizado: Informação de Usuário ausente." });
        }
        // Se o usuário é o Gestor Geral, ele não deve ter filtro NENHUM.
        if (user.role === 'gestor') {
            req.accessFilter = {
                whereClause: 'TRUE',
                params: [],
            };
            return next();
        }
        // Se não for Gestor, a unit_id DEVE existir para a segurança funcionar
        if (user.unit_id === null || user.unit_id === undefined) {
            console.error(`ERRO DE SEGURANÇA: Usuário não-gestor sem unit_id. Role: ${user.role}`);
            return res.status(403).json({ message: "Acesso negado. Servidor sem unidade de lotação definida." });
        }
        const userUnitId = user.unit_id;
        let unitParams = [];
        let unitWhereClause = '';
        // Variável local para evitar o erro TS2367
        const creasIdAsNumber = constants_1.UNIT_ID_CREAS;
        // 2. REGRA PADRÃO: O usuário só acessa sua Unidade.
        unitParams.push(userUnitId);
        // unitWhereClause usa o prefixo adaptativo (ex: "casos.unit_id" ou "c.unit_id")
        unitWhereClause = `${tablePrefix}."${unitIdColumn}" = $X`;
        // 3. REGRA DE EXCEÇÃO CRÍTICA: Vigilância (UNIT_ID_VIGILANCIA) acessa CREAS (UNIT_ID_CREAS).
        if (userUnitId === constants_1.UNIT_ID_VIGILANCIA) {
            if (constants_1.UNIT_ID_VIGILANCIA !== creasIdAsNumber) {
                unitParams.push(constants_1.UNIT_ID_CREAS);
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
exports.unitAccessMiddleware = unitAccessMiddleware;
