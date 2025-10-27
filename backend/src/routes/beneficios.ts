// backend/src/routes/beneficios.ts
// ⭐️ ATUALIZAÇÃO: Adicionada rota GET /:id/impressao para buscar dados completos para impressão.

import { Router, Request, Response } from "express";
import pool from "../db";
import { authMiddleware } from "../middleware/auth";
import { logAction } from "../services/logger";
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware"; 
import { AuthenticatedUser } from '../middleware/auth'; 
import { checkCaseAccess } from "../middleware/caseAccess.middleware"; 

const router = Router();

// Limpeza de SQL
const cleanSqlString = (sql: string): string => sql.replace(/\s+/g, ' ').trim();

// Aplica segurança base (Autenticação)
// NOTA: O unitAccessMiddleware aqui pode não ser ideal para todas as rotas.
// Vamos adicionar verificações específicas nas rotas que precisam.
router.use(authMiddleware); 


/**
 * @route   GET /api/beneficios
 * @desc    Lista todos os Benefícios Eventuais (Requerimentos) da unidade do usuário
 * @access  Private (CRAS/CREAS Operacional)
 */
router.get("/", async (req: Request, res: Response) => {
    // ... (código da rota GET / inalterado) ...
    const access = req.access!;
    const user = req.user as AuthenticatedUser;

    try {
        let whereClause = 'TRUE';
        const params: any[] = [];
        let paramIndex = 1;

        // 1. FILTRO DE SEGURANÇA (Segregação por Unidade)
        if (!access.isGestorGeral && !access.isVigilancia) {
            if (user.unit_id) { // Usa user.unit_id diretamente
                params.push(user.unit_id);
                // Filtra pela unidade do técnico que registrou o benefício
                whereClause = `be.unit_id = $${paramIndex++}`; 
            } else {
                return res.json([]); // Bloqueia operacionais sem lotação
            }
        }
        // Se Gestor/Vigilância, whereClause = 'TRUE', vê tudo.

        // 2. QUERY COM JOINS (para pegar nome do caso e do técnico)
        const query = cleanSqlString(`
            SELECT 
                be.id,
                be.data_solicitacao,
                be.beneficio_solicitado,
                be.status_parecer,
                be.caso_id,
                c.nome AS nome_caso,
                u.nome_completo AS tecnico_nome,
                be.nome_requerente 
            FROM beneficios_eventuais be
            LEFT JOIN casos c ON be.caso_id = c.id
            LEFT JOIN users u ON be.tecnico_id = u.id
            WHERE ${whereClause}
            ORDER BY be.data_solicitacao DESC;
        `);
        
        const result = await pool.query(query, params);
        res.json(result.rows);
        
    } catch (err: any) {
        console.error(`Erro ao listar benefícios eventuais: ${err.message}`);
        res.status(500).json({ message: "Erro interno ao buscar benefícios." });
    }
});


/**
 * @route   POST /api/beneficios
 * @desc    Cria um novo Requerimento/Parecer de Benefício Eventual
 * @access  Private (CRAS/CREAS Operacional)
 */
