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
        -- 1. GESTOR (4) e ADMIN (8): Todas as permissões
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id 
        FROM roles r, permissions p
        WHERE r.id IN (4, 8)
        ON CONFLICT DO NOTHING;
    
        -- 2. COORDENADORES (3, 6): Todas as entidades (1-35), sem telas (screen.%)
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r, permissions p
        WHERE r.id IN (3, 6) 
          AND p.name NOT LIKE 'screen.%'
        ON CONFLICT DO NOTHING;
    
        -- 3. VIGILÂNCIA (5): Somente as telas (screen.%)
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r, permissions p
        WHERE r.id = 5 
          AND p.name LIKE 'screen.%'
        ON CONFLICT DO NOTHING;
    
        -- 4. TÉCNICOS (1, 2, 7): Sem 'users.%' e sem 'screen.%'
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r, permissions p
        WHERE r.id IN (1, 2, 7)
          AND p.name NOT LIKE 'users.%'
          AND p.name NOT LIKE 'screen.%'
        ON CONFLICT DO NOTHING;
      `)
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.sql(`
        DELETE * FROM role_permissions
        `)
};
