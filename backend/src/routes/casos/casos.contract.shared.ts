export type CasePayload = Record<string, unknown>;
export type AccessScope = { whereClause: string; params: (string | number)[] };

export const CASE_STATUS = ["Ativo", "Desligado", "Arquivado"] as const;
export const TIPO_VIOLENCIA = ["FISICA", "PSICOLOGICA", "SEXUAL", "PATRIMONIAL", "MORAL"] as const;
export const CANAL_DENUNCIA = [
  "DISQUE_100_180",
  "CONSELHO_TUTELAR",
  "PODER_JUDICIARIO_MINISTERIO_PUBLICO",
  "DELEGACIA_DE_POLICIA",
  "DEMANDA_ESPONTANEA",
  "ENCAMINHAMENTO_DA_REDE",
  "OUTROS",
] as const;
export const SEXO = ["MASCULINO", "FEMININO", "INTERSEXO"] as const;
export const RACA_COR = ["BRANCA", "PRETA", "PARDA", "AMARELA", "INDIGENA", "NAO_DECLARADO"] as const;
export const ESCOLARIDADE = [
  "SEM_IDADE_ESCOLAR",
  "EJA",
  "FUNDAMENTAL_1_INCOMPLETO",
  "FUNDAMENTAL_1_COMPLETO",
  "FUNDAMENTAL_2_INCOMPLETO",
  "FUNDAMENTAL_2_COMPLETO",
  "ENSINO_MEDIO_INCOMPLETO",
  "ENSINO_MEDIO_COMPLETO",
  "TECNICO_INCOMPLETO",
  "TECNICO_COMPLETO",
  "SUPERIOR_INCOMPLETO",
  "SUPERIOR_COMPLETO",
] as const;
export const VINCULO_AGRESSOR = ["CONJUGE", "COMPANHEIRO", "EX_COMPANHEIRO", "PAI", "MAE", "FILHO", "IRMAO", "OUTROS"] as const;
export const FAIXA_ETARIA_AGRESSOR = ["MENOR_18", "FAIXA_18_30", "FAIXA_31_40", "FAIXA_41_50", "FAIXA_51_60", "FAIXA_61_MAIS"] as const;
export const SEXO_AGRESSOR = ["HOMEM", "MULHER", "OUTRO"] as const;
export const TIPO_RESIDENCIA = ["CASA", "APARTAMENTO", "COMODO_QUITINETE", "BARRACO_OCUPACAO", "UNIDADE_INSTITUCIONAL", "SITUACAO_DE_RUA"] as const;
export const FORMA_OCUPACAO = ["PROPRIA_PAGA", "PROPRIA_EM_AQUISICAO", "ALUGADA", "CEDIDA_FAMILIAR_AMIGO", "CEDIDA_EMPREGADOR", "OCUPADA_IRREGULAR"] as const;
export const MATERIAL_CONSTRUCAO = ["ALVENARIA_TIJOLO", "MADEIRA_APARELHADA", "MATERIAL_REAPROVEITADO", "SEM_CONSTRUCAO_PERMANENTE"] as const;
export const ENCAMINHADA_SCFV = ["SCFV", "CDI", "Não"] as const;
export const CONFIRMACAO_VIOLENCIA = ["Confirmada", "Em análise", "Não confirmada"] as const;
export const SIM_NAO = ["Sim", "Não"] as const;
export const RECEBE_BPC = ["Idoso", "PCD", "Não"] as const;

export const META_FIELDS = new Set(["nome", "data_cad", "tec_ref", "status", "unit_id", "dados_completos_payload"]);

export const LEGACY_KEY_MAP: Record<string, string> = {
  tipo_violencia: "tipoViolencia",
  canalOrigem: "canalDenuncia",
  corEtnia: "racaCor",
  notificacaoSINAM: "notificacaoSINAN",
  local_ocorrencia: "bairro",
};

export const LEGACY_VALUE_MAP: Record<string, Record<string, string>> = {
  sexo: {
    Masculino: "MASCULINO",
    Feminino: "FEMININO",
  },
  tipoViolenciaDescricoes: {
    EMPURRAO: "EMPURROES",
    SOCOS: "ESPANCAMENTO",
  },
};

export const SEARCH_BY_VALUES = ["q", "nome", "cpf", "nis", "tec_ref"] as const;
export const SORT_BY_VALUES = ["data_cad", "nome", "tec_ref"] as const;
export const SORT_ORDER_VALUES = ["asc", "desc"] as const;
export const RESERVED_FILTER_KEYS = new Set(["unit_id", "user_id", "permissions", "role"]);

export type FilterDef = {
  source: "column" | "jsonb" | "derived";
  path: string;
  type: "string" | "enum";
  operators: Array<"eq" | "ilike">;
  enumValues?: readonly string[];
};

export type CasoListInput = {
  accessScope: AccessScope;
  search?: string;
  searchBy?: (typeof SEARCH_BY_VALUES)[number];
  status: (typeof CASE_STATUS)[number] | "todos";
  mes?: string;
  page?: number;
  limit?: number;
  sortBy: (typeof SORT_BY_VALUES)[number];
  sortOrder: (typeof SORT_ORDER_VALUES)[number];
  filters: Record<string, string>;
};

export const CASE_OPTIONAL_ENUM_FIELDS = [
  ["canalDenuncia", CANAL_DENUNCIA],
  ["sexo", SEXO],
  ["racaCor", RACA_COR],
  ["escolaridade", ESCOLARIDADE],
  ["vinculoAgressor", VINCULO_AGRESSOR],
  ["faixaEtariaAgressor", FAIXA_ETARIA_AGRESSOR],
  ["sexoAgressor", SEXO_AGRESSOR],
  ["tipoResidencia", TIPO_RESIDENCIA],
  ["formaOcupacao", FORMA_OCUPACAO],
  ["materialConstrucao", MATERIAL_CONSTRUCAO],
  ["encaminhadaSCFV", ENCAMINHADA_SCFV],
  ["confirmacaoViolencia", CONFIRMACAO_VIOLENCIA],
  ["recebeBPC", RECEBE_BPC],
] as const;

export const CASE_BOOLEAN_FIELDS = [
  "recebePBF",
  "recebeBE",
  "membrosCadUnico",
  "membroCarcerario",
  "membroSocioeducacao",
  "vitimaPCD",
  "tratamentoSaude",
  "encaminhamento",
  "inseridoPAEFI",
  "notificacaoSINAN",
  "reincidente",
  "coabitaComAgressor",
] as const;

export class CasoValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CasoValidationError";
    this.status = status;
  }
}

export type NormalizedCaseMutationInput = {
  nome: string | null;
  data_cad: string;
  tec_ref: string | null;
  status: (typeof CASE_STATUS)[number];
  unit_id: number;
  dados_completos_payload: CasePayload;
};

export type NormalizedCaseUpdateInput = {
  nome?: string | null;
  data_cad?: string;
  tec_ref?: string | null;
  dados_completos_payload: CasePayload;
};
