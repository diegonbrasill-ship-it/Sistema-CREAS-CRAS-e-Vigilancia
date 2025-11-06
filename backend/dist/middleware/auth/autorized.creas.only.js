"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeCreasOnly = void 0;
const constants_1 = require("../../utils/constants");
const authorizeCreasOnly = (req, res, next) => {
    const user = req.user;
    const userUnitId = user?.unit_id;
    const userRole = user?.role;
    // 1. EXCEÇÃO: Gestor Geral sempre pode acessar (visão de supervisão)
    if (userRole === 'gestor') {
        return next();
    }
    // 2. REGRA CREAS: Acesso é permitido APENAS se estiver lotado no CREAS (ID 1)
    if (!user || userUnitId !== constants_1.UNIT_ID_CREAS) {
        console.warn(`Tentativa de acesso MSE não autorizado. User Unit: ${userUnitId}`);
        return res.status(403).json({
            message: "Acesso restrito. Este módulo é exclusivo para a unidade CREAS."
        });
    }
    next();
};
exports.authorizeCreasOnly = authorizeCreasOnly;
