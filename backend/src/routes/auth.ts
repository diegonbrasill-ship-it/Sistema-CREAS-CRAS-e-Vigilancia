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
        // 📌 MUDANÇA CRÍTICA: SIMPLIFICAÇÃO DA QUERY
        // Seleciona apenas as colunas mínimas essenciais (id e passwordhash).
        // As colunas de permissão (role, unit_id, is_active) são selecionadas opcionalmente,
        // minimizando o risco de falha SQL se o esquema estiver incompleto.
        const result = await pool.query(
            'SELECT id, username, passwordhash, role, is_active, unit_id, nome_completo, cargo FROM users WHERE username = $1', 
            [username]
        );
        
        if (result.rowCount === 0) {
            await logAction({ username, action: 'LOGIN_FAILURE', details: { reason: 'User not found' } });
            return res.status(401).json({ message: "Usuário ou senha inválidos." });
        }
        
        const user = result.rows[0];
        
        // 📌 VERIFICAÇÃO DA SENHA (ANTES DE QUALQUER CHECAGEM DE PERMISSÃO)
        const isPasswordCorrect = await bcrypt.compare(password, user.passwordhash);
        
        if (!isPasswordCorrect) {
            await logAction({ userId: user.id, username: user.username, action: 'LOGIN_FAILURE', details: { reason: 'Incorrect password' } });
            return res.status(401).json({ message: "Usuário ou senha inválidos." });
        }
        
        // 📌 CHECAGENS DE PERMISSÃO E CONFIGURAÇÃO (AGORA MAIS TOLERANTES A CAMPOS NULOS)
        
        // 1. Checando Status Ativo
        if (user.is_active === false) { // Usamos '=== false' para cobrir o caso 'undefined'/'null'
            await logAction({ userId: user.id, username: user.username, action: 'LOGIN_FAILURE', details: { reason: 'User is inactive' } });
            return res.status(403).json({ message: "Este usuário foi desativado. Entre em contato com o gestor." });
        }
        
        // 2. Checando Unit ID (CRÍTICO) - Se for nulo/undefined, é bloqueado com 403.
        if (!user.unit_id) {
             console.error(`ERRO CRÍTICO: Usuário ${username} não possui unit_id. Cadastro incompleto.`);
             await logAction({ userId: user.id, username: user.username, action: 'LOGIN_FAILURE', details: { reason: 'User unit_id is missing' } });
             return res.status(403).json({ message: "Erro de configuração: Unidade de trabalho não definida." });
        }
        
        // 3. Checando Role (CRÍTICO) - Se for nulo/undefined, usa 'tecnico' como fallback.
        const userRole = user.role || 'tecnico'; // Fallback para evitar quebra total

        await logAction({ userId: user.id, username: user.username, action: 'LOGIN_SUCCESS', details: { unitId: user.unit_id } });
        
        const tokenPayload = {
            id: user.id,
            username: user.username,
            role: userRole,
            nome_completo: user.nome_completo,
            cargo: user.cargo,
            is_active: user.is_active,
            unit_id: user.unit_id
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
                role: userRole,
                nome_completo: user.nome_completo,
                cargo: user.cargo,
                is_active: user.is_active,
                unit_id: user.unit_id
            }
        });

    } catch (err: any) {
        console.error("FATAL: Erro no processo de login:", err.message);
        await logAction({ username, action: 'LOGIN_ERROR', details: { error: err.message } });
        res.status(500).json({ message: "Erro interno do servidor ao tentar login. Verifique o log do servidor." });
    }
});

export default router;




