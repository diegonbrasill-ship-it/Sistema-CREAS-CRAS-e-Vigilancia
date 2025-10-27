// backend/src/routes/users.ts

import { Router, Request, Response, NextFunction } from "express";
import pool from "../db";
import bcrypt from "bcryptjs";
import { QueryResult } from "pg";
import { authMiddleware, checkRole } from "../middleware/auth";
import { logAction } from "../services/logger";
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware"; 
// 🛑 REMOVIDA A IMPORTAÇÃO PROBLEMÁTICA DE CONSTANTES

// ⭐️ CORREÇÃO LOCAL: Declarando constantes para resolver erro de exportação ⭐️
const CREAS_UNIT_ID = 1; 
const CRAS_UNIT_IDS = [3, 4, 5, 6]; 
// --------------------------------------------------------------------------


const router = Router();

// 📌 SOLUÇÃO DE LIMPEZA EXTREMA
const cleanSqlString = (sql: string): string => {
    return sql.replace(/\s+/g, ' ').trim();
};

// 🛑 Aplica apenas a checagem de autenticação e filtro de unidade no router.use
router.use(authMiddleware, unitAccessMiddleware('users', 'unit_id'));


// =======================================================================
// MIDDLEWARE AUXILIAR: Checa se o usuário pode editar o alvo (NOVO MODELO)
// =======================================================================
async function checkUserUnitAccess(req: Request, res: Response, next: NextFunction) {
    const { id: targetUserId } = req.params;
    const access = req.access!; // Novo objeto de acesso injetado
    
    // 1. O usuário Gestor Geral pode editar qualquer um
    if (access.isGestorGeral) {
        return next();
    }

    // 2. Checagem estrita para Coordenador/Técnico
    // Eles só podem editar usuários que estão na mesma unidade que eles.
    if (access.userUnitId === null) {
        // Usuário sem lotação (e que não é Gestor/Vigilância) não pode gerenciar ninguém.
        return res.status(403).json({ message: "Acesso Proibido. Usuário sem lotação não pode gerenciar outros servidores." });
    }
    
    try {
        const query = cleanSqlString(`
            SELECT id FROM users WHERE id = $1 AND unit_id = $2
        `);
        // Checa se o usuário alvo pertence à mesma unidade do administrador logado
        const result = await pool.query(query, [targetUserId, access.userUnitId]);
        
        if (result.rowCount === 0) {
            return res.status(403).json({ message: "Acesso Proibido. Você só pode editar usuários da sua unidade." });
        }
        next();
    } catch (error) {
        console.error("Erro na checagem de acesso de usuário:", error);
        res.status(500).json({ message: "Erro de validação de acesso." });
    }
}


// =======================================================================
// ROTA GET /users (Listagem: ELIMINANDO $X/$Y)
// =======================================================================
router.get("/", 
    async (req: Request, res: Response) => {
    
    const access = req.access!; 

    try {
        let query = 'SELECT id, username, role, nome_completo, cargo, is_active, unit_id FROM users'; 
        const params: (string | number)[] = [];
        const additionalWhereClauses: string[] = [];
        let paramIndex = 1;

        // 1. FILTRO DE SEGURANÇA POR UNIDADE (Substitui a lógica obsoleta de $X/$Y)
        if (!access.isGestorGeral) { 
            // Coordenador/Técnico/Vigilância: Vê APENAS a sua unidade
            if (access.userUnitId !== null) {
                params.push(access.userUnitId);
                additionalWhereClauses.push(`unit_id = $${paramIndex++}`);
            } else {
                // Usuário sem lotação (e que não é Gestor/Vigilância) não pode listar ninguém
                additionalWhereClauses.push(`FALSE`); 
            }
        } 
        
        // 2. FILTRO DE STATUS: Lista APENAS usuários ativos.
        additionalWhereClauses.push('is_active = true');

        // Juntar as cláusulas e montar a query
        if (additionalWhereClauses.length > 0) {
             query += ` WHERE ${additionalWhereClauses.join(' AND ')} ORDER BY nome_completo ASC`;
        } else {
             query += ` ORDER BY nome_completo ASC`;
        }

        const finalQuery = cleanSqlString(query); 
        const result = await pool.query(finalQuery, params);
        
        res.json(result.rows);
    } catch (err: any) {
        console.error("Erro ao listar usuários:", err.message);
        res.status(500).json({ message: "Erro ao buscar usuários." });
    }
    }
);


