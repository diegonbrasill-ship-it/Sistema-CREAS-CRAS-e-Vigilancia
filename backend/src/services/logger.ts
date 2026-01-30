// backend/src/services/logger.ts
import pool from '../db';

interface LogOptions {
  user_id?: number;
  username?: string;
  action: string;
  details?: object;
}

export async function logAction({ user_id, username, action, details }: LogOptions): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO logs ("user_id", username, action, details) VALUES ($1, $2, $3, $4)`,
      [user_id, username, action, details ? JSON.stringify(details) : null]
    );
  } catch (error) {
    console.error("Falha ao registrar ação no log de auditoria:", error);
    // Em um sistema real, poderíamos ter um alerta aqui (email, etc.)
  }
}