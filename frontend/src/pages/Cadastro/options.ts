export type Option<T extends string = string> = {
  readonly value: T;
  readonly label: string;
};

type NonEmptyOptions<T extends string = string> = readonly [Option<T>, ...Option<T>[]];

export const getOptionValues = <const T extends NonEmptyOptions>(options: T) =>
  options.map((option) => option.value) as [T[number]["value"], ...T[number]["value"][]];

export const SIM_NAO_OPTIONS = [
  { value: "Sim", label: "Sim" },
  { value: "Não", label: "Não" },
] as const satisfies NonEmptyOptions;
export const SIM_NAO_VALUES = getOptionValues(SIM_NAO_OPTIONS);

export const TIPO_DEFICIENCIA_OPTIONS = [
  { value: "DEFICIENCIA_FISICA", label: "Deficiência Física" },
  { value: "DEFICIENCIA_VISUAL", label: "Visual" },
  { value: "DEFICIENCIA_AUDITIVA", label: "Auditiva" },
  { value: "DEFICIENCIA_PSICOSSOCIAL_MENTAL", label: "Psicossocial (mental)" },
  { value: "DEFICIENCIA_MULTIPLA", label: "Deficiência Múltipla" },
] as const satisfies NonEmptyOptions;
export const TIPO_DEFICIENCIA_VALUES = getOptionValues(TIPO_DEFICIENCIA_OPTIONS);

export const ESCOLARIDADE_OPTIONS = [
  { value: "NAO_ESTUDOU", label: "Não estudou" },
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
] as const satisfies NonEmptyOptions;
export const ESCOLARIDADE_VALUES = getOptionValues(ESCOLARIDADE_OPTIONS);

export const ENCAMINHADA_SCFV_OPTIONS = [
  { value: "SCFV", label: "SCFV" },
  { value: "CDI", label: "CDI" },
  { value: "Não", label: "Não" },
] as const satisfies NonEmptyOptions;
export const ENCAMINHADA_SCFV_VALUES = getOptionValues(ENCAMINHADA_SCFV_OPTIONS);

export const CONFIRMACAO_VIOLENCIA_OPTIONS = [
  { value: "Confirmada", label: "Confirmada" },
  { value: "Em análise", label: "Em análise" },
  { value: "Não confirmada", label: "Não confirmada" },
] as const satisfies NonEmptyOptions;
export const CONFIRMACAO_VIOLENCIA_VALUES = getOptionValues(CONFIRMACAO_VIOLENCIA_OPTIONS);

export const TIPO_VIOLENCIA_OPTIONS = [
  { value: "FISICA", label: "Física" },
  { value: "PSICOLOGICA", label: "Psicológica" },
  { value: "SEXUAL", label: "Sexual" },
  { value: "PATRIMONIAL", label: "Patrimonial" },
  { value: "MORAL", label: "Moral" },
] as const satisfies NonEmptyOptions;
export const TIPO_VIOLENCIA_VALUES = getOptionValues(TIPO_VIOLENCIA_OPTIONS);

export const TIPO_VIOLENCIA_DESCRICOES_MAP = {
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
} as const satisfies Record<(typeof TIPO_VIOLENCIA_VALUES)[number], NonEmptyOptions>;

export const CANAL_ORIGEM_OPTIONS = [
  { value: "DISQUE_100_180", label: "Disque 100/180" },
  { value: "CONSELHO_TUTELAR", label: "Conselho Tutelar" },
  { value: "PODER_JUDICIARIO_MINISTERIO_PUBLICO", label: "Poder Judiciário / Ministério Público" },
  { value: "DELEGACIA_DE_POLICIA", label: "Delegacia de Polícia" },
  { value: "DEMANDA_ESPONTANEA", label: "Demanda espontânea" },
  { value: "ENCAMINHAMENTO_DA_REDE", label: "Encaminhamento da rede" },
  { value: "OUTROS", label: "Outros" },
] as const satisfies NonEmptyOptions;
export const CANAL_ORIGEM_VALUES = getOptionValues(CANAL_ORIGEM_OPTIONS);

export const RACA_COR_OPTIONS = [
  { value: "BRANCA", label: "Branca" },
  { value: "PRETA", label: "Preta" },
  { value: "PARDA", label: "Parda" },
  { value: "AMARELA", label: "Amarela" },
  { value: "INDIGENA", label: "Indígena" },
  { value: "NAO_DECLARADO", label: "Não declarado" },
] as const satisfies NonEmptyOptions;
export const RACA_COR_VALUES = getOptionValues(RACA_COR_OPTIONS);

export const SEXO_OPTIONS = [
  { value: "MASCULINO", label: "Masculino" },
  { value: "FEMININO", label: "Feminino" },
  { value: "INTERSEXO", label: "Intersexo" },
] as const satisfies NonEmptyOptions;
export const SEXO_VALUES = getOptionValues(SEXO_OPTIONS);

