// backend/src/routes/demandas.ts

import { Router, Request, Response } from "express";
import pool from "../db";
import { authMiddleware } from "../middleware/auth";
import { logAction } from "../services/logger";
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware"; 
import { UNIT_ID_CREAS, UNIT_ID_VIGILANCIA } from "../utils/constants"; 
import { checkCaseAccess } from "../middleware/caseAccess.middleware"; 
import { AuthenticatedUser } from '../middleware/auth'; // Presumindo que esta tipagem seja usada no req.user

const router = Router();

// 📌 SOLUÇÃO DE LIMPEZA EXTREMA: Essencial para remover o erro 'syntax error at or near " "'
const cleanSqlString = (sql: string): string => {
    return sql.replace(/\s+/g, ' ').trim();
};

// =======================================================================
// 📌 MÓDULO CRÍTICO: ANONIMIZAÇÃO (Tipagem Corrigida)
// =======================================================================
// ✅ CORREÇÃO AQUI: Aceita unit_id como number ou null.
function anonimizarDemandaSeNecessario(user: { unit_id: number | null }, demanda: any): any {
    const isVigilancia = user.unit_id === UNIT_ID_VIGILANCIA;
    
    if (!isVigilancia || !demanda.caso_id) { return demanda; }

    const casoUnitId = demanda.caso_unit_id;
    const deveAnonimizar = casoUnitId === UNIT_ID_CREAS; 

    if (deveAnonimizar) {
        const demandaAnonimizada = { ...demanda };
        const casoId = demandaAnonimizada.caso_id || 'XXX';

        demandaAnonimizada.nome_caso = `[DADO SIGILOSO - ID: ${casoId}]`;
        
        return demandaAnonimizada;
    }
    
    return demanda;
}


// =======================================================================
// APLICAÇÃO GERAL DOS MIDDLEWARES DE SEGURANÇA NA ROTA
// 📌 FIX: Passamos 'c' como nome de tabela para que o filtro use o alias 'c'
// =======================================================================
router.use(authMiddleware, unitAccessMiddleware('c', 'unit_id'));


// =======================================================================
// ROTA: Listar todas as demandas (GET /api/demandas)
// =======================================================================
router.get("/", async (req: Request, res: Response) => {
    // 🛑 CORREÇÃO: Passando o usuário completo, pois a função agora aceita number | null.
    const user = req.user as AuthenticatedUser; 
    const accessFilter = req.accessFilter!;
    
    try {
        // 1. Resolve Placeholders e Parâmetros de Unidade
        const unitParams: (string | number)[] = [];
        let unitWhere = accessFilter.whereClause;
        
        const startParamIndex = unitParams.length + 1;
        
        if (accessFilter.params.length === 1) {
            unitWhere = unitWhere.replace('$X', `$${startParamIndex}`);
            unitParams.push(accessFilter.params[0]);
        } else if (accessFilter.params.length === 2) {
            unitWhere = unitWhere.replace('$X', `$${startParamIndex}`).replace('$Y', `$${startParamIndex + 1}`);
            unitParams.push(accessFilter.params[0], accessFilter.params[1]);
        }

        // 📌 FIX: Aplica a limpeza final na query. O alias 'c' está correto aqui.
        const query = cleanSqlString(`
            SELECT
                d.id, d.tipo_documento, d.instituicao_origem, d.data_recebimento,
                d.prazo_resposta, d.status, c.nome AS nome_caso, c.id AS caso_id,
                c.unit_id AS caso_unit_id,
                u_tec.username AS tecnico_designado, u_reg.username AS registrado_por
            FROM demandas d
            LEFT JOIN casos c ON d.caso_associado_id = c.id
            LEFT JOIN users u_tec ON d.tecnico_designado_id = u_tec.id
            LEFT JOIN users u_reg ON d.registrado_por_id = u_reg.id
            WHERE ${unitWhere}
            ORDER BY d.data_recebimento DESC;
        `);
        const result = await pool.query(query, unitParams);
        
        const dadosProcessados = result.rows.map((demanda: any) => anonimizarDemandaSeNecessario(user, demanda));

        res.json(dadosProcessados);
    } catch (err: any) {
        console.error(`Erro ao listar demandas: ${err.message}`);
        res.status(500).json({ message: "Erro interno ao buscar demandas." });
    }
});

// =======================================================================
// ROTA: Criar uma nova demanda (POST /api/demandas)
// =======================================================================
router.post("/", checkCaseAccess('body', 'caso_associado_id'), async (req: Request, res: Response) => {
    const {
        tipo_documento, instituicao_origem, numero_documento, data_recebimento, 
        prazo_resposta, assunto, caso_associado_id, tecnico_designado_id
    } = req.body;
    const registrado_por_id = req.user!.id;
    const userUnitId = req.user!.unit_id;

    if (!tipo_documento || !instituicao_origem || !data_recebimento || !tecnico_designado_id) {
        return res.status(400).json({ message: "Campos obrigatórios estão faltando." });
    }

    try {
        const query = cleanSqlString(`
            INSERT INTO demandas (
                tipo_documento, instituicao_origem, numero_documento, data_recebimento, 
                prazo_resposta, assunto, caso_associado_id, tecnico_designado_id, registrado_por_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
        `);
        const result = await pool.query(query, [
            tipo_documento, instituicao_origem, numero_documento, data_recebimento,
            prazo_resposta, assunto, caso_associado_id, tecnico_designado_id, registrado_por_id
        ]);
        const novaDemandaId = result.rows[0].id;
        
        await logAction({ 
            userId: registrado_por_id, 
            username: req.user!.username, 
            action: 'CREATE_DEMAND', 
            details: { demandaId: novaDemandaId, assunto, casoAssociadoId: caso_associado_id, unitId: userUnitId } 
        });
        
        res.status(201).json({ message: "Demanda registrada com sucesso!", demandaId: novaDemandaId });
    } catch (err: any) {
        console.error(`Erro ao registrar demanda: ${err.message}`);
        res.status(500).json({ message: "Erro interno ao registrar a demanda." });
    }
});

