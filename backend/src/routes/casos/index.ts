// backend/src/routes/casos.ts

import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth/auth";
import { unitAccessMiddleware } from "../../middleware/unitAccess.middleware";
import { checkCaseAccess } from "../../middleware/caseAccess.middleware"; // Manter para rotas de modificação

const router = Router();

import { CasosCrontroller } from "./casos.controller";

router.use(authMiddleware, unitAccessMiddleware('casos', 'unit_id'));

router.post("/", CasosCrontroller.create); //create new case
router.get("/", CasosCrontroller.list); //list 
router.get("/busca-rapida", authMiddleware, unitAccessMiddleware('casos', 'unit_id'), CasosCrontroller.getFast);
router.put("/:id", checkCaseAccess('params', 'id'), CasosCrontroller.update); //atualizar caso
router.patch("/:id/status", checkCaseAccess('params', 'id'), CasosCrontroller.patch); //atualiza o atributo status
router.delete("/:id", checkCaseAccess('params', 'id'), CasosCrontroller.delete); // deleta um caso
router.get("/:id", CasosCrontroller.getCaso); //lista 1 caso por id
router.get("/:casoId/encaminhamentos", CasosCrontroller.getEncaminhamentos); // lista os encaminhamentos de um caso especifico

export default router;

