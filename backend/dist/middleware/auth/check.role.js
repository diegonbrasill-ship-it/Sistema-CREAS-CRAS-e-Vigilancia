"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRole = void 0;
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
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
exports.checkRole = checkRole;
