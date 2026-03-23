export type CasosSearchBy = "q" | "nome" | "cpf" | "nis" | "tec_ref";
export type CasosStatus = "Ativo" | "Desligado" | "Arquivado" | "todos";
export type CasosSortBy = "data_cad" | "nome" | "tec_ref";
export type CasosSortOrder = "asc" | "desc";
export type DrilldownSource = "dashboard" | "vigilancia";

export interface CasosListParams {
  search?: string;
  searchBy?: CasosSearchBy;
  status?: CasosStatus;
  mes?: string;
  sortBy?: CasosSortBy;
  sortOrder?: CasosSortOrder;
  filters?: Record<string, string>;
}

export interface DrilldownUiFilters {
  mes?: string;
  tecRef?: string;
  bairro?: string;
  local_ocorrencia?: string;
}

export interface BuildCasosDrilldownInput {
  source: DrilldownSource;
  action?: string;
  value?: string | null;
  uiFilters?: DrilldownUiFilters;
  referenceDate?: Date;
}

type ActionRule =
  | {
      status?: CasosStatus;
      useCurrentMonth?: boolean;
      filterKey?: string;
      fixedValue?: string;
      useClickedValue?: boolean;
    }
  | {
      status?: CasosStatus;
      useCurrentMonth?: boolean;
      searchBy: CasosSearchBy;
      fixedValue?: string;
      useClickedValue?: boolean;
    };

const ACTION_RULES: Record<string, ActionRule> = {
  todos: { status: "todos" },
  novos_no_mes: { useCurrentMonth: true },
  total_ativos: { status: "Ativo" },
  casos_novos_30d: { status: "todos", useCurrentMonth: true },
  violencia_confirmada: {
    status: "todos",
    filterKey: "confirmacaoViolencia",
    fixedValue: "Confirmada",
  },
  notificados_sinan: {
    status: "todos",
    filterKey: "notificacaoSINAN",
    fixedValue: "Sim",
  },
  inseridos_paefi: {
    status: "todos",
    filterKey: "inseridoPAEFI",
    fixedValue: "Sim",
  },
  reincidentes: {
    status: "todos",
    filterKey: "reincidente",
    fixedValue: "Sim",
  },
  recebem_bolsa_familia: {
    status: "todos",
    filterKey: "recebePBF",
    fixedValue: "Sim",
  },
  recebem_bpc: {
    status: "todos",
    filterKey: "recebeBPC",
    fixedValue: "Idoso",
  },
  dependencia_financeira: {
    status: "todos",
    filterKey: "dependeFinanceiro",
    fixedValue: "Sim",
  },
  vitima_pcd: {
    status: "todos",
    filterKey: "vitimaPCD",
    fixedValue: "Sim",
  },
  membro_carcerario: {
    status: "todos",
    filterKey: "membroCarcerario",
    fixedValue: "Sim",
  },
  membro_socioeducacao: {
    status: "todos",
    filterKey: "membroSocioeducacao",
    fixedValue: "Sim",
  },
  por_bairro: {
    status: "todos",
    filterKey: "bairro",
    useClickedValue: true,
  },
  local_ocorrencia: {
    status: "todos",
    filterKey: "bairro",
    useClickedValue: true,
  },
  localOcorrencia: {
    status: "todos",
    filterKey: "bairro",
    useClickedValue: true,
  },
  por_canal: {
    status: "todos",
    filterKey: "canalDenuncia",
    useClickedValue: true,
  },
  por_violencia: {
    status: "todos",
    filterKey: "tipoViolencia",
    useClickedValue: true,
  },
  por_faixa_etaria: {
    status: "todos",
    filterKey: "faixaEtariaVitima",
    useClickedValue: true,
  },
  bairro: { filterKey: "bairro", useClickedValue: true },
  canalDenuncia: {
    status: "todos",
    filterKey: "canalDenuncia",
    useClickedValue: true,
  },
  canalOrigem: {
    status: "todos",
    filterKey: "canalDenuncia",
    useClickedValue: true,
  },
  tipoViolencia: {
    status: "todos",
    filterKey: "tipoViolencia",
    useClickedValue: true,
  },
  tipo_violencia: {
    status: "todos",
    filterKey: "tipoViolencia",
    useClickedValue: true,
  },
  sexo: {
    status: "todos",
    filterKey: "sexo",
    useClickedValue: true,
  },
  racaCor: {
    status: "todos",
    filterKey: "racaCor",
    useClickedValue: true,
  },
  corEtnia: {
    status: "todos",
    filterKey: "racaCor",
    useClickedValue: true,
  },
  confirmacaoViolencia: {
    status: "todos",
    filterKey: "confirmacaoViolencia",
    useClickedValue: true,
  },
  dependeFinanceiro: {
    status: "todos",
    filterKey: "dependeFinanceiro",
    useClickedValue: true,
  },
  recebeBPC: {
    status: "todos",
    filterKey: "recebeBPC",
    useClickedValue: true,
  },
  membroSocioeducacao: {
    status: "todos",
    filterKey: "membroSocioeducacao",
    useClickedValue: true,
  },
  reincidente: {
    status: "todos",
    filterKey: "reincidente",
    useClickedValue: true,
  },
  tecRef: {
    status: "todos",
    searchBy: "tec_ref",
    useClickedValue: true,
  },
  q: {
    status: "todos",
    searchBy: "q",
    useClickedValue: true,
  },
};

