// backend/src/routes/anexos.ts

import express, { Request, Response } from 'express';
import pool from '../db';
import { authMiddleware } from '../middleware/auth';
import upload from '../middleware/upload';
import { logAction } from '../services/logger';
import path from 'path';
import fs from 'fs';

const router = express.Router();

router.use(authMiddleware); // Protege todas as rotas de anexo

// =======================================================================
// ROTA ANTIGA (mantida): Upload de anexo para um CASO
// =======================================================================
router.post(
  '/upload/caso/:casoId', 
  upload.single('anexo'), 
  async (req: Request, res: Response) => {
    
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo foi enviado.' });
    }

    const { casoId } = req.params;
    const { descricao } = req.body;
    const { id: userId, username } = req.user!;
    const { originalname, filename, path: filePath, mimetype, size } = req.file;

    try {
      const query = `
        INSERT INTO anexos 
          ("casoId", "userId", "nomeOriginal", "nomeArmazenado", "caminhoArquivo", "tipoArquivo", "tamanhoArquivo", descricao)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, "nomeOriginal";
      `;
      const result = await pool.query(query, [
        casoId, userId, originalname, filename, filePath, mimetype, size, descricao
      ]);
      const novoAnexo = result.rows[0];

      await logAction({
        userId,
        username,
        action: 'UPLOAD_CASE_ATTACHMENT',
        details: { casoId, anexoId: novoAnexo.id, nomeArquivo: novoAnexo.nomeOriginal }
      });

      res.status(201).json({ message: 'Arquivo enviado com sucesso!', anexo: novoAnexo });
    } catch (err: any) {
      console.error('Erro ao salvar informações do anexo no banco de dados:', err.message);
      res.status(500).json({ message: 'Erro no servidor ao registrar o anexo.' });
    }
});

// =======================================================================
// 📌 NOVA ROTA: Upload de anexo para uma DEMANDA
// =======================================================================
router.post(
    '/upload/demanda/:demandaId',
    upload.single('anexo'),
    async (req: Request, res: Response) => {
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum arquivo foi enviado.' });
        }

        const { demandaId } = req.params;
        const { descricao } = req.body;
        const { id: userId, username } = req.user!;
        const { originalname, filename, path: filePath, mimetype, size } = req.file;

        try {
            const query = `
                INSERT INTO anexos
                  ("demandaId", "userId", "nomeOriginal", "nomeArmazenado", "caminhoArquivo", "tipoArquivo", "tamanhoArquivo", descricao)
                VALUES
                  ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, "nomeOriginal";
            `;
            const result = await pool.query(query, [
                demandaId, userId, originalname, filename, filePath, mimetype, size, descricao
            ]);
            const novoAnexo = result.rows[0];

            await logAction({
                userId,
                username,
                action: 'UPLOAD_DEMAND_ATTACHMENT',
                details: { demandaId, anexoId: novoAnexo.id, nomeArquivo: novoAnexo.nomeOriginal }
            });

            res.status(201).json({ message: 'Arquivo enviado com sucesso!', anexo: novoAnexo });
        } catch (err: any) {
            console.error(`Erro ao anexar arquivo à demanda ${demandaId}:`, err.message);
            res.status(500).json({ message: 'Erro no servidor ao registrar o anexo.' });
        }
    }
);


// ROTA para listar os anexos de um CASO
router.get('/casos/:casoId', async (req: Request, res: Response) => {
  const { casoId } = req.params;
  try {
    const query = `
      SELECT
        anex.id, anex."nomeOriginal", anex."tamanhoArquivo",
        anex."dataUpload", anex.descricao, usr.username AS "uploadedBy"
      FROM anexos anex
      LEFT JOIN users usr ON anex."userId" = usr.id
      WHERE anex."casoId" = $1
      ORDER BY anex."dataUpload" DESC;
    `;
    const result = await pool.query(query, [casoId]);
    res.json(result.rows);
  } catch (err: any) {
    console.error(`Erro ao listar anexos para o caso ${casoId}:`, err.message);
    res.status(500).json({ message: 'Erro ao buscar anexos.' });
  }
});

// ROTA para permitir o DOWNLOAD de um anexo
router.get('/download/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const query = `SELECT "caminhoArquivo", "nomeOriginal" FROM anexos WHERE id = $1`;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Anexo não encontrado.' });
    }

    const anexo = result.rows[0];
    // Caminho relativo à raiz do projeto, não ao diretório 'dist'
    const filePath = path.resolve(anexo.caminhoArquivo);

    if (fs.existsSync(filePath)) {
      res.download(filePath, anexo.nomeOriginal, (err) => {
        if (err) {
          console.error('Erro durante o download do arquivo:', err);
        }
      });
    } else {
      console.error(`Arquivo não encontrado no disco: ${filePath}`);
      res.status(404).json({ message: 'Arquivo não encontrado no servidor.' });
    }
  } catch (err: any) {
    console.error(`Erro ao processar download do anexo ${id}:`, err.message);
    res.status(500).json({ message: 'Erro ao processar download.' });
  }
});


export default router;