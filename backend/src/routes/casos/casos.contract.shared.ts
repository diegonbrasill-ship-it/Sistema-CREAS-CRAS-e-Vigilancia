export type CasePayload = Record<string, unknown>;
export type AccessScope = { whereClause: string; params: (string | number)[] };

import { CASO_GROUPED_OPTION_VALUES, CASO_OPTION_VALUES } from "./casos.option-catalog";

export const CASE_STATUS = ["Ativo", "Desligado", "Arquivado"] as const;
export const TIPO_VIOLENCIA = CASO_OPTION_VALUES.tipo_violencia;
export const TIPO_VIOLENCIA_DETALHES = CASO_GROUPED_OPTION_VALUES.detalhes_violencia;
export const CANAL_DENUNCIA = CASO_OPTION_VALUES.canal_denuncia;
export const SEXO = CASO_OPTION_VALUES.sexo;
export const RACA_COR = CASO_OPTION_VALUES.raca_cor;
export const ESCOLARIDADE = CASO_OPTION_VALUES.escolaridade;
export const VINCULO_AGRESSOR = CASO_OPTION_VALUES.vinculo_agressor;
export const FAIXA_ETARIA_AGRESSOR = CASO_OPTION_VALUES.faixa_etaria_agressor;
export const SEXO_AGRESSOR = CASO_OPTION_VALUES.sexo_agressor;
export const TIPO_RESIDENCIA = CASO_OPTION_VALUES.tipo_residencia;
export const FORMA_OCUPACAO = CASO_OPTION_VALUES.forma_ocupacao;
export const MATERIAL_CONSTRUCAO = CASO_OPTION_VALUES.material_construcao;
export const ENCAMINHADA_SCFV = CASO_OPTION_VALUES.encaminhada_scfv;
export const CONFIRMACAO_VIOLENCIA = CASO_OPTION_VALUES.confirmacao_violencia;
export const SIM_NAO = CASO_OPTION_VALUES.sim_nao;
export const RECEBE_BPC = CASO_OPTION_VALUES.recebe_bpc;

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
