// backend/routes/vigilancia.ts

import express, { Request, Response } from "express";
import pool from "../db";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();


// =======================================================================
// 📊 ROTAS DE KPI / DASHBOARD (sem middleware de autenticação)
// =======================================================================

/**
 * @route   GET /sobrecarga-equipe
 * @desc    Calcula a média de casos por técnico (sem autenticação)
 */
router.get("/sobrecarga-equipe", async (req: Request, res: Response) => {
  try {
    const totalTecnicosQuery = `SELECT COUNT(*) AS total FROM users WHERE role = 'tecnico';`;
    const totalCasosAtivosQuery = `SELECT COUNT(*) AS total FROM casos;`;

    const [tecnicosResult, casosResult] = await Promise.all([
      pool.query(totalTecnicosQuery),
      pool.query(totalCasosAtivosQuery),
    ]);

    const totalTecnicos = parseInt(tecnicosResult.rows[0].total, 10);
    const totalCasosAtivos = parseInt(casosResult.rows[0].total, 10);

    const mediaCasosPorTecnico =
      totalTecnicos > 0 ? totalCasosAtivos / totalTecnicos : 0;

    res.json({
      mediaCasosPorTecnico: parseFloat(mediaCasosPorTecnico.toFixed(1)),
      totalCasosAtivos,
      totalTecnicos,
      limiteRecomendado: 50,
    });
  } catch (err: any) {
    console.error("Erro ao buscar dados para KPI de sobrecarga:", err.message);
    res.status(500).send("Erro no servidor");
  }
});

/**
 * @route   GET /fluxo-demanda
 * @desc    Casos novos nos últimos 30 dias (sem autenticação)
 */
router.get("/fluxo-demanda", async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT COUNT(*) AS total 
      FROM casos 
      WHERE "dataCad" >= NOW() - INTERVAL '30 days';
    `;
    const result = await pool.query(query);

    res.json({ casosNovosUltimos30Dias: parseInt(result.rows[0].total, 10) });
  } catch (err: any) {
    console.error("Erro ao buscar dados para KPI de fluxo de demanda:", err.message);
    res.status(500).send("Erro no servidor");
  }
});

/**
 * @route   GET /reincidencia
 * @desc    Calcula reincidência em 1 ano (sem autenticação)
 */
router.get("/reincidencia", async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        COUNT(*) AS total_casos,
        COUNT(*) FILTER (WHERE (dados_completos->>'reincidente')::boolean = true) AS casos_reincidentes
      FROM casos
      WHERE "dataCad" >= NOW() - INTERVAL '1 year';
    `;
    const result = await pool.query(query);

    const total = parseInt(result.rows[0].total_casos, 10);
    const reincidentes = parseInt(result.rows[0].casos_reincidentes, 10);
    const taxa = total > 0 ? (reincidentes / total) * 100 : 0;

    res.json({
      taxaReincidencia: parseFloat(taxa.toFixed(1)),
      totalCasosReincidentes: reincidentes,
      totalCasosPeriodo: total,
    });
  } catch (err: any) {
    console.error("Erro ao buscar dados para KPI de reincidência:", err.message);
    res.status(500).send("Erro no servidor");
  }
});

/**
 * @route   GET /incidencia-bairros
 * @desc    Mapa de incidência por bairro (sem autenticação)
 */
router.get("/incidencia-bairros", async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        dados_completos->>'bairro' AS bairro, 
        COUNT(*) as casos 
      FROM casos 
      WHERE dados_completos->>'bairro' IS NOT NULL AND dados_completos->>'bairro' <> ''
      GROUP BY dados_completos->>'bairro'
      ORDER BY casos DESC;
    `;
    const result = await pool.query(query);

    res.json(result.rows);
  } catch (err: any) {
    console.error("Erro ao buscar dados para o mapa de incidência:", err.message);
    res.status(500).send("Erro no servidor");
  }
});

/**
 * @route   GET /fontes-acionamento
 * @desc    Fontes de denúncia (sem autenticação)
 */
router.get("/fontes-acionamento", async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        dados_completos->>'canalDenuncia' AS fonte, 
        COUNT(*) as quantidade 
      FROM casos 
      WHERE dados_completos->>'canalDenuncia' IS NOT NULL AND dados_completos->>'canalDenuncia' <> ''
      GROUP BY dados_completos->>'canalDenuncia'
      ORDER BY quantidade DESC;
    `;
    const result = await pool.query(query);

    res.json(result.rows);
  } catch (err: any) {
    console.error("Erro ao buscar dados para fontes de acionamento:", err.message);
    res.status(500).send("Erro no servidor");
  }
});

/**
 * @route   GET /perfil-violacoes
 * @desc    Perfil dos tipos de violência (sem autenticação)
 */
