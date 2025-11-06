
import pool from "../../db";
import { CASOS_SQL } from "./casos.sql";
import { logAction } from "../../services/logger";

export class CasosService {

    static async createCaso(data: any, admin: any) {
        const {
            nome,
            dataCad,
            tecRef,
            status,
            unit_id,
            dados_completos_payload
        } = data;

        const nomeToUse = nome || null;
        const tecRefToUse = tecRef || null;
        const unitIdToUse = unit_id || admin.user!.unit_id || null;  // Garante o unit_id do usuário logado
        const statusToUse = status || 'Ativo'; // Padrão 'Ativo' para novos casos
        const dataCadToUse = dataCad || new Date().toISOString().split('T')[0];
        const dadosCompletosJSON = JSON.stringify(dados_completos_payload); // O objeto JSONB é o payload restante 
        const userId = admin.user!.id;
        const username = admin.user!.username;

        const result = await pool.query(CASOS_SQL.CLEAN(CASOS_SQL.INSERT),
            [
                nomeToUse,
                dataCadToUse,
                tecRefToUse,
                statusToUse,
                unitIdToUse,
                userId,
                dadosCompletosJSON
            ])

        const novoCaso = result.rows[0];

        await logAction({
            userId: userId,
            username: username,
            action: "CREATE_CASO",
            details: { casoId: novoCaso.id }
        })
        return novoCaso;
    }

    static async list() {

    }
    static async update() { }

}