import {
  AccessScope,
  CASE_STATUS,
  CANAL_DENUNCIA,
  CasoListInput,
  CasoValidationError,
  CONFIRMACAO_VIOLENCIA,
  ENCAMINHADA_SCFV,
  ESCOLARIDADE,
  FAIXA_ETARIA_AGRESSOR,
  FilterDef,
  FORMA_OCUPACAO,
  LEGACY_VALUE_MAP,
  MATERIAL_CONSTRUCAO,
  RACA_COR,
  RECEBE_BPC,
  RESERVED_FILTER_KEYS,
  SEARCH_BY_VALUES,
  SEXO,
  SEXO_AGRESSOR,
  SIM_NAO,
  SORT_BY_VALUES,
  SORT_ORDER_VALUES,
  TIPO_RESIDENCIA,
  TIPO_VIOLENCIA,
  VINCULO_AGRESSOR,
} from "./casos.contract.shared";
import {
  ensureEnum,
  ensurePositiveInteger,
  isRecord,
  normalizeYesNoValue,
  readQueryString,
} from "./casos.contract.utils";

const FAIXA_ETARIA_VITIMA = [
  "Criança (0-11)",
  "Adolescente (12-17)",
  "Jovem (18-29)",
  "Adulto (30-59)",
  "Idoso (60+)",
  "Não informado",
] as const;

const CASE_FILTER_ALIAS_MAP: Record<string, string> = {
  por_bairro: "bairro",
  local_ocorrencia: "bairro",
  localOcorrencia: "bairro",
  por_canal: "canalDenuncia",
  canalOrigem: "canalDenuncia",
  por_violencia: "tipoViolencia",
  tipo_violencia: "tipoViolencia",
  corEtnia: "racaCor",
  reincidentes: "reincidente",
};

const CASE_SEARCH_ALIAS_MAP: Record<string, CasoListInput["searchBy"]> = {
  q: "q",
  tecRef: "tec_ref",
  tec_ref: "tec_ref",
};

function resolveCasoFilterKey(rawKey: string): string {
  return CASE_FILTER_ALIAS_MAP[rawKey] ?? rawKey;
}

export const CASE_FILTER_DEFS: Record<string, FilterDef> = {
  bairro: { source: "jsonb", path: "bairro", type: "string", operators: ["eq", "ilike"] },
  tipoViolencia: { source: "jsonb", path: "tipoViolencia", type: "enum", operators: ["eq"], enumValues: TIPO_VIOLENCIA },
  canalDenuncia: { source: "jsonb", path: "canalDenuncia", type: "enum", operators: ["eq"], enumValues: CANAL_DENUNCIA },
  sexo: { source: "jsonb", path: "sexo", type: "enum", operators: ["eq"], enumValues: SEXO },
  racaCor: { source: "jsonb", path: "racaCor", type: "enum", operators: ["eq"], enumValues: RACA_COR },
  escolaridade: { source: "jsonb", path: "escolaridade", type: "enum", operators: ["eq"], enumValues: ESCOLARIDADE },
  confirmacaoViolencia: { source: "jsonb", path: "confirmacaoViolencia", type: "enum", operators: ["eq"], enumValues: CONFIRMACAO_VIOLENCIA },
  membroSocioeducacao: { source: "jsonb", path: "membroSocioeducacao", type: "enum", operators: ["eq"], enumValues: SIM_NAO },
  recebeBPC: { source: "jsonb", path: "recebeBPC", type: "enum", operators: ["eq"], enumValues: RECEBE_BPC },
  vinculoAgressor: { source: "jsonb", path: "vinculoAgressor", type: "enum", operators: ["eq"], enumValues: VINCULO_AGRESSOR },
  coabitaComAgressor: { source: "jsonb", path: "coabitaComAgressor", type: "enum", operators: ["eq"], enumValues: SIM_NAO },
  dependeFinanceiro: { source: "jsonb", path: "dependeFinanceiro", type: "enum", operators: ["eq"], enumValues: SIM_NAO },
  faixaEtariaAgressor: { source: "jsonb", path: "faixaEtariaAgressor", type: "enum", operators: ["eq"], enumValues: FAIXA_ETARIA_AGRESSOR },
  sexoAgressor: { source: "jsonb", path: "sexoAgressor", type: "enum", operators: ["eq"], enumValues: SEXO_AGRESSOR },
  tipoResidencia: { source: "jsonb", path: "tipoResidencia", type: "enum", operators: ["eq"], enumValues: TIPO_RESIDENCIA },
  formaOcupacao: { source: "jsonb", path: "formaOcupacao", type: "enum", operators: ["eq"], enumValues: FORMA_OCUPACAO },
  materialConstrucao: { source: "jsonb", path: "materialConstrucao", type: "enum", operators: ["eq"], enumValues: MATERIAL_CONSTRUCAO },
  encaminhadaSCFV: { source: "jsonb", path: "encaminhadaSCFV", type: "enum", operators: ["eq"], enumValues: ENCAMINHADA_SCFV },
  reincidente: { source: "jsonb", path: "reincidente", type: "enum", operators: ["eq"], enumValues: SIM_NAO },
  inseridoPAEFI: { source: "jsonb", path: "inseridoPAEFI", type: "enum", operators: ["eq"], enumValues: SIM_NAO },
  recebePBF: { source: "jsonb", path: "recebePBF", type: "enum", operators: ["eq"], enumValues: SIM_NAO },
  notificacaoSINAN: { source: "jsonb", path: "notificacaoSINAN", type: "enum", operators: ["eq"], enumValues: SIM_NAO },
  vitimaPCD: { source: "jsonb", path: "vitimaPCD", type: "enum", operators: ["eq"], enumValues: SIM_NAO },
  membroCarcerario: { source: "jsonb", path: "membroCarcerario", type: "enum", operators: ["eq"], enumValues: SIM_NAO },
  faixaEtariaVitima: { source: "derived", path: "faixaEtariaVitima", type: "enum", operators: ["eq"], enumValues: FAIXA_ETARIA_VITIMA },
};

