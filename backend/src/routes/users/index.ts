// src/routes/users/index.ts
import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth/auth';
import { checkRole } from '../../middleware/auth/check.role';
import { unitAccessMiddleware } from '../../middleware/unitAccess.middleware';
import { UsersController } from './users.controller';
import { checkUserUnitAccess } from './middleware';

const router = Router();

router.use(authMiddleware, unitAccessMiddleware('users', 'unit_id'));

router.get('/', UsersController.list);
router.post('/', checkRole(['coordenador', 'gestor']), UsersController.create);
router.put('/:id', checkRole(['coordenador', 'gestor']), checkUserUnitAccess, UsersController.update);

export default router;
