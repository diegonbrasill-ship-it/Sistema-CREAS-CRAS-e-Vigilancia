
import pool from "../../db";
import { CASOS_SQL } from "./casos.sql";
import { logAction } from "../../services/logger";
import { log } from "node:console";

export class CasosService {

    static async createCaso(data: any, admin: any) {

        const {
            nome,
            dataCad,
            tec_ref,
            status,
            unit_id,
            dados_completos_payload
        } = data;

        console.log('dados vindos do front:')
        console.log(data)


        const nomeToUse = nome || null;
        const tecRefToUse = tec_ref || null;
        const unitIdToUse = unit_id || admin.user!.unit_id || null;
        const statusToUse = status || 'Ativo'; // Padrão 'Ativo' para novos casos
        const dataCadToUse = dataCad || new Date().toISOString().split('T')[0];
        const dadosCompletosJSON = JSON.stringify(dados_completos_payload); // O objeto JSONB é o payload restante 
        const user_id = admin!.id;
        const username = admin!.username;

        const result = await pool.query(CASOS_SQL.CLEAN(CASOS_SQL.INSERT),
            [
                nomeToUse,
                dataCadToUse,
                tecRefToUse,
                statusToUse,
                unitIdToUse,
                user_id,
                dadosCompletosJSON
            ])

        const novoCaso = result.rows[0];

        await logAction({
            user_id: user_id,
            username: username,
            action: "CREATE_CASO",
            details: { casoId: novoCaso.id }
        })

        log(novoCaso)
        return novoCaso;
    }

    static async list() {
    }

    static async update() { }

}