"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
// 🧠 Função auxiliar para validar se o casoId é numérico
function validarCasoId(casoId) {
    const id = Number(casoId);
    if (isNaN(id) || id <= 0)
        return null;
    return id;
}
// 🗂️ Listar anexos por caso
router.get("/casos/:id", async (req, res) => {
    try {
        const casoId = validarCasoId(req.params.id);
        if (!casoId) {
            console.error(`ERRO: casoId inválido recebido: ${req.params.id}`);
            return res.status(400).json({ error: "ID de caso inválido." });
        }
        console.log(`DEBUG: Acessando rota /anexos/casos/ com casoId: ${casoId}`);
        const query = `
      SELECT id, nome_arquivo, tipo, caminho, data_upload, usuario_upload
      FROM anexos
      WHERE caso_id = $1
      ORDER BY data_upload DESC
    `;
        const { rows } = await db_1.default.query(query, [casoId]);
        console.log(`DEBUG: ${rows.length} anexos encontrados para o caso ${casoId}`);
        return res.status(200).json(rows);
    }
    catch (error) {
        console.error("Erro ao listar anexos:", error.message);
        return res.status(500).json({ error: "Erro interno ao listar anexos." });
    }
});
// 📤 Upload de novo anexo (exemplo, se existir no seu projeto)
router.post("/casos/:id", async (req, res) => {
    try {
        const casoId = validarCasoId(req.params.id);
        if (!casoId) {
            console.error(`ERRO: casoId inválido recebido: ${req.params.id}`);
            return res.status(400).json({ error: "ID de caso inválido." });
        }
        const { nome_arquivo, tipo, caminho, usuario_upload } = req.body;
        if (!nome_arquivo || !tipo || !caminho) {
            return res.status(400).json({ error: "Campos obrigatórios ausentes." });
        }
        const query = `
      INSERT INTO anexos (caso_id, nome_arquivo, tipo, caminho, usuario_upload, data_upload)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id
    `;
        const { rows } = await db_1.default.query(query, [casoId, nome_arquivo, tipo, caminho, usuario_upload]);
        console.log(`DEBUG: Novo anexo inserido no caso ${casoId}, ID: ${rows[0].id}`);
        return res.status(201).json({ message: "Anexo inserido com sucesso.", id: rows[0].id });
    }
    catch (error) {
        console.error("Erro ao inserir anexo:", error.message);
        return res.status(500).json({ error: "Erro interno ao inserir anexo." });
    }
});
exports.default = router;
