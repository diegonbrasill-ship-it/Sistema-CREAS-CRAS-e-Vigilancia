// backend/src/routes/relatorios.ts
import { Router } from "express";
import pool from "../db";
import { authMiddleware } from "../middleware/auth";
import { generateGeneralReportPDF } from "../services/report.service";

const router = Router();

// ROTA PARA GERAR O RELATÓRIO GERAL
router.post("/geral", authMiddleware, async (req, res) => {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: "As datas de início e fim são obrigatórias." });
    }

    try {
        // Busca os dados no banco de dados dentro do período especificado
        const result = await pool.query(
            `SELECT id, "dataCad", "tecRef", nome, dados_completos->>'bairro' as bairro, dados_completos->>'tipoViolencia' as "tipoViolencia"
             FROM casos
             WHERE "dataCad" BETWEEN $1 AND $2
             ORDER BY "dataCad" ASC`,
            [startDate, endDate]
        );
        const casos = result.rows;

        if (casos.length === 0) {
            return res.status(404).json({ message: "Nenhum caso encontrado no período selecionado." });
        }

        // Chama o serviço para gerar o PDF
        const pdfBuffer = await generateGeneralReportPDF(casos);

        // Configura os headers da resposta para o navegador entender que é um arquivo PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio-geral-${Date.now()}.pdf`);

        // Envia o PDF como resposta
        res.send(pdfBuffer);

    } catch (err: any) {
        console.error("Erro ao gerar relatório:", err);
        res.status(500).json({ message: "Erro interno ao gerar relatório." });
    }
});

export default router;