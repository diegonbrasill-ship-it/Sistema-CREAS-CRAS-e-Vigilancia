// backend/src/middleware/auth.ts

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UNIT_ID_CREAS } from "../utils/constants"; 

// Definição dos tipos de perfis expandidos
export type UserRole = 'gestor' | 'coordenador' | 'tecnico_superior' | 'tecnico_medio' | 'vigilancia';

// =======================================================
// 📌 FIX CRÍTICO: Exportamos a interface para que outros módulos possam usá-la
// =======================================================
export interface AuthenticatedUser { // AGORA EXPORTADA
  id: number;
  username: string;
  role: UserRole | string; 
  unit_id: number | null; 
}

// Interface que define o payload completo do JWT (inclui iat/exp)
interface TokenPayload extends AuthenticatedUser {
  iat: number;
  exp: number;
}

// Extensão da tipagem Request para incluir nosso filtro (acessível nas rotas)
declare global {
  namespace Express {
    interface Request {
      // Corrigindo a tipagem para garantir que 'unit_id' esteja acessível
      user?: AuthenticatedUser;
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
    
    // Converte unit_id para number ou null de forma segura
    const safeUnitId = unit_id ?? null;

    req.user = { id, username, role: role as UserRole, unit_id: safeUnitId } as AuthenticatedUser; 

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
// FIX FINAL: ACESSO EXCLUSIVO AO CREAS (Com exceção para o Gestor Geral)
// =======================================================

/**
 * Middleware que garante que o usuário pertença EXCLUSIVAMENTE à unidade CREAS (Unit ID 1).
 */
export const authorizeCreasOnly = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const userUnitId = user?.unit_id;
    const userRole = user?.role;

    // 1. EXCEÇÃO: Gestor Geral sempre pode acessar (visão de supervisão)
    if (userRole === 'gestor') {
        return next();
    }
    
    // 2. REGRA CREAS: Acesso é permitido APENAS se estiver lotado no CREAS (ID 1)
    if (!user || userUnitId !== UNIT_ID_CREAS) {
        console.warn(`Tentativa de acesso MSE não autorizado. User Unit: ${userUnitId}`);
        return res.status(403).json({ 
            message: "Acesso restrito. Este módulo é exclusivo para a unidade CREAS." 
        });
    }

    next();
};