export const CASE_SORT_COLUMNS: Record<(typeof SORT_BY_VALUES)[number], string> = {
  data_cad: "data_cad",
  nome: "nome",
  tec_ref: "tec_ref",
};

function normalizeEnumFilterValue(filterKey: string, rawValue: string): string {
  const trimmed = rawValue.trim();

  if (filterKey === "sexo") {
    return LEGACY_VALUE_MAP.sexo[trimmed] ?? trimmed;
  }

  return normalizeYesNoValue(trimmed) as string;
}

export function normalizeCaseFilterValue(filterKey: string, rawValue: string): string {
  const definition = CASE_FILTER_DEFS[filterKey];
  if (!definition) {
    throw new CasoValidationError(`Filtro '${filterKey}' não é permitido.`);
  }

  const value = normalizeEnumFilterValue(filterKey, rawValue);
  if (definition.type === "enum" && definition.enumValues && !definition.enumValues.includes(value)) {
    throw new CasoValidationError(`Valor inválido para o filtro '${filterKey}'.`);
  }

  return value;
}

function extractBracketFilters(query: Record<string, unknown>): Record<string, string> {
  const filters: Record<string, string> = {};

  for (const [key, value] of Object.entries(query)) {
    const match = key.match(/^filters\[(.+)\]$/);
    if (!match) continue;

    const resolvedValue = readQueryString(value);
    if (resolvedValue !== undefined) {
      filters[resolveCasoFilterKey(match[1])] = resolvedValue;
    }
  }

  return filters;
}

function extractNestedFilters(query: Record<string, unknown>): Record<string, string> {
  if (!isRecord(query.filters)) {
    return {};
  }

  const filters: Record<string, string> = {};
  for (const [key, value] of Object.entries(query.filters)) {
    const resolvedValue = readQueryString(value);
    if (resolvedValue !== undefined) {
      filters[resolveCasoFilterKey(key)] = resolvedValue;
    }
  }

  return filters;
}

