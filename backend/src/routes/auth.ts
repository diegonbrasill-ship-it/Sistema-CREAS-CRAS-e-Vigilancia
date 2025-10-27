// backend/src/routes/auth.ts
import { Router } from "express";
import pool from "../db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logAction } from "../services/logger";

const router = Router();

router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ message: "Usuário e senha são obrigatórios." });
    }
    
    try {
        // 1. Seleciona todos os campos necessários, incluindo unit_id
        const result = await pool.query('SELECT id, username, role, passwordhash, is_active, unit_id, nome_completo, cargo FROM users WHERE username = $1', [username]);
        
        if (result.rowCount === 0) {
            await logAction({ username, action: 'LOGIN_FAILURE', details: { reason: 'User not found' } });
            return res.status(401).json({ message: "Usuário ou senha inválidos." });
        }
        
        const user = result.rows[0];
        
        // 2. 🚨 FIX CRÍTICO DE SEGURANÇA: Bloqueia se unit_id for nulo, exceto para Gestor e Vigilância
        if (!user.unit_id && user.role !== 'gestor' && user.role !== 'vigilancia') { 
             console.error(`ERRO CRÍTICO: Usuário ${username} não possui unit_id. Cadastro incompleto.`);
             await logAction({ userId: user.id, username: user.username, action: 'LOGIN_FAILURE', details: { reason: 'User unit_id is missing' } });
             return res.status(403).json({ message: "Erro de configuração do usuário: Unidade de trabalho não definida." });
        }
        
        const isPasswordCorrect = await bcrypt.compare(password, user.passwordhash);
        
        if (!isPasswordCorrect) {
            await logAction({ userId: user.id, username: user.username, action: 'LOGIN_FAILURE', details: { reason: 'Incorrect password' } });
            return res.status(401).json({ message: "Usuário ou senha inválidos." });
        }
        
        if (user.is_active === false) {
            await logAction({ userId: user.id, username: user.username, action: 'LOGIN_FAILURE', details: { reason: 'User is inactive' } });
            return res.status(403).json({ message: "Este usuário foi desativado. Entre em contato com o gestor." });
        }

        await logAction({ userId: user.id, username: user.username, action: 'LOGIN_SUCCESS', details: { unitId: user.unit_id } });
        
        // 3. Incluir unit_id no payload do JWT
        const tokenPayload = {
            id: user.id,
            username: user.username,
            role: user.role,
            nome_completo: user.nome_completo,
            cargo: user.cargo,
            is_active: user.is_active,
            unit_id: user.unit_id, 
        };
        
        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET || 'seu_segredo_padrao_para_testes',
            { expiresIn: '8h' }
        );
        
        res.json({
            message: "Login bem-sucedido!",
            token,
            user: tokenPayload
        });

    } catch (err: any) {
        console.error("FATAL: Erro no processo de login:", err.message);
        await logAction({ username, action: 'LOGIN_ERROR', details: { error: err.message } });
        res.status(500).json({ message: "Erro interno do servidor ao tentar login. Verifique o log do servidor." });
    }
});

export default router;




