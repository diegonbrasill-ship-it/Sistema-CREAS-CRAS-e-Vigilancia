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
      -- Gestor: todas as permissões
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id 
      FROM roles r, permissions p
      WHERE r.name = 'gestor'
      ON CONFLICT DO NOTHING;
  
      -- Coordenadores: todas as entidades, sem telas
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.name IN ('coordenador_creas', 'coordenador_cras')
        AND p.name NOT LIKE 'screen.%'
      ON CONFLICT DO NOTHING;
  
      -- Vigilância: somente telas
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.name = 'vigilancia'
        AND p.name LIKE 'screen.%'
      ON CONFLICT DO NOTHING;
  
      -- Técnicos: sem users.* e sem telas
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.name IN ('tecnico_superior', 'tecnico_medio', 'tecnico_cras')
        AND p.name NOT LIKE 'users.%'
        AND p.name NOT LIKE 'screen.%'
      ON CONFLICT DO NOTHING;
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM role_permissions
    WHERE role_id IN (
      SELECT id FROM roles
      WHERE name IN (
        'gestor',
        'coordenador_creas',
        'coordenador_cras',
        'vigilancia',
        'tecnico_superior',
        'tecnico_medio',
        'tecnico_cras'
      )
    );
  `);
};
