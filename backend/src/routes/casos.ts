// backend/src/routes/casos.ts

import { Router, Request, Response } from "express";
import pool from "../db";
import { authMiddleware, checkRole } from "../middleware/auth";
import { logAction } from "../services/logger";

const router = Router();

function anonimizarDadosSeNecessario(user: { id: number; role: string }, data: any): any {
  if (user.role !== 'vigilancia') { return data; }
  const removerCamposSensiveis = (caso: any) => {
    const casoAnonimizado = { ...caso };
    delete casoAnonimizado.nome;
    delete casoAnonimizado.cpf;
    delete casoAnonimizado.nis;
    if (casoAnonimizado.dados_completos) {
      delete casoAnonimizado.dados_completos.nome;
      delete casoAnonimizado.dados_completos.cpf;
      delete casoAnonimizado.dados_completos.nis;
    }
    return casoAnonimizado;
  };
  if (Array.isArray(data)) {
    return data.map(removerCamposSensiveis);
  } else {
    return removerCamposSensiveis(data);
  }
}

router.post("/", authMiddleware, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const casoData = req.body;
    try {
        const { dataCad, tecRef, nome = null } = casoData; 
        if (!dataCad || !tecRef) {
            return res.status(400).json({ 
                message: "Falha na validação: Os campos 'Data do Cadastro' e 'Técnico Responsável' são obrigatórios." 
            });
        }
        const dados_completos = casoData;
        const result = await pool.query(
            `INSERT INTO casos ("dataCad", "tecRef", nome, dados_completos, "userId", status)
             VALUES ($1, $2, $3, $4, $5, 'Ativo') RETURNING id`,
            [ dataCad, tecRef, nome, JSON.stringify(dados_completos), userId ]
        );
        const novoCasoId = result.rows[0].id;
        await logAction({ userId, username: req.user!.username, action: 'CREATE_CASE', details: { casoId: novoCasoId, nomeVitima: nome } });
        res.status(201).json({ message: "Caso cadastrado com sucesso!", casoId: novoCasoId });
    } catch (err: any) {
        console.error("Erro ao cadastrar caso:", err.message);
        res.status(500).json({ message: "Erro interno no servidor ao cadastrar o caso." });
    }
});

router.put("/:id", authMiddleware, async (req: Request, res: Response) => {
    const { id } = req.params;
    const novosDados = req.body;
    const userId = req.user!.id;
    const username = req.user!.username;
    try {
        const resultadoAtual = await pool.query('SELECT dados_completos FROM casos WHERE id = $1', [id]);
        if (resultadoAtual.rowCount === 0) {
            return res.status(404).json({ message: "Caso não encontrado." });
        }
        const dadosAntigos = resultadoAtual.rows[0].dados_completos;
        const dadosMesclados = { ...dadosAntigos, ...novosDados };
        const { dataCad, tecRef, nome = null } = dadosMesclados;
        await pool.query(
            `UPDATE casos 
             SET "dataCad" = $1, "tecRef" = $2, nome = $3, dados_completos = $4
             WHERE id = $5`,
            [dataCad, tecRef, nome, JSON.stringify(dadosMesclados), id]
        );
        await logAction({ userId, username, action: 'UPDATE_CASE', details: { casoId: id } });
        res.status(200).json({ message: "Prontuário atualizado com sucesso!", caso: dadosMesclados });
    } catch (err: any) {
        console.error(`Erro ao atualizar caso ${id}:`, err.message);
        res.status(500).json({ message: "Erro interno ao atualizar o prontuário." });
    }
});

