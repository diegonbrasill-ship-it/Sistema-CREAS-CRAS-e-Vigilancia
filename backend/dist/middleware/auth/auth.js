"use strict";
// backend/src/middleware/auth.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    const { authorization } = req.headers;
    if (!authorization) {
        return res.status(401).json({ message: "Token de autenticação não fornecido." });
    }
    const [, token] = authorization.split(" ");
    try {
        const secret = process.env.JWT_SECRET || 'seu_segredo_padrao_para_testes';
        const data = jsonwebtoken_1.default.verify(token, secret);
        const { id, username, role, unit_id } = data;
        // Converte unit_id para number ou null de forma segura
        const safeUnitId = unit_id ?? null;
        req.user = { id, username, role: role, unit_id: safeUnitId };
        return next();
    }
    catch {
        return res.status(401).json({ message: "Token inválido ou expirado." });
    }
};
exports.authMiddleware = authMiddleware;
