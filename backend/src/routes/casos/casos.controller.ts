import { Request, Response } from "express";
import { CasosService } from "./casos.service";
import { CasoValidationError, parseCasoListQuery } from "./casos.contract";

function handleCasosError(res: Response, err: unknown, fallbackMessage: string) {
    if (err instanceof CasoValidationError) {
        return res.status(err.status).json({ message: err.message });
    }

    const safeMessage = err instanceof Error ? err.message : fallbackMessage;
    console.error(fallbackMessage, safeMessage);
    return res.status(500).json({ message: fallbackMessage });
}

export class CasosCrontroller {

    static async create(req: Request, res: Response) {
        try {
            const novoCaso = await CasosService.createCaso(req.body, req.user!)
            res.status(201).json(novoCaso);

        } catch (err: unknown) {
            return handleCasosError(res, err, "Erro ao criar caso.");
        }
    }

    static async list(req: Request, res: Response) {
        try {
            const input = parseCasoListQuery(req.query as Record<string, unknown>, req.accessFilter!);
            const rows = await CasosService.list(input);

            res.json(rows);

        } catch (err: unknown) {
            return handleCasosError(res, err, "Erro ao buscar casos.");
        }

    }

    static async update(req: Request, res: Response) {
        try {
            const updatedCaso = await CasosService.updateCaso(req.params.id, req.body, req.user!);
            if (!updatedCaso) {
                return res.status(404).json({ message: "Caso não encontrado." });
            }

            res.status(200).json({ message: "Prontuário atualizado com sucesso!", caso: updatedCaso });

        } catch (err: unknown) {
            return handleCasosError(res, err, "Erro interno ao atualizar o prontuário.");
        }
    }

    static async patch(req: Request, res: Response) {
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !['Ativo', 'Desligado', 'Arquivado'].includes(status)) {
            return res.status(400).json({ message: "Status inválido. Valores permitidos: Ativo, Desligado, Arquivado." });
        }
        try {
            const result = await CasosService.patchStatus(id, status, req.user!);
            if (!result) return res.status(404).json({ message: 'Caso não encontrado.' });

            res.status(200).json(result);

        } catch (err: unknown) {
            return handleCasosError(res, err, "Erro interno ao atualizar o status do caso.");
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const result = await CasosService.deleteCaso(req.params.id, req.user!);
            if (!result) return res.status(404).json({ message: 'Caso não encontrado.' });

            res.status(200).json(result);
        } catch (err: unknown) {
            return handleCasosError(res, err, "Erro ao excluir caso.");
        }
    }

    static async getCaso(req: Request, res: Response) {
        try {
            const payloadCasoCompleto = await CasosService.getCasoById({
                id: req.params.id,
                accessFilter: req.accessFilter!,
            });

            if (!payloadCasoCompleto) {
                return res.status(404).json({ message: "Caso não encontrado." });
            }

            res.status(200).json(payloadCasoCompleto);

        } catch (err: unknown) {
            return handleCasosError(res, err, "Erro ao buscar detalhes do caso.");
        }
    }

    static async getEncaminhamentos(req: Request, res: Response) {
        const { casoId } = req.params;
        const accessFilter = req.accessFilter!;

        try {
            const rows = await CasosService.getEncaminhamentos({ casoId, accessFilter });
            res.json(rows);
        } catch (err: any) {
            console.error(`Erro ao listar encaminhamentos para o caso ${casoId}:`, err.message);
            res.status(500).json({ message: "Erro ao buscar encaminhamentos." });
        }
    }


    static async getFast(req: Request, res: Response) {

        const accessFilter = req.accessFilter!;
        const { q } = req.query as { q?: string };
        const searchTerm = q?.trim();

        if (!searchTerm || searchTerm.length < 3) {
            return res.json([]);
        }

        try {
            const rows = await CasosService.getFast({ accessFilter, q: searchTerm });
            res.json(rows);
        } catch (err: any) {
            console.error("Erro na busca rápida de casos:", err.message);
            res.status(500).json({ message: "Erro na busca rápida de casos." });
        }

    }

}
