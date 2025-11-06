"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CASOS_SQL = void 0;
exports.CASOS_SQL = {
    CLEAN: (sql) => sql.replace(/\s+/g, ' ').trim(),
    INSERT: `
      INSERT INTO casos (nome, "dataCad", "tecRef", status, unaxit_id, "userId", dados_completos)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    SELECT_BASE: `
      SELECT id, "dataCad", "tecRef", nome, status,
             dados_completos->>'bairro' AS bairro,
             dados_completos->>'confirmacaoViolencia' AS "confirmacaoViolencia",
             dados_completos->>'membroSocioeducacao' AS "membroSocioeducacao",
             unit_id
      FROM casos
    `,
    SELECT_BY_ID: `
      SELECT * FROM casos WHERE id = $1
    `,
    UPDATE: `
      UPDATE casos SET "dataCad"=$1, "tecRef"=$2, nome=$3, dados_completos=$4 WHERE id=$5
    `,
    UPDATE_STATUS: `
      UPDATE casos SET status = $1 WHERE id = $2 RETURNING nome
    `,
    DELETE: `
      DELETE FROM casos WHERE id = $1 RETURNING nome
    `,
    SELECT_FROM_DEMANDAS: '',
};
