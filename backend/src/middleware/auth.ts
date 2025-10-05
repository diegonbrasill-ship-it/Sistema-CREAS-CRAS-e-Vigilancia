// backend/src/middleware/auth.ts

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UNIT_ID_CREAS } from "../utils/constants"; // Importa o ID fixo do CREAS

// Definição dos tipos de perfis expandidos
export type UserRole = 'gestor' | 'coordenador' | 'tecnico_superior' | 'tecnico_medio' | 'vigilancia';

// =======================================================
// 📌 INTERFACE DO PAYLOAD JWT
// unit_id é crucial para a segurança bidimensional.
// =======================================================
interface TokenPayload {
  id: number;
  username: string;
  role: UserRole | string; // Permitimos string para compatibilidade com dados antigos
  unit_id: number; 
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      // Corrigindo a tipagem para garantir que 'unit_id' esteja acessível
      user?: Omit<TokenPayload, 'iat' | 'exp'>;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ message: "Token de autenticação não fornecido." });
  }

  const [, token] = authorization.split(" ");

  try {
    const secret = process.env.JWT_SECRET || 'seu_segredo_padrao_para_testes';
    const data = jwt.verify(token, secret);
    
    const { id, username, role, unit_id } = data as TokenPayload;

    req.user = { id, username, role: role as UserRole, unit_id }; 

    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
};

/**
 * Middleware para checagem de permissão básica por role (Gestor e Coordenador)
 */
export const checkRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Acesso negado. Você não tem permissão para esta ação." });
    }

    return next();
  };
};


// =======================================================
// 📌 NOVO MIDDLEWARE CRÍTICO: ACESSO EXCLUSIVO AO CREAS
// =======================================================

/**
 * Middleware que garante que o usuário pertença EXCLUSIVAMENTE à unidade CREAS (Unit ID 1).
 * Usado para proteger as rotas do Módulo de MSE (Medida Socioeducativa).
 */
export const authorizeCreasOnly = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user || user.unit_id !== UNIT_ID_CREAS) {
        console.warn(`Tentativa de acesso MSE não autorizado. User Unit: ${user?.unit_id}`);
        return res.status(403).json({ 
            message: "Acesso restrito. Este módulo é exclusivo para a unidade CREAS." 
        });
    }

    next();
};

