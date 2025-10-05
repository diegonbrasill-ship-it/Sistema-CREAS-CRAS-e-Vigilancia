// backend/src/routes/users.ts

import { Router, Request, Response, NextFunction } from "express";
import pool from "../db";
import bcrypt from "bcryptjs";
import { QueryResult } from "pg";
import { authMiddleware, checkRole } from "../middleware/auth";
import { logAction } from "../services/logger";
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware"; // Importação do filtro de unidade

const router = Router();

// 📌 SOLUÇÃO DE LIMPEZA EXTREMA: Essencial para remover o erro 'syntax error at or near " "'
const cleanSqlString = (sql: string): string => {
    return sql.replace(/\s+/g, ' ').trim();
};

// Aplica a checagem de role (Gestor/Coordenador) e gera o filtro de unidade.
router.use(authMiddleware, checkRole(['coordenador', 'gestor']), unitAccessMiddleware('users', 'unit_id'));


// =======================================================================
// ROTA GET /users (Listagem: Filtra usuários por unidade do gestor)
// =======================================================================
router.get("/", async (req: Request, res: Response) => {
    const accessFilter = req.accessFilter!; // Filtro de unidade gerado pelo middleware
    
    try {
        // 1. Resolve Placeholders e Parâmetros
        const params: (string | number)[] = [];
        let unitWhere = accessFilter.whereClause;
        
        // Substituir $X, $Y pelos números reais dos placeholders ($1, $2...)
        if (accessFilter.params.length === 1) {
            unitWhere = unitWhere.replace('$X', `$${params.length + 1}`);
        } else if (accessFilter.params.length === 2) {
            unitWhere = unitWhere.replace('$X', `$${params.length + 1}`).replace('$Y', `$${params.length + 2}`);
        }
        
        // Adicionar os parâmetros da unidade à lista principal
        params.push(...accessFilter.params);

        // 2. Query com filtro de unidade
        const query = cleanSqlString(`
            SELECT id, username, role, nome_completo, cargo, is_active, unit_id 
            FROM users 
            WHERE ${unitWhere} 
            ORDER BY username ASC
        `);
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err: any) {
        console.error("Erro ao listar usuários:", err.message);
        res.status(500).json({ message: "Erro ao buscar usuários." });
    }
});


