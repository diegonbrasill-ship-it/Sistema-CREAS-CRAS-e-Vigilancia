// backend/src/routes/auth.ts
import { Router } from "express";
import pool from "../../db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logAction } from "../../services/logger";
import { log } from "node:console";

const router = Router();

router.post("/", async (req, res) => {
        const { username, password } = req.body;

        if (!username || !password) { //verificação se na request viream usuário e senha
                return res.status(400).json({ message: "Usuário e senha são obrigatórios." });
        }

        try {

                const result = await pool.query(  // seleciona todos os campos necessários
                        'SELECT id, username, role, password_hash, is_active, unit_id, nome_completo, cargo FROM users WHERE username = $1', [username]);

                if (result.rowCount === 0) { //verifica se a query ao banco retornou algo
                        await logAction({ username, action: 'LOGIN_FAILURE', details: { reason: 'User not found' } });
                        return res.status(401).json({ message: "Usuário ou senha inválidos." });
                }

                const user = result.rows[0]; //salva todos os dados numa variavel user, faz sentido isso?

                //TODO: adaptar ao novo modelo de cargos e permissões
                if (!user.unit_id && user.role !== 'gestor') { // 2. Checa unit_id (se for null, bloqueia, exceto se cargo for Gestor)
                        console.error(`ERRO CRÍTICO: Usuário ${username} não possui unit_id. Cadastro incompleto.`);
                        await logAction({ user_id: user.id, username: user.username, action: 'LOGIN_FAILURE', details: { reason: 'User unit_id is missing' } });
                        return res.status(403).json({ message: "Erro de configuração do usuário: Unidade de trabalho não definida." });
                }

                const isPasswordCorrect = await bcrypt.compare(password, user.password_hash); //verifica compatibilidade da senha enviada


                if (!isPasswordCorrect) { //se senha for incorreta bloqueia
                        await logAction({ user_id: user.id, username: user.username, action: 'LOGIN_FAILURE', details: { reason: 'Incorrect password' } });
                        return res.status(401).json({ message: "Usuário ou senha inválidos." });
                }

                if (user.is_active === false) { //verifica se o usuário está inativo
                        await logAction({ user_id: user.id, username: user.username, action: 'LOGIN_FAILURE', details: { reason: 'User is inactive' } });
                        return res.status(403).json({ message: "Este usuário foi desativado. Entre em contato com o gestor." });
                }

                await logAction({ user_id: user.id, username: user.username, action: 'LOGIN_SUCCESS', details: { unitId: user.unit_id } }); //registra log de sucesso no banco


                const tokenPayload = { // monta payload JWT com dados do banco 
                        id: user.id,
                        username: user.username,
                        role: user.role,
                        nome_completo: user.nome_completo,
                        cargo: user.cargo,
                        is_active: user.is_active,
                        unit_id: user.unit_id,
                };

                const token = jwt.sign( // monta o token (código) JWT fornecido ao front 
                        tokenPayload,
                        process.env.JWT_SECRET || 'seu_segredo_padrao_para_testes',
                        { expiresIn: '8h' }
                );

                //TODO: passar permissions relacionadas a cargo
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

        } catch (err: any) {
                console.error("FATAL: Erro no processo de login:", err.message);
                await logAction({ username, action: 'LOGIN_ERROR', details: { error: err.message } });
                res.status(500).json({ message: "Erro interno do servidor ao tentar login. Verifique o log do servidor." });
        }
});

export default router;