// =======================================================================
// ROTA: Buscar uma demanda específica por ID (GET /api/demandas/:id)
// =======================================================================
router.get("/:id", async (req: Request, res: Response) => {
    // 🛑 CORREÇÃO: Passando o usuário completo.
    const user = req.user as AuthenticatedUser; 
    const accessFilter = req.accessFilter!;
    const { id } = req.params;

    try {
        // 1. Resolve Placeholders e Parâmetros de Unidade (para o filtro de acesso no JOIN)
        const unitParams: (string | number)[] = [id];
        let unitWhere = accessFilter.whereClause;
        
        if (accessFilter.params.length === 1) {
            unitWhere = unitWhere.replace('$X', `$${unitParams.length + 1}`);
            unitParams.push(accessFilter.params[0]);
        } else if (accessFilter.params.length === 2) {
            unitWhere = unitWhere.replace('$X', `$${unitParams.length + 1}`).replace('$Y', `$${unitParams.length + 2}`);
            unitParams.push(accessFilter.params[0], accessFilter.params[1]);
        }

        const demandaQuery = cleanSqlString(`
            SELECT
                d.id, d.tipo_documento, d.instituicao_origem, d.numero_documento,
                d.data_recebimento, d.prazo_resposta, d.assunto, d.status,
                d.caso_associado_id, c.nome AS nome_caso, c.unit_id AS caso_unit_id,
                d.tecnico_designado_id, u_tec.username AS tecnico_designado, 
                d.registrado_por_id, u_reg.username AS registrado_por, d.created_at
            FROM demandas d
            LEFT JOIN casos c ON d.caso_associado_id = c.id
            LEFT JOIN users u_tec ON d.tecnico_designado_id = u_tec.id
            LEFT JOIN users u_reg ON d.registrado_por_id = u_reg.id
            WHERE d.id = $1 AND ${unitWhere}
        `);
        const demandaResult = await pool.query(demandaQuery, unitParams);

        if (demandaResult.rowCount === 0) {
            return res.status(404).json({ message: "Demanda não encontrada ou acesso restrito à sua unidade." });
        }
        
        const demandaBase = demandaResult.rows[0];

        const anexosQuery = cleanSqlString(`
            SELECT id, "nomeOriginal", "dataUpload" 
            FROM anexos 
            WHERE "demandaId" = $1 
            ORDER BY "dataUpload" DESC;
        `);
        const anexosResult = await pool.query(anexosQuery, [id]);

        let demandaDetalhada = {
            ...demandaBase,
            anexos: anexosResult.rows
        };
        
        demandaDetalhada = anonimizarDemandaSeNecessario(user, demandaDetalhada);

        res.json(demandaDetalhada);
    } catch (err: any) {
        console.error(`Erro ao buscar demanda ${id}: ${err.message}`);
        res.status(500).json({ message: "Erro interno ao buscar a demanda." });
    }
});

// =======================================================================
// ROTA: Atualizar o status de uma demanda (PATCH /api/demandas/:id/status)
// =======================================================================
router.patch("/:id/status", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const { id: userId, username } = req.user!;
    const accessFilter = req.accessFilter!;

    if (!status || !['Nova', 'Em Andamento', 'Finalizada'].includes(status)) {
        return res.status(400).json({ message: "Status inválido." });
    }

    try {
        // 1. Resolve Placeholders e Parâmetros de Unidade
        const updateParams: (string | number)[] = [status, id];
        let unitWhere = accessFilter.whereClause;
        
        if (accessFilter.params.length === 1) {
            unitWhere = unitWhere.replace('$X', `$${updateParams.length + 1}`);
            updateParams.push(accessFilter.params[0]);
        } else if (accessFilter.params.length === 2) {
            unitWhere = unitWhere.replace('$X', `$${updateParams.length + 1}`).replace('$Y', `$${updateParams.length + 2}`);
            updateParams.push(accessFilter.params[0], accessFilter.params[1]);
        }
        
        const query = cleanSqlString(`
            UPDATE demandas d
            SET status = $1
            FROM casos c
            WHERE d.id = $2
            AND d.caso_associado_id = c.id
            AND ${unitWhere}
            RETURNING d.id, d.caso_associado_id;
        `);

        const result = await pool.query(query, updateParams);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Demanda não encontrada ou acesso restrito à sua unidade.' });
        }
        const { caso_associado_id: casoId } = result.rows[0];

        await logAction({ 
            userId, 
            username, 
            action: 'UPDATE_DEMAND_STATUS', 
            details: { demandaId: id, novoStatus: status, casoId, unitId: req.user!.unit_id } 
        });
        
        res.status(200).json({ message: `Status da demanda atualizado para '${status}'.` });
    } catch (err: any) {
        console.error(`Erro ao atualizar status da demanda ${id}: ${err.message}`);
        res.status(500).json({ message: "Erro interno ao atualizar status." });
    }
});

export default router;