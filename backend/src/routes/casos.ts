// backend/src/routes/casos.ts

import { Router, Request, Response } from "express";
import pool from "../db";
import { authMiddleware } from "../middleware/auth";
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware"; 
import { logAction } from "../services/logger";
import { UNIT_ID_CREAS, UNIT_ID_VIGILANCIA } from "../utils/constants";
import { checkCaseAccess } from "../middleware/caseAccess.middleware"; 

const router = Router();

// 📌 SOLUÇÃO DE LIMPEZA EXTREMA: Essencial para remover o erro 'syntax error at or near " "'
const cleanSqlString = (sql: string): string => {
    return sql.replace(/\s+/g, ' ').trim();
};

// =======================================================================
// 📌 MÓDULO CRÍTICO: REGRA DE SIGILO E ANONIMIZAÇÃO DA VIGILÂNCIA
// =======================================================================
function anonimizarDadosSeNecessario(user: { id: number; role: string; unit_id: number }, data: any): any {
    const isVigilancia = user.unit_id === UNIT_ID_VIGILANCIA;
    
    if (!isVigilancia) { return data; }

    const anonimizarCaso = (caso: any) => {
        const deveAnonimizar = caso.unit_id === UNIT_ID_CREAS; 

        if (!deveAnonimizar) {
            return caso;
        }

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
    
    if (Array.isArray(data)) {
        return data.map(anonimizarCaso);
    } else {
        return anonimizarCaso(data);
    }
}

// =======================================================================
// APLICAÇÃO GERAL DOS MIDDLEWARES DE SEGURANÇA NA ROTA
// =======================================================================
router.use(authMiddleware, unitAccessMiddleware('casos', 'unit_id')); 


// =======================================================================
// ROTA POST /casos - CRIAR CASO (Adiciona unit_id do criador)
// =======================================================================
router.post("/", async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const userUnitId = req.user!.unit_id;
    
    const casoData = req.body;
    try {
        const { dataCad, tecRef, nome = null } = casoData; 

        if (!dataCad || !tecRef) {
            return res.status(400).json({ 
                message: "Falha na validação: Os campos 'Data do Cadastro' e 'Técnico Responsável' são obrigatórios." 
            });
        }
        const dados_completos = casoData;
        
        const query = cleanSqlString(`
            INSERT INTO casos ("dataCad", "tecRef", nome, dados_completos, "userId", status, unit_id)
             VALUES ($1, $2, $3, $4, $5, 'Ativo', $6) RETURNING id
        `);
        const result = await pool.query(query, [ dataCad, tecRef, nome, JSON.stringify(dados_completos), userId, userUnitId ]);
        const novoCasoId = result.rows[0].id;
        await logAction({ userId, username: req.user!.username, action: 'CREATE_CASE', details: { casoId: novoCasoId, nomeVitima: nome, unitId: userUnitId } });
        res.status(201).json({ message: "Caso cadastrado com sucesso!", casoId: novoCasoId });
    } catch (err: any) {
        console.error("Erro ao cadastrar caso:", err.message);
        res.status(500).json({ message: "Erro interno no servidor ao cadastrar o caso." });
    }
});

