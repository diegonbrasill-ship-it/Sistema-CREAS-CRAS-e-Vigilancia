/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {void}
 */
exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO unidades (id, name, type, created_at, updated_at)
    VALUES
      (1, 'CREAS', 'CREAS', NOW(), NOW()),
      (2, 'CRAS Geralda Medeiros', 'CRAS', NOW(), NOW()),
      (3, 'CRAS Mariana Alves', 'CRAS', NOW(), NOW()),
      (4, 'CRAS Matheus Leitão', 'CRAS', NOW(), NOW()),
      (5, 'CRAS Severina Celestino', 'CRAS', NOW(), NOW()),
      (6, 'Vigilancia SocioAssistencial', 'Vigilancia', NOW(), NOW()),
      (7, 'Centro POP', 'Centro POP', NOW(), NOW()),
      (8, 'Conselho Tutelar Norte', 'Conselho Tutelar', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        type = EXCLUDED.type,
        updated_at = NOW();
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {void}
 */
exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM unidades
    WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8);
  `);
};
