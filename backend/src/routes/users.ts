import { Router, Request, Response } from "express";
import pool from "../db";
import bcrypt from "bcryptjs";
// 1. IMPORTAÇÃO: Adicionamos o tipo 'QueryResult' da biblioteca 'pg'
import { QueryResult } from "pg";
import { authMiddleware, checkRole } from "../middleware/auth";
import { logAction } from "../services/logger";

const router = Router();

router.use(authMiddleware, checkRole(['coordenador', 'gestor', 'Técnico', 'vigilancia']));

router.get("/", async (req: Request, res: Response) => {
  try {
    const query = 'SELECT id, username, role, nome_completo, cargo, is_active FROM users ORDER BY username ASC';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err: any) {
    console.error("Erro ao listar usuários:", err.message);
    res.status(500).json({ message: "Erro ao buscar usuários." });
  }
});

router.post("/", async (req: Request, res: Response) => {
  const { username, password, role, nome_completo, cargo } = req.body;
  const adminUser = req.user!;

  if (!username || !password || !role || !nome_completo || !cargo) {
    return res.status(400).json({ message: "Todos os campos (usuário, senha, perfil, nome completo, cargo) são obrigatórios." });
  }

  const validRoles = ['tecnico', 'coordenador', 'gestor', 'vigilancia'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Perfil (role) inválido." });
  }

  try {
    // 2. CORREÇÃO: Aplicamos a "Afirmação de Tipo" com 'as QueryResult'
    const userExists = await pool.query('SELECT id FROM users WHERE username = $1', [username]) as QueryResult;
    
    // Agora a verificação funciona sem erros, pois garantimos o tipo para o TypeScript
    if ((userExists.rowCount ?? 0) > 0) {
  return res.status(400).json({ message: "Este nome de usuário já está em uso." });
}


    const passwordHash = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (username, passwordHash, role, nome_completo, cargo, is_active) 
      VALUES ($1, $2, $3, $4, $5, true) 
      RETURNING id, username, role, nome_completo, cargo, is_active;
    `;
    const result = await pool.query(query, [username, passwordHash, role, nome_completo, cargo]);
    const newUser = result.rows[0];
    
    await logAction({
      userId: adminUser.id,
      username: adminUser.username,
      action: 'CREATE_USER',
      details: { createdUserId: newUser.id, createdUsername: newUser.username }
    });

    res.status(201).json(newUser);

  } catch (err: any) {
    console.error("Erro ao criar usuário:", err.message);
    res.status(500).json({ message: "Erro no servidor ao criar usuário." });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { username, role, nome_completo, cargo } = req.body;
    const adminUser = req.user!;

    if (!username || !role || !nome_completo || !cargo) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios para edição." });
    }

    try {
        const query = `
            UPDATE users 
            SET username = $1, role = $2, nome_completo = $3, cargo = $4 
            WHERE id = $5
            RETURNING id, username, role, nome_completo, cargo, is_active;
        `;
        const result = await pool.query(query, [username, role, nome_completo, cargo, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        
        await logAction({
            userId: adminUser.id,
            username: adminUser.username,
            action: 'UPDATE_USER',
            details: { updatedUserId: id, updatedUsername: username }
        });

        res.status(200).json(result.rows[0]);
    } catch (err: any) {
        console.error("Erro ao editar usuário:", err.message);
        if (err.code === '23505') { 
            return res.status(400).json({ message: 'Este nome de usuário já está em uso.' });
        }
        res.status(500).json({ message: "Erro no servidor ao editar usuário." });
    }
});

router.patch("/:id/status", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const adminUser = req.user!;

    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "O status (isActive) deve ser um valor booleano (true/false)." });
    }

    try {
        const result = await pool.query('UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, username', [isActive, id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        
        await logAction({
            userId: adminUser.id,
            username: adminUser.username,
            action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
            details: { targetUserId: result.rows[0].id, targetUsername: result.rows[0].username }
        });

        res.status(200).json({ message: `Usuário ${isActive ? 'ativado' : 'desativado'} com sucesso.` });
    } catch (err: any) {
        console.error("Erro ao alterar status do usuário:", err.message);
        res.status(500).json({ message: "Erro no servidor ao alterar status do usuário." });
    }
});

router.post("/reatribuir", async (req: Request, res: Response) => {
    const { fromUserId, toUserId } = req.body;
    const adminUser = req.user!;

    if (!fromUserId || !toUserId) {
        return res.status(400).json({ message: 'É necessário informar o usuário de origem e o de destino.' });
    }
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const toUserResult = await client.query('SELECT nome_completo, cargo FROM users WHERE id = $1', [toUserId]);
        if (toUserResult.rowCount === 0) {
            throw new Error('Usuário de destino não encontrado.');
        }
        const { nome_completo, cargo } = toUserResult.rows[0];
        const newTecRef = cargo ? `${nome_completo} - ${cargo}` : nome_completo;

        const updateResult = await client.query(
            'UPDATE casos SET "userId" = $1, "tecRef" = $2 WHERE "userId" = $3',
            [toUserId, newTecRef, fromUserId]
        );

        await client.query('COMMIT');

        await logAction({
            userId: adminUser.id,
            username: adminUser.username,
            action: 'REASSIGN_CASES',
            details: { fromUserId, toUserId, casesCount: updateResult.rowCount }
        });

        res.status(200).json({ message: `${updateResult.rowCount} caso(s) foram reatribuídos com sucesso.` });

    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error("Erro ao reatribuir casos:", err.message);
        res.status(500).json({ message: "Erro no servidor ao reatribuir casos." });
    } finally {
        client.release();
    }
});

export default router;
