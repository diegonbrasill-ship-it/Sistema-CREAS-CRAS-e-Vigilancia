// backend/src/routes/casos.ts

import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth/auth";
import { unitAccessMiddleware } from "../../middleware/unitAccess.middleware";
import { checkCaseAccess } from "../../middleware/caseAccess.middleware"; // Manter para rotas de modificação

const router = Router();

import { CasosCrontroller } from "./casos.controller";

router.use(authMiddleware, unitAccessMiddleware('casos', 'unit_id'));

// ROTA POST /casos - CRIAR NOVO CASO
router.post("/", CasosCrontroller.create);

// ROTA GET /casos - LISTAR CASOS (CORREÇÃO DE TIPAGEM E BPC)
router.get("/", CasosCrontroller.list);

// ROTA PUT /casos/:id - ATUALIZAR CASO
router.put("/:id", checkCaseAccess('params', 'id'), CasosCrontroller.update);

// PATCH /casos/:id/status 
router.patch("/:id/status", checkCaseAccess('params', 'id'), CasosCrontroller.patch);

// DELETE /casos/:id
router.delete("/:id", checkCaseAccess('params', 'id'), CasosCrontroller.delete);

// GET /casos/:id - DETALHES DO CASO 
router.get("/:id", CasosCrontroller.getCaso);

// GET /casos/:casoId/encaminhamentos
router.get("/:casoId/encaminhamentos", CasosCrontroller.getEncaminhamentos);

// ROTA GET /casos/busca-rapida - BUSCA RÁPIDA PARA ASSOCIAÇÃO DE DEMANDAS
router.get("/busca-rapida", authMiddleware, unitAccessMiddleware('casos', 'unit_id'), CasosCrontroller.getFast);


export default router;

