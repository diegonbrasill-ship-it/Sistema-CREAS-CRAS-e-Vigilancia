
import { Request, Response } from "express";
import { UsersService } from "./users.service";
import { MessageConfig } from "pg";

export class UsersController {

    static async list(req: Request, res: Response) {
        const { whereClause, params } = req.accessFilter!;
        try {
            const users = UsersService.listUsers(whereClause, params)
            res.json(users)
        } catch (err: any) {
            res.status(500).json({ message: err.message })
        }
    }

    static async create(req: Request, res: Response) {
        try {
            const newUser = UsersService.createUsers(req.body, req.user)
        } catch (err: any) {
            res.status(400).json({ message: err.message })
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const updated = await UsersService.updateUser(req.params.id, req.body, req.user);
            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

}