router.get("/perfil-violacoes", async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        dados_completos->>'tipoViolencia' AS tipo, 
        COUNT(*) as quantidade 
      FROM casos 
      WHERE dados_completos->>'tipoViolencia' IS NOT NULL AND dados_completos->>'tipoViolencia' <> ''
      GROUP BY dados_completos->>'tipoViolencia'
      ORDER BY quantidade DESC;
    `;
    const result = await pool.query(query);

    res.json(result.rows);
  } catch (err: any) {
    console.error("Erro ao buscar dados para perfil de violações:", err.message);
    res.status(500).send("Erro no servidor");
  }
});


// =======================================================================
// 🔐 ROTAS AUTENTICADAS (usam authMiddleware)
// =======================================================================

/**
 * @route   GET /api/vigilancia/fluxo-demanda
 * @desc    Casos novos nos últimos 30 dias (com autenticação)
 */
router.get("/fluxo-demanda", authMiddleware, async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT COUNT(id) AS "total"
      FROM casos
      WHERE "dataCad" >= CURRENT_DATE - INTERVAL '30 days';
    `;
    const result = await pool.query(query);

    res.json({ casosNovosUltimos30Dias: parseInt(result.rows[0].total, 10) });
  } catch (err: any) {
    console.error("Erro ao buscar fluxo de demanda:", err.message);
    res.status(500).json({ message: "Erro interno no servidor." });
  }
});

/**
 * @route   GET /api/vigilancia/sobrecarga-equipe
 * @desc    Média de casos por técnico (com autenticação)
 */
router.get("/sobrecarga-equipe", authMiddleware, async (req: Request, res: Response) => {
  try {
    const totalCasosResult = await pool.query(`SELECT COUNT(id) as "total" FROM casos`);
    const totalCasos = parseInt(totalCasosResult.rows[0].total, 10);

    const totalTecnicosResult = await pool.query(
      `SELECT COUNT(DISTINCT "tecRef") as "total" FROM casos`
    );
    const totalTecnicos = parseInt(totalTecnicosResult.rows[0].total, 10);

    const mediaCasos = totalTecnicos > 0 ? totalCasos / totalTecnicos : 0;

    res.json({
      mediaCasosPorTecnico: parseFloat(mediaCasos.toFixed(1)),
      limiteRecomendado: 25,
    });
  } catch (err: any) {
    console.error("Erro ao calcular sobrecarga da equipe:", err.message);
    res.status(500).json({ message: "Erro interno no servidor." });
  }
});

/**
 * @route   GET /api/vigilancia/incidencia-bairros
 * @desc    Casos por bairro (com autenticação)
 */
router.get("/incidencia-bairros", authMiddleware, async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        dados_completos->>'bairro' AS bairro,
        COUNT(id)::int AS casos
      FROM casos
      WHERE dados_completos->>'bairro' IS NOT NULL 
        AND dados_completos->>'bairro' <> ''
      GROUP BY bairro
      ORDER BY casos DESC;
    `;
    const result = await pool.query(query);

    res.json(result.rows);
  } catch (err: any) {
    console.error("Erro ao buscar incidência por bairros:", err.message);
    res.status(500).json({ message: "Erro interno no servidor." });
  }
});

/**
 * @route   GET /api/vigilancia/fontes-acionamento
 * @desc    Canais de denúncia (com autenticação)
 */
router.get("/fontes-acionamento", authMiddleware, async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        dados_completos->>'canalDenuncia' AS fonte,
        COUNT(id)::int AS quantidade
      FROM casos
      WHERE dados_completos->>'canalDenuncia' IS NOT NULL 
        AND dados_completos->>'canalDenuncia' <> ''
      GROUP BY fonte
      ORDER BY quantidade DESC;
    `;
    const result = await pool.query(query);

    res.json(result.rows);
  } catch (err: any) {
    console.error("Erro ao buscar fontes de acionamento:", err.message);
    res.status(500).json({ message: "Erro interno no servidor." });
  }
});

/**
 * @route   GET /api/vigilancia/taxa-reincidencia
 * @desc    Taxa de reincidência nos últimos 12 meses (com autenticação)
 */
router.get("/taxa-reincidencia", authMiddleware, async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        COUNT(id) AS "totalCasos",
        COUNT(id) FILTER (WHERE dados_completos->>'reincidente' = 'Sim') AS "casosReincidentes"
      FROM casos
      WHERE "dataCad" >= NOW() - INTERVAL '1 year';
    `;
    const result = await pool.query(query);

    const total = parseInt(result.rows[0].totalCasos, 10);
    const reincidentes = parseInt(result.rows[0].casosReincidentes, 10);
    const taxa = total > 0 ? (reincidentes / total) * 100 : 0;

    res.json({ taxaReincidencia: parseFloat(taxa.toFixed(1)) });
  } catch (err: any) {
    console.error("Erro ao calcular taxa de reincidência:", err.message);
    res.status(500).json({ message: "Erro interno no servidor." });
  }
});


export default router;
