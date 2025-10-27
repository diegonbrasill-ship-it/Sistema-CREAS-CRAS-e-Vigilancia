// backend/src/routes/rma.ts
// ⭐️ CORRIGIDO: Queries agora incluem a tabela ACOMPANHAMENTOS para o RMA ⭐️

import { Router, Request, Response } from "express";
import pool from "../db";
import { authMiddleware } from "../middleware/auth";
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware"; 
import { AuthenticatedUser } from '../middleware/auth'; 

const router = Router();

// A função cleanSqlString é necessária para remover quebras de linha/comentários
const cleanSqlString = (sql: string): string => {
    // Remove comentários SQL '--'
    let noComments = sql.replace(/--.*$/gm, ''); 
    // Colapsa espaços em branco e quebras de linha
    return noComments.replace(/\s+/g, ' ').trim();
};

// Aplica segurança base (autenticação e injeção de acesso)
router.use(authMiddleware, unitAccessMiddleware('casos', 'unit_id')); 


/**
 * @route   GET /api/rma/gerar
 * @desc    Calcula e retorna os dados agregados do RMA para um mês/ano/unidade específicos.
 * @access  Private (Operacional CREAS/CRAS)
 */
router.get("/gerar", async (req: Request, res: Response) => {
    const user = req.user as AuthenticatedUser;
    const access = req.access!;

    // 1. OBTER OS FILTROS DA QUERY (Mês, Ano, Unidade)
    const { mes, ano, unitId } = req.query;

    if (!mes || !ano || !unitId) {
        return res.status(400).json({ message: "Mês, Ano e Unit ID são obrigatórios." });
    }

    // 2. VALIDAÇÃO DE PERMISSÃO
    const isAdmin = access.isGestorGeral;
    // Converte unitId (string da query) para número para comparação segura
    const isOwner = access.userUnitId === Number(unitId); 

    if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "Acesso negado. Você só pode gerar relatórios da sua própria unidade." });
    }

    // 3. DEFINIÇÃO DOS PARÂMETROS DE DATA E UNIDADE
    const params = [
        unitId, // $1
        `${ano}-${String(mes).padStart(2, '0')}-01` // $2 (Início do Mês)
    ];
    
    try {
        // 4. QUERY MESTRA DE AGREGAÇÃO
        const query = cleanSqlString(`
            WITH MesFiltradoCasos AS (
                -- CTE 1: Filtra 'casos' (Prontuários ABERTOS no mês)
                SELECT 
                    id,
                    (dados_completos->>'motivoAcolhida') AS motivoAcolhida,
                    (dados_completos->>'primeiraInfSuas') AS primeiraInfSuas,
                    (dados_completos->>'encaminhamentoSCFV') AS encaminhamentoSCFV,
                    (dados_completos->>'segundaViaDocumentos') AS segundaViaDocumentos,
                    (dados_completos->>'recebePBF') AS recebePBF,
                    (dados_completos->>'recebeBPC') AS recebeBPC,
                    (dados_completos->>'trabalhoInfantil') AS trabalhoInfantil,
                    (dados_completos->>'membroAcolhimento') AS membroAcolhimento,
                    (dados_completos->>'acompanhamentoCREAS') AS acompanhamentoCREAS,
                    (dados_completos->'beneficiosEventuais') AS beneficiosEventuais
                FROM casos
                WHERE 
                    unit_id = $1
                    AND "dataCad" >= $2::date
                    AND "dataCad" < ($2::date + interval '1 month')
            ),
            MesFiltradoAcomps AS (
                -- ⭐️ CTE 2: Filtra 'acompanhamentos' (AÇÕES feitas no mês) ⭐️
                SELECT
                    a.id,
                    a.tipo,
                    a."casoId"
                FROM acompanhamentos a
                JOIN casos c ON a."casoId" = c.id
                WHERE
                    c.unit_id = $1
                    AND a.data >= $2::date
                    AND a.data < ($2::date + interval '1 month')
            ),
            AtividadesFiltradas AS (
                -- CTE 3: Filtra 'atividades_coletivas' pelo mês/unidade
                SELECT 
                    id,
                    tipo_atividade,
                    tema_grupo,
                    publico_alvo,
                    numero_participantes
                FROM atividades_coletivas
                WHERE
                    unit_id = $1
                    AND data_atividade >= $2::date
                    AND data_atividade < ($2::date + interval '1 month')
            )
            
            -- QUERY FINAL: Agrega os resultados das CTEs
            SELECT
                -- Bloco A (PAIF)
                (SELECT COUNT(*) FROM MesFiltradoCasos) AS "A3_novas_familias_paif",
                (SELECT COUNT(*) FROM MesFiltradoCasos WHERE primeiraInfSuas = 'Sim') AS "A3_1_novas_primeira_infancia",
                (SELECT COUNT(*) FROM MesFiltradoCasos WHERE encaminhamentoSCFV IS NOT NULL AND encaminhamentoSCFV != 'NAO_ENC') AS "A3_2_novas_scfv",
                (SELECT COUNT(*) FROM MesFiltradoAcomps WHERE tipo = 'DESLIGAMENTO_PAIF') AS "A4_desligadas_paif",
                (SELECT COUNT(*) FROM MesFiltradoAcomps WHERE tipo = 'DESISTENCIA_PAIF') AS "A5_desistencias_paif",

                -- Bloco B (Perfil Novas Famílias)
                (SELECT COUNT(*) FROM MesFiltradoCasos WHERE recebePBF = 'Sim') AS "B1_pbf",
                (SELECT COUNT(*) FROM MesFiltradoCasos WHERE recebeBPC = 'Idoso' OR recebeBPC = 'PCD') AS "B4_bpc",
                (SELECT COUNT(*) FROM MesFiltradoCasos WHERE trabalhoInfantil = 'Sim') AS "B5_trabalho_infantil",
                (SELECT COUNT(*) FROM MesFiltradoCasos WHERE membroAcolhimento = 'Sim') AS "B6_membro_acolhimento",
                (SELECT COUNT(*) FROM MesFiltradoCasos WHERE acompanhamentoCREAS = 'Sim') AS "B8_acompanhamento_creas",

                -- Bloco C (Atendimentos) - ⭐️ CORRIGIDO PARA USAR ACOMPANHAMENTOS ⭐️
                (SELECT COUNT(*) FROM MesFiltradoAcomps WHERE tipo = 'ATEND_PARTICULARIZADO') AS "C1_1_atend_paif",
                (SELECT COUNT(*) FROM MesFiltradoAcomps WHERE tipo = 'VISITA_DOMICILIAR') AS "C1_2_atend_vd",
                (SELECT COUNT(*) FROM MesFiltradoCasos WHERE motivoAcolhida = 'Espontanea') AS "C2_1_1_espontanea",
                (SELECT COUNT(*) FROM MesFiltradoCasos WHERE motivoAcolhida = 'Busca Ativa') AS "C2_1_2_busca_ativa",
                (SELECT COUNT(*) FROM MesFiltradoCasos WHERE motivoAcolhida = 'Encaminhamento') AS "C2_1_3_enc_rede_assist",
                (SELECT COUNT(*) FROM MesFiltradoCasos WHERE motivoAcolhida = 'Solicitacao') AS "C2_1_4_enc_outras_pol",
                (SELECT COUNT(*) FROM MesFiltradoAcomps WHERE tipo = 'ENC_CADUNICO') AS "C3_1_enc_cadunico",
                (SELECT COUNT(*) FROM MesFiltradoAcomps WHERE tipo = 'ENC_DOCUMENTACAO') AS "C8_documentacao_basica",

                -- Bloco D (Benefícios Eventuais)
                (SELECT COUNT(DISTINCT c.id) FROM MesFiltradoCasos c, jsonb_array_elements(c.beneficiosEventuais) AS b WHERE b->>'tipo' = 'KIT_GESTANTE') AS "D4_auxilio_natalidade",
                (SELECT COUNT(DISTINCT c.id) FROM MesFiltradoCasos c, jsonb_array_elements(c.beneficiosEventuais) AS b WHERE b->>'tipo' = 'AUXILIO_FUNERAL') AS "D5_auxilio_funeral",

                -- Bloco G (Atividades Coletivas)
                (SELECT SUM(numero_participantes) FROM AtividadesFiltradas WHERE tipo_atividade = 'GRUPO_PAIF_GESTANTES') AS "G1_1_grupo_gestantes",
                (SELECT SUM(numero_participantes) FROM AtividadesFiltradas WHERE tipo_atividade = 'GRUPO_PAIF_BPC') AS "G1_2_grupo_bpc",
                (SELECT SUM(numero_participantes) FROM AtividadesFiltradas WHERE tipo_atividade = 'GRUPO_PAIF_PBF') AS "G1_3_grupo_pbf",
                (SELECT SUM(numero_participantes) FROM AtividadesFiltradas WHERE tipo_atividade = 'GRUPO_PAIF_OUTROS') AS "G1_4_grupo_outros",
                (SELECT SUM(numero_participantes) FROM AtividadesFiltradas WHERE tipo_atividade = 'SCFV_0_6') AS "G2_scfv_0_6",
                (SELECT SUM(numero_participantes) FROM AtividadesFiltradas WHERE tipo_atividade = 'SCFV_7_14') AS "G3_scfv_7_14",
                (SELECT SUM(numero_participantes) FROM AtividadesFiltradas WHERE tipo_atividade = 'SCFV_15_17') AS "G4_scfv_15_17",
                (SELECT SUM(numero_participantes) FROM AtividadesFiltradas WHERE tipo_atividade = 'SCFV_18_59') AS "G5_scfv_18_59",
                (SELECT SUM(numero_participantes) FROM AtividadesFiltradas WHERE tipo_atividade = 'SCFV_IDOSOS') AS "G7_scfv_idosos",
                (SELECT SUM(numero_participantes) FROM AtividadesFiltradas WHERE tipo_atividade = 'SCFV_PCD') AS "G9_scfv_pcd",
                (SELECT SUM(numero_participantes) FROM AtividadesFiltradas WHERE tipo_atividade = 'EVENTO_PALESTRA') AS "G10_eventos"
        `);
        
        const result = await pool.query(query, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Nenhum dado encontrado para este período ou unidade." });
        }

        // Retorna o objeto JSON com todos os dados calculados
        res.json(result.rows[0]);

    } catch (err: any) {
        console.error(`Erro ao gerar RMA: ${err.message}`);
        res.status(500).json({ message: "Erro interno ao gerar o RMA." });
    }
});


export default router;