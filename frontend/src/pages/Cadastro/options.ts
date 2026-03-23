// Fonte única de opções/valores canônicos para Selects do Cadastro.
// PR-3: reduzir dispersão de valores (ex.: "Não" vs "NÃO")
// PR-4: expandir enums e novos blocos (contrato canônico)

export type Option = { value: string; label: string };

export const SIM_NAO_OPTIONS: Option[] = [
  { value: "Sim", label: "Sim" },
  { value: "Não", label: "Não" },
];

export const ESCOLARIDADE_OPTIONS: Option[] = [
  { value: "SEM_IDADE_ESCOLAR", label: "Sem idade escolar" },
  { value: "EJA", label: "EJA" },
  { value: "FUNDAMENTAL_1_INCOMPLETO", label: "Fundamental I incompleto" },
  { value: "FUNDAMENTAL_1_COMPLETO", label: "Fundamental I completo" },
  { value: "FUNDAMENTAL_2_INCOMPLETO", label: "Fundamental II incompleto" },
  { value: "FUNDAMENTAL_2_COMPLETO", label: "Fundamental II completo" },
  { value: "ENSINO_MEDIO_INCOMPLETO", label: "Ensino médio incompleto" },
  { value: "ENSINO_MEDIO_COMPLETO", label: "Ensino médio completo" },
  { value: "TECNICO_INCOMPLETO", label: "Técnico incompleto" },
  { value: "TECNICO_COMPLETO", label: "Técnico completo" },
  { value: "SUPERIOR_INCOMPLETO", label: "Superior incompleto" },
  { value: "SUPERIOR_COMPLETO", label: "Superior completo" },
];

// --- Encaminhamentos (PR-3) ---
export const ENCAMINHADA_SCFV_OPTIONS: Option[] = [
  { value: "SCFV", label: "SCFV" },
  { value: "CDI", label: "CDI" },
  { value: "Não", label: "Não" },
];

export const CONFIRMACAO_VIOLENCIA_OPTIONS: Option[] = [
  { value: "Confirmada", label: "Confirmada" },
  { value: "Em análise", label: "Em análise" },
  { value: "Não confirmada", label: "Não confirmada" },
];

export const TIPO_VIOLENCIA_OPTIONS: Option[] = [
  { value: "FISICA", label: "Física" },
  { value: "PSICOLOGICA", label: "Psicológica" },
  { value: "SEXUAL", label: "Sexual" },
  { value: "PATRIMONIAL", label: "Patrimonial" },
  { value: "MORAL", label: "Moral" },
];

export const TIPO_VIOLENCIA_DESCRICOES_MAP: Record<string, Option[]> = {
  FISICA: [
    { value: "ESPANCAMENTO", label: "Espancamento" },
    { value: "SACUDIDAS", label: "Sacudidas" },
    { value: "CHUTES", label: "Chutes" },
    { value: "BOFETADAS", label: "Bofetadas" },
    { value: "QUEIMADURAS", label: "Queimaduras" },
    { value: "EMPURROES", label: "Empurroes" },
    { value: "ARREMESSO_DE_OBJETOS", label: "Arremesso de objetos" },
    { value: "LESOES_COM_ARMAS", label: "Lesoes com armas" },
    { value: "OFENSA_A_INTEGRIDADE_CORPORAL", label: "Ofensa a integridade corporal" },
  ],
  PSICOLOGICA: [
    { value: "AMEACA", label: "Ameaca" },
    { value: "HUMILHACAO", label: "Humilhacao" },
    { value: "ISOLAMENTO", label: "Isolamento" },
    { value: "VIGILANCIA_CONSTANTE", label: "Vigilancia constante" },
    { value: "PERSEGUICAO", label: "Perseguicao" },
    { value: "INSULTO", label: "Insulto" },
    { value: "CHANTAGEM", label: "Chantagem" },
    { value: "RIDICULARIZACAO", label: "Ridicularizacao" },
    { value: "LIMITACAO_DE_IR_E_VIR", label: "Limitacao de ir e vir" },
    { value: "DANO_EMOCIONAL", label: "Dano emocional" },
  ],
  SEXUAL: [
    { value: "ESTUPRO", label: "Estupro" },
    { value: "COACAO_SEXUAL", label: "Coacao sexual" },
    { value: "IMPEDIR_USO_DE_CONTRACEPTIVO", label: "Impedir uso de contraceptivo" },
    { value: "FORCAR_ABORTO", label: "Forcar aborto" },
    { value: "FORCAR_MATRIMONIO", label: "Forcar matrimonio" },
    { value: "PROSTITUICAO_FORCADA", label: "Prostituicao forcada" },
    { value: "GRAVIDEZ_NAO_DESEJADA", label: "Gravidez nao desejada" },
  ],
  PATRIMONIAL: [
    { value: "RETENCAO_DE_DOCUMENTOS", label: "Retencao de documentos" },
    { value: "SUBTRACAO_DE_BENS", label: "Subtracao de bens" },
    { value: "DESTRUICAO_DE_FERRAMENTAS", label: "Destruicao de ferramentas" },
    { value: "CONTROLE_DE_SALARIO", label: "Controle de salario" },
    { value: "QUEBRA_DE_CELULAR", label: "Quebra de celular" },
    { value: "DANO_PATRIMONIAL", label: "Dano patrimonial" },
  ],
  MORAL: [
    { value: "CALUNIA", label: "Calúnia" },
    { value: "DIFAMACAO", label: "Difamacao" },
    { value: "INJURIA", label: "Injuria" },
    { value: "EXPOSICAO_DE_INTIMIDADE", label: "Exposicao de intimidade" },
    { value: "MENTIRAS_PUBLICAS", label: "Mentiras publicas" },
  ],
};