export const ORIENTACAO_SEXUAL_OPTIONS = [
  { value: "HETEROSSEXUAL", label: "Heterossexual" },
  { value: "HOMOSSEXUAL", label: "Homossexual" },
  { value: "BISSEXUAL", label: "Bissexual" },
  { value: "OUTRA", label: "Outra" },
  { value: "PREFIRO_NAO_INFORMAR", label: "Prefiro não informar" },
] as const satisfies NonEmptyOptions;
export const ORIENTACAO_SEXUAL_VALUES = getOptionValues(ORIENTACAO_SEXUAL_OPTIONS);

export const IDENTIDADE_GENERO_OPTIONS = [
  { value: "HOMEM", label: "Homem" },
  { value: "MULHER", label: "Mulher" },
  { value: "TRAVESTI", label: "Travesti" },
  { value: "NAO_BINARIO", label: "Não-binário" },
  { value: "OUTROS", label: "Outros" },
] as const satisfies NonEmptyOptions;
export const IDENTIDADE_GENERO_VALUES = getOptionValues(IDENTIDADE_GENERO_OPTIONS);

export const VINCULO_AGRESSOR_OPTIONS = [
  { value: "CONJUGE", label: "Cônjuge" },
  { value: "COMPANHEIRO", label: "Companheiro(a)" },
  { value: "EX_COMPANHEIRO", label: "Ex-companheiro(a)" },
  { value: "PAI", label: "Pai" },
  { value: "MAE", label: "Mãe" },
  { value: "FILHO", label: "Filho(a)" },
  { value: "IRMAO", label: "Irmão(ã)" },
  { value: "OUTROS", label: "Outros" },
] as const satisfies NonEmptyOptions;
export const VINCULO_AGRESSOR_VALUES = getOptionValues(VINCULO_AGRESSOR_OPTIONS);

export const FAIXA_ETARIA_AGRESSOR_OPTIONS = [
  { value: "MENOR_18", label: "Menor de 18" },
  { value: "FAIXA_18_30", label: "18 a 30" },
  { value: "FAIXA_31_40", label: "31 a 40" },
  { value: "FAIXA_41_50", label: "41 a 50" },
  { value: "FAIXA_51_60", label: "51 a 60" },
  { value: "FAIXA_61_MAIS", label: "61+" },
] as const satisfies NonEmptyOptions;
export const FAIXA_ETARIA_AGRESSOR_VALUES = getOptionValues(FAIXA_ETARIA_AGRESSOR_OPTIONS);

export const SEXO_AGRESSOR_OPTIONS = [
  { value: "HOMEM", label: "Homem" },
  { value: "MULHER", label: "Mulher" },
  { value: "OUTRO", label: "Outro" },
] as const satisfies NonEmptyOptions;
export const SEXO_AGRESSOR_VALUES = getOptionValues(SEXO_AGRESSOR_OPTIONS);

export const TIPO_RESIDENCIA_OPTIONS = [
  { value: "CASA", label: "Casa" },
  { value: "APARTAMENTO", label: "Apartamento" },
  { value: "COMODO_QUITINETE", label: "Cômodo/Quitinete" },
  { value: "BARRACO_OCUPACAO", label: "Barraco/Ocupação" },
  { value: "UNIDADE_INSTITUCIONAL", label: "Unidade institucional" },
  { value: "SITUACAO_DE_RUA", label: "Situação de rua" },
] as const satisfies NonEmptyOptions;
export const TIPO_RESIDENCIA_VALUES = getOptionValues(TIPO_RESIDENCIA_OPTIONS);

export const FORMA_OCUPACAO_OPTIONS = [
  { value: "PROPRIA_PAGA", label: "Própria (paga)" },
  { value: "PROPRIA_EM_AQUISICAO", label: "Própria (em aquisição)" },
  { value: "ALUGADA", label: "Alugada" },
  { value: "CEDIDA_FAMILIAR_AMIGO", label: "Cedida (familiar/amigo)" },
  { value: "CEDIDA_EMPREGADOR", label: "Cedida (empregador)" },
  { value: "OCUPADA_IRREGULAR", label: "Ocupada irregular" },
] as const satisfies NonEmptyOptions;
export const FORMA_OCUPACAO_VALUES = getOptionValues(FORMA_OCUPACAO_OPTIONS);

export const MATERIAL_CONSTRUCAO_OPTIONS = [
  { value: "ALVENARIA_TIJOLO", label: "Alvenaria/Tijolo" },
  { value: "MADEIRA_APARELHADA", label: "Madeira" },
  { value: "MATERIAL_REAPROVEITADO", label: "Material reaproveitado" },
  { value: "SEM_CONSTRUCAO_PERMANENTE", label: "Sem construção permanente" },
] as const satisfies NonEmptyOptions;
export const MATERIAL_CONSTRUCAO_VALUES = getOptionValues(MATERIAL_CONSTRUCAO_OPTIONS);
