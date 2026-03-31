// backend/src/routes/dashboard.ts

import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth/auth";
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware";
import { DashboardService } from "../services/dashboard.service";

const router = Router();

router.use(authMiddleware, unitAccessMiddleware('casos', 'unit_id'));

// =======================================================================
// ROTA PRINCIPAL: GET / (Busca Dados do Dashboard)
// =======================================================================
router.get("/", async (req: Request, res: Response) => {
    try {
        const { mes, tec_ref, bairro } = req.query as { mes?: string, tec_ref?: string, bairro?: string };
        const responsePayload = await DashboardService.getDashboardData({
            accessScope: req.accessFilter!,
            mes,
            tec_ref,
            bairro,
        });
        res.json(responsePayload);

    } catch (err: any) {
        console.error("Erro na rota unificada do dashboard:", err.message);
        res.status(500).json({ message: "Erro ao buscar dados do dashboard." });
    }
});


export default router;
