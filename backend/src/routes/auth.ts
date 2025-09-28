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
        // A consulta SELECT * já busca a nova coluna 'is_active'
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        
        if (result.rowCount === 0) {
            await logAction({ username, action: 'LOGIN_FAILURE', details: { reason: 'User not found' } });
            return res.status(401).json({ message: "Usuário ou senha inválidos." });
        }
        
        const user = result.rows[0];
        const isPasswordCorrect = await bcrypt.compare(password, user.passwordhash);
        
        if (!isPasswordCorrect) {
            await logAction({ userId: user.id, username: user.username, action: 'LOGIN_FAILURE', details: { reason: 'Incorrect password' } });
            return res.status(401).json({ message: "Usuário ou senha inválidos." });
        }
        
        // =======================================================================
        // 📌 NOVA VERIFICAÇÃO: Checando se o usuário está ativo
        // =======================================================================
        if (!user.is_active) {
            await logAction({ userId: user.id, username: user.username, action: 'LOGIN_FAILURE', details: { reason: 'User is inactive' } });
            return res.status(403).json({ message: "Este usuário foi desativado. Entre em contato com o gestor." });
        }

        await logAction({ userId: user.id, username: user.username, action: 'LOGIN_SUCCESS' });
        
        const tokenPayload = {
            id: user.id,
            username: user.username,
            role: user.role,
            nome_completo: user.nome_completo,
            cargo: user.cargo,
            is_active: user.is_active
        };
        
        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET || 'seu_segredo_padrao_para_testes',
            { expiresIn: '8h' }
        );
        
        res.json({
            message: "Login bem-sucedido!",
            token,
            user: { 
                id: user.id, 
                username: user.username, 
                role: user.role,
                nome_completo: user.nome_completo,
                cargo: user.cargo,
                is_active: user.is_active
            }
        });

    } catch (err: any) {
        await logAction({ username, action: 'LOGIN_ERROR', details: { error: err.message } });
        res.status(500).json({ message: "Erro interno do servidor.", error: err.message });
    }
});

export default router;




