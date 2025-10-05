// backend/src/utils/sqlUtils.ts

/**
 * Função de Limpeza SQL Extrema: Remove quebras de linha e múltiplos espaços.
 * Essencial para remover o erro 'syntax error at or near " "'.
 */
export const cleanSqlString = (sql: string): string => {
    return sql.replace(/\s+/g, ' ').trim();
};

/**
 * Tipos de Perfis de Acesso Válidos (Roles do Back-end).
 * Usamos essas strings em todo o sistema para checagem de permissão.
 */
export type UserRole = 'gestor' | 'coordenador' | 'tecnico_superior' | 'tecnico_medio' | 'vigilancia' | 'tecnico';