// src/utils/roles.ts
export type UserRole =
    | 'tecnico_superior'
    | 'tecnico_medio'
    | 'coordenador'
    | 'gestor'
    | 'vigilancia'
    | 'coordenador_cras'
    | 'tecnico_cras';

export const PROFILE_OPTIONS: { value: UserRole; label: string }[] = [
    { value: 'tecnico_superior', label: 'Técnico de Nível Superior' },
    { value: 'tecnico_medio', label: 'Técnico de Nível Médio' },
    { value: 'coordenador', label: 'Coordenador(a) CREAS' },
    { value: 'gestor', label: 'Secretário(a) / Gestor Geral' },
    { value: 'vigilancia', label: 'Vigilância Socioassistencial' },
    { value: 'coordenador_cras', label: 'Coordenador(a) CRAS' },
    { value: 'tecnico_cras', label: 'Técnico(a) CRAS' },
];

export const PROFILE_LABELS: Record<UserRole, string> =
    PROFILE_OPTIONS.reduce((acc, cur) => {
        acc[cur.value] = cur.label;
        return acc;
    }, {} as Record<UserRole, string>);
