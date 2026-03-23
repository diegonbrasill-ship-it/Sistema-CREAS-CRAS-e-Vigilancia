import pool from "../../db";
import { CASOS_SQL } from "./casos.sql";
import { logAction } from "../../services/logger";
import { QueryBuilder } from "../../utils/query-builder";
import { AuthenticatedUser } from "../../middleware/auth/authenticated.user";
import {
    CASE_FILTER_DEFS,
    CASE_SORT_COLUMNS,
    CasoListInput,
    normalizeCreateCasoInput,
    normalizeCasePayload,
    normalizeCaseReadPayload,
    normalizeUpdateCasoInput,
    validateCasePayload,
} from "./casos.contract";

type AccessFilter = { whereClause: string; params: any[] };

export class CasosService {

    static async createCaso(data: unknown, admin: AuthenticatedUser) {
        const normalized = normalizeCreateCasoInput(data, admin);
        const user_id = admin.id;
        const username = admin.username;

        const result = await pool.query(CASOS_SQL.CLEAN(CASOS_SQL.INSERT),
            [
                normalized.nome,
                normalized.data_cad,
                normalized.tec_ref,
                normalized.status,
                normalized.unit_id,
                user_id,
                JSON.stringify(normalized.dados_completos_payload)
            ])

        const novoCaso = {
            ...result.rows[0],
            nome: result.rows[0]?.nome ?? normalized.nome,
            data_cad: result.rows[0]?.data_cad ?? normalized.data_cad,
            tec_ref: result.rows[0]?.tec_ref ?? normalized.tec_ref,
            status: result.rows[0]?.status ?? normalized.status,
            unit_id: result.rows[0]?.unit_id ?? normalized.unit_id,
            dados_completos: result.rows[0]?.dados_completos ?? normalized.dados_completos_payload,
        };

        await logAction({
            user_id: user_id,
            username: username,
            action: "CREATE_CASO",
            details: { casoId: novoCaso.id }
        })

        return novoCaso;
    }

