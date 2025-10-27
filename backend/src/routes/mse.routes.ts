// backend/src/routes/mse.routes.ts

import { Router, Request, Response } from "express";
import pool from "../db";
import { logAction } from "../services/logger";
// Importa o authorizeCreasOnly
import { authorizeCreasOnly, authMiddleware } from "../middleware/auth";
import { UNIT_ID_CREAS } from "../utils/constants";
import { QueryResult } from "pg"; 
// ⭐️ NOVO: Importamos unitAccessMiddleware para rotas que precisam de filtro de BI
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware";

const router = Router();

// SOLUÇÃO DE LIMPEZA EXTREMA
const cleanSqlString = (sql: string): string => {
    return sql.replace(/\s+/g, ' ').trim();
};

// Interface de tipos (mantida)
interface MseRegistroBody {
    nome_adolescente: string; data_nascimento: string; responsavel: string; endereco: string; contato: string; nis: string;
    mse_tipo: 'LA' | 'PSC' | 'LA + PSC'; mse_data_inicio: string; mse_duracao_meses: number; situacao: 'CUMPRIMENTO' | 'DESCUMPRIMENTO';
    local_descumprimento?: string; pia_data_elaboracao?: string; pia_status?: 'Em Análise' | 'Aprovado' | 'Revisão' | 'Não Elaborado';
    // Adicionamos os campos de auditoria que podem vir no payload de edição, mas são ignorados na criação
    registrado_por_id?: number; 
    unit_id?: number;
}


// Aplica middlewares de segurança na ordem correta
router.use(authMiddleware); 
router.use(authorizeCreasOnly);


/**
 * @route POST /api/mse/registros
 * @desc  Cria um novo registro de Medida Socioeducativa (MSE)
 */
router.post("/registros", async (req: Request, res: Response) => {
    const userId = req.user!.id;
    // Usa a unidade do usuário, com fallback para CREAS (ID 1)
    const unit_id = req.user!.unit_id ?? UNIT_ID_CREAS; 

    const {
        nome_adolescente, data_nascimento, responsavel, endereco, contato, nis,
        mse_tipo, mse_data_inicio, mse_duracao_meses, situacao, local_descumprimento,
        pia_data_elaboracao, pia_status
    } = req.body as MseRegistroBody;

    if (!nome_adolescente || !data_nascimento || !mse_tipo || !mse_data_inicio || !mse_duracao_meses || !situacao) {
        return res.status(400).json({ message: "Campos obrigatórios de MSE estão faltando." });
    }

    // 📌 FIX DE DADOS: Limpeza e garantia de tamanho máximo (resolve o erro 'value too long')
    const cleanNis = nis ? nis.replace(/[^\d]/g, '').substring(0, 15) : null; 
    const cleanContato = contato ? contato.replace(/[^\d]/g, '').substring(0, 20) : null; 
    const finalPiaStatus = pia_status ?? 'Em Análise';


    try {
        const query = cleanSqlString(`
            INSERT INTO registros_mse (
                nome_adolescente, data_nascimento, responsavel, endereco, contato, nis,
                mse_tipo, mse_data_inicio, mse_duracao_meses, situacao, local_descumprimento,
                pia_data_elaboracao, pia_status, registrado_por_id, unit_id
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
            ) RETURNING id;
        `);
        
        const params = [
            nome_adolescente, data_nascimento, responsavel, endereco, cleanContato, cleanNis, 
            mse_tipo, mse_data_inicio, mse_duracao_meses, situacao, local_descumprimento,
            pia_data_elaboracao, finalPiaStatus, userId, unit_id 
        ];

        const result = await pool.query(query, params) as QueryResult<{ id: number }>;
        const novoRegistroId = result.rows[0].id;

        await logAction({ 
            userId, 
            username: req.user!.username, 
            action: 'CREATE_MSE_REGISTRY', 
            details: { registroId: novoRegistroId, adolescente: nome_adolescente, unitId: unit_id } 
        });
        
        res.status(201).json({ message: "Registro de MSE criado com sucesso!", registroId: novoRegistroId });

    } catch (err: any) {
        console.error("Erro ao criar registro MSE:", err.message);
        res.status(500).json({ message: "Erro interno ao registrar MSE." });
    }
});


/**
 * @route PUT /api/mse/registros/:id
 * @desc  Atualiza um registro de MSE existente (CHECA ACESSO VIA ID DO PRÓPRIO REGISTRO)
 */