// =======================================================================
// ROTA POST /users (Criação)
// =======================================================================
router.post("/", checkRole(['coordenador', 'gestor']), async (req: Request, res: Response) => {
    const { username, password, role, nome_completo, cargo, unit_id } = req.body;
    const adminUser = req.user!; 
    const adminRole = adminUser.role;
    
    // Regra de Autorização de Criação: Coordenadores só podem criar para sua própria unidade. Gestores Máximos podem criar para todos.
    if (adminRole === 'coordenador' && unit_id !== adminUser.unit_id) {
        return res.status(400).json({ message: "Acesso Proibido. Coordenadores só podem criar usuários para sua própria unidade." });
    }
    
    if (!username || !password || !role || !nome_completo || !cargo || unit_id === null) {
        return res.status(400).json({ message: "Todos os campos (usuário, senha, perfil, nome completo, cargo, unidade) são obrigatórios." });
    }
    
    // ⭐️ CORREÇÃO CRÍTICA: Lista de Roles Válidas expandida e verificada
    const validRoles = ['tecnico_superior', 'tecnico_medio', 'coordenador', 'gestor', 'vigilancia', 'coordenador_cras', 'tecnico_cras', 'admin'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: `Perfil (role) inválido. Roles aceitas: ${validRoles.join(', ')}` });
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
// ROTA PUT /users/:id (Edição)
// =======================================================================
router.put("/:id", checkRole(['coordenador', 'gestor']), checkUserUnitAccess, async (req: Request, res: Response) => {
    const { id } = req.params;
    // ⭐️ CORREÇÃO: unit_id é opcional, mas se vier deve ser um número/null válido
    const { username, role, nome_completo, cargo, unit_id } = req.body;
    const adminUser = req.user!;

    if (!username || !role || !nome_completo || !cargo) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios para edição." });
    }

    // ⭐️ CORREÇÃO: Lista de Roles Válidas expandida e verificada
    const validRoles = ['tecnico_superior', 'tecnico_medio', 'coordenador', 'gestor', 'vigilancia', 'coordenador_cras', 'tecnico_cras', 'admin'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: `Perfil (role) inválido. Roles aceitas: ${validRoles.join(', ')}` });
    }

    try {
        // Se o Front-end não enviar o unit_id (que é o comportamento do modal que vimos), 
        // a lógica de PUT deve garantir que o valor não seja NULL (a menos que seja Gestor/Vigilância).
        // Aqui, confiamos que o Front-end enviou o unit_id original (como vimos no UserEditModal)

        const query = cleanSqlString(`
            UPDATE users 
            SET username = $1, role = $2, nome_completo = $3, cargo = $4, unit_id = $5 
            WHERE id = $6
            RETURNING id, username, role, nome_completo, cargo, is_active, unit_id;
        `);
        // Parâmetros: username, role, nome_completo, cargo, unit_id, id
        const result = await pool.query(query, [username, role, nome_completo, cargo, unit_id, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        
        await logAction({
            userId: adminUser.id,
            username: adminUser.username,
            action: 'UPDATE_USER',
            details: { updatedUserId: id, updatedUsername: username, updatedUnitId: unit_id }
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

router.patch("/:id/status", checkRole(['coordenador', 'gestor']), checkUserUnitAccess, async (req: Request, res: Response) => {
// ... (Código PATCH inalterado)
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

router.post("/reatribuir", checkRole(['coordenador', 'gestor']), async (req: Request, res: Response) => {
// ... (Código POST /reatribuir mantido inalterado - já é seguro)
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
            return res.status(403).json({ message: 'Acesso Proibido. Um ou ambos os usuários não existem ou não pertencem à sua unidade de trabalho.' });
        }
        
        const toUserResultQuery = cleanSqlString('SELECT nome_completo, cargo FROM users WHERE id = $1');
        const toUserResult = await client.query(toUserResultQuery, [toUserId]);
        if (toUserResult.rowCount === 0) {
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