// =======================================================================
// ROTA POST /users (Criação: Garante que o usuário criado pertence à unidade do gestor)
// =======================================================================
router.post("/", async (req: Request, res: Response) => {
    const { username, password, role, nome_completo, cargo, unit_id } = req.body;
    const adminUser = req.user!; 

    // CHECAGEM CRÍTICA: O gestor só pode criar usuários para a sua PRÓPRIA unidade.
    if (unit_id !== adminUser.unit_id) {
        return res.status(403).json({ message: "Acesso Proibido. Você só pode criar usuários para a sua unidade de trabalho." });
    }
    
    if (!username || !password || !role || !nome_completo || !cargo || !unit_id) {
        return res.status(400).json({ message: "Todos os campos (usuário, senha, perfil, nome completo, cargo, unidade) são obrigatórios." });
    }

    const validRoles = ['tecnico', 'coordenador', 'gestor', 'vigilancia'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Perfil (role) inválido." });
    }

    try {
        const userExistsQuery = cleanSqlString('SELECT id FROM users WHERE username = $1');
        const userExists = await pool.query(userExistsQuery, [username]) as QueryResult;
        
        if ((userExists.rowCount ?? 0) > 0) {
            return res.status(400).json({ message: "Este nome de usuário já está em uso." });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const query = cleanSqlString(`
            INSERT INTO users (username, passwordHash, role, nome_completo, cargo, is_active, unit_id) 
            VALUES ($1, $2, $3, $4, $5, true, $6) 
            RETURNING id, username, role, nome_completo, cargo, is_active, unit_id;
        `);
        const result = await pool.query(query, [username, passwordHash, role, nome_completo, cargo, unit_id]);
        const newUser = result.rows[0];
        
        await logAction({
            userId: adminUser.id,
            username: adminUser.username,
            action: 'CREATE_USER',
            details: { createdUserId: newUser.id, createdUsername: newUser.username, createdUnitId: unit_id }
        });

        res.status(201).json(newUser);

    } catch (err: any) {
        console.error("Erro ao criar usuário:", err.message);
        res.status(500).json({ message: "Erro no servidor ao criar usuário." });
    }
});


// =======================================================================
// MIDDLEWARE AUXILIAR: Checa se o usuário pode editar o alvo (Baseado no unit_id)
// =======================================================================
async function checkUserUnitAccess(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const adminUser = req.user!;
    const accessFilter = req.accessFilter!;

    // 1. Resolve Placeholders e Parâmetros
    const params: (string | number)[] = [id];
    let unitWhere = accessFilter.whereClause;
    
    // Substituir $X, $Y pelos números reais dos placeholders ($2, $3...)
    if (accessFilter.params.length === 1) {
        unitWhere = unitWhere.replace('$X', `$${params.length + 1}`);
        params.push(accessFilter.params[0]);
    } else if (accessFilter.params.length === 2) {
        unitWhere = unitWhere.replace('$X', `$${params.length + 1}`).replace('$Y', `$${params.length + 2}`);
        params.push(accessFilter.params[0], accessFilter.params[1]);
    }

    // 2. Checa se o ID do usuário (req.params.id) está dentro da(s) unidade(s) permitida(s).
    const query = cleanSqlString(`SELECT id FROM users WHERE id = $1 AND ${unitWhere}`);
    
    try {
        const result = await pool.query(query, params);
        if (result.rowCount === 0) {
            return res.status(403).json({ message: "Acesso Proibido. Você não pode editar usuários de outras unidades." });
        }
        next();
    } catch (error) {
        console.error("Erro na checagem de acesso de usuário:", error);
        res.status(500).json({ message: "Erro de validação de acesso." });
    }
}

// =======================================================================
// ROTA PUT /users/:id (Edição: Garante que o usuário a ser editado pertence à unidade do gestor)
// =======================================================================
router.put("/:id", checkUserUnitAccess, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { username, role, nome_completo, cargo } = req.body;
    const adminUser = req.user!;

    if (!username || !role || !nome_completo || !cargo) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios para edição." });
    }

    try {
        const query = cleanSqlString(`
            UPDATE users 
            SET username = $1, role = $2, nome_completo = $3, cargo = $4 
            WHERE id = $5
            RETURNING id, username, role, nome_completo, cargo, is_active, unit_id;
        `);
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

router.patch("/:id/status", checkUserUnitAccess, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const adminUser = req.user!;

    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "O status (isActive) deve ser um valor booleano (true/false)." });
    }

    try {
        const query = cleanSqlString('UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, username');
        const result = await pool.query(query, [isActive, id]);
        
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
    const adminUnitId = adminUser.unit_id; 

    if (!fromUserId || !toUserId) {
        return res.status(400).json({ message: 'É necessário informar o usuário de origem e o de destino.' });
    }
    
    if (fromUserId === toUserId) {
        return res.status(400).json({ message: 'Não é possível reatribuir casos para o mesmo usuário.' });
    }
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // CHECAGEM CRÍTICA DE UNIDADE: Verifica se AMBOS os usuários pertencem à unidade do admin.
        const accessQuery = cleanSqlString(`
            SELECT id, unit_id 
            FROM users 
            WHERE id IN ($1, $2) AND unit_id = $3
        `);
        
        const accessCheck = await client.query(accessQuery, [fromUserId, toUserId, adminUnitId]);
        
        if (accessCheck.rowCount !== 2) {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: 'Acesso Proibido. Um ou ambos os usuários não existem ou não pertencem à sua unidade de trabalho.' });
        }
        
        const toUserResultQuery = cleanSqlString('SELECT nome_completo, cargo FROM users WHERE id = $1');
        const toUserResult = await client.query(toUserResultQuery, [toUserId]);
        if (toUserResult.rowCount === 0) {
            await client.query('ROLLBACK');
            throw new Error('Usuário de destino não encontrado.');
        }
        const { nome_completo, cargo } = toUserResult.rows[0];
        const newTecRef = cargo ? `${nome_completo} - ${cargo}` : nome_completo;

        const updateResultQuery = cleanSqlString(
            'UPDATE casos SET "userId" = $1, "tecRef" = $2 WHERE "userId" = $3 AND unit_id = $4'
        );
        const updateResult = await client.query(
            updateResultQuery,
            [toUserId, newTecRef, fromUserId, adminUnitId] 
        );

        await client.query('COMMIT');

        await logAction({
            userId: adminUser.id,
            username: adminUser.username,
            action: 'REASSIGN_CASES',
            details: { fromUserId, toUserId, casesCount: updateResult.rowCount, unitId: adminUnitId }
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
