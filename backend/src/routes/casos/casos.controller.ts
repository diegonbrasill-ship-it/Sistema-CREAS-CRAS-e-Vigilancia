import { query, Request, Response } from "express";
import pool from "../../db";
import { CASOS_SQL } from "./casos.sql";
import { logAction } from "../../services/logger";
import { CasosService } from "./casos.service";

export class CasosCrontroller {

    static async create(req: Request, res: Response) {
        // necessidade de definir mais os erros de rotas?
        try {
            const novoCaso = await CasosService.createCaso(req.body, req.user)
            res.status(201).json(novoCaso);

        } catch (err: any) {
            console.error("Erro ao criar caso:", err.message);
            res.status(500).json({ message: "Erro ao criar caso." });
        }
    }

    static async list(req: Request, res: Response) {
        const user = req.user!;
        const accessFilter = req.accessFilter!;

        const {
            tec_ref,
            filtro,
            valor,
            status = 'Ativo',
            confirmedViolence,
            socioeducacao,
            mes,
            page,
            limit,
        } = req.query as any;

        try {
            const rows = await CasosService.list({
                accessFilter,
                tec_ref,
                filtro,
                valor,
                status,
                confirmedViolence,
                socioeducacao,
                mes,
                page,
                limit,
            });

            res.json(rows);

        } catch (err: any) {
            console.error("Erro ao listar casos:", err.message);
            res.status(500).json({ message: "Erro ao buscar casos." });
        }

    }

    static async update(req: Request, res: Response) {

        const { id } = req.params;
        const casoUpdate = req.body;
        const { id: user_id, username } = req.user!;

        console.log("Update caso (put)")
        console.log("dados do front")
        console.log(casoUpdate)

        try {

            const dataBaseSelectResponse = await pool.query(CASOS_SQL.CLEAN(CASOS_SQL.SELECT_BY_ID), [id]);
            if (dataBaseSelectResponse.rowCount === 0) return res.status(404).json({ message: "Caso não encontrado." });
            const casoAtual = dataBaseSelectResponse.rows[0];
            // junção de dados
            const dadosMesclados = {
                ...casoAtual.dados_completos,
                ...casoUpdate
            };
            const data_cad = casoUpdate.data_cad || casoAtual.data_cad;
            const tec_ref = casoUpdate.tec_ref || casoAtual.tec_ref;
            const nome = casoUpdate.nome || casoAtual.nome || null;
            //Update no banco
            console.log("dados do mesclados")
            console.log(dadosMesclados)

            const dataBaseUpdateResponse = await pool.query(
                CASOS_SQL.CLEAN(CASOS_SQL.UPDATE),
                [data_cad, tec_ref, nome, JSON.stringify(dadosMesclados), id]
            );
            const updatedCaso = dataBaseUpdateResponse.rows[0]
            console.log("caso atualizado")
            console.log(updatedCaso)
            await logAction({ user_id, username, action: 'UPDATE_CASE', details: { casoId: id } });
            res.status(200).json({ message: "Prontuário atualizado com sucesso!", caso: dadosMesclados });

        } catch (err: any) {

            console.error(`Erro ao atualizar caso ${id}:`, err.message);
            res.status(500).json({ message: "Erro interno ao atualizar o prontuário." });

        }
    }

    static async patch(req: Request, res: Response) {
        const { id } = req.params;
        const { status } = req.body;
        const { id: user_id, username } = req.user!;
        if (!status || !['Ativo', 'Desligado', 'Arquivado'].includes(status)) {
            return res.status(400).json({ message: "Status inválido. Valores permitidos: Ativo, Desligado, Arquivado." });
        }
        try {
            const result = await pool.query(CASOS_SQL.CLEAN(CASOS_SQL.UPDATE_STATUS), [status, id]);
            if (result.rowCount === 0) return res.status(404).json({ message: 'Caso não encontrado.' });

            await logAction({ user_id, username, action: 'UPDATE_CASE_STATUS', details: { casoId: id, nomeVitima: result.rows[0].nome, novoStatus: status } });
            res.status(200).json({ message: `Caso ${id} atualizado para '${status}' com sucesso.` });

        } catch (err: any) {
            console.error(`Erro ao atualizar status do caso ${id}:`, err.message);
            res.status(500).json({ message: "Erro interno ao atualizar o status do caso." });
        }
    }

    static async delete(req: Request, res: Response) {
        const { id } = req.params;
        const { id: user_id, username } = req.user!;
        try {
            const result = await pool.query(CASOS_SQL.CLEAN(CASOS_SQL.DELETE), [id]);

            if (result.rowCount === 0) return res.status(404).json({ message: 'Caso não encontrado.' });

            await logAction({ user_id, username, action: 'DELETE_CASE', details: { casoId: id, nomeVitima: result.rows[0].nome } });
            res.status(200).json({ message: 'Caso excluído com sucesso.' });
        } catch (err: any) {
            console.error("Erro ao excluir caso:", err.message);
            res.status(500).json({ message: "Erro ao excluir caso." });
        }
    }

    static async getCaso(req: Request, res: Response) {
        //usuario solicita caso por id
        //verifico se foi ele que criou
        const { id} = req.params;
        const user = req.user!;
        try {
            let query = CASOS_SQL.SELECT_BY_ID
            const response = await pool.query(CASOS_SQL.CLEAN(query), [id]);
            console.log(response.rows)

            if (response.rowCount === 0){ return res.status(404).json({ message: "Caso não encontrado." }); } 
            
            const casoConsultado = response.rows[0];
            let nomeToSendInPayload = casoConsultado.nome;

            if(casoConsultado.user_id !== user.id) { nomeToSendInPayload = "NOME EM SIGILO" }

            const demandasQuery = CASOS_SQL.CLEAN(`
                SELECT id, tipo_documento, instituicao_origem, data_recebimento, status
                FROM demandas   
                WHERE caso_associado_id = $1
                ORDER BY data_recebimento DESC
            `);

            const demandasResult = await pool.query(demandasQuery, [id]);

            const payloadCasoCompleto = {
                ...casoConsultado.dados_completos,
                id: casoConsultado.id,
                data_cad: casoConsultado.data_cad,
                tec_ref: casoConsultado.tec_ref,
                nome: nomeToSendInPayload,
                status: casoConsultado.status,
                unit_id: casoConsultado.unit_id,
                demandas_vinculadas: demandasResult.rows
            };

    
            res.status(200).json(payloadCasoCompleto);

        } catch (err: any) {

            console.error(`Erro ao buscar detalhes do caso ${id}:`, err.message);
            res.status(500).json({ message: "Erro ao buscar detalhes do caso." });
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