// Origem estruturada
export const CANAL_ORIGEM_OPTIONS: Option[] = [
  { value: "DISQUE_100_180", label: "Disque 100/180" },
  { value: "CONSELHO_TUTELAR", label: "Conselho Tutelar" },
  { value: "PODER_JUDICIARIO_MINISTERIO_PUBLICO", label: "Poder Judiciário / Ministério Público" },
  { value: "DELEGACIA_DE_POLICIA", label: "Delegacia de Polícia" },
  { value: "DEMANDA_ESPONTANEA", label: "Demanda espontânea" },
  { value: "ENCAMINHAMENTO_DA_REDE", label: "Encaminhamento da rede" },
  { value: "OUTROS", label: "Outros" },
];

export const RACA_COR_OPTIONS: Option[] = [
  { value: "BRANCA", label: "Branca" },
  { value: "PRETA", label: "Preta" },
  { value: "PARDA", label: "Parda" },
  { value: "AMARELA", label: "Amarela" },
  { value: "INDIGENA", label: "Indígena" },
  { value: "NAO_DECLARADO", label: "Não declarado" },
];

export const SEXO_OPTIONS: Option[] = [
  { value: "MASCULINO", label: "Masculino" },
  { value: "FEMININO", label: "Feminino" },
  { value: "INTERSEXO", label: "Intersexo" },
];

export const ORIENTACAO_SEXUAL_OPTIONS: Option[] = [
  { value: "HETEROSSEXUAL", label: "Heterossexual" },
  { value: "HOMOSSEXUAL", label: "Homossexual" },
  { value: "BISSEXUAL", label: "Bissexual" },
  { value: "OUTRA", label: "Outra" },
  { value: "PREFIRO_NAO_INFORMAR", label: "Prefiro não informar" },
];

export const IDENTIDADE_GENERO_OPTIONS: Option[] = [
  { value: "HOMEM", label: "Homem" },
  { value: "MULHER", label: "Mulher" },
  { value: "TRAVESTI", label: "Travesti" },
  { value: "NAO_BINARIO", label: "Não-binário" },
  { value: "OUTROS", label: "Outros" },
];

// Agressor
export const VINCULO_AGRESSOR_OPTIONS: Option[] = [
  { value: "CONJUGE", label: "Cônjuge" },
  { value: "COMPANHEIRO", label: "Companheiro(a)" },
  { value: "EX_COMPANHEIRO", label: "Ex-companheiro(a)" },
  { value: "PAI", label: "Pai" },
  { value: "MAE", label: "Mãe" },
  { value: "FILHO", label: "Filho(a)" },
  { value: "IRMAO", label: "Irmão(ã)" },
  { value: "OUTROS", label: "Outros" },
];

export const FAIXA_ETARIA_AGRESSOR_OPTIONS: Option[] = [
  { value: "MENOR_18", label: "Menor de 18" },
  { value: "FAIXA_18_30", label: "18 a 30" },
  { value: "FAIXA_31_40", label: "31 a 40" },
  { value: "FAIXA_41_50", label: "41 a 50" },
  { value: "FAIXA_51_60", label: "51 a 60" },
  { value: "FAIXA_61_MAIS", label: "61+" },
];

export const SEXO_AGRESSOR_OPTIONS: Option[] = [
  { value: "HOMEM", label: "Homem" },
  { value: "MULHER", label: "Mulher" },
  { value: "OUTRO", label: "Outro" },
];

// Moradia
export const TIPO_RESIDENCIA_OPTIONS: Option[] = [
  { value: "CASA", label: "Casa" },
  { value: "APARTAMENTO", label: "Apartamento" },
  { value: "COMODO_QUITINETE", label: "Cômodo/Quitinete" },
  { value: "BARRACO_OCUPACAO", label: "Barraco/Ocupação" },
  { value: "UNIDADE_INSTITUCIONAL", label: "Unidade institucional" },
  { value: "SITUACAO_DE_RUA", label: "Situação de rua" },
];

export const FORMA_OCUPACAO_OPTIONS: Option[] = [
  { value: "PROPRIA_PAGA", label: "Própria (paga)" },
  { value: "PROPRIA_EM_AQUISICAO", label: "Própria (em aquisição)" },
  { value: "ALUGADA", label: "Alugada" },
  { value: "CEDIDA_FAMILIAR_AMIGO", label: "Cedida (familiar/amigo)" },
  { value: "CEDIDA_EMPREGADOR", label: "Cedida (empregador)" },
  { value: "OCUPADA_IRREGULAR", label: "Ocupada irregular" },
];

export const MATERIAL_CONSTRUCAO_OPTIONS: Option[] = [
  { value: "ALVENARIA_TIJOLO", label: "Alvenaria/Tijolo" },
  { value: "MADEIRA_APARELHADA", label: "Madeira" },
  { value: "MATERIAL_REAPROVEITADO", label: "Material reaproveitado" },
  { value: "SEM_CONSTRUCAO_PERMANENTE", label: "Sem construção permanente" },
];
