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
    //-- Atualiza a coluna role_id baseada no nome que está na coluna role
    pgm.sql(  
        `UPDATE users u
        SET role_id = r.id
        FROM roles r
        WHERE u.role = r.name;
      `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    // Reverter essa operação geralmente significa limpar os IDs
    pgm.sql(`UPDATE users SET role_id = NULL;`);
};