// =======================================================================
// ROTA GET /casos - LISTAR CASOS (Filtro de Unidade + Busca Parcial)
// =======================================================================
router.get("/", async (req: Request, res: Response) => {
  const user = req.user!;
  const accessFilter = req.accessFilter!; 
  const { q, tecRef, filtro, valor, status = 'Ativo' } = req.query as { q?: string, tecRef?: string, filtro?: string, valor?: string, status?: string };

  try {
    let query = 'SELECT id, "dataCad", "tecRef", nome, status, dados_completos->>\'bairro\' as bairro, unit_id FROM casos'; 
    const params: (string | number)[] = [];
    let whereClauses: string[] = [];
    
    // 1. TRATAMENTO DE FILTROS BÁSICOS (Status)
    if (status && status !== 'todos') {
        params.push(status);
        whereClauses.push(`status = $${params.length}`);
    }

    // 📌 FIX CRÍTICO: TRATAMENTO DA BUSCA GERAL ('q') e BUSCA POR TECLADO (tecRef)
    const searchTerm = valor && filtro === 'q' ? valor : tecRef;
    
    if (searchTerm && typeof searchTerm === 'string') {
        // Usa o ILIKE com % para busca parcial em nome, tecRef, NIS e CPF
        const wildCardSearch = `%${searchTerm}%`;
        params.push(wildCardSearch, wildCardSearch, wildCardSearch, wildCardSearch);
        const placeholder1 = `$${params.length - 3}`;
        const placeholder2 = `$${params.length - 2}`;
        const placeholder3 = `$${params.length - 1}`;
        const placeholder4 = `$${params.length}`;
        
        whereClauses.push(cleanSqlString(`
            (nome ILIKE ${placeholder1} OR 
            "tecRef" ILIKE ${placeholder2} OR 
            dados_completos->>'nis' ILIKE ${placeholder3} OR 
            dados_completos->>'cpf' ILIKE ${placeholder4})
        `));
    } 
    
    // 📌 TRATAMENTO DOS FILTROS AVANÇADOS (por_bairro, por_violencia, etc.)
    else if (filtro && valor && filtro !== 'q') {
        const partialSearch = `%${valor}%`;
        params.push(filtro === 'por_bairro' ? valor : partialSearch);
        const placeholder = `$${params.length}`;
        
        if (filtro === 'por_bairro') {
             whereClauses.push(`dados_completos->>'bairro' = ${placeholder}`);
        } else if (filtro === 'por_violencia') {
             whereClauses.push(`dados_completos->>'tipoViolencia' ILIKE ${placeholder}`);
        }
        // NOTE: Adicione outros filtros avançados aqui se necessário
    }

    // 2. ADIÇÃO DO FILTRO DE ACESSO DA UNIDADE (CRÍTICO!)
    const offset = params.length;
    let unitWhere = accessFilter.whereClause;
    
    if (accessFilter.params.length === 1) {
        unitWhere = unitWhere.replace('$X', `$${offset + 1}`);
    } else if (accessFilter.params.length === 2) {
        unitWhere = unitWhere.replace('$X', `$${offset + 1}`).replace('$Y', `$${offset + 2}`);
    }
    
    accessFilter.params.forEach(p => params.push(p));
    whereClauses.push(unitWhere); 

    
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    query += ' ORDER BY "dataCad" DESC';

    // FIX: Aplica a limpeza final antes de enviar
    const finalQuery = cleanSqlString(query); 

    const result = await pool.query(finalQuery, params);
    
    const dadosProcessados = anonimizarDadosSeNecessario(user, result.rows);
    
    res.json(dadosProcessados);
  } catch (err: any) {
    console.error("Erro ao listar casos:", err.message);
    res.status(500).json({ message: "Erro ao buscar casos." });
  }
});

// =======================================================================
// ROTA PUT /casos/:id - ATUALIZAR CASO (Usa checagem de acesso centralizada)
// =======================================================================
router.put("/:id", checkCaseAccess('params', 'id'), async (req: Request, res: Response) => {
    const { id } = req.params;
    const novosDados = req.body;
    const userId = req.user!.id;
    const username = req.user!.username;
    
    try {
        // FIX: Aplica a limpeza na query de SELECT
        const resultadoAtualQuery = cleanSqlString('SELECT dados_completos FROM casos WHERE id = $1');
        const resultadoAtual = await pool.query(resultadoAtualQuery, [id]);
        
        if (resultadoAtual.rowCount === 0) {
            return res.status(404).json({ message: "Caso não encontrado." });
        }
        
        const dadosAntigos = resultadoAtual.rows[0].dados_completos;
        const dadosMesclados = { ...dadosAntigos, ...novosDados };
        const { dataCad, tecRef, nome = null } = dadosMesclados;
        
        const updateQuery = cleanSqlString(`
            UPDATE casos 
             SET "dataCad" = $1, "tecRef" = $2, nome = $3, dados_completos = $4
             WHERE id = $5
        `);
        await pool.query(updateQuery, [dataCad, tecRef, nome, JSON.stringify(dadosMesclados), id]);
        
        await logAction({ userId, username, action: 'UPDATE_CASE', details: { casoId: id } });
        res.status(200).json({ message: "Prontuário atualizado com sucesso!", caso: dadosMesclados });
    } catch (err: any) {
        console.error(`Erro ao atualizar caso ${id}:`, err.message);
        res.status(500).json({ message: "Erro interno ao atualizar o prontuário." });
    }
});

