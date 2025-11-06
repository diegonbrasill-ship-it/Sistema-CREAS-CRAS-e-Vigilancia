"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CasosService = void 0;
const db_1 = __importDefault(require("../../db"));
const casos_sql_1 = require("./casos.sql");
const logger_1 = require("../../services/logger");
class CasosService {
    static async createCaso(data, admin) {
        const { nome, dataCad, tecRef, status, unit_id, dados_completos_payload } = data;
        const nomeToUse = nome || null;
        const tecRefToUse = tecRef || null;
        const unitIdToUse = unit_id || admin.user.unit_id || null; // Garante o unit_id do usuário logado
        const statusToUse = status || 'Ativo'; // Padrão 'Ativo' para novos casos
        const dataCadToUse = dataCad || new Date().toISOString().split('T')[0];
        const dadosCompletosJSON = JSON.stringify(dados_completos_payload); // O objeto JSONB é o payload restante 
        const userId = admin.user.id;
        const username = admin.user.username;
        const result = await db_1.default.query(casos_sql_1.CASOS_SQL.CLEAN(casos_sql_1.CASOS_SQL.INSERT), [
            nomeToUse,
            dataCadToUse,
            tecRefToUse,
            statusToUse,
            unitIdToUse,
            userId,
            dadosCompletosJSON
        ]);
        const novoCaso = result.rows[0];
        await (0, logger_1.logAction)({
            userId: userId,
            username: username,
            action: "CREATE_CASO",
            details: { casoId: novoCaso.id }
        });
        return novoCaso;
    }
    static async list() { }
    static async update() { }
}
exports.CasosService = CasosService;
