
import pool from "../../db";
import bcrypt from "bcryptjs";
import { SQL } from "./users.sql"
import { logAction } from '../../services/logger';
import { Query, QueryResult } from 'pg';


export class UsersService {

    static async listUsers(where: string, params: any[]) {
        console.log("where_clause:", where)
        console.log("params:", params)
        console.log("QUERY")
        console.log()

        const query = `${SQL.LIST_USERS} AND ${where} ORDER BY nome_completo ASC`
        console.log(query)
        const result = await pool.query(SQL.CLEAN(query), params)

        return result.rows
    }

    static async createUsers(data: any, admin: any) {

        const {
            username,
            password, role,
            nome_completo,
            cargo,
            unit_id,
            role_id, 
        } = data;
        console.log('dados vindos do front')
        console.log(data)
        
        const userExists: QueryResult = await pool.query(
            SQL.CLEAN('SELECT id FROM users WHERE username = $1'), [username]);
        if (userExists.rowCount && userExists.rowCount > 0)
            throw new Error('Este nome de usuário já está em uso.');


        if (admin.role !== "gestor" && unit_id !== admin.unit_id)//deve criar apenas usuários para sua unidade
            throw new Error('Você só pode criar cadastros para sua unidade');



        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            SQL.CLEAN(SQL.CREATE_USER),
            [
                username,
                passwordHash,
                role,
                nome_completo,
                cargo,
                unit_id,
                role_id,
            ]
        );

        
        await logAction({
            user_id: admin.id,
            username: admin.username,
            action: 'CREATE_USER',
            details: { createdUserId: result.rows[0].id, createdUsername: username },
        });

        console.log('dados vindos data base')
        console.log(result.rows)
        return result.rows
        

    }

    static async updateUser(id: string, data: any, admin: any) {

        const { username, role, nome_completo, cargo } = data;
        const result = await pool.query(SQL.CLEAN(SQL.UPDATE_USER), [username, role, nome_completo, cargo, id,]);
        if (result.rowCount === 0) {
            throw new Error("Usuario não encontrado ou não existe.")
        }
        await logAction({
            user_id: admin.id,
            username: admin.username,
            action: 'UPDATE_USER',
            details: { updatedUserId: id, updatedUsername: username },
        });
        return result.rows[0];
    }


}

