"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/auth.ts
const express_1 = require("express");
const db_1 = __importDefault(require("../../db"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../../services/logger");
const router = (0, express_1.Router)();
router.post("/", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Usuário e senha são obrigatórios." });
    }
    try {
        // 1. Seleciona todos os campos necessários, incluindo unit_id
        const result = await db_1.default.query('SELECT id, username, role, passwordhash, is_active, unit_id, nome_completo, cargo FROM users WHERE username = $1', [username]);
        if (result.rowCount === 0) {
            await (0, logger_1.logAction)({ username, action: 'LOGIN_FAILURE', details: { reason: 'User not found' } });
            return res.status(401).json({ message: "Usuário ou senha inválidos." });
        }
        const user = result.rows[0];
        // 2. Checa unit_id (se for null, bloqueia, exceto se for Gestor que tem unit_id=null)
        if (!user.unit_id && user.role !== 'gestor') { // Gestor é a única exceção
            console.error(`ERRO CRÍTICO: Usuário ${username} não possui unit_id. Cadastro incompleto.`);
            await (0, logger_1.logAction)({ userId: user.id, username: user.username, action: 'LOGIN_FAILURE', details: { reason: 'User unit_id is missing' } });
            return res.status(403).json({ message: "Erro de configuração do usuário: Unidade de trabalho não definida." });
        }
        const isPasswordCorrect = await bcryptjs_1.default.compare(password, user.passwordhash);
        if (!isPasswordCorrect) {
            await (0, logger_1.logAction)({ userId: user.id, username: user.username, action: 'LOGIN_FAILURE', details: { reason: 'Incorrect password' } });
            return res.status(401).json({ message: "Usuário ou senha inválidos." });
        }
        if (user.is_active === false) {
            await (0, logger_1.logAction)({ userId: user.id, username: user.username, action: 'LOGIN_FAILURE', details: { reason: 'User is inactive' } });
            return res.status(403).json({ message: "Este usuário foi desativado. Entre em contato com o gestor." });
        }
        await (0, logger_1.logAction)({ userId: user.id, username: user.username, action: 'LOGIN_SUCCESS', details: { unitId: user.unit_id } });
        // 3. 📌 FIX CRÍTICO: Incluir unit_id no payload do JWT
        const tokenPayload = {
            id: user.id,
            username: user.username,
            role: user.role,
            nome_completo: user.nome_completo,
            cargo: user.cargo,
            is_active: user.is_active,
            unit_id: user.unit_id, // 🔥 ESTA LINHA CORRIGE O ERRO DE SEGURANÇA
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, process.env.JWT_SECRET || 'seu_segredo_padrao_para_testes', { expiresIn: '8h' });
        res.json({
            message: "Login bem-sucedido!",
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                nome_completo: user.nome_completo,
                cargo: user.cargo,
                is_active: user.is_active,
                unit_id: user.unit_id
            }
        });
    }
    catch (err) {
        console.error("FATAL: Erro no processo de login:", err.message);
        await (0, logger_1.logAction)({ username, action: 'LOGIN_ERROR', details: { error: err.message } });
        res.status(500).json({ message: "Erro interno do servidor ao tentar login. Verifique o log do servidor." });
    }
});
exports.default = router;
