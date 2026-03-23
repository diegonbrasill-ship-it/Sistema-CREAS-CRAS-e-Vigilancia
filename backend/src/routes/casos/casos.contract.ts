import { AuthenticatedUser } from "../../middleware/auth/authenticated.user";
import {
  CASE_BOOLEAN_FIELDS,
  CASE_OPTIONAL_ENUM_FIELDS,
  CASE_STATUS,
  CasePayload,
  CasoValidationError,
  NormalizedCaseMutationInput,
  NormalizedCaseUpdateInput,
  SIM_NAO,
  TIPO_VIOLENCIA,
} from "./casos.contract.shared";
import {
  ensureDate,
  ensureEnum,
  ensureInteger,
  ensureOptionalEnum,
  extractPayload,
  isRecord,
  normalizeCasePayload,
  normalizeCaseReadPayload,
  normalizePartialCasePayload,
  trimString,
} from "./casos.contract.utils";

export * from "./casos.contract.shared";
export * from "./casos.contract.utils";
export * from "./casos.filters";

export function validateCasePayload(payload: CasePayload) {
  ensureEnum("tipoViolencia", payload.tipoViolencia, TIPO_VIOLENCIA);

  const tipoViolenciaDescricoes = payload.tipoViolenciaDescricoes;
  if (!Array.isArray(tipoViolenciaDescricoes) || tipoViolenciaDescricoes.length === 0) {
    throw new CasoValidationError("tipoViolenciaDescricoes deve conter ao menos um item.");
  }

  for (const [fieldName, allowedValues] of CASE_OPTIONAL_ENUM_FIELDS) {
    ensureOptionalEnum(fieldName, payload[fieldName], allowedValues);
  }

  for (const field of CASE_BOOLEAN_FIELDS) {
    ensureOptionalEnum(field, payload[field], SIM_NAO);
  }

  if (payload.canalDenuncia === "OUTROS" && !payload.especificacaoOutroCanal) {
    throw new CasoValidationError("especificacaoOutroCanal é obrigatória quando canalDenuncia for OUTROS.");
  }
  if (payload.racaCor === "INDIGENA" && !payload.etniaIndigena) {
    throw new CasoValidationError("etniaIndigena é obrigatória quando racaCor for INDIGENA.");
  }
  if (payload.vinculoAgressor === "OUTROS" && !payload.especificacaoOutroVinculo) {
    throw new CasoValidationError("especificacaoOutroVinculo é obrigatória quando vinculoAgressor for OUTROS.");
  }
}

export function normalizeCreateCasoInput(data: unknown, admin: AuthenticatedUser): NormalizedCaseMutationInput {
  if (!isRecord(data)) {
    throw new CasoValidationError("Body da requisição deve ser um objeto.");
  }

  const status = ensureEnum("status", data.status ?? "Ativo", CASE_STATUS);
  const data_cad = ensureDate(data.data_cad ?? new Date().toISOString().slice(0, 10));

  const providedUnitId = data.unit_id !== undefined && data.unit_id !== null ? ensureInteger(data.unit_id, "unit_id") : undefined;
  const unit_id = providedUnitId ?? admin.unit_id;
  if (unit_id === null || unit_id === undefined) {
    throw new CasoValidationError("unit_id é obrigatório para criar casos.");
  }
  if (admin.role !== "gestor" && providedUnitId !== undefined && providedUnitId !== admin.unit_id) {
    throw new CasoValidationError("Você só pode criar casos para a sua própria unidade.", 403);
  }

  const normalizedPayload = normalizeCasePayload(extractPayload(data));
  validateCasePayload(normalizedPayload);

  const nome = trimString(data.nome ?? normalizedPayload.nome);
  const tec_ref = trimString(data.tec_ref);

  return {
    nome: typeof nome === "string" && nome.length > 0 ? nome : null,
    data_cad,
    tec_ref: typeof tec_ref === "string" && tec_ref.length > 0 ? tec_ref : null,
    status,
    unit_id,
    dados_completos_payload: normalizedPayload,
  };
}

export function normalizeUpdateCasoInput(data: unknown): NormalizedCaseUpdateInput {
  if (!isRecord(data)) {
    throw new CasoValidationError("Body da requisição deve ser um objeto.");
  }

  const normalizedPayload = normalizePartialCasePayload(extractPayload(data));

  if (Object.keys(normalizedPayload).length === 0) {
    throw new CasoValidationError("dados_completos_payload deve conter ao menos um campo.");
  }

  if (
    normalizedPayload.tipoViolenciaDescricoes !== undefined &&
    (!Array.isArray(normalizedPayload.tipoViolenciaDescricoes) || normalizedPayload.tipoViolenciaDescricoes.length === 0)
  ) {
    throw new CasoValidationError("tipoViolenciaDescricoes deve conter ao menos um item.");
  }

  ensureOptionalEnum("tipoViolencia", normalizedPayload.tipoViolencia, TIPO_VIOLENCIA);

  for (const [fieldName, allowedValues] of CASE_OPTIONAL_ENUM_FIELDS) {
    ensureOptionalEnum(fieldName, normalizedPayload[fieldName], allowedValues);
  }

  for (const field of CASE_BOOLEAN_FIELDS) {
    ensureOptionalEnum(field, normalizedPayload[field], SIM_NAO);
  }

  const nome = trimString(data.nome);
  const tec_ref = trimString(data.tec_ref);

  return {
    nome: typeof nome === "string" ? (nome.length > 0 ? nome : null) : undefined,
    data_cad: data.data_cad !== undefined ? ensureDate(data.data_cad) : undefined,
    tec_ref: typeof tec_ref === "string" ? (tec_ref.length > 0 ? tec_ref : null) : undefined,
    dados_completos_payload: normalizedPayload,
  };
}

export { normalizeCasePayload, normalizeCaseReadPayload, normalizePartialCasePayload };
