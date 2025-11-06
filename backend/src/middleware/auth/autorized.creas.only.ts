import { Response, Request, NextFunction } from "express";
import { UNIT_ID_CREAS } from "../../utils/constants";

export const authorizeCreasOnly = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const userUnitId = user?.unit_id;
    const userRole = user?.role;

    // 1. EXCEÇÃO: Gestor Geral sempre pode acessar (visão de supervisão)
    if (userRole === 'gestor') {
        return next();
    }

    // 2. REGRA CREAS: Acesso é permitido APENAS se estiver lotado no CREAS (ID 1)
    if (!user || userUnitId !== UNIT_ID_CREAS) {
        console.warn(`Tentativa de acesso MSE não autorizado. User Unit: ${userUnitId}`);
        return res.status(403).json({
            message: "Acesso restrito. Este módulo é exclusivo para a unidade CREAS."
        });
    }

    next();
};

