export type CatalogOption = {
  value: string;
  label: string;
  isDefault?: boolean;
};

export type CatalogOptionSet = {
  label: string;
  allowCustomOption?: boolean;
  customOptionConfig?: {
    triggerValue: string;
    customLabelFieldKey: string;
    promoteToOptionCatalog: boolean;
    promotionScope: "unit" | "global";
    normalizedValueStrategy: "slug_uppercase";
  };
  options: readonly CatalogOption[];
};

const core = (items: Array<[string, string]>): CatalogOption[] =>
  items.map(([value, label]) => ({ value, label, isDefault: true }));

const optionValues = <T extends readonly CatalogOption[]>(options: T) =>
  options.map((option) => option.value) as readonly string[];

const groupedOptionValues = <T extends Record<string, readonly CatalogOption[]>>(groupedOptions: T) =>
  Object.fromEntries(
    Object.entries(groupedOptions).map(([groupKey, options]) => [groupKey, optionValues(options)])
  ) as Record<string, readonly string[]>;

export const CASO_OPTION_SETS = {
  sim_nao: { label: "Sim/Não", options: core([["Sim", "Sim"], ["Não", "Não"]]) },
  recebe_bpc: { label: "Recebe BPC", options: core([["Idoso", "Idoso"], ["PCD", "PCD"], ["Não", "Não"]]) },
  renda_familiar: {
    label: "Renda familiar",
    options: core([
      ["Sem renda", "Sem renda"],
      ["Meio salário mínimo", "Meio salário mínimo"],
      ["1 salário mínimo", "1 salário mínimo"],
      ["1.5 salário mínimo", "1.5 salário mínimo"],
      ["2 salários mínimos", "2 salários mínimos"],
      ["2.5 salários mínimos", "2.5 salários mínimos"],
      ["3 salários mínimos", "3 salários mínimos"],
      ["3.5 salários mínimos", "3.5 salários mínimos"],
      ["4 salários mínimos", "4 salários mínimos"],
      ["4.5 salários mínimos", "4.5 salários mínimos"],
      ["5 salários mínimos", "5 salários mínimos"],
      ["5.5 salários mínimos", "5.5 salários mínimos"],
      ["6 ou mais salários mínimos", "6 ou mais salários mínimos"],
    ]),
  },
  composicao_familiar: {
    label: "Composição familiar",
    options: core([
      ["1 membro", "1 membro"],
      ["2 membros", "2 membros"],
      ["3 membros", "3 membros"],
      ["4 membros", "4 membros"],
      ["5 membros", "5 membros"],
      ["6 ou mais membros", "6 ou mais membros"],
    ]),
  },
  tipo_violencia: {
    label: "Tipos principais de violência",
    options: core([
      ["FISICA", "Física"],
      ["PSICOLOGICA", "Psicológica"],
      ["SEXUAL", "Sexual"],
      ["PATRIMONIAL", "Patrimonial"],
      ["MORAL", "Moral"],
    ]),
  },
  canal_denuncia: {
    label: "Canal de denúncia",
    allowCustomOption: true,
    customOptionConfig: {
      triggerValue: "OUTROS",
      customLabelFieldKey: "especificacaoOutroCanal",
      promoteToOptionCatalog: true,
      promotionScope: "unit",
      normalizedValueStrategy: "slug_uppercase",
    },
    options: core([
      ["DISQUE_100_180", "Disque 100/180"],
      ["CONSELHO_TUTELAR", "Conselho Tutelar"],
      ["PODER_JUDICIARIO_MINISTERIO_PUBLICO", "Poder Judiciário / Ministério Público"],
      ["DELEGACIA_DE_POLICIA", "Delegacia de Polícia"],
      ["DEMANDA_ESPONTANEA", "Demanda espontânea"],
      ["ENCAMINHAMENTO_DA_REDE", "Encaminhamento da rede"],
      ["OUTROS", "Outro"],
    ]),
  },
  sexo: {
    label: "Sexo",
    options: core([
      ["MASCULINO", "Masculino"],
      ["FEMININO", "Feminino"],
      ["INTERSEXO", "Intersexo"],
    ]),
  },
  orientacao_sexual: {
    label: "Orientação sexual",
    allowCustomOption: true,
    customOptionConfig: {
      triggerValue: "OUTRA",
      customLabelFieldKey: "orientacaoSexualCustomizada",
      promoteToOptionCatalog: true,
      promotionScope: "unit",
      normalizedValueStrategy: "slug_uppercase",
    },
    options: core([
      ["HETEROSSEXUAL", "Heterossexual"],
      ["HOMOSSEXUAL", "Homossexual"],
      ["BISSEXUAL", "Bissexual"],
      ["OUTRA", "Outra"],
      ["PREFIRO_NAO_INFORMAR", "Prefiro não informar"],
    ]),
  },
  identidade_genero: {
    label: "Identidade de gênero",
    allowCustomOption: true,
    customOptionConfig: {
      triggerValue: "OUTROS",
      customLabelFieldKey: "identidadeGeneroCustomizada",
      promoteToOptionCatalog: true,
      promotionScope: "unit",
      normalizedValueStrategy: "slug_uppercase",
    },
    options: core([
      ["HOMEM", "Homem"],
      ["MULHER", "Mulher"],
      ["TRAVESTI", "Travesti"],
      ["NAO_BINARIO", "Não-binário"],
      ["OUTROS", "Outro"],
    ]),
  },
  raca_cor: {
    label: "Raça/cor",
    options: core([
      ["BRANCA", "Branca"],
      ["PRETA", "Preta"],
      ["PARDA", "Parda"],
      ["AMARELA", "Amarela"],
      ["INDIGENA", "Indígena"],
      ["NAO_DECLARADO", "Não declarado"],
    ]),
  },
  escolaridade: {
    label: "Escolaridade",
    options: core([
      ["NAO_ESTUDOU", "Não estudou"],
      ["SEM_IDADE_ESCOLAR", "Sem idade escolar"],
      ["EJA", "EJA"],
      ["FUNDAMENTAL_1_INCOMPLETO", "Fundamental I incompleto"],
      ["FUNDAMENTAL_1_COMPLETO", "Fundamental I completo"],
      ["FUNDAMENTAL_2_INCOMPLETO", "Fundamental II incompleto"],
      ["FUNDAMENTAL_2_COMPLETO", "Fundamental II completo"],
      ["ENSINO_MEDIO_INCOMPLETO", "Ensino médio incompleto"],
      ["ENSINO_MEDIO_COMPLETO", "Ensino médio completo"],
      ["TECNICO_INCOMPLETO", "Técnico incompleto"],
      ["TECNICO_COMPLETO", "Técnico completo"],
      ["SUPERIOR_INCOMPLETO", "Superior incompleto"],
      ["SUPERIOR_COMPLETO", "Superior completo"],
    ]),
  },
  tipo_deficiencia: {
    label: "Tipo de deficiência",
    options: core([
      ["DEFICIENCIA_FISICA", "Deficiência Física"],
      ["DEFICIENCIA_VISUAL", "Visual"],
      ["DEFICIENCIA_AUDITIVA", "Auditiva"],
      ["DEFICIENCIA_PSICOSSOCIAL_MENTAL", "Psicossocial (mental)"],
      ["DEFICIENCIA_MULTIPLA", "Deficiência Múltipla"],
    ]),
  },
  encaminhada_scfv: {
    label: "Encaminhada ao SCFV/CDI",
    options: core([
      ["SCFV", "SCFV"],
      ["CDI", "CDI"],
      ["Não", "Não"],
    ]),
  },
  confirmacao_violencia: {
    label: "Confirmação da violência",
    options: core([
      ["Confirmada", "Confirmada"],
      ["Em análise", "Em análise"],
      ["Não confirmada", "Não confirmada"],
    ]),
  },
  vinculo_agressor: {
    label: "Vínculo com o agressor",
    allowCustomOption: true,
    customOptionConfig: {
      triggerValue: "OUTROS",
      customLabelFieldKey: "especificacaoOutroVinculo",
      promoteToOptionCatalog: true,
      promotionScope: "unit",
      normalizedValueStrategy: "slug_uppercase",
    },
    options: core([
      ["CONJUGE", "Cônjuge"],
      ["COMPANHEIRO", "Companheiro(a)"],
      ["EX_COMPANHEIRO", "Ex-companheiro(a)"],
      ["PAI", "Pai"],
      ["MAE", "Mãe"],
      ["FILHO", "Filho(a)"],
      ["IRMAO", "Irmão(ã)"],
      ["OUTROS", "Outro"],
    ]),
  },
  faixa_etaria_agressor: {
    label: "Faixa etária do agressor",
    options: core([
      ["MENOR_18", "Menor de 18"],
      ["FAIXA_18_30", "18 a 30"],
      ["FAIXA_31_40", "31 a 40"],
      ["FAIXA_41_50", "41 a 50"],
      ["FAIXA_51_60", "51 a 60"],
      ["FAIXA_61_MAIS", "61+"],
    ]),
  },
  sexo_agressor: {
    label: "Sexo do agressor",
    options: core([
      ["HOMEM", "Homem"],
      ["MULHER", "Mulher"],
      ["OUTRO", "Outro"],
    ]),
  },
  tipo_residencia: {
    label: "Tipo de residência",
    options: core([
      ["CASA", "Casa"],
      ["APARTAMENTO", "Apartamento"],
      ["COMODO_QUITINETE", "Cômodo/Quitinete"],
      ["BARRACO_OCUPACAO", "Barraco/Ocupação"],
      ["UNIDADE_INSTITUCIONAL", "Unidade institucional"],
      ["SITUACAO_DE_RUA", "Situação de rua"],
    ]),
  },
  forma_ocupacao: {
    label: "Forma de ocupação",
    options: core([
      ["PROPRIA_PAGA", "Própria (paga)"],
      ["PROPRIA_EM_AQUISICAO", "Própria (em aquisição)"],
      ["ALUGADA", "Alugada"],
      ["CEDIDA_FAMILIAR_AMIGO", "Cedida (familiar/amigo)"],
      ["CEDIDA_EMPREGADOR", "Cedida (empregador)"],
      ["OCUPADA_IRREGULAR", "Ocupada irregular"],
    ]),
  },
  material_construcao: {
    label: "Material da construção",
    options: core([
      ["ALVENARIA_TIJOLO", "Alvenaria/Tijolo"],
      ["MADEIRA_APARELHADA", "Madeira"],
      ["MATERIAL_REAPROVEITADO", "Material reaproveitado"],
      ["SEM_CONSTRUCAO_PERMANENTE", "Sem construção permanente"],
    ]),
  },
} as const satisfies Record<string, CatalogOptionSet>;

