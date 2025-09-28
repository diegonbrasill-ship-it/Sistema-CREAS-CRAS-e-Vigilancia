// backend/src/middleware/upload.ts

import multer from 'multer';
import path from 'path';
import { Request } from 'express';

// 1. Configuração do Armazenamento
const storage = multer.diskStorage({
  // Define a pasta de destino para os arquivos
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Salva os arquivos na pasta 'uploads' que criamos
  },
  // Define como o arquivo será nomeado
  filename: (req, file, cb) => {
    // Para garantir um nome único, usamos a data atual em milissegundos + nome original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// 2. Filtro de Arquivos (para segurança)
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Define os tipos de arquivo permitidos (MIME types)
  const allowedTypes = [
    'application/pdf', // .pdf
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'image/jpeg', // .jpeg, .jpg
    'image/png' // .png
  ];

  if (allowedTypes.includes(file.mimetype)) {
    // Se o tipo do arquivo estiver na lista, aceite-o
    cb(null, true);
  } else {
    // Se não, rejeite o arquivo com uma mensagem de erro
    cb(new Error('Tipo de arquivo não suportado. Apenas PDF, DOC, DOCX, JPG e PNG são permitidos.'));
  }
};

// 3. Criação e Exportação da Instância do Multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // Limite de 5MB por arquivo
  },
  fileFilter: fileFilter
});

export default upload;