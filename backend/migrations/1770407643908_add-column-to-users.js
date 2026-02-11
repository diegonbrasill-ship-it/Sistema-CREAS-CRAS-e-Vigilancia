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
    pgm.sql(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role_id INTEGER,
    ADD CONSTRAINT fk_user_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
    `)
};
