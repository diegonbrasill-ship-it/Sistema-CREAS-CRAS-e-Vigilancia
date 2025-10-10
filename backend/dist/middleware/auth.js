"use strict";
// backend/src/middleware/auth.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeCreasOnly = exports.checkRole = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const constants_1 = require("../utils/constants");
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
/**
 * Middleware para checagem de permissão básica por role (Gestor e Coordenador)
 */
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.role;
        if (!userRole || !allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: "Acesso negado. Você não tem permissão para esta ação." });
        }
        return next();
    };
};
exports.checkRole = checkRole;
// =======================================================
// FIX FINAL: ACESSO EXCLUSIVO AO CREAS (Com exceção para o Gestor Geral)
// =======================================================
/**
 * Middleware que garante que o usuário pertença EXCLUSIVAMENTE à unidade CREAS (Unit ID 1).
 */
const authorizeCreasOnly = (req, res, next) => {
    const user = req.user;
    const userUnitId = user?.unit_id;
    const userRole = user?.role;
    // 1. EXCEÇÃO: Gestor Geral sempre pode acessar (visão de supervisão)
    if (userRole === 'gestor') {
        return next();
    }
    // 2. REGRA CREAS: Acesso é permitido APENAS se estiver lotado no CREAS (ID 1)
    if (!user || userUnitId !== constants_1.UNIT_ID_CREAS) {
        console.warn(`Tentativa de acesso MSE não autorizado. User Unit: ${userUnitId}`);
        return res.status(403).json({
            message: "Acesso restrito. Este módulo é exclusivo para a unidade CREAS."
        });
    }
    next();
};
exports.authorizeCreasOnly = authorizeCreasOnly;
