"use strict";
// backend/src/utils/sqlUtils.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanSqlString = void 0;
/**
 * Função de Limpeza SQL Extrema: Remove quebras de linha e múltiplos espaços.
 * Essencial para remover o erro 'syntax error at or near " "'.
 */
const cleanSqlString = (sql) => {
    return sql.replace(/\s+/g, ' ').trim();
};
exports.cleanSqlString = cleanSqlString;
