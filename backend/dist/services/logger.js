"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAction = logAction;
// backend/src/services/logger.ts
const db_1 = __importDefault(require("../db"));
async function logAction({ userId, username, action, details }) {
    try {
        await db_1.default.query(`INSERT INTO logs ("userId", username, action, details) VALUES ($1, $2, $3, $4)`, [userId, username, action, details ? JSON.stringify(details) : null]);
    }
    catch (error) {
        console.error("Falha ao registrar ação no log de auditoria:", error);
        // Em um sistema real, poderíamos ter um alerta aqui (email, etc.)
    }
}
