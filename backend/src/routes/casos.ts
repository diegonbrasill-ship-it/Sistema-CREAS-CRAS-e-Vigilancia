// backend/src/routes/casos.ts 

import { Router, Request, Response } from "express";
import pool from "../db";
import { authMiddleware } from "../middleware/auth";
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware";
import { logAction } from "../services/logger";
import { UNIT_ID_CREAS, UNIT_ID_VIGILANCIA } from "../utils/constants";
import { checkCaseAccess } from "../middleware/caseAccess.middleware"; 

const router = Router();

// ⭐️ CONSTANTES DO BACKEND ⭐️
const CREAS_UNIT_ID = 1;
const CRAS_UNIT_IDS = [2, 3, 4, 5]; // IDs das unidades CRAS
const VIGILANCIA_ROLE = 'vigilancia';

// FUNÇÃO UTILITÁRIA: Limpeza de strings SQL
export const cleanSqlString = (sql: string): string => sql.replace(/\s+/g, ' ').trim();

// =======================================================================
// FUNÇÃO DE ANONIMIZAÇÃO DE DADOS (Mantida)
// =======================================================================
export function anonimizarDadosSeNecessario(
  user: { id: number; role: string; unit_id: number | null },
  data: any
): any {
  const isVigilancia = user.role === 'vigilancia';
  if (!isVigilancia || !data) return data;

  const anonimizarCaso = (caso: any) => {
    const deveAnonimizar = caso.unit_id === UNIT_ID_CREAS;
    if (!deveAnonimizar) return caso;

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
router.use(authMiddleware, unitAccessMiddleware('casos', 'unit_id'));

// =======================================================================
// ROTA POST /casos - CRIAR NOVO CASO (CORREÇÃO DEFINITIVA DE PERSISTÊNCIA - Risco C)
// =======================================================================
router.post("/", async (req: Request, res: Response) => {
    
    const { 
        nome, 
        dataCad, 
        tecRef, 
        status, 
        unit_id,
    } = req.body;

    // 🛑 CORREÇÃO 1: Mapeamento EXPLICITO e Conversão de "" para NULL (Risco C)
    // Garante que campos vazios não sejam descartados pelo Node/Express/JSONB
    const dados_completos_cleaned: any = {};
    
    // Lista abrangente de campos que devem ser convertidos de "" para null
    const jsonbKeys = [
        'nis', 'idade', 'sexo', 'corEtnia', 'primeiraInfSuas', 
        'bairro', 'rua', 'pontoReferencia', 'contato',
        'recebePropPai', 'recebePAA', 'recebeBPC', 'recebeHabitacaoSocial',
        'escolaridade', 'rendaFamiliar', 
        // Adicionando campos críticos que podem ser perdidos (ex: CPF, que deve ser JSONB)
        'cpf' 
    ];
    // Inclui todos os demais campos passados no body que não são campos SQL raiz (nome, tecRef, etc.)
    const allJsonbKeys = Object.keys(req.body).filter(key => 
        !['nome', 'dataCad', 'tecRef', 'status', 'unit_id'].includes(key)
    );
    // Unifica a lista (garantindo que não haja duplicatas e que todos os campos JSONB sejam verificados)
    const finalJsonbKeys = Array.from(new Set([...jsonbKeys, ...allJsonbKeys]));


    finalJsonbKeys.forEach(key => {
        const rawValue = req.body[key];
        // Converte string vazia ("") ou undefined/null em null
        const cleanedValue = (rawValue === "" || rawValue === undefined || rawValue === null) ? null : rawValue;
            
        // Armazena apenas se o valor for preenchido OU se for um dos campos explicitamente listados para forçar o 'null'
        if (cleanedValue !== null || jsonbKeys.includes(key)) {
          dados_completos_cleaned[key] = cleanedValue;
        }
    });
    
    const dadosCompletosJSON = JSON.stringify(dados_completos_cleaned);
    // 🛑 FIM DA CORREÇÃO DE PERSISTÊNCIA 🛑

    const nomeToUse = nome || null;
    const tecRefToUse = tecRef || null;
    // Se não for fornecido no body, usa o unit_id do usuário logado (padrão seguro)
    const unitIdToUse = unit_id || req.user!.unit_id || null; 
    const statusToUse = status || 'Ativo';
    const dataCadToUse = dataCad || new Date().toISOString().split('T')[0];

    const userId = req.user!.id;
    const username = req.user!.username;

    try {
        const insertQuery = cleanSqlString(`
            INSERT INTO casos (nome, "dataCad", "tecRef", status, unit_id, "userId", dados_completos)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `);

        const result = await pool.query(insertQuery, [
            nomeToUse, 
            dataCadToUse, 
            tecRefToUse, 
            statusToUse, 
            unitIdToUse, 
            userId, 
            dadosCompletosJSON
        ]);

        const casoBase = result.rows[0];
        
        // Mescla os dados JSONB para que o Frontend veja todos os campos no objeto raiz
        const casoMesclado = {
            ...casoBase.dados_completos,
            id: casoBase.id,
            dataCad: casoBase.dataCad,
            tecRef: casoBase.tecRef,
            nome: casoBase.nome,
            status: casoBase.status,
            unit_id: casoBase.unit_id,
        };


        await logAction({ userId, username, action: 'CREATE_CASE', details: { casoId: casoBase.id } });
        
        // Retorna o objeto mesclado!
        res.status(201).json(casoMesclado);
        
    } catch (err: any) {
        console.error("Erro ao criar caso:", err.message);
        res.status(500).json({ message: "Erro ao criar caso." });
    }
});

// =======================================================================
// ROTA GET /casos - LISTAR CASOS (CORREÇÃO DE SEGREGACÃO CRÍTICA - Risco A/B)
// =======================================================================
router.get("/", async (req: Request, res: Response) => {
  const user = req.user!;
  // 🛑 MUDANÇA CRÍTICA: Usando o novo objeto 'access' 🛑
  const access = req.access!;
  
  // Desestruturação da Query
  const { 
    q, tecRef, filtro, valor, status = 'Ativo', 
    confirmedViolence, socioeducacao, mes 
} = req.query as any;

    // 🛑 FLUXO DE PARÂMETROS: Começa em $1. 🛑
    let params: any[] = [];
    const whereClauses: string[] = [];

    const addParam = (val: any) => {
        params.push(val);
        return `$${params.length}`; 
    };
    // 🛑 FIM DO FLUXO DE PARÂMETROS 🛑

  // ⭐️ INÍCIO DA CORREÇÃO DE VISIBILIDADE E FILTROS ⭐️
  const isVigilancia = access.isVigilancia; 
  const isGestorGeral = access.isGestorGeral; 
  const userUnitId = access.userUnitId;

  try {
    let query = `
      SELECT id, "dataCad", "tecRef", nome, status,
             dados_completos->>'bairro' AS bairro,
             dados_completos->>'confirmacaoViolencia' AS "confirmacaoViolencia",
             dados_completos->>'membroSocioeducacao' AS "membroSocioeducacao",
             unit_id
      FROM casos
    `;

      
      // 1. FILTROS DE PESQUISA GERAL (q, tecRef)
      const searchTarget = q || tecRef;
      if (searchTarget) {
        const wild = `%${searchTarget}%`;
        const p1 = addParam(wild);
        const p2 = addParam(wild);
        const p3 = addParam(wild);
        const p4 = addParam(wild);

        whereClauses.push(cleanSqlString(`
          (nome ILIKE ${p1} OR
           "tecRef" ILIKE ${p2} OR
           dados_completos->>'nis' ILIKE ${p3} OR
           dados_completos->>'cpf' ILIKE ${p4})
        `));
      } 
      // 2. FILTROS DE DRILL-DOWN (Filtro/Valor)
      else if (filtro && valor) {
          // Lógica de filtro (mantida, pois está correta no contexto de query)
          const jsonKey = filtro;
          
          if (jsonKey === 'por_faixa_etaria') { 
            const phValor = addParam(valor);
            const rangeClause = cleanSqlString(`
                (CASE 
                    WHEN (dados_completos->>'idade')::integer BETWEEN 0 AND 11 THEN 'Criança (0-11)' 
                    WHEN (dados_completos->>'idade')::integer BETWEEN 12 AND 17 THEN 'Adolescente (12-17)' 
                    WHEN (dados_completos->>'idade')::integer BETWEEN 18 AND 29 THEN 'Jovem (18-29)' 
                    WHEN (dados_completos->>'idade')::integer BETWEEN 30 AND 59 THEN 'Adulto (30-59)' 
                    WHEN (dados_completos->>'idade')::integer >= 60 THEN 'Idoso (60+)' 
                    ELSE 'Não informado' 
                END = ${phValor})
            `);
            whereClauses.push(rangeClause);
          } else if (jsonKey === 'recebeBPC') {
              whereClauses.push(`(dados_completos->>'${jsonKey}' = 'Idoso' OR dados_completos->>'${jsonKey}' = 'PCD')`);
          } else if (jsonKey === 'por_violencia') {
              const targetKey = 'tipoViolencia'; 
              const phValor = addParam(valor);
              whereClauses.push(cleanSqlString(`LOWER(TRIM(dados_completos->>'${targetKey}')) ILIKE '%' || LOWER(${phValor}::TEXT) || '%'`));
          } else if (jsonKey === 'por_bairro' || jsonKey === 'por_canal') {
              const targetKey = jsonKey.replace('por_', '');
              if (valor.toLowerCase().includes('não informado') || valor.toLowerCase() === 'n/i') {
                whereClauses.push(`(dados_completos->>'${targetKey}' IS NULL OR TRIM(dados_completos->>'${targetKey}') = '')`);
              } else {
                const phValor = addParam(valor);
                whereClauses.push(`LOWER(TRIM(dados_completos->>'${targetKey}')) = LOWER(${phValor}::TEXT)`);
              }
          } else {
              const phValor = addParam(valor);
            whereClauses.push(`dados_completos->>'${jsonKey}' = ${phValor}::TEXT`);
          }
      }
      // 3. FILTROS BÁSICOS (status, confirmedViolence, socioeducacao)
      if (status && status !== 'todos') {
        const ph = addParam(status);
        whereClauses.push(`status = ${ph}::VARCHAR`);
      }
      if (confirmedViolence === 'true') whereClauses.push(`(dados_completos->>'confirmacaoViolencia')::TEXT = 'Confirmada'`);
      if (socioeducacao === 'true') whereClauses.push(`(dados_completos->>'membroSocioeducacao')::TEXT = 'Sim'`);

      // 🛑 4. FILTRO DE ACESSO POR UNIDADE (SEGURANÇA PADRÃO - NOVO MODELO) 🛑
      let unitAccessClause = '';
      
      if (isVigilancia || isGestorGeral) {
          // Gestor Geral e Vigilância veem CREAS (1) e CRAS (2-5) E NULLs
          // Se o user.unit_id for nulo, ele vê tudo (Gestor Geral)
          const allUnits = [CREAS_UNIT_ID, ...CRAS_UNIT_IDS];
          const placeholders = allUnits.map(unitId => addParam(unitId)).join(', ');
          unitAccessClause = `(casos.unit_id IN (${placeholders}) OR casos.unit_id IS NULL)`;
      
      } else if (userUnitId !== null && userUnitId !== undefined) {
          // Servidor CREAS/CRAS: Só vê a própria unidade e casos sem lotação
          const userUnitParam = addParam(userUnitId);
          unitAccessClause = `(casos.unit_id = ${userUnitParam} OR casos.unit_id IS NULL)`;
      }
      // Nota: A regra do BI (unit_id = 1 OR NULL) é exclusiva das rotas dashboard/vigilancia.
      // A rota /casos deve mostrar a visão do usuário.

      if (unitAccessClause) {
        whereClauses.push(unitAccessClause);
      }


      // Montagem final da query
      if (whereClauses.length > 0) query += ` WHERE ${whereClauses.join(' AND ')}`;
      query += ` ORDER BY "dataCad" DESC`;

      // Execução
      const result = await pool.query(cleanSqlString(query), params);
      const dadosProcessados = anonimizarDadosSeNecessario(user, result.rows);
      res.json(dadosProcessados);

    } catch (err: any) {
      console.error("Erro ao listar casos:", err.message);
      res.status(500).json({ message: "Erro ao buscar casos." });
    }
});

// =======================================================================
// ROTA PUT /casos/:id - ATUALIZAR CASO (Mantém segurança de modificação)
// =======================================================================
// Não requer refatoração de acesso, pois usa checkCaseAccess, que é um middleware customizado
router.put("/:id", checkCaseAccess('params', 'id'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const novosDados = req.body;
  const { id: userId, username } = req.user!;

  try {
    const resultAtual = await pool.query(cleanSqlString('SELECT dados_completos, "dataCad", "tecRef", nome, status FROM casos WHERE id = $1'), [id]);
    if (resultAtual.rowCount === 0) return res.status(404).json({ message: "Caso não encontrado." });

    const dadosExistentes = resultAtual.rows[0];
    
    const dadosMesclados = { 
        ...dadosExistentes.dados_completos, 
        ...novosDados 
    };
    
    // CORREÇÃO: Mesclagem de dados e conversão de vazios para null para persistência JSONB
    const dadosCompletosJSON = JSON.stringify(dadosMesclados, (key, value) => {
        // Se for string vazia, retorna null para o JSONB
        return value === "" ? null : value;
    });
    
    const dataCad = novosDados.dataCad || dadosExistentes.dataCad; 
    const tecRef = novosDados.tecRef || dadosExistentes.tecRef;
    const nome = novosDados.nome || dadosExistentes.nome || null;
    const status = novosDados.status || dadosExistentes.status || 'Ativo';


    await pool.query(
      cleanSqlString(`UPDATE casos SET "dataCad" = $1, "tecRef" = $2, nome = $3, status = $4, dados_completos = $5 WHERE id = $6`),
      [dataCad, tecRef, nome, status, dadosCompletosJSON, id]
    );

    await logAction({ userId, username, action: 'UPDATE_CASE', details: { casoId: id } });
    res.status(200).json({ message: "Prontuário atualizado com sucesso!", caso: dadosMesclados });
  } catch (err: any) {
    console.error(`Erro ao atualizar caso ${id}:`, err.message);
    res.status(500).json({ message: "Erro interno ao atualizar o prontuário." });
  }
});

// =======================================================================
// PATCH /casos/:id/status (Mantém segurança de modificação)
// =======================================================================
// Não requer refatoração de acesso, pois usa checkCaseAccess
router.patch("/:id/status", checkCaseAccess('params', 'id'), async (req: Request, res: Response) => {
  // ... código inalterado ...
  const { id } = req.params;
  const { status } = req.body;
  const { id: userId, username } = req.user!;
  if (!status || !['Ativo', 'Desligado', 'Arquivado'].includes(status)) {
    return res.status(400).json({ message: "Status inválido. Valores permitidos: Ativo, Desligado, Arquivado." });
  }
  try {
    const result = await pool.query(cleanSqlString('UPDATE casos SET status = $1 WHERE id = $2 RETURNING nome'), [status, id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Caso não encontrado.' });

    await logAction({ userId, username, action: 'UPDATE_CASE_STATUS', details: { casoId: id, nomeVitima: result.rows[0].nome, novoStatus: status } });
    res.status(200).json({ message: `Caso ${id} atualizado para '${status}' com sucesso.` });
  } catch (err: any) {
    console.error(`Erro ao atualizar status do caso ${id}:`, err.message);
    res.status(500).json({ message: "Erro interno ao atualizar o status do caso." });
  }
});

// =======================================================================
// DELETE /casos/:id (Mantém segurança de modificação)
// =======================================================================
// Não requer refatoração de acesso, pois usa checkCaseAccess
router.delete("/:id", checkCaseAccess('params', 'id'), async (req: Request, res: Response) => {
  // ... código inalterado ...
  const { id } = req.params;
  const { id: userId, username } = req.user!;
  try {
    const result = await pool.query(cleanSqlString('DELETE FROM casos WHERE id = $1 RETURNING nome'), [id]);

    if (result.rowCount === 0) return res.status(404).json({ message: 'Caso não encontrado.' });

    await logAction({ userId, username, action: 'DELETE_CASE', details: { casoId: id, nomeVitima: result.rows[0].nome } });
    res.status(200).json({ message: 'Caso excluído com sucesso.' });
  } catch (err: any) {
    console.error("Erro ao excluir caso:", err.message);
    res.status(500).json({ message: "Erro ao excluir caso." });
  }
});

// =======================================================================
// GET /casos/:id - DETALHES DO CASO (CORREÇÃO DE SEGURANÇA - Risco A)
// =======================================================================
router.get("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user!;
    // 🛑 MUDANÇA CRÍTICA: Usando o novo objeto 'access' 🛑
    const access = req.access!; 

    try {
        // 1. Montagem da Cláusula WHERE de Acesso (Segura)
        const unitParams: (string | number)[] = [id]; // ID do Caso é o $1
        let accessClause = `id = $1`;
        
        const addParam = (val: any) => {
            unitParams.push(val);
            return `$${unitParams.length}`; 
        };
        
        let unitFilter = '';
        if (access.isGestorGeral || access.isVigilancia) {
            // Gestor/Vigilância pode ver todos os casos do CREAS/CRAS e NULL
            const allUnits = [CREAS_UNIT_ID, ...CRAS_UNIT_IDS];
            const placeholders = allUnits.map(unitId => addParam(unitId)).join(', ');
            unitFilter = `(unit_id IN (${placeholders}) OR unit_id IS NULL)`;
        } else if (access.userUnitId !== null && access.userUnitId !== undefined) {
            // Servidor CREAS/CRAS: Só vê a própria unidade e casos sem lotação
            const userUnitParam = addParam(access.userUnitId);
            unitFilter = `(unit_id = ${userUnitParam} OR unit_id IS NULL)`;
        }

        if (unitFilter) {
          accessClause += ` AND ${unitFilter}`;
        }
    
        const checkQuery = cleanSqlString(`SELECT * FROM casos WHERE ${accessClause}`);

        // 2. EXECUTA A CHECAGEM E BUSCA AO MESMO TEMPO
        const casoResult = await pool.query(checkQuery, unitParams);
        
        if (casoResult.rowCount === 0) {
            return res.status(404).json({ message: "Caso não encontrado ou acesso restrito." });
        }

        const casoBase = casoResult.rows[0];

        const demandasQuery = cleanSqlString(`
            SELECT id, tipo_documento, instituicao_origem, data_recebimento, status
            FROM demandas
            WHERE caso_associado_id = $1
            ORDER BY data_recebimento DESC
        `);
        const demandasResult = await pool.query(demandasQuery, [id]);

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
    } catch (err: any) {
        console.error(`Erro ao buscar detalhes do caso ${id}:`, err.message);
        res.status(500).json({ message: "Erro ao buscar detalhes do caso." });
    }
});

// =======================================================================
// GET /casos/:casoId/encaminhamentos (CORREÇÃO DE SEGURANÇA - Risco A)
// =======================================================================
router.get("/:casoId/encaminhamentos", async (req: Request, res: Response) => {
  const { casoId } = req.params;
  // 🛑 MUDANÇA CRÍTICA: Usando o novo objeto 'access' 🛑
  const access = req.access!; 

    // 1. Montagem da Cláusula WHERE de Acesso para o CASO (Segura)
    const unitParams: (string | number)[] = [casoId]; // ID do Caso é o $1
    let unitFilter = '';
    
    const addParam = (val: any) => {
        unitParams.push(val);
        return `$${unitParams.length}`; 
    };
    
    if (access.isGestorGeral || access.isVigilancia) {
        const allUnits = [CREAS_UNIT_ID, ...CRAS_UNIT_IDS];
        const placeholders = allUnits.map(unitId => addParam(unitId)).join(', ');
        unitFilter = `(c.unit_id IN (${placeholders}) OR c.unit_id IS NULL)`;
    } else if (access.userUnitId !== null && access.userUnitId !== undefined) {
        const userUnitParam = addParam(access.userUnitId);
        unitFilter = `(c.unit_id = ${userUnitParam} OR c.unit_id IS NULL)`;
    }

    // 2. Query: Busca encaminhamentos APENAS se o caso pertencer à unidade
    // (enc.casoId = $1) AND (unitFilter)
    const whereClause = unitFilter ? ` AND ${unitFilter}` : '';


    const checkQuery = cleanSqlString(`
        SELECT enc.id, enc."servicoDestino", enc."dataEncaminhamento", enc.status,
               enc.observacoes, usr.username AS "tecRef"
        FROM encaminhamentos enc
        LEFT JOIN users usr ON enc."userId" = usr.id
        LEFT JOIN casos c ON enc."casoId" = c.id
        WHERE enc."casoId" = $1 ${whereClause}
        ORDER BY enc."dataEncaminhamento" DESC
    `);

  try {
    const result = await pool.query(checkQuery, unitParams);
    res.json(result.rows);
  } catch (err: any) {
    console.error(`Erro ao listar encaminhamentos para o caso ${casoId}:`, err.message);
    res.status(500).json({ message: "Erro ao buscar encaminhamentos." });
  }
});

// =======================================================================
// ROTA GET /casos/busca-rapida - BUSCA RÁPIDA PARA ASSOCIAÇÃO DE DEMANDAS (CORREÇÃO DE SEGURANÇA - Risco A)
// =======================================================================
router.get("/busca-rapida", async (req: Request, res: Response) => {
    // 🛑 MUDANÇA CRÍTICA: Usando o novo objeto 'access' 🛑
    const access = req.access!;
    const { q } = req.query as { q?: string };
    const searchTerm = q?.trim();

    if (!searchTerm || searchTerm.length < 3) {
        return res.json([]); // Retorna vazio se a busca for muito curta
    }

    try {
        const params: any[] = [];
        const addParam = (val: any) => {
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
        
        const searchClause = cleanSqlString(`
            (nome ILIKE ${p1} OR
             dados_completos->>'nis' ILIKE ${p2} OR
             dados_completos->>'cpf' ILIKE ${p3}
             ${idClause}
            )
        `);
        
        // 2. Constrói o filtro de acesso por unidade (Segura)
        let unitFilter = '';
        
        if (access.isGestorGeral || access.isVigilancia) {
            const allUnits = [CREAS_UNIT_ID, ...CRAS_UNIT_IDS];
            const placeholders = allUnits.map(unitId => addParam(unitId)).join(', ');
            unitFilter = `(unit_id IN (${placeholders}) OR unit_id IS NULL)`;
        } else if (access.userUnitId !== null && access.userUnitId !== undefined) {
            const userUnitParam = addParam(access.userUnitId);
            unitFilter = `(unit_id = ${userUnitParam} OR unit_id IS NULL)`;
        }
        
        const unitAccessClause = unitFilter ? `AND ${unitFilter}` : '';
        
        // 3. Montagem final da query (combinando busca, status Ativo e segurança)
        const query = cleanSqlString(`
            SELECT id, nome, "tecRef", dados_completos->>'nis' AS nis, dados_completos->>'cpf' AS cpf
            FROM casos
            WHERE status = 'Ativo' 
              AND (${searchClause})
              ${unitAccessClause}
            ORDER BY nome ASC
            LIMIT 10
        `);

        const result = await pool.query(query, params);
        
        res.json(result.rows);
    } catch (err: any) {
        console.error("Erro na busca rápida de casos:", err.message);
        res.status(500).json({ message: "Erro na busca rápida de casos." });
    }
});

export default router;