    static async list(input: CasoListInput) {
        const {
            accessScope,
            search,
            searchBy,
            status,
            mes,
            page,
            limit,
            sortBy,
            sortOrder,
            filters,
        } = input;

        const qb = new QueryBuilder(CASOS_SQL.SELECT_BASE);
        qb.where('deleted_at IS NULL');

        if (status !== 'todos') {
            qb.whereIf(status, (ph) => `status = ${ph}::VARCHAR`);
        }
        qb.whereIf(mes, (ph) => `TO_CHAR(data_cad, 'YYYY-MM') = ${ph}::VARCHAR`);

        if (search) {
            if (searchBy === 'nome') {
                qb.whereILike(search, 'nome');
            } else if (searchBy === 'tec_ref') {
                qb.whereILike(search, 'tec_ref');
            } else if (searchBy === 'cpf') {
                qb.whereJsonILike('dados_completos', 'cpf', search);
            } else if (searchBy === 'nis') {
                qb.whereJsonILike('dados_completos', 'nis', search);
            } else {
                const p1 = qb.addParam(`%${search}%`);
                const p2 = qb.addParam(`%${search}%`);
                const p3 = qb.addParam(`%${search}%`);
                const p4 = qb.addParam(`%${search}%`);
                qb.where(CASOS_SQL.CLEAN(`(
                    nome ILIKE ${p1} OR
                    tec_ref ILIKE ${p2} OR
                    dados_completos->>'nis' ILIKE ${p3} OR
                    dados_completos->>'cpf' ILIKE ${p4}
                )`));
            }
        }

        for (const [filterKey, filterValue] of Object.entries(filters)) {
            const definition = CASE_FILTER_DEFS[filterKey];
            if (!definition) {
                continue;
            }

            if (filterKey === 'faixaEtariaVitima') {
                qb.whereIf(filterValue, (ph) => CASOS_SQL.CLEAN(`
                    CASE
                        WHEN COALESCE(dados_completos->>'idade', '') ~ '^[0-9]+$'
                             AND (dados_completos->>'idade')::integer BETWEEN 0 AND 11 THEN 'Criança (0-11)'
                        WHEN COALESCE(dados_completos->>'idade', '') ~ '^[0-9]+$'
                             AND (dados_completos->>'idade')::integer BETWEEN 12 AND 17 THEN 'Adolescente (12-17)'
                        WHEN COALESCE(dados_completos->>'idade', '') ~ '^[0-9]+$'
                             AND (dados_completos->>'idade')::integer BETWEEN 18 AND 29 THEN 'Jovem (18-29)'
                        WHEN COALESCE(dados_completos->>'idade', '') ~ '^[0-9]+$'
                             AND (dados_completos->>'idade')::integer BETWEEN 30 AND 59 THEN 'Adulto (30-59)'
                        WHEN COALESCE(dados_completos->>'idade', '') ~ '^[0-9]+$'
                             AND (dados_completos->>'idade')::integer >= 60 THEN 'Idoso (60+)'
                        ELSE 'Não informado'
                    END = ${ph}::TEXT
                `));
                continue;
            }

            if (definition.source === 'jsonb') {
                qb.whereJsonEquals(
                    'dados_completos',
                    definition.path,
                    filterValue,
                    { caseInsensitive: definition.type === 'string' }
                );
            }
        }

        qb.applyAccessFilter(accessScope, { allowNullUnit: false });
        qb.applyOrdering(sortBy, sortOrder, CASE_SORT_COLUMNS);

        const limitNum = limit !== undefined ? Math.min(200, limit) : undefined;
        if (page !== undefined && limitNum !== undefined) {
            qb.limit(limitNum, (page - 1) * limitNum);
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

        qb.where(`deleted_at IS NULL`);
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

        qb.applyAccessFilter(accessFilter, { allowNullUnit: false });
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

        qb.where(`c.deleted_at IS NULL`);
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

    static async getCasoById(input: { id: string; accessFilter: AccessFilter }) {
        const { id, accessFilter } = input;

        const qb = new QueryBuilder(CASOS_SQL.CLEAN(`
            SELECT id, data_cad, tec_ref, nome, status, unit_id, dados_completos
            FROM casos
        `));
        qb.where(`deleted_at IS NULL`);
        qb.whereIf(id, (ph) => `id = ${ph}::INTEGER`);
        qb.applyAccessFilter(accessFilter, { allowNullUnit: false });

        const [sql, params] = qb.build();
        const response = await pool.query(CASOS_SQL.CLEAN(sql), params);
        if (response.rowCount === 0) {
            return null;
        }

        const casoConsultado = response.rows[0];
        const dadosCompletos = normalizeCaseReadPayload(casoConsultado.dados_completos);

        if (dadosCompletos.nome === undefined && casoConsultado.nome) {
            dadosCompletos.nome = casoConsultado.nome;
        }

        const demandasQuery = CASOS_SQL.CLEAN(`
            SELECT id, tipo_documento, instituicao_origem, data_recebimento, status
            FROM demandas
            WHERE caso_associado_id = $1
            ORDER BY data_recebimento DESC
        `);
        const demandasResult = await pool.query(demandasQuery, [casoConsultado.id]);

        return {
            id: casoConsultado.id,
            data_cad: casoConsultado.data_cad,
            tec_ref: casoConsultado.tec_ref,
            nome: casoConsultado.nome,
            status: casoConsultado.status,
            unit_id: casoConsultado.unit_id,
            dados_completos: dadosCompletos,
            demandas_vinculadas: demandasResult.rows,
            demandasVinculadas: demandasResult.rows,
        };
    }
    
    static async updateCaso(id: string, data: unknown, admin: AuthenticatedUser) {
        const currentResult = await pool.query(CASOS_SQL.CLEAN(CASOS_SQL.SELECT_BY_ID), [id]);
        if (currentResult.rowCount === 0) {
            return null;
        }

        const casoAtual = currentResult.rows[0];
        const patch = normalizeUpdateCasoInput(data);
        const currentPayload = normalizeCaseReadPayload(casoAtual.dados_completos);
        const mergedPayload = normalizeCasePayload({
            ...currentPayload,
            ...patch.dados_completos_payload,
        });
        validateCasePayload(mergedPayload);

        const data_cad = patch.data_cad ?? casoAtual.data_cad;
        const tec_ref = patch.tec_ref !== undefined ? patch.tec_ref : casoAtual.tec_ref;
        const mergedNome = patch.nome !== undefined
            ? patch.nome
            : typeof mergedPayload.nome === "string"
                ? mergedPayload.nome
                : casoAtual.nome;

        const updateResult = await pool.query(
            CASOS_SQL.CLEAN(CASOS_SQL.UPDATE),
            [data_cad, tec_ref, mergedNome, JSON.stringify(mergedPayload), id]
        );

        const updatedCaso = {
            ...updateResult.rows[0],
            dados_completos: normalizeCaseReadPayload(updateResult.rows[0]?.dados_completos ?? mergedPayload),
        };

        await logAction({
            user_id: admin.id,
            username: admin.username,
            action: 'UPDATE_CASE',
            details: { casoId: id },
        });

        return updatedCaso;
    }

    static async patchStatus(id: string, status: string, admin: AuthenticatedUser) {
        const result = await pool.query(CASOS_SQL.CLEAN(CASOS_SQL.UPDATE_STATUS), [status, id]);
        if (result.rowCount === 0) {
            return null;
        }

        await logAction({
            user_id: admin.id,
            username: admin.username,
            action: 'UPDATE_CASE_STATUS',
            details: { casoId: id, nomeVitima: result.rows[0].nome, novoStatus: status },
        });

        return {
            id: result.rows[0].id,
            status: result.rows[0].status,
        };
    }

    static async deleteCaso(id: string, admin: AuthenticatedUser) {
        const result = await pool.query(CASOS_SQL.CLEAN(CASOS_SQL.DELETE), [id]);
        if (result.rowCount === 0) {
            return null;
        }

        await logAction({
            user_id: admin.id,
            username: admin.username,
            action: 'DELETE_CASE',
            details: { casoId: id, nomeVitima: result.rows[0].nome },
        });

        return {
            id: result.rows[0].id,
            deleted: true,
        };
    }


}
