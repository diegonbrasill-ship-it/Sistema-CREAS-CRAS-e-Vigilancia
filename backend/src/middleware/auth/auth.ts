// backend/src/middleware/auth.ts

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UNIT_ID_CREAS } from "../../utils/constants";
import { UserRole, AuthenticatedUser, TokenPayload } from "./authenticated.user"

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const { authorization } = req.headers;

    if (!authorization) {
        return res.status(401).json({ message: "Token de autenticação não fornecido." });
    }

    const [, token] = authorization.split(" ");

    try {
        const secret = process.env.JWT_SECRET || 'seu_segredo_padrao_para_testes';
        const data = jwt.verify(token, secret);

        const { id, username, role, unit_id } = data as TokenPayload;

        // Converte unit_id para number ou null de forma segura
        const safeUnitId = unit_id ?? null;

        req.user = { id, username, role: role as UserRole, unit_id: safeUnitId } as AuthenticatedUser;

        return next();
    } catch {
        return res.status(401).json({ message: "Token inválido ou expirado." });
    }
};

