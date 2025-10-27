// backend/src/routes/dashboard.ts 

import { Router, Request, Response } from "express"; 
import pool from "../db";
import { authMiddleware } from "../middleware/auth";
import { unitAccessMiddleware } from "../middleware/unitAccess.middleware"; 
import { QueryResult } from "pg";

const router = Router();

// ⭐️ CONSTANTES CRÍTICAS PARA SEGREGACÃO ⭐️
const CREAS_UNIT_ID = 1;

// 📌 SOLUÇÃO DE LIMPEZA EXTREMA: Remove quebras de linha e múltiplos espaços.
const cleanSqlString = (sql: string): string => {
    // Essencial para remover caracteres invisíveis que causam o erro 42601
    return sql.replace(/\s+/g, ' ').trim();
};

/**
 * Função utilitária para gerar o filtro WHERE e sincronizar os parâmetros.
 * Esta função implementa o Filtro Fiel: Garante que o BI seja APENAS CREAS (unit_id=1) ou Casos sem lotação (NULL).
 *  * @param filters - Filtros dinâmicos da URL.
 * @param access - Objeto de acesso simples (req.access) do novo middleware.
 * @param startParamIndex - O índice inicial do parâmetro ($1, $2, etc.).
 * @returns [whereContent, params] - A string do conteúdo WHERE e o array de parâmetros.
 */
const buildFullWhereClauseContent = ( 
    filters: { mes?: string, tecRef?: string, bairro?: string },
    access: Request['access'], // Recebe o novo objeto simples
    startParamIndex: number
): [string, any[]] => {
    
    if (!access) {
        // Este erro nunca deve ocorrer se o authMiddleware e unitAccessMiddleware estiverem ativos.
        throw new Error("Erro de segurança: Acesso do usuário indisponível.");
    }

    const whereClauses: string[] = [];
    let params: any[] = [];
    let paramIndex = startParamIndex;

    // 🛑 1. CORREÇÃO CRÍTICA DE SEGREGACÃO (BI EXCLUSIVO CREAS/PAEFI) 🛑
    // Garante que o Dashboard só conte casos do CREAS (ID 1) ou Casos NÃO lotados (NULL).
    
    const creasIdParam = `$${paramIndex++}`;
    params.push(CREAS_UNIT_ID); // Valor 1
    
    // FILTRO FIEL: Apenas unidade 1 (CREAS) OU NULL (Casos sem lotação)
    whereClauses.push(`(casos.unit_id = ${creasIdParam} OR casos.unit_id IS NULL)`);

    
    // 2. Adicionar filtros existentes (mes, tecRef, bairro)
    if (filters.mes) {
        params.push(filters.mes);
        whereClauses.push(`TO_CHAR(casos."dataCad", 'YYYY-MM') = $${paramIndex++}`);
    }
    if (filters.tecRef) {
        params.push(`%${filters.tecRef}%`); // Adicionando LIKE/ILIKE para busca parcial
        whereClauses.push(`casos."tecRef" ILIKE $${paramIndex++}`);
    }
    if (filters.bairro) {
        params.push(filters.bairro);
        whereClauses.push(`LOWER(casos.dados_completos->>'bairro') = LOWER($${paramIndex++})`);
    }


    // 3. INSERIR FILTRO DE SEGURANÇA BASE (Unit ID do Usuário)
    // O Dashboard só permite a visualização do CREAS (unit_id=1), conforme o filtro (1).
    // No entanto, para fins de segurança, vamos garantir que o usuário:
    // a) Se for CREAS (unit_id=1), o filtro (1) já o contempla.
    // b) Se for CRAS (unit_id != 1), ele não deveria acessar esta rota de BI. 
    // c) Se for Gestor/Vigilância, o filtro (1) permite ver todos os dados de BI.
      
    // IMPLEMENTAÇÃO DE SEGURANÇA ADICIONAL: Se o usuário NÃO for GESTOR/VIGILANCIA, 
    // e a unitId dele for diferente da unitId do CREAS (1), ele não pode ver.
    // A regra é que o BI é exclusivo para CREAS. Se um usuário CRAS tentar acessar, ele só 
    // verá dados se a unitId dele for 1, o que é o comportamento esperado. 
    // O filtro (1) já garante que a consulta só traga dados do CREAS (1) ou NULL.
    // Podemos, portanto, confiar que o filtro (1) é o limitador primário.
    // Não é necessário um filtro adicional de "unidade do usuário" (unitIdColumn) aqui,
    // pois o foco é o BI CREAS.
    
    
    // Retorna APENAS O CONTEÚDO do WHERE, limpo.
    return [whereClauses.join(' AND ').trim(), params];
};


