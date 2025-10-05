// backend/src/routes/relatorios.ts
import { Router, Request, Response } from "express";
import pool from "../db";
import { authMiddleware } from "../middleware/auth";
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware"; // 📌 NOVO IMPORT
import { generateGeneralReportPDF } from "../services/report.service";

const router = Router();

// =======================================================================
// APLICAÇÃO GERAL DOS MIDDLEWARES DE SEGURANÇA NA ROTA
// O unitAccessMiddleware é aplicado para gerar req.accessFilter!
// =======================================================================
router.use(authMiddleware, unitAccessMiddleware('casos', 'unit_id')); // Aplica o filtro na tabela 'casos'

// =======================================================================
// ROTA PARA GERAR O RELATÓRIO GERAL
// 📌 MUDANÇA CRÍTICA: Injeção do filtro de unidade na query
// =======================================================================
router.post("/geral", async (req: Request, res: Response) => {
    const { startDate, endDate } = req.body;
    const accessFilter = req.accessFilter!; // Pega o filtro gerado pelo middleware
    
    if (!startDate || !endDate) {
        return res.status(400).json({ message: "As datas de início e fim são obrigatórias." });
    }

    try {
        // 1. Parâmetros base da query: datas de início e fim
        const params: (string | number)[] = [startDate, endDate];
        let paramIndex = params.length;
        
        // 2. Resolve a Cláusula WHERE de acesso à Unidade (CRÍTICO!)
        let unitWhere = accessFilter.whereClause;
        
        // Substituir placeholders ($X, $Y) por números reais ($N+1, $N+2...)
        if (accessFilter.params.length === 1) {
            unitWhere = unitWhere.replace('$X', `$${paramIndex + 1}`);
            paramIndex++;
        } else if (accessFilter.params.length === 2) {
            unitWhere = unitWhere.replace('$X', `$${paramIndex + 1}`).replace('$Y', `$${paramIndex + 2}`);
            paramIndex += 2;
        }
        
        // Adiciona os parâmetros de unidade à lista principal
        params.push(...accessFilter.params);

        // 3. Monta a query final com o filtro de unidade
        const result = await pool.query(
            `SELECT id, "dataCad", "tecRef", nome, dados_completos->>'bairro' as bairro, dados_completos->>'tipoViolencia' as "tipoViolencia", unit_id
             FROM casos
             WHERE "dataCad" BETWEEN $1 AND $2
             AND ${unitWhere} -- 📌 FILTRO DE ACESSO INJETADO AQUI
             ORDER BY "dataCad" ASC`,
            params // Lista completa: [startDate, endDate, unit_id_1, unit_id_2...]
        );
        const casos = result.rows;

        // NOTA: Os dados do relatório gerado (PDF) DEVEM ser anonimizados
        // se o usuário for VIGILÂNCIA e estiver acessando dados do CREAS.
        // Assumindo que generateGeneralReportPDF lida com a anonimização
        // internamente ou que a rota deve tratar isso. No modelo atual, 
        // passaremos o user.unit_id para o service se necessário. 
        // Por hora, o filtro de acesso é o mais crítico.

        if (casos.length === 0) {
            return res.status(404).json({ message: "Nenhum caso encontrado no período selecionado para sua unidade." });
        }
        
        // Assumindo que generateGeneralReportPDF consome a lista de casos
        const pdfBuffer = await generateGeneralReportPDF(casos);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio-geral-${Date.now()}.pdf`);

        res.send(pdfBuffer);

    } catch (err: any) {
        console.error("Erro ao gerar relatório:", err);
        res.status(500).json({ message: "Erro interno ao gerar relatório." });
    }
});

export default router;