"use strict";
// backend/src/routes/casos.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth/auth");
const unitAccess_middleware_1 = require("../../middleware/unitAccess.middleware");
const caseAccess_middleware_1 = require("../../middleware/caseAccess.middleware"); // Manter para rotas de modificação
const router = (0, express_1.Router)();
const casos_controller_1 = require("./casos.controller");
router.use(auth_1.authMiddleware, (0, unitAccess_middleware_1.unitAccessMiddleware)('casos', 'unit_id'));
// ROTA POST /casos - CRIAR NOVO CASO
router.post("/", casos_controller_1.CasosCrontroller.create);
// ROTA GET /casos - LISTAR CASOS (CORREÇÃO DE TIPAGEM E BPC)
router.get("/", casos_controller_1.CasosCrontroller.list);
// ROTA PUT /casos/:id - ATUALIZAR CASO
router.put("/:id", (0, caseAccess_middleware_1.checkCaseAccess)('params', 'id'), casos_controller_1.CasosCrontroller.update);
// PATCH /casos/:id/status 
router.patch("/:id/status", (0, caseAccess_middleware_1.checkCaseAccess)('params', 'id'), casos_controller_1.CasosCrontroller.patch);
// DELETE /casos/:id
router.delete("/:id", (0, caseAccess_middleware_1.checkCaseAccess)('params', 'id'), casos_controller_1.CasosCrontroller.delete);
// GET /casos/:id - DETALHES DO CASO 
router.get("/:id", casos_controller_1.CasosCrontroller.getCaso);
// GET /casos/:casoId/encaminhamentos
router.get("/:casoId/encaminhamentos", casos_controller_1.CasosCrontroller.getEncaminhamentos);
// ROTA GET /casos/busca-rapida - BUSCA RÁPIDA PARA ASSOCIAÇÃO DE DEMANDAS
router.get("/busca-rapida", auth_1.authMiddleware, (0, unitAccess_middleware_1.unitAccessMiddleware)('casos', 'unit_id'), casos_controller_1.CasosCrontroller.getFast);
exports.default = router;
