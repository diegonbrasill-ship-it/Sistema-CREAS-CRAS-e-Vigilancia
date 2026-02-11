/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    pgm.sql(
        `INSERT INTO permissions (name, description, created_at, updated_at)
    VALUES
        --Permissões a outras telas
        ('screen.integrations.access', 'Acesso a tela de Integrações', NOW(), NOW()),
        ('screen.relatorios.access', 'Acesso a tela de Relatórios', NOW(), NOW())
    ON CONFLICT (name) DO NOTHING;
    `)
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.sql(
        `DELETE FROM permissions
      WHERE name IN ('screen.integrations.access', 'screen.relatorios.access');
    `
    )
};