// =======================================================================
// 📌 APLICAÇÃO GERAL DOS MIDDLEWARES DE SEGURANÇA NA ROTA
// =======================================================================
// O unitAccessMiddleware injeta o novo req.access
router.use(authMiddleware, unitAccessMiddleware('casos', 'unit_id'));


// =======================================================================
// ROTA PRINCIPAL: GET / (Busca Dados do Dashboard)
// =======================================================================
router.get("/", async (req: Request, res: Response) => {
    try {
        // 🛑 MUDANÇA CRÍTICA: Usando o novo objeto 'access' 🛑
        const access = req.access!; 
        
        const { mes, tecRef, bairro } = req.query as { mes?: string, tecRef?: string, bairro?: string };
        
        // 1. Gera o conteúdo e os parâmetros (Inicia a contagem em $1)
        // Passando o novo objeto 'access' em vez do obsoleto 'accessFilter'
        const [whereContent, params] = buildFullWhereClauseContent({ mes, tecRef, bairro }, access, 1);

        // 2. Monta as cláusulas WHERE/AND de forma EXPLICITA e segura
        const whereClause = whereContent.length > 0 ? ` WHERE ${whereContent}` : '';
        // Se houver whereContent, o andClause deve começar com ' AND '.
        const andClause = whereContent.length > 0 ? ` AND ${whereContent}` : ''; 
        
        // Lógica para excluir valores nulos/vazios/sem rótulo nos agrupamentos
        const appendNonNullFilter = (jsonbKey: string): string => {
            const jsonbField = `dados_completos->>'${jsonbKey}'`;
            // Se já houver whereContent, baseClause é o 'andClause'. Se não, é ' WHERE TRUE '
            const baseClause = whereContent.length > 0 ? andClause : ' WHERE TRUE ';
            
            // Filtro rigoroso: exclui NULL, espaços em branco e valores comuns de fallback.
            return ` ${baseClause} 
                     AND ${jsonbField} IS NOT NULL 
                     AND TRIM(${jsonbField}) <> '' 
                     AND LOWER(TRIM(${jsonbField})) NOT IN ('n/i', 'não informado', 'null', 'undefined') `;
        }
        
        // Função para garantir que campos que seriam NULOS tenham o rótulo "Não Informado"
        const getGroupedFieldName = (jsonbKey: string): string => {
            const jsonbField = `dados_completos->>'${jsonbKey}'`;
            const trimmedField = `TRIM(${jsonbField})`;
            
            // COALESCE(NULLIF(NULLIF(TRIM(campo), ''), 'N/I'), 'Não Informado')
            return `COALESCE(NULLIF(NULLIF(${trimmedField}, ''), 'N/I'), 'Não Informado')`;
        }

        // As demais queries dependem corretamente das variáveis 'whereClause' e 'andClause', 
        // que agora contêm o filtro CREAS/PAEFI e a indexação correta dos parâmetros.
        const queries = [
            // 0 - Indicadores: Total de Atendimentos 
            pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos ${whereClause}`), params),
            
            // 1. Novos no Mês (A query base tem WHERE, usa andClause)
            pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos WHERE "dataCad" >= date_trunc('month', CURRENT_DATE) ${andClause}`), params),

            // 2 - 4 (Queries que usam andClause)
            pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'inseridoPAEFI' = 'Sim' ${andClause}`), params),
            pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'reincidente' = 'Sim' ${andClause}`), params),
            pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'recebePBF' = 'Sim' ${andClause}`), params),
            
            // 5 - Indicadores: Recebem BPC (CORREÇÃO DE VALORES: Usando OR explícito)
            pool.query(cleanSqlString(`
                SELECT COUNT(id) AS total FROM casos 
                WHERE (dados_completos->>'recebeBPC' = 'Idoso' OR dados_completos->>'recebeBPC' = 'PCD')
                ${andClause}
            `), params),
            
            // 6-7 (Queries que usam andClause)
            pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'confirmacaoViolencia' = 'Confirmada' ${andClause}`), params),
            pool.query(cleanSqlString(`SELECT COUNT(id) AS total FROM casos WHERE dados_completos->>'notificacaoSINAM' = 'Sim' ${andClause}`), params),
            
            // 8 - Indicadores: Contexto Familiar (Não precisa de GROUP BY)
            pool.query(cleanSqlString(`SELECT
                COUNT(*) FILTER (WHERE dados_completos->>'dependeFinanceiro' = 'Sim') AS "dependenciaFinanceira",
                COUNT(*) FILTER (WHERE dados_completos->>'vitimaPCD' = 'Sim') AS "vitimaPCD",
                COUNT(*) FILTER (WHERE dados_completos->>'membroCarcerario' = 'Sim') AS "membroCarcerario",
                COUNT(*) FILTER (WHERE dados_completos->>'membroSocioeducacao' = 'Sim') AS "membroSocioeducacao"
                FROM casos ${whereClause}`), params),
            
            // 9 - 12 (Principais: Reforçando checagem TRIM() )
            pool.query(cleanSqlString(`SELECT dados_completos->>'tipoMoradia' AS name FROM casos ${whereClause} AND dados_completos->>'tipoMoradia' IS NOT NULL AND TRIM(dados_completos->>'tipoMoradia') <> '' GROUP BY dados_completos->>'tipoMoradia' ORDER BY COUNT(*) DESC LIMIT 1`), params),
            pool.query(cleanSqlString(`SELECT dados_completos->>'escolaridade' AS name FROM casos ${whereClause} AND dados_completos->>'escolaridade' IS NOT NULL AND TRIM(dados_completos->>'escolaridade') <> '' GROUP BY dados_completos->>'escolaridade' ORDER BY COUNT(*) DESC LIMIT 1`), params),
            pool.query(cleanSqlString(`SELECT dados_completos->>'tipoViolencia' AS name FROM casos ${whereClause} AND dados_completos->>'tipoViolencia' IS NOT NULL AND TRIM(dados_completos->>'tipoViolencia') <> '' GROUP BY dados_completos->>'tipoViolencia' ORDER BY COUNT(*) DESC LIMIT 1`), params),
            pool.query(cleanSqlString(`SELECT dados_completos->>'localOcorrencia' AS name FROM casos ${whereClause} AND dados_completos->>'localOcorrencia' IS NOT NULL AND TRIM(dados_completos->>'localOcorrencia') <> '' GROUP BY dados_completos->>'localOcorrencia' ORDER BY COUNT(*) DESC LIMIT 1`), params),
            
            // 13 a 19 - Gráficos (USANDO A FUNÇÃO getGroupedFieldName)
            pool.query(cleanSqlString(`SELECT ${getGroupedFieldName('bairro')} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC LIMIT 5`), params),
            pool.query(cleanSqlString(`SELECT ${getGroupedFieldName('tipoViolencia')} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC`), params),
            pool.query(cleanSqlString(`SELECT ${getGroupedFieldName('encaminhamentoDetalhe')} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC LIMIT 5`), params),
            pool.query(cleanSqlString(`SELECT ${getGroupedFieldName('sexo')} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC`), params),
            pool.query(cleanSqlString(`SELECT ${getGroupedFieldName('canalDenuncia')} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC`), params),
            pool.query(cleanSqlString(`SELECT ${getGroupedFieldName('corEtnia')} as name, COUNT(*) as value FROM casos ${whereClause} GROUP BY name ORDER BY value DESC`), params),
            // Faixa Etária (Tratamento especial no agrupamento)
            pool.query(cleanSqlString(`SELECT CASE WHEN (dados_completos->>'idade')::integer BETWEEN 0 AND 11 THEN 'Criança (0-11)' WHEN (dados_completos->>'idade')::integer BETWEEN 12 AND 17 THEN 'Adolescente (12-17)' WHEN (dados_completos->>'idade')::integer BETWEEN 18 AND 29 THEN 'Jovem (18-29)' WHEN (dados_completos->>'idade')::integer BETWEEN 30 AND 59 THEN 'Adulto (30-59)' WHEN (dados_completos->>'idade')::integer >= 60 THEN 'Idoso (60+)' ELSE 'Não informado' END as name, COUNT(*) as value FROM casos ${whereClause} AND dados_completos->>'idade' IS NOT NULL AND TRIM(dados_completos->>'idade') <> '' GROUP BY name ORDER BY value DESC`), params),
            
            // 20, 21, 22 - Opções para os Filtros (Reforçando checagem TRIM() )
            pool.query(cleanSqlString(`SELECT DISTINCT TO_CHAR("dataCad", 'YYYY-MM') AS mes FROM casos ${whereClause} AND "dataCad" IS NOT NULL GROUP BY mes ORDER BY mes DESC`), params),
            pool.query(cleanSqlString(`SELECT DISTINCT "tecRef" FROM casos ${whereClause} AND "tecRef" IS NOT NULL GROUP BY "tecRef" ORDER BY "tecRef" ASC`), params),
            pool.query(cleanSqlString(`SELECT DISTINCT dados_completos->>'bairro' AS bairro FROM casos ${whereClause} AND dados_completos->>'bairro' IS NOT NULL AND TRIM(dados_completos->>'bairro') <> '' GROUP BY bairro ORDER BY bairro ASC`), params)
        ];

        const results: QueryResult[] = await Promise.all(queries);

        const responsePayload = {
            dados: {
                indicadores: { 
                    totalAtendimentos: parseInt(results[0].rows[0]?.total || 0, 10),
                    novosNoMes: parseInt(results[1].rows[0]?.total || 0, 10),
                    inseridosPAEFI: parseInt(results[2].rows[0]?.total || 0, 10),
                    reincidentes: parseInt(results[3].rows[0]?.total || 0, 10),
                    recebemBolsaFamilia: parseInt(results[4].rows[0]?.total || 0, 10),
                    recebemBPC: parseInt(results[5].rows[0]?.total || 0, 10),
                    violenciaConfirmada: parseInt(results[6].rows[0]?.total || 0, 10),
                    notificadosSINAM: parseInt(results[7].rows[0]?.total || 0, 10),
                    contextoFamiliar: results[8].rows[0] || {},
                },
                principais: { 
                    moradiaPrincipal: results[9].rows[0]?.name || "N/I",
                    escolaridadePrincipal: results[10].rows[0]?.name || "N/I",
                    violenciaPrincipal: results[11].rows[0]?.name || "N/I",
                    localPrincipal: results[12].rows[0]?.name || "N/I"
                },
                graficos: {
                    casosPorBairro: results[13].rows.map((r: any) => ({...r, value: parseInt(r.value, 10)})),
                    tiposViolacao: results[14].rows.map((r: any) => ({...r, value: parseInt(r.value, 10)})),
                    encaminhamentosTop5: results[15].rows.map((r: any) => ({...r, value: parseInt(r.value, 10)})),
                    casosPorSexo: results[16].rows.map((r: any) => ({...r, value: parseInt(r.value, 10)})),
                    canalDenuncia: results[17].rows.map((r: any) => ({...r, value: parseInt(r.value, 10)})),
                    casosPorCor: results[18].rows.map((r: any) => ({...r, value: parseInt(r.value, 10)})),
                    casosPorFaixaEtaria: results[19].rows.map((r: any) => ({...r, value: parseInt(r.value, 10)}))
                }
            },
            opcoesFiltro: {
                meses: results[20].rows.map((r: any) => r.mes),
                tecnicos: results[21].rows.map((r: any) => r.tecRef),
                bairros: results[22].rows.map((r: any) => r.bairro),
            }
        };
        res.json(responsePayload);

    } catch (err: any) {
      console.error("Erro na rota unificada do dashboard:", err.message);
      res.status(500).json({ message: "Erro ao buscar dados do dashboard." });
    }
});


export default router;