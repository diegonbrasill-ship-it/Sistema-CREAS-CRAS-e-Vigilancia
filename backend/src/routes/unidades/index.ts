import { Request, Response } from "express";
import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth/auth';
import { checkRole } from '../../middleware/auth/check.role';
import { unitAccessMiddleware } from '../../middleware/unitAccess.middleware';
import pool from "../../db";
import bcrypt from "bcryptjs";
import { logAction } from '../../services/logger';
import { QueryResult } from 'pg';


const router = Router();

router.use(authMiddleware);

router.get('/', listUnidades);

async function listUnidades(req: Request, res: Response) {

    const query = `
    SELECT id, name FROM unidades
    `;

    const clean = (sql: string) => sql.replace(/\s+/g, ' ').trim()

    try {
        const unidades = await pool.query(clean(query))
        res.json(unidades.rows)

    } catch (err: any) {
        res.status(500).json({ message: "Erro ao listar unidades " + err.message })
    }

}


export default router;
