// backend/src/routes/casos.ts

import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth/auth";
import { unitAccessMiddleware } from "../../middleware/unitAccess.middleware";
import { checkCaseAccess } from "../../middleware/caseAccess.middleware"; // Manter para rotas de modificação

const router = Router();

import { CasosController } from "./casos.controller";

router.use(authMiddleware, unitAccessMiddleware('casos', 'unit_id'));

router.post("/", CasosController.create); //create new case
router.get("/", CasosController.list); //list 
router.get("/schema", CasosController.getSchema);
router.get("/busca-rapida", CasosController.getFast);
router.put("/:id", checkCaseAccess('params', 'id'), CasosController.update); //atualizar caso
router.patch("/:id/status", checkCaseAccess('params', 'id'), CasosController.patch); //atualiza o atributo status
router.delete("/:id", checkCaseAccess('params', 'id'), CasosController.delete); // deleta um caso
router.get("/:id", checkCaseAccess('params', 'id'), CasosController.getCaso); //lista 1 caso por id
router.get("/:casoId/encaminhamentos", checkCaseAccess('params', 'casoId'), CasosController.getEncaminhamentos); // lista os encaminhamentos de um caso especifico

export default router;

