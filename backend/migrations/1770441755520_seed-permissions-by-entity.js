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
      INSERT INTO roles (name, description, created_at, updated_at)
      VALUES
        ('tecnico_superior', 'Técnico de Nível Superior', NOW(), NOW()),
        ('tecnico_medio', 'Técnico de Nível Médio', NOW(), NOW()),
        ('coordenador_creas', 'Coordenador(a) CREAS', NOW(), NOW()),
        ('gestor', 'Secretário(a) / Gestor Geral', NOW(), NOW()),
        ('vigilancia', 'Vigilância Socioassistencial', NOW(), NOW()),
        ('coordenador_cras', 'Coordenador(a) CRAS', NOW(), NOW()),
        ('tecnico_cras', 'Técnico(a) CRAS', NOW(), NOW())
      ON CONFLICT (name) DO UPDATE
      SET description = EXCLUDED.description,
          updated_at = NOW();

      INSERT INTO permissions (name, description, created_at, updated_at)
      VALUES
        ('users.create', 'Criação de usuários', NOW(), NOW()),
        ('users.read', 'Leitura de usuários', NOW(), NOW()),
        ('users.edit', 'Edição de usuários', NOW(), NOW()),
        ('users.delete', 'Exclusão de usuários', NOW(), NOW()),
        ('users.archive', 'Arquivamento de usuários', NOW(), NOW()),
        ('units.create', 'Criação de unidades', NOW(), NOW()),
        ('units.read', 'Leitura de unidades', NOW(), NOW()),
        ('units.edit', 'Edição de unidades', NOW(), NOW()),
        ('units.delete', 'Exclusão de unidades', NOW(), NOW()),
        ('units.archive', 'Arquivamento de unidades', NOW(), NOW()),
        ('casos.create', 'Criação de casos', NOW(), NOW()),
        ('casos.read', 'Leitura de casos', NOW(), NOW()),
        ('casos.edit', 'Edição de casos', NOW(), NOW()),
        ('casos.delete', 'Exclusão de casos', NOW(), NOW()),
        ('casos.archive', 'Arquivamento de casos', NOW(), NOW()),
        ('mse.create', 'Criação de MSE', NOW(), NOW()),
        ('mse.read', 'Leitura de MSE', NOW(), NOW()),
        ('mse.edit', 'Edição de MSE', NOW(), NOW()),
        ('mse.delete', 'Exclusão de MSE', NOW(), NOW()),
        ('mse.archive', 'Arquivamento de MSE', NOW(), NOW()),
        ('demandas.create', 'Criação de demandas', NOW(), NOW()),
        ('demandas.read', 'Leitura de demandas', NOW(), NOW()),
        ('demandas.edit', 'Edição de demandas', NOW(), NOW()),
        ('demandas.delete', 'Exclusão de demandas', NOW(), NOW()),
        ('demandas.archive', 'Arquivamento de demandas', NOW(), NOW()),
        ('anexos.create', 'Criação de anexos', NOW(), NOW()),
        ('anexos.read', 'Leitura de anexos', NOW(), NOW()),
        ('anexos.edit', 'Edição de anexos', NOW(), NOW()),
        ('anexos.delete', 'Exclusão de anexos', NOW(), NOW()),
        ('anexos.archive', 'Arquivamento de anexos', NOW(), NOW()),
        ('encaminhamentos.create', 'Criação de encaminhamentos', NOW(), NOW()),
        ('encaminhamentos.read', 'Leitura de encaminhamentos', NOW(), NOW()),
        ('encaminhamentos.edit', 'Edição de encaminhamentos', NOW(), NOW()),
        ('encaminhamentos.delete', 'Exclusão de encaminhamentos', NOW(), NOW()),
        ('encaminhamentos.archive', 'Arquivamento de encaminhamentos', NOW(), NOW()),
        ('screen.dashboard.access', 'Acesso à tela de dashboard geral', NOW(), NOW()),
        ('screen.vigilancia.access', 'Acesso à tela de vigilância socioassistencial', NOW(), NOW()),
        ('screen.integrations.access', 'Acesso a tela de Integrações', NOW(), NOW()),
        ('screen.relatorios.access', 'Acesso a tela de Relatórios', NOW(), NOW())
      ON CONFLICT (name) DO UPDATE
      SET description = EXCLUDED.description,
          updated_at = NOW();
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.sql(`
      DELETE FROM roles
      WHERE name IN (
        'tecnico_superior',
        'tecnico_medio',
        'coordenador_creas',
        'gestor',
        'vigilancia',
        'coordenador_cras',
        'tecnico_cras'
      );

      DELETE FROM permissions 
      WHERE name LIKE '%.create' 
         OR name LIKE '%.read' 
         OR name LIKE '%.edit' 
         OR name LIKE '%.delete' 
         OR name LIKE '%.archive'
         OR name LIKE 'screen.%';
    `);
};
