// backend/src/services/logger.ts
import pool from '../db';

interface LogOptions {
  userId?: number;
  username?: string;
  action: string;
  details?: object;
}

export async function logAction({ userId, username, action, details }: LogOptions): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO logs ("userId", username, action, details) VALUES ($1, $2, $3, $4)`,
      [userId, username, action, details ? JSON.stringify(details) : null]
    );
  } catch (error) {
    console.error("Falha ao registrar ação no log de auditoria:", error);
    // Em um sistema real, poderíamos ter um alerta aqui (email, etc.)
  }
}