router.get("/", authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const { q, tecRef, filtro, valor, status = 'Ativo' } = req.query;

  try {
    let query = 'SELECT id, "dataCad", "tecRef", nome, status, dados_completos->>\'bairro\' as bairro FROM casos';
    const params: (string | number)[] = [];
    let whereClauses: string[] = [];
    
    if (status && typeof status === 'string' && status !== 'todos') {
        params.push(status);
        whereClauses.push(`status = $${params.length}`);
    }

    if (tecRef && typeof tecRef === 'string') {
        params.push(`%${tecRef}%`);
        whereClauses.push(`"tecRef" ILIKE $${params.length}`);
    }
    
    if (q && typeof q === 'string') {
        params.push(`%${q}%`);
        whereClauses.push(`(nome ILIKE $${params.length} OR dados_completos->>'nis' ILIKE $${params.length})`);
    }

    if (filtro && typeof filtro === 'string') {
        switch (filtro) {
            case 'todos':
                whereClauses = whereClauses.filter(c => !c.startsWith('status'));
                if (params.includes('Ativo')) params.splice(params.indexOf('Ativo'), 1);
                break;
            case 'novos_no_mes': whereClauses.push(`"dataCad" >= date_trunc('month', current_date)`); break;
            case 'reincidentes': whereClauses.push(`LOWER(dados_completos->>'reincidente') = 'sim'`); break;
            case 'inseridos_paefi': whereClauses.push(`LOWER(dados_completos->>'inseridoPAEFI') = 'sim'`); break;
            case 'por_bairro': if (valor && typeof valor === 'string') { params.push(valor); whereClauses.push(`dados_completos->>'bairro' = $${params.length}`); } break;
            case 'por_violencia': if (valor && typeof valor === 'string') { params.push(valor); whereClauses.push(`dados_completos->>'tipoViolencia' = $${params.length}`); } break;
            case 'por_canal': if (valor && typeof valor === 'string') { params.push(valor); whereClauses.push(`dados_completos->>'canalDenuncia' = $${params.length}`); } break;
            case 'por_sexo': if (valor && typeof valor === 'string') { params.push(valor); whereClauses.push(`dados_completos->>'sexo' = $${params.length}`); } break;
            case 'por_cor_etnia': if (valor && typeof valor === 'string') { params.push(valor); whereClauses.push(`dados_completos->>'corEtnia' = $${params.length}`); } break;
            case 'por_faixa_etaria':
                if (valor && typeof valor === 'string') {
                    let condition = '';
                    if (valor.includes('0-11')) condition = `(dados_completos->>'idade')::integer BETWEEN 0 AND 11`;
                    if (valor.includes('12-17')) condition = `(dados_completos->>'idade')::integer BETWEEN 12 AND 17`;
                    if (valor.includes('18-29')) condition = `(dados_completos->>'idade')::integer BETWEEN 18 AND 29`;
                    if (valor.includes('30-59')) condition = `(dados_completos->>'idade')::integer BETWEEN 30 AND 59`;
                    if (valor.includes('60+')) condition = `(dados_completos->>'idade')::integer >= 60`;
                    if(condition) whereClauses.push(condition);
                }
                break;
            case 'recebem_bolsa_familia': whereClauses.push(`LOWER(dados_completos->>'recebePBF') = 'sim'`); break;
            case 'recebem_bpc': whereClauses.push(`dados_completos->>'recebeBPC' IN ('Idoso', 'PCD')`); break;
            case 'violencia_confirmada': whereClauses.push(`LOWER(dados_completos->>'confirmacaoViolencia') = 'confirmada'`); break;
            case 'notificados_sinan': whereClauses.push(`LOWER(dados_completos->>'notificacaoSINAM') = 'sim'`); break;
            case 'dependencia_financeira': whereClauses.push(`LOWER(dados_completos->>'dependeFinanceiro') = 'sim'`); break;
            case 'vitima_pcd': whereClauses.push(`LOWER(dados_completos->>'vitimaPCD') = 'sim'`); break;
            case 'membro_carcerario': whereClauses.push(`LOWER(dados_completos->>'membroCarcerario') = 'sim'`); break;
            case 'membro_socioeducacao': whereClauses.push(`LOWER(dados_completos->>'membroSocioeducacao') = 'sim'`); break;
        }
    }
    
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    query += ' ORDER BY "dataCad" DESC';

    const result = await pool.query(query, params);
    
    const dadosProcessados = anonimizarDadosSeNecessario(user, result.rows);
    
    res.json(dadosProcessados);
  } catch (err: any) {
    console.error("Erro ao listar casos:", err.message);
    res.status(500).json({ message: "Erro ao buscar casos." });
  }
});

router.get("/:id", authMiddleware, async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user!;
    try {
        // Primeira consulta: busca os dados do caso
        const casoQuery = 'SELECT * FROM casos WHERE id = $1';
        const casoResult = await pool.query(casoQuery, [id]);
        
        if (casoResult.rowCount === 0) {
            return res.status(404).json({ message: "Caso não encontrado." });
        }
        
        const casoBase = casoResult.rows[0];
        
        // 📌 NOVA CONSULTA: Busca as demandas vinculadas a este caso
        const demandasQuery = `
            SELECT id, tipo_documento, instituicao_origem, data_recebimento, status 
            FROM demandas 
            WHERE caso_associado_id = $1 
            ORDER BY data_recebimento DESC
        `;
        const demandasResult = await pool.query(demandasQuery, [id]);

        // Combina os dados do caso com suas demandas vinculadas
        const casoCompleto = {
            ...casoBase.dados_completos,
            id: casoBase.id,
            dataCad: casoBase.dataCad,
            tecRef: casoBase.tecRef,
            nome: casoBase.nome,
            userId: casoBase.userId,
            status: casoBase.status,
            demandasVinculadas: demandasResult.rows // 📌 Adiciona a lista de demandas à resposta
        };
        
        const dadosProcessados = anonimizarDadosSeNecessario(user, casoCompleto);
        res.json(dadosProcessados);
    } catch (err: any) {
        console.error(`Erro ao buscar detalhes do caso ${id}:`, err.message);
        res.status(500).json({ message: "Erro ao buscar detalhes do caso." });
    }
});

router.patch("/:id/status", authMiddleware, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const { id: userId, username } = req.user!;
    if (!status || !['Ativo', 'Desligado', 'Arquivado'].includes(status)) {
        return res.status(400).json({ message: "Status inválido. Valores permitidos: Ativo, Desligado, Arquivado." });
    }
    try {
        const result = await pool.query(
            'UPDATE casos SET status = $1 WHERE id = $2 RETURNING id, nome',
            [status, id]
        );
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

router.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { id: userId, username } = req.user!;
    try {
        const result = await pool.query('DELETE FROM casos WHERE id = $1 RETURNING nome', [id]);
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

router.get("/:casoId/encaminhamentos", authMiddleware, async (req: Request, res: Response) => {
    const { casoId } = req.params;
    try {
        const query = `
          SELECT
            enc.id, enc."servicoDestino", enc."dataEncaminhamento", enc.status,
            enc.observacoes, usr.username AS "tecRef" 
          FROM encaminhamentos enc
          LEFT JOIN users usr ON enc."userId" = usr.id
          WHERE enc."casoId" = $1
          ORDER BY enc."dataEncaminhamento" DESC;
        `;
        const result = await pool.query(query, [casoId]);
        res.json(result.rows);
    } catch (err: any) {
        console.error(`Erro ao listar encaminhamentos para o caso ${casoId}:`, err.message);
        res.status(500).json({ message: "Erro ao buscar encaminhamentos." });
    }
});

export default router;