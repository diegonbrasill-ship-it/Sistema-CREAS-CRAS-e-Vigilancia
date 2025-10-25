"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const db_1 = __importDefault(require("../../db"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const users_sql_1 = require("./users.sql");
const logger_1 = require("../../services/logger");
class UsersService {
    static async listUsers(where, params) {
        const query = `${users_sql_1.SQL.LIST_USERS} AND ${where} ORDER BY nome_completo ASC`;
        const result = await db_1.default.query(users_sql_1.SQL.CLEAN(query), params);
        return result.rows;
    }
    static async createUsers(data, admin) {
        const { username, password, role, nome_completo, cargo, unit_id } = data;
        const userExists = await db_1.default.query(users_sql_1.SQL.CLEAN('SELECT id FROM users WHERE username = $1'), [username]);
        if (userExists.rowCount && userExists.rowCount > 0)
            throw new Error('Este nome de usuário já está em uso.');
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const result = await db_1.default.query(users_sql_1.SQL.CLEAN(users_sql_1.SQL.CREATE_USER), [
            username,
            passwordHash,
            role,
            nome_completo,
            cargo,
            unit_id,
        ]);
        await (0, logger_1.logAction)({
            userId: admin.id,
            username: admin.username,
            action: 'CREATE_USER',
            details: { createdUserId: result.rows[0].id, createdUsername: username },
        });
    }
    static async updateUser(id, data, admin) {
        const { username, role, nome_completo, cargo } = data;
        const result = await db_1.default.query(users_sql_1.SQL.CLEAN(users_sql_1.SQL.UPDATE_USER), [username, role, nome_completo, cargo, id,]);
        if (result.rowCount === 0) {
            throw new Error("Usuario não encontrado ou não existe.");
        }
        await (0, logger_1.logAction)({
            userId: admin.id,
            username: admin.username,
            action: 'UPDATE_USER',
            details: { updatedUserId: id, updatedUsername: username },
        });
        return result.rows[0];
    }
}
exports.UsersService = UsersService;
