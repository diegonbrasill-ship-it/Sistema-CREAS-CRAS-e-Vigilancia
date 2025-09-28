// backend/src/middleware/auth.ts

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface TokenPayload {
  id: number;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
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
    const { id, username, role } = data as TokenPayload;

    req.user = { id, username, role } as TokenPayload;

    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
};

// AQUI ESTÁ A FUNÇÃO QUE FALTAVA SER EXPORTADA
export const checkRole = (rolesPermitidas: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole || !rolesPermitidas.includes(userRole)) {
      return res.status(403).json({ message: "Acesso negado. Você não tem permissão para esta ação." });
    }

    return next();
  };
};