export function normalizeLegacyCasoFilters(query: Record<string, unknown>) {
  const filtro = readQueryString(query.filtro);
  const valor = readQueryString(query.valor);
  const normalized: Pick<CasoListInput, "search" | "searchBy" | "filters"> = { filters: {} };

  if (!filtro || !valor) {
    return normalized;
  }

  const searchAlias = CASE_SEARCH_ALIAS_MAP[filtro];
  if (searchAlias) {
    normalized.search = valor;
    normalized.searchBy = searchAlias;
    return normalized;
  }

  if (filtro === "por_faixa_etaria") {
    normalized.filters.faixaEtariaVitima = valor;
    return normalized;
  }

  if (filtro === "dependeFinanceiramenteAgressor") {
    normalized.filters.dependeFinanceiro = valor;
    return normalized;
  }

  normalized.filters[resolveCasoFilterKey(filtro)] = valor;
  return normalized;
}

function resolveCasoSearch(query: Record<string, unknown>, legacy: Pick<CasoListInput, "search" | "searchBy">) {
  const rawSearch = readQueryString(query.search);
  const legacyQuerySearch = readQueryString(query.q);
  let search = rawSearch ?? legacy.search;
  let searchBy = readQueryString(query.searchBy) ?? legacy.searchBy;
  const tecRefSearch = readQueryString(query.tec_ref) ?? readQueryString(query.tecRef);

  if (!search && legacyQuerySearch) {
    search = legacyQuerySearch;
    searchBy = "q";
  }

  if (!search && tecRefSearch) {
    search = tecRefSearch;
    searchBy = "tec_ref";
  }

  if (!searchBy && search) {
    searchBy = "q";
  }

  if (searchBy !== undefined) {
    ensureEnum("searchBy", searchBy, SEARCH_BY_VALUES);
  }

  return {
    search,
    searchBy: searchBy as CasoListInput["searchBy"],
  };
}

function mergeCasoFilters(query: Record<string, unknown>, legacyFilters: Record<string, string>) {
  const mergedFilters = {
    ...legacyFilters,
    ...extractNestedFilters(query),
    ...extractBracketFilters(query),
  };

  const bairro = readQueryString(query.bairro)
    ?? readQueryString(query.local_ocorrencia)
    ?? readQueryString(query.localOcorrencia);
  if (bairro && !mergedFilters.bairro) {
    mergedFilters.bairro = bairro;
  }

  if (readQueryString(query.confirmedViolence) === "true" && !mergedFilters.confirmacaoViolencia) {
    mergedFilters.confirmacaoViolencia = "Confirmada";
  }
  if (readQueryString(query.socioeducacao) === "true" && !mergedFilters.membroSocioeducacao) {
    mergedFilters.membroSocioeducacao = "Sim";
  }

  return mergedFilters;
}

function normalizeCasoFilters(filters: Record<string, string>) {
  return Object.entries(filters).reduce<Record<string, string>>((acc, [key, rawValue]) => {
    if (RESERVED_FILTER_KEYS.has(key)) {
      throw new CasoValidationError(`Filtro '${key}' não pode ser enviado pela query.`);
    }

    if (!CASE_FILTER_DEFS[key]) {
      throw new CasoValidationError(`Filtro '${key}' não é permitido.`);
    }

    acc[key] = normalizeCaseFilterValue(key, rawValue);
    return acc;
  }, {});
}

export function parseCasoListQuery(query: Record<string, unknown>, accessScope: AccessScope): CasoListInput {
  const legacy = normalizeLegacyCasoFilters(query);
  const { search, searchBy } = resolveCasoSearch(query, legacy);

  const rawStatus = readQueryString(query.status) ?? "Ativo";
  const status = rawStatus === "todos" ? "todos" : ensureEnum("status", rawStatus, CASE_STATUS);
  const mes = readQueryString(query.mes);
  if (mes !== undefined && !/^\d{4}-\d{2}$/.test(mes)) {
    throw new CasoValidationError("mes deve estar no formato YYYY-MM.");
  }

  return {
    accessScope,
    search,
    searchBy,
    status,
    mes,
    page: ensurePositiveInteger(readQueryString(query.page), "page"),
    limit: ensurePositiveInteger(readQueryString(query.limit), "limit"),
    sortBy: ensureEnum("sortBy", readQueryString(query.sortBy) ?? "data_cad", SORT_BY_VALUES),
    sortOrder: ensureEnum("sortOrder", readQueryString(query.sortOrder) ?? "desc", SORT_ORDER_VALUES),
    filters: normalizeCasoFilters(mergeCasoFilters(query, legacy.filters)),
  };
}
