import { Request, Response } from "express";
import {
  parseRelatorioDashboardInput,
  parseRelatorioGeralInput,
  RelatorioValidationError,
} from "./relatorios.contract";
import { RelatoriosService } from "./relatorios.service";

function handleRelatoriosError(res: Response, err: unknown, fallbackMessage: string) {
  if (err instanceof RelatorioValidationError) {
    return res.status(err.status).json({ message: err.message });
  }

  const safeMessage = err instanceof Error ? err.message : fallbackMessage;
  console.error(fallbackMessage, safeMessage);
  return res.status(500).json({ message: fallbackMessage });
}

export class RelatoriosController {
  static async generateGeneral(req: Request, res: Response) {
    try {
      const input = parseRelatorioGeralInput(req.body, req.accessFilter, req.user);
      const pdfBuffer = await RelatoriosService.generateGeneralReport(input);
      if (!pdfBuffer) {
        return res.status(404).json({ message: "Nenhum caso encontrado no período selecionado para sua unidade." });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=relatorio-geral-${Date.now()}.pdf`);

      return res.send(pdfBuffer);
    } catch (err: unknown) {
      return handleRelatoriosError(res, err, "Erro interno ao gerar relatório.");
    }
  }

  static async generateDashboard(req: Request, res: Response) {
    try {
      const input = parseRelatorioDashboardInput(req.query, req.accessFilter, req.user);
      const pdfBuffer = await RelatoriosService.generateDashboardReport(input);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=relatorio-dashboard-${Date.now()}.pdf`);

      return res.send(pdfBuffer);
    } catch (err: unknown) {
      return handleRelatoriosError(res, err, "Erro interno ao gerar relatório do dashboard.");
    }
  }
}