function normalizeText(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeYearMonth(value?: string | null): string | undefined {
  const normalized = normalizeText(value);
  if (!normalized) return undefined;
  return /^\d{4}-\d{2}$/.test(normalized) ? normalized : undefined;
}

function getCurrentYearMonth(referenceDate: Date): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function normalizeDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeSexo(value: string): string {
  const normalized = normalizeDiacritics(value).trim().toUpperCase();

  if (normalized === "MASCULINO" || normalized === "HOMEM" || normalized === "M") {
    return "MASCULINO";
  }

  if (normalized === "FEMININO" || normalized === "MULHER" || normalized === "F") {
    return "FEMININO";
  }

  if (normalized === "INTERSEXO") {
    return "INTERSEXO";
  }

  return normalized;
}

function normalizeTipoViolencia(value: string): string {
  const normalized = normalizeDiacritics(value).trim().toUpperCase();

  if (normalized === "FISICA") return "FISICA";
  if (normalized === "PSICOLOGICA") return "PSICOLOGICA";
  if (normalized === "SEXUAL") return "SEXUAL";
  if (normalized === "PATRIMONIAL") return "PATRIMONIAL";
  if (normalized === "MORAL") return "MORAL";

  return normalized;
}

function normalizeSimNao(value: string): string {
  const normalized = normalizeDiacritics(value).trim().toUpperCase();

  if (normalized === "SIM" || normalized === "S") return "Sim";
  if (normalized === "NAO" || normalized === "NÃO" || normalized === "N") return "Não";

  return value.trim();
}

function normalizeFilterValue(filterKey: string, value: string): string {
  switch (filterKey) {
    case "sexo":
      return normalizeSexo(value);
    case "tipoViolencia":
      return normalizeTipoViolencia(value);
    case "reincidente":
    case "dependeFinanceiro":
    case "membroSocioeducacao":
    case "recebeBPC":
    case "recebePBF":
    case "notificacaoSINAN":
    case "inseridoPAEFI":
    case "vitimaPCD":
    case "membroCarcerario":
    case "confirmacaoViolencia":
      return normalizeSimNao(value) === "Não" ? "Não" : value.trim();
    case "bairro":
    case "canalDenuncia":
    case "racaCor":
    case "faixaEtariaVitima":
      return value.trim();
    default:
      return value.trim();
  }
}

function ensureFilters(params: CasosListParams): Record<string, string> {
  if (!params.filters) {
    params.filters = {};
  }

  return params.filters;
}

function applyUiFilters(params: CasosListParams, uiFilters?: DrilldownUiFilters) {
  const mes = normalizeYearMonth(uiFilters?.mes);
  if (mes) {
    params.mes = mes;
  }

  const tecRef = normalizeText(uiFilters?.tecRef);
  if (tecRef) {
    params.search = tecRef;
    params.searchBy = "tec_ref";
  }

  const bairro = normalizeText(uiFilters?.bairro) ?? normalizeText(uiFilters?.local_ocorrencia);
  if (bairro) {
    ensureFilters(params).bairro = bairro;
  }
}

function applyRule(
  params: CasosListParams,
  rule: ActionRule,
  value: string | null | undefined,
  referenceDate: Date,
) {
  if (rule.status) {
    params.status = rule.status;
  }

  if (rule.useCurrentMonth && !params.mes) {
    params.mes = getCurrentYearMonth(referenceDate);
  }

  const resolvedValue = rule.fixedValue ?? (rule.useClickedValue ? normalizeText(value) : undefined);

  if ("searchBy" in rule) {
    if (resolvedValue) {
      params.search = resolvedValue;
      params.searchBy = rule.searchBy;
    }
    return;
  }

  if (rule.filterKey && resolvedValue) {
    ensureFilters(params)[rule.filterKey] = normalizeFilterValue(rule.filterKey, resolvedValue);
  }
}

function finalizeParams(params: CasosListParams): CasosListParams {
  if (params.filters && Object.keys(params.filters).length === 0) {
    delete params.filters;
  }

  return params;
}

export function buildCasosDrilldownParams(input: BuildCasosDrilldownInput): CasosListParams {
  const referenceDate = input.referenceDate ?? new Date();
  const params: CasosListParams = {};

  applyUiFilters(params, input.uiFilters);

  const action = normalizeText(input.action);
  if (!action) {
    return finalizeParams(params);
  }

  const rule = ACTION_RULES[action];
  if (rule) {
    applyRule(params, rule, input.value, referenceDate);
    return finalizeParams(params);
  }

  throw new Error(`Acao de drill-down nao mapeada: ${action}`);
}

export function buildCasosDrilldownSearchParams(input: BuildCasosDrilldownInput): URLSearchParams {
  return toCasosSearchParams(buildCasosDrilldownParams(input));
}

export function toCasosSearchParams(params: CasosListParams): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (params.search) searchParams.set("search", params.search);
  if (params.searchBy) searchParams.set("searchBy", params.searchBy);
  if (params.status) searchParams.set("status", params.status);
  if (params.mes) searchParams.set("mes", params.mes);
  if (params.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

  Object.entries(params.filters ?? {}).forEach(([key, value]) => {
    searchParams.set(`filters[${key}]`, value);
  });

  return searchParams;
}