export const CASO_GROUPED_OPTION_SETS = {
  detalhes_violencia: {
    FISICA: core([
      ["ESPANCAMENTO", "Espancamento"],
      ["SACUDIDAS", "Sacudidas"],
      ["CHUTES", "Chutes"],
      ["BOFETADAS", "Bofetadas"],
      ["QUEIMADURAS", "Queimaduras"],
      ["EMPURROES", "Empurrões"],
      ["ARREMESSO_DE_OBJETOS", "Arremesso de objetos"],
      ["LESOES_COM_ARMAS", "Lesões com armas"],
      ["OFENSA_A_INTEGRIDADE_CORPORAL", "Ofensa à integridade corporal"],
    ]),
    PSICOLOGICA: core([
      ["AMEACA", "Ameaça"],
      ["HUMILHACAO", "Humilhação"],
      ["ISOLAMENTO", "Isolamento"],
      ["VIGILANCIA_CONSTANTE", "Vigilância constante"],
      ["PERSEGUICAO", "Perseguição"],
      ["INSULTO", "Insulto"],
      ["CHANTAGEM", "Chantagem"],
      ["RIDICULARIZACAO", "Ridicularização"],
      ["LIMITACAO_DE_IR_E_VIR", "Limitação de ir e vir"],
      ["DANO_EMOCIONAL", "Dano emocional"],
    ]),
    SEXUAL: core([
      ["ESTUPRO", "Estupro"],
      ["COACAO_SEXUAL", "Coação sexual"],
      ["IMPEDIR_USO_DE_CONTRACEPTIVO", "Impedir uso de contraceptivo"],
      ["FORCAR_ABORTO", "Forçar aborto"],
      ["FORCAR_MATRIMONIO", "Forçar matrimônio"],
      ["PROSTITUICAO_FORCADA", "Prostituição forçada"],
      ["GRAVIDEZ_NAO_DESEJADA", "Gravidez não desejada"],
    ]),
    PATRIMONIAL: core([
      ["RETENCAO_DE_DOCUMENTOS", "Retenção de documentos"],
      ["SUBTRACAO_DE_BENS", "Subtração de bens"],
      ["DESTRUICAO_DE_FERRAMENTAS", "Destruição de ferramentas"],
      ["CONTROLE_DE_SALARIO", "Controle de salário"],
      ["QUEBRA_DE_CELULAR", "Quebra de celular"],
      ["DANO_PATRIMONIAL", "Dano patrimonial"],
    ]),
    MORAL: core([
      ["CALUNIA", "Calúnia"],
      ["DIFAMACAO", "Difamação"],
      ["INJURIA", "Injúria"],
      ["EXPOSICAO_DE_INTIMIDADE", "Exposição de intimidade"],
      ["MENTIRAS_PUBLICAS", "Mentiras públicas"],
    ]),
  },
} as const satisfies Record<string, Record<string, readonly CatalogOption[]>>;

