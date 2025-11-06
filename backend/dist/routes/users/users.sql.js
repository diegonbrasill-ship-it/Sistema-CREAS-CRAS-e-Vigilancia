"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQL = void 0;
exports.SQL = {
    CLEAN: (sql) => sql.replace(/\s+/g, ' ').trim(),
    LIST_USERS: `
    SELECT id, username, role, nome_completo, cargo, is_active, unit_id
    FROM users
    WHERE is_active = true
    `,
    CREATE_USER: `
    INSERT INTO users (username, password_hash, role, nome_completo, cargo, is_active, unit_id)
    VALUES($1,$2,$3,$4,$5, true,$6)
    RETURNING id, username, role, nome_completo, cargo, is_active, unit_id
    `,
    UPDATE_USER: `
    UPDATE users
    SET username = $1, role = $2, nome_completo = $3, cargo = $4
    WHERE id = $5
    RETURNING id, username, role, nome_completo, cargo, is_active, unit_id
    `,
    UPDATE_STATUS: `
    UPDATE users
    SET is_active = $1 
    WHERE id = $2
    RETURNING id, username
    `,
};
