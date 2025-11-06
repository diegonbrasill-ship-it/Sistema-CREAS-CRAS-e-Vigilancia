"use strict";
// backend/src/routes/casos.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanSqlString = void 0;
exports.anonimizarDadosSeNecessario = anonimizarDadosSeNecessario;
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth/auth");
const unitAccess_middleware_1 = require("../middleware/unitAccess.middleware");
const logger_1 = require("../services/logger");
const constants_1 = require("../utils/constants");
const caseAccess_middleware_1 = require("../middleware/caseAccess.middleware"); // Manter para rotas de modificação
const router = (0, express_1.Router)();
// FUNÇÃO UTILITÁRIA: Limpeza de strings SQL
const cleanSqlString = (sql) => sql.replace(/\s+/g, ' ').trim();
exports.cleanSqlString = cleanSqlString;
// =======================================================================
// FUNÇÃO DE ANONIMIZAÇÃO DE DADOS (Mantida)
// =======================================================================
function anonimizarDadosSeNecessario(user, data) {
    const isVigilancia = user.role === 'vigilancia';
    if (!isVigilancia || !data)
        return data;
    const anonimizarCaso = (caso) => {
        const deveAnonimizar = caso.unit_id === constants_1.UNIT_ID_CREAS;
        if (!deveAnonimizar)
            return caso;
        const casoAnonimizado = { ...caso };
        const casoId = casoAnonimizado.id || 'XXX';
        casoAnonimizado.nome = `[DADO SIGILOSO - ID: ${casoId}]`;
        delete casoAnonimizado.cpf;
        delete casoAnonimizado.nis;
        if (casoAnonimizado.dados_completos) {
            casoAnonimizado.dados_completos.nome = `[DADO SIGILOSO - ID: ${casoId}]`;
            delete casoAnonimizado.dados_completos.cpf;
            delete casoAnonimizado.dados_completos.nis;
        }
        return casoAnonimizado;
    };
    return Array.isArray(data) ? data.map(anonimizarCaso) : anonimizarCaso(data);
}
// =======================================================================
// MIDDLEWARES GERAIS DE SEGURANÇA
// =======================================================================
router.use(auth_1.authMiddleware, (0, unitAccess_middleware_1.unitAccessMiddleware)('casos', 'unit_id'));
// =======================================================================
// ROTA POST /casos - CRIAR NOVO CASO (CORRIGIDO: Inserção de dados_completos)
// =======================================================================
router.post("/", async (req, res) => {
    // ⭐️ CORREÇÃO CRÍTICA: Desestruturação para separar COLUNAS SQL e o JSONB
    const { nome, dataCad, tecRef, status, unit_id, 
    // Captura todos os outros campos (incluindo tipoViolencia) para o JSONB
    ...dados_completos_payload } = req.body;
    // Campos SQL (com fallback)
    const nomeToUse = nome || null;
    const tecRefToUse = tecRef || null;
    const unitIdToUse = unit_id || req.user.unit_id || null; // Garante o unit_id do usuário logado
    const statusToUse = status || 'Ativo'; // Padrão 'Ativo' para novos casos
    const dataCadToUse = dataCad || new Date().toISOString().split('T')[0];
    // O objeto JSONB é o payload restante (agora com tipoViolencia, etc.)
    const dadosCompletosJSON = JSON.stringify(dados_completos_payload);
    const userId = req.user.id;
    const username = req.user.username;
    try {
        const insertQuery = (0, exports.cleanSqlString)(`
            INSERT INTO casos (nome, "dataCad", "tecRef", status, unit_id, "userId", dados_completos)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `);
        const result = await db_1.default.query(insertQuery, [
            nomeToUse,
            dataCadToUse,
            tecRefToUse,
            statusToUse,
            unitIdToUse,
            userId,
            dadosCompletosJSON
        ]);
        const novoCaso = result.rows[0];
        await (0, logger_1.logAction)({ userId, username, action: 'CREATE_CASE', details: { casoId: novoCaso.id } });
        res.status(201).json(novoCaso);
    }
    catch (err) {
        console.error("Erro ao criar caso:", err.message);
        res.status(500).json({ message: "Erro ao criar caso." });
    }
});
// =======================================================================
// ROTA GET /casos - LISTAR CASOS (CORREÇÃO DE TIPAGEM E BPC)
// =======================================================================
router.get("/", async (req, res) => {
    const user = req.user;
    const accessFilter = req.accessFilter;
    // Desestruturação da Query
    const { q, tecRef, filtro, valor, status = 'Ativo', confirmedViolence, socioeducacao, mes } = req.query;
    try {
        let query = `
      SELECT id, "dataCad", "tecRef", nome, status,
             dados_completos->>'bairro' AS bairro,
             dados_completos->>'confirmacaoViolencia' AS "confirmacaoViolencia",
             dados_completos->>'membroSocioeducacao' AS "membroSocioeducacao",
             unit_id
      FROM casos
    `;
        const params = [];
        const whereClauses = [];
        // helper: adiciona param e retorna placeholder $n
        const addParam = (val) => {
            params.push(val);
            return `$${params.length}`;
        };
        // 1. FILTROS STATUS E MÊS
        if (status && status !== 'todos') {
            const ph = addParam(status);
            whereClauses.push(`status = ${ph}::VARCHAR`);
        }
        if (mes) {
            const ph = addParam(mes);
            whereClauses.push(`TO_CHAR("dataCad", 'YYYY-MM') = ${ph}::VARCHAR`);
        }
        // 2. FILTRO DE BUSCA (geral ou por tecRef/filtro)
        const searchTerm = valor && filtro === 'q' ? valor : tecRef;
        if (searchTerm) {
            const wild = `%${searchTerm}%`;
            const p1 = addParam(wild);
            const p2 = addParam(wild);
            const p3 = addParam(wild);
            const p4 = addParam(wild);
            whereClauses.push((0, exports.cleanSqlString)(`
          (nome ILIKE ${p1} OR
           "tecRef" ILIKE ${p2} OR
           dados_completos->>'nis' ILIKE ${p3} OR
           dados_completos->>'cpf' ILIKE ${p4})
        `));
        }
        // ⭐️ TRATAMENTO ROBUSTO PARA FILTROS DE CARD/GRÁFICO
        else if (filtro && valor && filtro !== 'q') {
            const jsonKey = filtro;
            const phValor = addParam(valor);
            if (jsonKey === 'por_bairro') {
                // Lógica de Bairro (busca exata)
                whereClauses.push(`LOWER(dados_completos->>'bairro') = LOWER(${phValor}::TEXT)`);
            }
            else if (jsonKey === 'por_violencia') {
                // Lógica de Tipo de Violência (busca parcial - ILIKE)
                whereClauses.push(`dados_completos->>'tipoViolencia' ILIKE ${phValor}`);
            }
            else if (jsonKey === 'por_faixa_etaria') {
                // Lógica de Faixa Etária (filtro complexo no frontend, tratamento especial no backend)
                whereClauses.push((0, exports.cleanSqlString)(`
              CASE 
                  WHEN (dados_completos->>'idade')::integer BETWEEN 0 AND 11 THEN 'Criança (0-11)' 
                  WHEN (dados_completos->>'idade')::integer BETWEEN 12 AND 17 THEN 'Adolescente (12-17)' 
                  WHEN (dados_completos->>'idade')::integer BETWEEN 18 AND 29 THEN 'Jovem (18-29)' 
                  WHEN (dados_completos->>'idade')::integer BETWEEN 30 AND 59 THEN 'Adulto (30-59)' 
                  WHEN (dados_completos->>'idade')::integer >= 60 THEN 'Idoso (60+)' 
                  ELSE 'Não informado' 
              END = ${phValor}::TEXT
          `));
            }
            // ⭐️ CORREÇÃO FINAL BPC: Trata o filtro do card BPC (Listagem)
            else if (jsonKey === 'recebeBPC') {
                // O modal BPC deve listar todos os casos que se qualificam (Idoso OU PCD)
                whereClauses.push(`(dados_completos->>'recebeBPC' = 'Idoso' OR dados_completos->>'recebeBPC' = 'PCD')`);
                // 🛑 AÇÃO CRÍTICA: Remove o parâmetro 'valor' que estava contaminando o array
                params.pop();
            }
            else {
                // Lógica Genérica (Violência Confirmada, Sexo, etc.)
                whereClauses.push(`dados_completos->>'${jsonKey}' = ${phValor}::TEXT`);
            }
        }
        // 3. FILTROS DE COERÊNCIA (Apenas mantidos por compatibilidade)
        if (confirmedViolence === 'true')
            whereClauses.push(`(dados_completos->>'confirmacaoViolencia')::TEXT = 'Confirmada'`);
        if (socioeducacao === 'true')
            whereClauses.push(`(dados_completos->>'membroSocioeducacao')::TEXT = 'Sim'`);
        // 4. FILTRO DE ACESSO POR UNIDADE (Visibilidade restaurada e Estabilidade)
        if (accessFilter.whereClause !== 'TRUE') {
            // cria placeholders sequenciais e adiciona os valores aos params com addParam
            const unitPlaceholders = accessFilter.params.map((p) => `${addParam(p)}::INTEGER`);
            let unitWhere = accessFilter.whereClause;
            // substitui tokens $X e $Y (se existirem) pelos placeholders gerados
            if (unitPlaceholders[0])
                unitWhere = unitWhere.replace(/\$X/g, unitPlaceholders[0]);
            if (unitPlaceholders[1])
                unitWhere = unitWhere.replace(/\$Y/g, unitPlaceholders[1]);
            // ⭐️ REAPLICAÇÃO DA CORREÇÃO DE VISIBILIDADE: Inclui casos sem unit_id (Gestor Principal)
            unitWhere = `(${unitWhere} OR casos.unit_id IS NULL)`;
            whereClauses.push(unitWhere);
        }
        // Montagem final da query
        if (whereClauses.length > 0)
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        query += ` ORDER BY "dataCad" DESC`;
        // Debug: verifique se placeholders e params estão sincronizados
        console.log("DEBUG: FINAL QUERY:", (0, exports.cleanSqlString)(query));
        console.log("DEBUG: FINAL PARAMS:", params);
        // Execução
        const result = await db_1.default.query((0, exports.cleanSqlString)(query), params);
        const dadosProcessados = anonimizarDadosSeNecessario(user, result.rows);
        res.json(dadosProcessados);
    }
    catch (err) {
        console.error("Erro ao listar casos:", err.message);
        res.status(500).json({ message: "Erro ao buscar casos." });
    }
});
// =======================================================================
// ROTA PUT /casos/:id - ATUALIZAR CASO (Mantém segurança de modificação)
// =======================================================================
router.put("/:id", (0, caseAccess_middleware_1.checkCaseAccess)('params', 'id'), async (req, res) => {
    const { id } = req.params;
    const novosDados = req.body;
    const { id: userId, username } = req.user;
    try {
        const resultAtual = await db_1.default.query((0, exports.cleanSqlString)('SELECT dados_completos, "dataCad", "tecRef", nome FROM casos WHERE id = $1'), [id]);
        if (resultAtual.rowCount === 0)
            return res.status(404).json({ message: "Caso não encontrado." });
        const dadosExistentes = resultAtual.rows[0];
        const dadosMesclados = {
            ...dadosExistentes.dados_completos,
            ...novosDados
        };
        // ⭐️ CORREÇÃO CRÍTICA: Mesclagem de dados
        const dataCad = novosDados.dataCad || dadosExistentes.dataCad;
        const tecRef = novosDados.tecRef || dadosExistentes.tecRef;
        const nome = novosDados.nome || dadosExistentes.nome || null;
        await db_1.default.query((0, exports.cleanSqlString)(`UPDATE casos SET "dataCad" = $1, "tecRef" = $2, nome = $3, dados_completos = $4 WHERE id = $5`), [dataCad, tecRef, nome, JSON.stringify(dadosMesclados), id]);
        await (0, logger_1.logAction)({ userId, username, action: 'UPDATE_CASE', details: { casoId: id } });
        res.status(200).json({ message: "Prontuário atualizado com sucesso!", caso: dadosMesclados });
    }
    catch (err) {
        console.error(`Erro ao atualizar caso ${id}:`, err.message);
        res.status(500).json({ message: "Erro interno ao atualizar o prontuário." });
    }
});
// =======================================================================
// PATCH /casos/:id/status (Mantém segurança de modificação)
// =======================================================================
router.patch("/:id/status", (0, caseAccess_middleware_1.checkCaseAccess)('params', 'id'), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const { id: userId, username } = req.user;
    if (!status || !['Ativo', 'Desligado', 'Arquivado'].includes(status)) {
        return res.status(400).json({ message: "Status inválido. Valores permitidos: Ativo, Desligado, Arquivado." });
    }
    try {
        const result = await db_1.default.query((0, exports.cleanSqlString)('UPDATE casos SET status = $1 WHERE id = $2 RETURNING nome'), [status, id]);
        if (result.rowCount === 0)
            return res.status(404).json({ message: 'Caso não encontrado.' });
        await (0, logger_1.logAction)({ userId, username, action: 'UPDATE_CASE_STATUS', details: { casoId: id, nomeVitima: result.rows[0].nome, novoStatus: status } });
        res.status(200).json({ message: `Caso ${id} atualizado para '${status}' com sucesso.` });
    }
    catch (err) {
        console.error(`Erro ao atualizar status do caso ${id}:`, err.message);
        res.status(500).json({ message: "Erro interno ao atualizar o status do caso." });
    }
});
// =======================================================================
// DELETE /casos/:id (Mantém segurança de modificação)
// =======================================================================
router.delete("/:id", (0, caseAccess_middleware_1.checkCaseAccess)('params', 'id'), async (req, res) => {
    const { id } = req.params;
    const { id: userId, username } = req.user;
    try {
        const result = await db_1.default.query((0, exports.cleanSqlString)('DELETE FROM casos WHERE id = $1 RETURNING nome'), [id]);
        if (result.rowCount === 0)
            return res.status(404).json({ message: 'Caso não encontrado.' });
        await (0, logger_1.logAction)({ userId, username, action: 'DELETE_CASE', details: { casoId: id, nomeVitima: result.rows[0].nome } });
        res.status(200).json({ message: 'Caso excluído com sucesso.' });
    }
    catch (err) {
        console.error("Erro ao excluir caso:", err.message);
        res.status(500).json({ message: "Erro ao excluir caso." });
    }
});
// =======================================================================
// GET /casos/:id - DETALHES DO CASO (Segurança Reintroduzida)
// =======================================================================
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const accessFilter = req.accessFilter; // Cláusula de filtro de unidade
    // 1. Resolvendo a Cláusula WHERE de Acesso
    const unitParams = [id]; // ID do Caso é o $1
    let unitWhere = accessFilter.whereClause;
    if (accessFilter.params.length === 1) {
        unitWhere = unitWhere.replace('$X', `$${unitParams.length + 1}`);
        unitParams.push(accessFilter.params[0]);
    }
    else if (accessFilter.params.length === 2) {
        unitWhere = unitWhere.replace('$X', `$${unitParams.length + 1}`).replace('$Y', `$${unitParams.length + 2}`);
        unitParams.push(accessFilter.params[0], accessFilter.params[1]);
    }
    // 2. Montando a Query Segura
    // ⭐️ Adiciona OR casos.unit_id IS NULL para Gestor Principal
    const finalUnitWhere = accessFilter.whereClause === 'TRUE' ? 'TRUE' : `(${unitWhere} OR casos.unit_id IS NULL)`;
    const checkQuery = (0, exports.cleanSqlString)(`SELECT * FROM casos WHERE id = $1 AND ${finalUnitWhere}`);
    try {
        // EXECUTA A CHECAGEM E BUSCA AO MESMO TEMPO
        const casoResult = await db_1.default.query(checkQuery, unitParams);
        if (casoResult.rowCount === 0) {
            // Se não encontrou ou não tem permissão
            return res.status(404).json({ message: "Caso não encontrado ou acesso restrito." });
        }
        const casoBase = casoResult.rows[0];
        const demandasQuery = (0, exports.cleanSqlString)(`
            SELECT id, tipo_documento, instituicao_origem, data_recebimento, status
            FROM demandas
            WHERE caso_associado_id = $1
            ORDER BY data_recebimento DESC
        `);
        const demandasResult = await db_1.default.query(demandasQuery, [id]);
        const casoCompleto = {
            ...casoBase.dados_completos,
            id: casoBase.id,
            dataCad: casoBase.dataCad,
            tecRef: casoBase.tecRef,
            nome: casoBase.nome,
            userId: casoBase.userId,
            status: casoBase.status,
            unit_id: casoBase.unit_id,
            demandasVinculadas: demandasResult.rows
        };
        const dadosProcessados = anonimizarDadosSeNecessario(user, casoCompleto);
        res.json(dadosProcessados);
    }
    catch (err) {
        console.error(`Erro ao buscar detalhes do caso ${id}:`, err.message);
        res.status(500).json({ message: "Erro ao buscar detalhes do caso." });
    }
});
// =======================================================================
// GET /casos/:casoId/encaminhamentos (Segurança Reintroduzida)
// =======================================================================
router.get("/:casoId/encaminhamentos", async (req, res) => {
    const { casoId } = req.params;
    const accessFilter = req.accessFilter; // Cláusula de filtro de unidade
    // 1. Resolve Placeholders para a checagem de acesso
    const unitParams = [casoId]; // ID do Caso é o $1
    let unitWhere = accessFilter.whereClause;
    if (accessFilter.params.length === 1) {
        unitWhere = unitWhere.replace('$X', `$${unitParams.length + 1}`);
        unitParams.push(accessFilter.params[0]);
    }
    else if (accessFilter.params.length === 2) {
        unitWhere = unitWhere.replace('$X', `$${unitParams.length + 1}`).replace('$Y', `$${unitParams.length + 2}`);
        unitParams.push(accessFilter.params[0], accessFilter.params[1]);
    }
    // 2. Query: Busca encaminhamentos APENAS se o caso pertencer à unidade
    const finalUnitWhere = accessFilter.whereClause === 'TRUE' ? 'TRUE' : `(${unitWhere.replace(/casos\./g, 'c.')} OR c.unit_id IS NULL)`;
    const checkQuery = (0, exports.cleanSqlString)(`
        SELECT enc.id, enc."servicoDestino", enc."dataEncaminhamento", enc.status,
               enc.observacoes, usr.username AS "tecRef"
        FROM encaminhamentos enc
        LEFT JOIN users usr ON enc."userId" = usr.id
        LEFT JOIN casos c ON enc."casoId" = c.id
        WHERE enc."casoId" = $1 AND ${finalUnitWhere}
        ORDER BY enc."dataEncaminhamento" DESC
    `);
    try {
        const result = await db_1.default.query(checkQuery, unitParams);
        res.json(result.rows);
    }
    catch (err) {
        console.error(`Erro ao listar encaminhamentos para o caso ${casoId}:`, err.message);
        res.status(500).json({ message: "Erro ao buscar encaminhamentos." });
    }
});
// backend/src/routes/casos.ts (Adicionar ao final)
// =======================================================================
// ROTA GET /casos/busca-rapida - BUSCA RÁPIDA PARA ASSOCIAÇÃO DE DEMANDAS
// =======================================================================
router.get("/busca-rapida", auth_1.authMiddleware, (0, unitAccess_middleware_1.unitAccessMiddleware)('casos', 'unit_id'), async (req, res) => {
    const accessFilter = req.accessFilter;
    const { q } = req.query;
    const searchTerm = q?.trim();
    if (!searchTerm || searchTerm.length < 3) {
        return res.json([]); // Retorna vazio se a busca for muito curta
    }
    try {
        const params = [];
        const addParam = (val) => {
            params.push(val);
            return `$${params.length}`;
        };
        // 1. Constrói a cláusula WHERE de busca (Nome, NIS, CPF, ID)
        const wild = `%${searchTerm}%`;
        const p1 = addParam(wild);
        const p2 = addParam(wild);
        const p3 = addParam(wild);
        // Tentativa de buscar por ID exato se o termo for numérico
        const idSearch = parseInt(searchTerm, 10);
        let idClause = '';
        if (!isNaN(idSearch)) {
            const pId = addParam(idSearch);
            idClause = ` OR id = ${pId}::INTEGER`;
        }
        const searchClause = (0, exports.cleanSqlString)(`
            (nome ILIKE ${p1} OR
             dados_completos->>'nis' ILIKE ${p2} OR
             dados_completos->>'cpf' ILIKE ${p3}
             ${idClause}
            )
        `);
        // 2. Constrói o filtro de acesso por unidade
        const [unitFilterContent, unitParams] = [accessFilter.whereClause, accessFilter.params];
        let accessParams = [...unitParams];
        // Substitui placeholders do accessFilter
        let accessWhere = unitFilterContent;
        let pIndex = params.length;
        if (unitParams.length === 1) {
            accessWhere = accessWhere.replace('$X', `$${++pIndex}`);
        }
        else if (unitParams.length === 2) {
            accessWhere = accessWhere.replace('$X', `$${++pIndex}`).replace('$Y', `$${++pIndex}`);
        }
        params.push(...accessParams);
        // 3. Montagem final da query (combinando busca, status Ativo e segurança)
        const query = (0, exports.cleanSqlString)(`
            SELECT id, nome, "tecRef", dados_completos->>'nis' AS nis, dados_completos->>'cpf' AS cpf
            FROM casos
            WHERE status = 'Ativo' 
              AND (${searchClause})
              AND (${accessWhere})
            ORDER BY nome ASC
            LIMIT 10
        `);
        const result = await db_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (err) {
        console.error("Erro na busca rápida de casos:", err.message);
        res.status(500).json({ message: "Erro na busca rápida de casos." });
    }
});
exports.default = router;
