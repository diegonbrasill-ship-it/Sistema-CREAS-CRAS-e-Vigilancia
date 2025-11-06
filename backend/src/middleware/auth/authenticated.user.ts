
export type UserRole = 'gestor' | 'coordenador' | 'tecnico_superior' | 'tecnico_medio' | 'vigilancia';

export interface AuthenticatedUser {
    id: number;
    username: string;
    role: UserRole | string;
    unit_id: number | null;
}

export interface TokenPayload extends AuthenticatedUser {
    iat: number;
    exp: number;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
            accessFilter?: {
                whereClause: string;
                params: (string | number)[];
            };
        }
    }
}