router.put("/registros/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const {
        nome_adolescente, data_nascimento, responsavel, endereco, contato, nis,
        mse_tipo, mse_data_inicio, mse_duracao_meses, situacao, local_descumprimento,
        pia_data_elaboracao, pia_status
    } = req.body as MseRegistroBody;

    // 1. CHECAGEM DE PERMISSÃO (USUÁRIO PODE EDITAR ESTE REGISTRO?)
    // Apenas Gestor e Coordenador da Unidade podem editar.
    const accessQuery = cleanSqlString(`
        SELECT unit_id, registrado_por_id FROM registros_mse WHERE id = $1
    `);
    const accessResult = await pool.query(accessQuery, [id]);

    if (accessResult.rowCount === 0) {
        return res.status(404).json({ message: "Registro MSE não encontrado." });
    }

    const { unit_id: registroUnitId } = accessResult.rows[0];
    const userRole = req.user!.role.toLowerCase();
    
    // Regra: A edição é permitida APENAS se o usuário for Gestor GERAL OU 
    // se o usuário for coordenador E estiver na MESMA unidade do registro.
    const canEdit = userRole.includes('gestor') || (userRole.includes('coordenador') && req.user!.unit_id === registroUnitId);

    if (!canEdit) {
        await logAction({ userId, username: req.user!.username, action: 'ATTEMPT_EDIT_MSE_FORBIDDEN', details: { registroId: id, targetUnit: registroUnitId } });
        return res.status(403).json({ message: "Acesso negado: Você não tem permissão para editar este registro." });
    }

    // 2. MONTAGEM DA QUERY DE UPDATE (Mapeia todos os campos)
    const fields = [
        'nome_adolescente', 'data_nascimento', 'responsavel', 'endereco', 'contato', 'nis', 
        'mse_tipo', 'mse_data_inicio', 'mse_duracao_meses', 'situacao', 'local_descumprimento', 
        'pia_data_elaboracao', 'pia_status'
    ];
    
    // Converte os dados do body em um array de parâmetros, tratando nulos e máscaras
    const values = fields.map(field => {
        let value = (req.body as any)[field];
        if (value === "" || value === undefined) value = null;
        
        if (field === 'nis' || field === 'contato') {
             value = (value || '').replace(/[^\d]/g, '').substring(0, field === 'nis' ? 15 : 20) || null;
        } else if (field === 'mse_duracao_meses') {
             value = Number(value);
        }
        
        return value;
    });

    const setClauses = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const finalQuery = cleanSqlString(`
        UPDATE registros_mse
        SET ${setClauses}
        WHERE id = $${fields.length + 1} 
        RETURNING id;
    `);

    try {
        await pool.query(finalQuery, [...values, id]);

        await logAction({ 
            userId, 
            username: req.user!.username, 
            action: 'UPDATE_MSE_REGISTRY', 
            details: { registroId: id, adolescente: nome_adolescente, unitId: registroUnitId } 
        });

        res.status(200).json({ message: "Registro MSE atualizado com sucesso!" });

    } catch (err: any) {
        console.error("Erro ao atualizar registro MSE:", err.message);
        res.status(500).json({ message: "Erro interno ao atualizar MSE." });
    }
});


/**
 * @route GET /api/mse/registros/:id
 * @desc  Busca um registro de MSE por ID
 */
router.get("/registros/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role.toLowerCase();
    const userUnitId = req.user!.unit_id;

    // 1. REGRAS DE ACESSO
    const canAccess = userRole.includes('gestor') || userRole.includes('vigilancia') || userRole.includes('coordenador') || userRole.includes('tecnico');
    
    if (!canAccess) {
        return res.status(403).json({ message: "Acesso negado." });
    }

    try {
        // 2. MONTAGEM DO FILTRO DE SEGURANÇA (Se não for Gestor/Vigilância, filtre pela unidade)
        let whereClause = `r.id = $1`;
        const params: (string | number)[] = [id];
        
        if (!userRole.includes('gestor') && !userRole.includes('vigilancia')) {
            // Se for coordenador/técnico, só pode ver registros da sua unidade (unit_id)
            params.push(userUnitId as number); // $2
            whereClause += ` AND r.unit_id = $2`;
        }

        const query = cleanSqlString(`
            SELECT r.*, u.nome_completo AS registrado_por_nome 
            FROM registros_mse r
            JOIN users u ON r.registrado_por_id = u.id
            WHERE ${whereClause}
        `);
        
        const result = await pool.query(query, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Registro MSE não encontrado ou acesso negado." });
        }

        res.json(result.rows[0]);

    } catch (err: any) {
        console.error("Erro ao buscar registro MSE por ID:", err.message);
        res.status(500).json({ message: "Erro interno ao buscar registro MSE." });
    }
});


