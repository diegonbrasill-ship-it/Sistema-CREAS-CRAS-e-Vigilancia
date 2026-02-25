export const Units = {
    1: 'CREAS',
    2: 'CRAS Geralda Medeiros',
    3: 'CRAS Mariana Alves',
    4: 'CRAS Matheus Leitão',
    5: 'CRAS Severina Celestino',
    6: 'Vigilancia SocioAssistencial',
    7: 'Centro POP',
    8: 'Conselho Tutelar Norte'
}
export const Roles = {
    1: 'Técnico de Nível Superior',
    2: 'Técnico de Nível Médio',
    3: 'Coordenador(a) CREAS',
    4: 'Secretário(a) / Gestor Geral',
    5: 'Vigilância Socioassistencial',
    6: 'Coordenador(a) CRAS',
    7: 'Técnico(a) CRAS',
    8: 'Administrador Sistema',
}

export const UNIT_OPTIONS = [
    { id: 1, nome: 'CREAS' },
    // { id: 2, nome: 'CRAS Geralda Medeiros' }, { id: 3, nome: 'CRAS Mariana Alves' }, { id: 4, nome: 'CRAS Matheus Leitão' }, { id: 5, nome: 'CRAS Severina Celestino' },
    { id: 6, nome: 'Vigilancia SocioAssistencial' },
    //{ id: 7, nome: 'Centro POP' }, { id: 8, nome: 'Conselho Tutelar Norte' },
];

export const ROLE_OPTIONS = [
    { id: 1, value: "tecnico_superior", label: "Técnico de Nível Superior" },
    { id: 2, value: "tecnico_medio", label: "Técnico de Nível Médio" },
    { id: 3, value: "coordenador_creas", label: "Coordenador(a) CREAS" },
    { id: 4, value: "gestor", label: "Secretário(a) / Gestor Geral" },
    { id: 5, value: "vigilancia", label: "Vigilância Socioassistencial" },
    //{ id: 6, value: "coordenador_cras", label: "Coordenador(a) CRAS" },
    //{ id: 7, value: "tecnico_cras", label: "Técnico(a) CRAS" },
];

export const entityPermissions = {
    users: [
      "users.create",
      "users.read",
      "users.edit",
      "users.delete",
      "users.archive",
    ],
    units: [
      "units.create",
      "units.read",
      "units.edit",
      "units.delete",
      "units.archive",
    ],
    casos: [
      "casos.create",
      "casos.read",
      "casos.edit",
      "casos.delete",
      "casos.archive",
    ],
    mse: [
      "mse.create",
      "mse.read",
      "mse.edit",
      "mse.delete",
      "mse.archive",
    ],
    demandas: [
      "demandas.create",
      "demandas.read",
      "demandas.edit",
      "demandas.delete",
      "demandas.archive",
    ],
    anexos: [
      "anexos.create",
      "anexos.read",
      "anexos.edit",
      "anexos.delete",
      "anexos.archive",
    ],
    encaminhamentos: [
      "encaminhamentos.create",
      "encaminhamentos.read",
      "encaminhamentos.edit",
      "encaminhamentos.delete",
      "encaminhamentos.archive",
    ],
  };

export const SCREEN_PERMISSIONS = {
  dashboard: "screen.dashboard.access",
  vigilancia: "screen.vigilancia.access",
  relatorios: "screen.relatorios.access",
  integracoes: "screen.integrations.access",
} as const;

