export const CASOS_SQL = {

  CLEAN: (sql: string) => sql.replace(/\s+/g, ' ').trim(),

  INSERT: `
      INSERT INTO casos (nome, data_cad, tec_ref, status, unit_id, user_id, dados_completos)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,

  SELECT_BASE: `
      SELECT id, data_cad, tec_ref, nome, status,
             dados_completos->>'bairro' AS bairro,
             dados_completos->>'confirmacaoViolencia' AS "confirmacaoViolencia",
             dados_completos->>'membroSocioeducacao' AS "membroSocioeducacao",
             unit_id
      FROM casos
    `,
  SELECT_BY_ID: `
      SELECT * FROM casos
    `,
  UPDATE: `
      UPDATE casos SET data_cad=$1, tec_ref=$2, nome=$3, dados_completos=$4 WHERE id=$5
    `,
  UPDATE_STATUS: `
      UPDATE casos SET status = $1 WHERE id = $2 RETURNING nome
    `,
  DELETE: `
      DELETE FROM casos WHERE id = $1 RETURNING nome
    `,
  SELECT_FROM_DEMANDAS: '',

};
