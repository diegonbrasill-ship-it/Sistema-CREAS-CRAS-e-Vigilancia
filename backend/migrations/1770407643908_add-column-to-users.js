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
      ADD COLUMN IF NOT EXISTS role_id INTEGER;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_user_role'
            AND table_name = 'users'
        ) THEN
          ALTER TABLE users
          ADD CONSTRAINT fk_user_role
            FOREIGN KEY (role_id)
            REFERENCES roles(id);
        END IF;
      END $$;
    `)
};

exports.down = (pgm) => {
    pgm.sql(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_user_role;
      ALTER TABLE users DROP COLUMN IF EXISTS role_id;
    `);
};
