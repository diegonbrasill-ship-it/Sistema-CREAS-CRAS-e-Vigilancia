"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/users/index.ts
const express_1 = require("express");
const auth_1 = require("../../middleware/auth/auth");
const check_role_1 = require("../../middleware/auth/check.role");
const unitAccess_middleware_1 = require("../../middleware/unitAccess.middleware");
const users_controller_1 = require("./users.controller");
const middleware_1 = require("./middleware");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware, (0, unitAccess_middleware_1.unitAccessMiddleware)('users', 'unit_id'));
router.get('/', users_controller_1.UsersController.list);
router.post('/', (0, check_role_1.checkRole)(['coordenador', 'gestor']), users_controller_1.UsersController.create);
router.put('/:id', (0, check_role_1.checkRole)(['coordenador', 'gestor']), middleware_1.checkUserUnitAccess, users_controller_1.UsersController.update);
exports.default = router;