/**
 * @route GET /api/mse/registros
 * @desc  Lista todos os registros de MSE e KPIs (Exclusivo CREAS)
 */
router.get("/registros", async (req: Request, res: Response) => {
    // ⭐️ CORREÇÃO: unit_id agora é unit_id do usuário, se ele tiver (exceto Gestor que ve tudo)
    const unit_id = req.user!.unit_id; 
    const isGestorOuVigilancia = req.user!.role.includes('gestor') || req.user!.role.includes('vigilancia');
    
    const { q } = req.query; 
    
    const durationSql = 'r.mse_data_inicio + interval \'1 month\' * r.mse_duracao_meses';

    let params: (string | number)[] = []; 
    let listWhere = `TRUE`;
    let paramIndex = 1;

    // 1. FILTRO DE SEGURANÇA (Segregação por Unidade, exceto Gestor/Vigilância)
    if (!isGestorOuVigilancia && unit_id) {
        params.push(unit_id);
        listWhere = `r.unit_id = $${paramIndex++}`;
    } else if (!isGestorOuVigilancia && !unit_id) {
        // Bloqueia usuários sem lotação e que não são Gestor/Vigilância
        return res.json({ registros: [], kpis: {} });
    }
    
    // 2. FILTRO DE BUSCA GERAL (q)
    if (q && typeof q === 'string') {
        const searchTerm = `%${q}%`;
        const qParams: string[] = [];

        if (listWhere !== 'TRUE') listWhere += cleanSqlString(` AND `);

        // Se já tiver unit_id no params, o próximo é $2, senão é $1
        const searchPlaceholder1 = `$${paramIndex++}`;
        const searchPlaceholder2 = `$${paramIndex++}`;
        
        params.push(searchTerm, searchTerm); 
        listWhere += cleanSqlString(`
             (r.nome_adolescente ILIKE ${searchPlaceholder1} OR r.nis ILIKE ${searchPlaceholder2})
        `);
    }

    try {
        const listQuery = cleanSqlString(`
            SELECT 
                r.id, r.nome_adolescente, r.data_nascimento, r.mse_tipo, r.mse_data_inicio, r.situacao, r.pia_data_elaboracao,
                u.username AS registrado_por,
                EXTRACT(YEAR FROM AGE(r.data_nascimento)) AS idade_atual,
                (${durationSql}) AS mse_data_final 
            FROM registros_mse r
            JOIN users u ON r.registrado_por_id = u.id
            WHERE ${listWhere}
            ORDER BY r.mse_data_inicio DESC;
        `);
        
        // A query KPI precisa usar o mesmo filtro WHERE da lista para consistência.
        // Se houver unit_id no filtro, ele será o $1.
        let kpiWhere = 'TRUE';
        const kpiParams: (string | number)[] = [];

        if (!isGestorOuVigilancia && unit_id) {
            kpiWhere = `r.unit_id = $1`;
            kpiParams.push(unit_id);
        }
        
        const kpiQuery = cleanSqlString(`
            SELECT
                COUNT(r.id) AS total_medidas,
                COUNT(r.id) FILTER (WHERE r.situacao = 'CUMPRIMENTO') AS total_cumprimento,
                COUNT(r.id) FILTER (WHERE r.situacao = 'DESCUMPRIMENTO') AS total_descumprimento,
                COUNT(r.id) FILTER (
                    WHERE r.situacao = 'CUMPRIMENTO' 
                    AND (${durationSql}) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
                ) AS expirando_em_60_dias
            FROM registros_mse r
            WHERE ${kpiWhere};
        `);
        
        const [registrosResult, kpiResult] = await Promise.all([
            pool.query(listQuery, params), 
            pool.query(kpiQuery, kpiParams), 
        ]);
        
        const responseData = {
            registros: registrosResult.rows,
            kpis: kpiResult.rows[0]
        };

        res.json(responseData);

    } catch (err: any) {
        console.error("Erro ao listar registros MSE:", err.message);
        res.status(500).json({ message: "Erro interno ao buscar registros MSE." });
    }
});


export default router;