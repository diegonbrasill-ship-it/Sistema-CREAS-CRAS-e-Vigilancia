// src/routes/users/index.ts
import { Router } from 'express';
import { authMiddleware, checkRole } from '../../middleware/auth';
import { unitAccessMiddleware } from '../../middleware/unitAccess.middleware';
import { UsersController } from './users.controller';
import { checkUserUnitAccess } from './middleware';

const router = Router();

router.use(authMiddleware, unitAccessMiddleware('users', 'unit_id'));

router.get('/', UsersController.list);
router.post('/', checkRole(['coordenador', 'gestor']), UsersController.create);
router.put('/:id', checkRole(['coordenador', 'gestor']), checkUserUnitAccess, UsersController.update);

export default router;
