import pool from "../../db";
import { CASOS_SQL } from "./casos.sql";
import { logAction } from "../../services/logger";
import { log } from "node:console";
import { QueryBuilder } from "../../utils/query-builder";

type AccessFilter = { whereClause: string; params: any[] };

export class CasosService {

    static async createCaso(data: any, admin: any) {

        const {
            nome,
            data_cad,
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
        const data_cadToUse = data_cad || new Date().toISOString().split('T')[0];
        const dadosCompletosJSON = JSON.stringify(dados_completos_payload); // O objeto JSONB é o payload restante 
        const user_id = admin!.id;
        const username = admin!.username;

        const result = await pool.query(CASOS_SQL.CLEAN(CASOS_SQL.INSERT),
            [
                nomeToUse,
                data_cadToUse,
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

    static async list(input: {
        accessFilter: AccessFilter;
        tec_ref?: string;
        filtro?: string;
        valor?: string;
        status?: string;
        confirmedViolence?: string;
        socioeducacao?: string;
        mes?: string;
        page?: string | number;
        limit?: string | number;
    }) {
        const {
            accessFilter,
            tec_ref,
            filtro,
            valor,
            status = 'Ativo',
            confirmedViolence,
            socioeducacao,
            mes,
            page,
            limit,
        } = input;

        const qb = new QueryBuilder(CASOS_SQL.SELECT_BASE);

        if (status !== 'todos') {
            qb.whereIf(status, (ph) => `status = ${ph}::VARCHAR`);
        }
        qb.whereIf(mes, (ph) => `TO_CHAR(data_cad, 'YYYY-MM') = ${ph}::VARCHAR`);

        const searchTerm = valor && filtro === 'q' ? valor : tec_ref;
        if (searchTerm) {
            const p1 = qb.addParam(`%${searchTerm}%`);
            const p2 = qb.addParam(`%${searchTerm}%`);
            const p3 = qb.addParam(`%${searchTerm}%`);
            const p4 = qb.addParam(`%${searchTerm}%`);
            qb.where(CASOS_SQL.CLEAN(`(
                nome ILIKE ${p1} OR
                tec_ref ILIKE ${p2} OR
                dados_completos->>'nis' ILIKE ${p3} OR
                dados_completos->>'cpf' ILIKE ${p4}
            )`));
        } else if (filtro && valor && filtro !== 'q') {
            const jsonKey = filtro;

            if (jsonKey === 'por_bairro') {
                qb.whereIf(valor, (ph) => `LOWER(dados_completos->>'bairro') = LOWER(${ph}::TEXT)`);
            } else if (jsonKey === 'por_violencia') {
                const ph = qb.addParam(`%${valor}%`);
                qb.where(`dados_completos->>'tipo_violencia' ILIKE ${ph}`);
            } else if (jsonKey === 'por_faixa_etaria') {
                qb.whereIf(valor, (ph) => CASOS_SQL.CLEAN(`
                    CASE
                        WHEN (dados_completos->>'idade')::integer BETWEEN 0 AND 11 THEN 'Criança (0-11)'
                        WHEN (dados_completos->>'idade')::integer BETWEEN 12 AND 17 THEN 'Adolescente (12-17)'
                        WHEN (dados_completos->>'idade')::integer BETWEEN 18 AND 29 THEN 'Jovem (18-29)'
                        WHEN (dados_completos->>'idade')::integer BETWEEN 30 AND 59 THEN 'Adulto (30-59)'
                        WHEN (dados_completos->>'idade')::integer >= 60 THEN 'Idoso (60+)'
                        ELSE 'Não informado'
                    END = ${ph}::TEXT
                `));
            } else if (jsonKey === 'recebeBPC') {
                qb.where(`(dados_completos->>'recebeBPC' = 'Idoso' OR dados_completos->>'recebeBPC' = 'PCD')`);
            } else {
                qb.whereIf(valor, (ph) => `dados_completos->>'${jsonKey}' = ${ph}::TEXT`);
            }
        }

        if (confirmedViolence === 'true') qb.where(`(dados_completos->>'confirmacaoViolencia')::TEXT = 'Confirmada'`);
        if (socioeducacao === 'true') qb.where(`(dados_completos->>'membroSocioeducacao')::TEXT = 'Sim'`);

        qb.applyAccessFilter(accessFilter);
        qb.order('data_cad DESC');

        const pageNum = page !== undefined ? Math.max(1, Number(page)) : undefined;
        const limitNum = limit !== undefined ? Math.max(1, Math.min(200, Number(limit))) : undefined;
        if (pageNum && limitNum) {
            qb.limit(limitNum, (pageNum - 1) * limitNum);
        }

        const [sql, params] = qb.build();
        const result = await pool.query(CASOS_SQL.CLEAN(sql), params);
        return result.rows;
    }

    static async getFast(input: { accessFilter: AccessFilter; q: string }) {
        const { accessFilter, q } = input;
        const searchTerm = q?.trim();
        if (!searchTerm || searchTerm.length < 3) return [];

        const qb = new QueryBuilder(CASOS_SQL.CLEAN(`
            SELECT id, nome, tec_ref, dados_completos->>'nis' AS nis, dados_completos->>'cpf' AS cpf
            FROM casos
        `));

        qb.where(`status = 'Ativo'`);

        const wild = `%${searchTerm}%`;
        const p1 = qb.addParam(wild);
        const p2 = qb.addParam(wild);
        const p3 = qb.addParam(wild);

        const idSearch = parseInt(searchTerm, 10);
        let idClause = '';
        if (!isNaN(idSearch)) {
            const pId = qb.addParam(idSearch);
            idClause = ` OR id = ${pId}::INTEGER`;
        }

        qb.where(CASOS_SQL.CLEAN(`(
            nome ILIKE ${p1} OR
            dados_completos->>'nis' ILIKE ${p2} OR
            dados_completos->>'cpf' ILIKE ${p3}
            ${idClause}
        )`));

        qb.applyAccessFilter(accessFilter);
        qb.order('nome ASC');
        qb.limit(10, 0);

        const [sql, params] = qb.build();
        const result = await pool.query(CASOS_SQL.CLEAN(sql), params);
        return result.rows;
    }

    static async getEncaminhamentos(input: { casoId: string; accessFilter: AccessFilter }) {
        const { casoId, accessFilter } = input;

        const qb = new QueryBuilder(CASOS_SQL.CLEAN(`
            SELECT enc.id, enc.servico_destino, enc.data_encaminhamento, enc.status,
                   enc.observacoes, usr.username AS tec_ref
            FROM encaminhamentos enc
            LEFT JOIN users usr ON enc.user_id = usr.id
            LEFT JOIN casos c ON enc.caso_id = c.id
        `));

        qb.whereIf(casoId, (ph) => `enc.caso_id = ${ph}`);

        const mappedAccessFilter = accessFilter.whereClause === 'TRUE'
            ? accessFilter
            : { ...accessFilter, whereClause: accessFilter.whereClause.replace(/^casos\./, 'c.') };

        qb.applyAccessFilter(mappedAccessFilter);
        qb.order('enc.data_encaminhamento DESC');

        const [sql, params] = qb.build();
        const result = await pool.query(CASOS_SQL.CLEAN(sql), params);
        return result.rows;
    }

    static async getCasoById() { }
    
    static async update() { }


}