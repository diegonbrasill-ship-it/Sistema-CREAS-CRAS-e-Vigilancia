import { Router } from "express";
import { authMiddleware } from "../../middleware/auth/auth";
import { unitAccessMiddleware } from "../../middleware/unitAccess.middleware";
import { RelatoriosController } from "./relatorios.controller";

const router = Router();

router.use(authMiddleware, unitAccessMiddleware("casos", "unit_id"));

router.post("/geral", RelatoriosController.generateGeneral);
router.get("/dashboard", RelatoriosController.generateDashboard);

export default router;
