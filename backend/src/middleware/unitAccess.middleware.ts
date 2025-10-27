// backend/src/middleware/unitAccess.middleware.ts (VERSÃO REFATORADA PARA INJETOR DE DADOS SIMPLES)

import { Request, Response, NextFunction } from "express";
import { UNIT_ID_CREAS, UNIT_ID_VIGILANCIA } from "../utils/constants"; 
import { AuthenticatedUser } from "./auth"; 

// ⭐️ CONSTANTES DO PROJETO ⭐️
const CRAS_UNIT_IDS = [2, 3, 4, 5];

// Extensão da tipagem Request para incluir o objeto de acesso simplificado
declare global {
    namespace Express {
        interface Request {
            // 🛑 NOVO OBJETO DE ACESSO: Simples, sem cláusulas SQL pré-montadas.
            access?: {
                userUnitId: number | null;
                isGestorGeral: boolean;
                isVigilancia: boolean;
                // Exemplo de unidades que o Gestor deve ver
                crasUnitIds: number[];
            };
        }
    }
}


/**
 * Middleware REFATORADO: Apenas verifica o perfil e injeta dados de acesso.
 * A construção da cláusula WHERE (a complexidade) é movida para a rota.
 */
export const unitAccessMiddleware = (tableName: string, unitIdColumn: string = 'unit_id') => {
    
    // NOTE: O tableName/unitIdColumn não são mais necessários neste middleware
    // refatorado, mas mantemos a assinatura para compatibilidade futura se necessário.

    return (req: Request, res: Response, next: NextFunction) => {
        
        const user = req.user as AuthenticatedUser | undefined;
        
        // 1. Checagem de Segurança Básica
        if (!user) {
            return res.status(401).json({ message: "Acesso não autorizado: Usuário ausente." });
        }

        const userRole = user.role.toLowerCase();
        const isGestorGeral = userRole === 'gestor';
        const isVigilancia = userRole === 'vigilancia';
        
        // 2. REGRA DE SEGURANÇA: Bloqueia usuários restritos sem lotação
        // Gestor e Vigilância podem ter unit_id nulo (por convenção, mas isso deve ser tratado na rota)
        if (!isGestorGeral && !isVigilancia && (user.unit_id === null || user.unit_id === undefined)) {
            console.error(`ERRO DE SEGURANÇA: Usuário restrito sem unit_id. Role: ${user.role}`);
            return res.status(403).json({ message: "Acesso negado. Servidor sem unidade de lotação definida." });
        }

        // 3. INJEÇÃO DO OBJETO DE ACESSO SIMPLIFICADO
        req.access = {
            userUnitId: user.unit_id,
            isGestorGeral: isGestorGeral,
            isVigilancia: isVigilancia,
            crasUnitIds: CRAS_UNIT_IDS, // IDs de todas as unidades CRAS
        };

        // 🛑 REMOVIDO: NENHUMA LÓGICA SQL OU accessFilter.whereClause AQUI! 🛑
        next();
    };
};