// Adiciona checkCaseAccess aqui pois a criação depende do acesso ao caso
router.post("/", checkCaseAccess('body', 'caso_id'), async (req: Request, res: Response) => {
    // ... (código da rota POST / inalterado) ...
    const user = req.user as AuthenticatedUser;
    
    // ⭐️ ATUALIZAÇÃO: Desestruturação de todos os campos do Payload (baseado no Requerimento ) ⭐️
    const { 
        // Campos Principais (Parecer)
        caso_id, 
        processo_numero,
        data_solicitacao,
        beneficio_solicitado, 
        breve_relato,
        parecer_social,
        status_parecer, 
        valor_concedido,
        dados_bancarios,
        
        // Campos do Requerimento ()
        beneficio_subtipo,
        observacao,
        nome_requerente,
        dn_requerente,
        rg_requerente,
        cpf_requerente,
        nis_requerente,
        endereco_requerente,
        bairro_requerente,
        ponto_referencia_requerente,
        cidade_requerente,
        telefone_requerente,
        possui_cadastro_cras
    } = req.body;
    
    const tecnico_id = user.id;
    const unit_id = user.unit_id; // Unidade do técnico

    // Validação de campos mínimos (do Parecer)
    if (!caso_id || !data_solicitacao || !beneficio_solicitado || !parecer_social || !status_parecer) {
        return res.status(400).json({ message: "Campos obrigatórios (Caso, Data, Benefício, Parecer, Status) estão faltando." });
    }

    try {
        // ⭐️ ATUALIZAÇÃO: Query INSERT com todos os 24 campos ⭐️
        const query = cleanSqlString(`
            INSERT INTO beneficios_eventuais (
                caso_id, tecnico_id, unit_id, processo_numero, data_solicitacao, 
                beneficio_solicitado, breve_relato, parecer_social, status_parecer, 
                valor_concedido, dados_bancarios,
                
                beneficio_subtipo, observacao, nome_requerente, dn_requerente, 
                rg_requerente, cpf_requerente, nis_requerente, endereco_requerente, 
                bairro_requerente, ponto_referencia_requerente, cidade_requerente, 
                telefone_requerente, possui_cadastro_cras
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 
                $12, $13, $14, $15, $16, $17, $18, $19, $20, 
                $21, $22, $23, $24
            ) 
            RETURNING id;
        `);
        
        // ⭐️ ATUALIZAÇÃO: Array de parâmetros com todos os 24 campos ⭐️
        const result = await pool.query(query, [
            // Bloco 1 (Original)
            caso_id, tecnico_id, unit_id, processo_numero, data_solicitacao,
            beneficio_solicitado, breve_relato, parecer_social, status_parecer,
            valor_concedido, dados_bancarios,
            // Bloco 2 (Novos campos do Requerimento )
            beneficio_subtipo, observacao, nome_requerente, 
            dn_requerente || null, // Garante que data vazia seja nula
            rg_requerente, cpf_requerente, nis_requerente, 
            endereco_requerente, bairro_requerente, ponto_referencia_requerente, 
            cidade_requerente, telefone_requerente, possui_cadastro_cras
        ]);
        
        const novoBeneficioId = result.rows[0].id;
        
        await logAction({ 
            userId: tecnico_id, 
            username: user.username, 
            action: 'CREATE_BENEFICIO_EVENTUAL', 
            details: { beneficioId: novoBeneficioId, casoId: caso_id, tipo: beneficio_solicitado, status: status_parecer, unitId: unit_id } 
        });
        
        res.status(201).json({ message: "Requerimento de Benefício Eventual salvo com sucesso!", beneficioId: novoBeneficioId });

    } catch (err: any) {
        console.error(`Erro ao salvar Benefício Eventual: ${err.message}`);
        res.status(500).json({ message: "Erro interno ao salvar o requerimento." });
    }
});

/**
 * @route   GET /api/beneficios/caso/:casoId
 * @desc    Lista todos os benefícios eventuais vinculados a um caso
 * @access  Private
 */
// Adiciona checkCaseAccess aqui pois a listagem depende do acesso ao caso
router.get("/caso/:casoId", checkCaseAccess('params', 'casoId'), async (req: Request, res: Response) => {
    // ... (código da rota GET /caso/:casoId inalterado) ...
    const { casoId } = req.params;

    try {
        // Nota: be.* já inclui automaticamente todos os novos campos da tabela.
        const query = cleanSqlString(`
            SELECT 
                be.*,
                u.nome_completo AS tecnico_nome,
                c.nome AS nome_caso
            FROM beneficios_eventuais be
            LEFT JOIN users u ON be.tecnico_id = u.id
            LEFT JOIN casos c ON be.caso_id = c.id
            WHERE be.caso_id = $1
            ORDER BY be.data_solicitacao DESC
        `);
        
        const result = await pool.query(query, [casoId]);
        res.json(result.rows);
        
    } catch (err: any) {
        console.error(`Erro ao listar benefícios do caso ${casoId}: ${err.message}`);
        res.status(500).json({ message: "Erro interno ao buscar benefícios." });
    }
});


// ⭐️ NOVA ROTA (B.E. Impressão Individual) ⭐️
/**
 * @route   GET /api/beneficios/:id/impressao
 * @desc    Busca dados completos de um benefício para impressão (Requerimento + Parecer)
 * @access  Private (Verifica acesso à unidade do benefício)
 */
router.get("/:id/impressao", async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user as AuthenticatedUser;
    const access = req.access!; // Assumindo que o middleware auth preenche req.access

    if (!id) {
        return res.status(400).json({ message: "ID do benefício não fornecido." });
    }

    try {
        const query = cleanSqlString(`
            SELECT 
                be.*, 
                c.*, -- Seleciona todos os campos do caso também
                u.nome_completo AS tecnico_nome,
                u.cargo AS tecnico_cargo,
                u.cress AS tecnico_cress -- Campo CRESS do técnico
            FROM beneficios_eventuais be
            LEFT JOIN casos c ON be.caso_id = c.id
            LEFT JOIN users u ON be.tecnico_id = u.id
            WHERE be.id = $1; 
        `);
        
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Benefício não encontrado." });
        }

        const beneficioData = result.rows[0];

        // Verificação de Segurança: O usuário pode acessar este benefício?
        if (!access.isGestorGeral && !access.isVigilancia && beneficioData.unit_id !== user.unit_id) {
             return res.status(403).json({ message: "Acesso negado a este benefício." });
        }

        // Retorna todos os dados combinados
        res.json(beneficioData);

    } catch (err: any) {
        console.error(`Erro ao buscar dados de impressão para benefício ${id}: ${err.message}`);
        res.status(500).json({ message: "Erro interno ao buscar dados para impressão." });
    }
});


export default router;