// =======================================================================
// ROTA GET /casos/:id - VISUALIZAÇÃO ÚNICA (Usa checagem de acesso centralizada)
// =======================================================================
router.get("/:id", checkCaseAccess('params', 'id'), async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user!;
    try {
        // FIX: Aplica a limpeza na query
        const casoQuery = cleanSqlString('SELECT * FROM casos WHERE id = $1'); 
        const casoResult = await pool.query(casoQuery, [id]);
        
        if (casoResult.rowCount === 0) {
            return res.status(404).json({ message: "Caso não encontrado." });
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
// ROTAS PATCH/DELETE/GET ENCAMINHAMENTOS (Usa checagem de acesso centralizada)
// =======================================================================
router.patch("/:id/status", checkCaseAccess('params', 'id'), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const { id: userId, username } = req.user!;
    if (!status || !['Ativo', 'Desligado', 'Arquivado'].includes(status)) {
        return res.status(400).json({ message: "Status inválido. Valores permitidos: Ativo, Desligado, Arquivado." });
    }
    try {
        const updateQuery = cleanSqlString('UPDATE casos SET status = $1 WHERE id = $2 RETURNING id, nome');
        const result = await pool.query(updateQuery, [status, id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Caso não encontrado.' });
        }
        await logAction({
            userId, username, action: 'UPDATE_CASE_STATUS',
            details: { casoId: id, nomeVitima: result.rows[0].nome, novoStatus: status }
        });
        res.status(200).json({ message: `Caso ${id} foi atualizado para '${status}' com sucesso.` });
    } catch (err: any) {
        console.error(`Erro ao atualizar status do caso ${id}:`, err.message);
        res.status(500).json({ message: "Erro interno ao atualizar o status do caso." });
    }
});

router.delete("/:id", checkCaseAccess('params', 'id'), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { id: userId, username } = req.user!;
    try {
        const deleteQuery = cleanSqlString('DELETE FROM casos WHERE id = $1 RETURNING nome');
        const result = await pool.query(deleteQuery, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Caso não encontrado.' });
        }
        const nomeVitima = result.rows[0].nome;
        await logAction({ userId, username, action: 'DELETE_CASE', details: { casoId: id, nomeVitima } });
        res.status(200).json({ message: 'Caso excluído com sucesso.' });
    } catch (err: any) {
        console.error("Erro ao excluir caso:", err.message);
        res.status(500).json({ message: "Erro ao excluir caso." });
    }
});

router.get("/:casoId/encaminhamentos", checkCaseAccess('params', 'casoId'), async (req: Request, res: Response) => {
    const { casoId } = req.params;
    try {
        const query = cleanSqlString(`
          SELECT
            enc.id, enc."servicoDestino", enc."dataEncaminhamento", enc.status,
            enc.observacoes, usr.username AS "tecRef" 
          FROM encaminhamentos enc
          LEFT JOIN users usr ON enc."userId" = usr.id
          WHERE enc."casoId" = $1
          ORDER BY enc."dataEncaminhamento" DESC;
        `);
        const result = await pool.query(query, [casoId]);
        res.json(result.rows);
    } catch (err: any) {
        console.error(`Erro ao listar encaminhamentos para o caso ${casoId}:`, err.message);
        res.status(500).json({ message: "Erro ao buscar encaminhamentos." });
    }
});

export default router;