export const CASO_OPTION_VALUES = {
  sim_nao: optionValues(CASO_OPTION_SETS.sim_nao.options),
  recebe_bpc: optionValues(CASO_OPTION_SETS.recebe_bpc.options),
  tipo_violencia: optionValues(CASO_OPTION_SETS.tipo_violencia.options),
  canal_denuncia: optionValues(CASO_OPTION_SETS.canal_denuncia.options),
  sexo: optionValues(CASO_OPTION_SETS.sexo.options),
  raca_cor: optionValues(CASO_OPTION_SETS.raca_cor.options),
  escolaridade: optionValues(CASO_OPTION_SETS.escolaridade.options),
  vinculo_agressor: optionValues(CASO_OPTION_SETS.vinculo_agressor.options),
  faixa_etaria_agressor: optionValues(CASO_OPTION_SETS.faixa_etaria_agressor.options),
  sexo_agressor: optionValues(CASO_OPTION_SETS.sexo_agressor.options),
  tipo_residencia: optionValues(CASO_OPTION_SETS.tipo_residencia.options),
  forma_ocupacao: optionValues(CASO_OPTION_SETS.forma_ocupacao.options),
  material_construcao: optionValues(CASO_OPTION_SETS.material_construcao.options),
  encaminhada_scfv: optionValues(CASO_OPTION_SETS.encaminhada_scfv.options),
  confirmacao_violencia: optionValues(CASO_OPTION_SETS.confirmacao_violencia.options),
} as const;

export const CASO_GROUPED_OPTION_VALUES = {
  detalhes_violencia: groupedOptionValues(CASO_GROUPED_OPTION_SETS.detalhes_violencia),
} as const;
