
import { Request, Response, NextFunction } from "express";

export const checkRole = (allowedRoles: string[]) => {

    return (req: Request, res: Response, next: NextFunction) => {
        const userRole = req.user?.role;

        if (!userRole) {
            return res.status(401).json({ message: "Acesso negado. Dados do token inconstantes." });
        }
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: "Acesso negado. Você não tem permissão para esta ação." });
        }


        return next();
    };
};

