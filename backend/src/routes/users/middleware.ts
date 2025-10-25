// src/routes/users/users.middleware.ts
import { Request, Response, NextFunction } from 'express';
import pool from '../../db';
import { SQL } from './users.sql';


export async function checkUserUnitAccess(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const accessFilter = req.accessFilter!; //esse cara vem de outra modulo de middleware chamado em outra camada

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
    const query = SQL.CLEAN(`SELECT id FROM users WHERE id = $1 AND ${unitWhere}`)

    try {

        const result = await pool.query(query, params);
        if (result.rowCount === 0) return res.status(403).json({ message: "Acesso Proibido. Você não pode editar usuários de outras unidades." });

        next(); // essa função deixa a "responsabilidade eou fluxo voltar para o controller"
    } catch (error) {

        console.error("Erro na checagem de acesso de usuário:", error);
        res.status(500).json({ message: "Erro de validação de acesso." });
    }
}