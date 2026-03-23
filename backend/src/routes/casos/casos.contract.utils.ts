import {
  CasePayload,
  CasoValidationError,
  LEGACY_KEY_MAP,
  LEGACY_VALUE_MAP,
  META_FIELDS,
} from "./casos.contract.shared";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export function normalizeYesNoValue(value: unknown): unknown {
  if (value === "Nao") return "Não";
  return value;
}

export function readQueryString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const resolved = readQueryString(item);
      if (resolved) return resolved;
    }
  }

  return undefined;
}

function normalizeViolenceDescriptions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new CasoValidationError("tipoViolenciaDescricoes deve ser um array.");
  }

  const normalized = value
    .map((item) => trimString(item))
    .filter((item): item is string => typeof item === "string" && item.length > 0)
    .map((item) => LEGACY_VALUE_MAP.tipoViolenciaDescricoes[item] ?? item);

  return [...new Set(normalized)];
}

export function ensureDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new CasoValidationError("data_cad deve estar no formato YYYY-MM-DD.");
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new CasoValidationError("data_cad deve ser uma data válida.");
  }

  return value;
}

export function ensureInteger(value: unknown, fieldName: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CasoValidationError(`${fieldName} deve ser um inteiro válido.`);
  }
  return parsed;
}

export function ensurePositiveInteger(value: string | undefined, fieldName: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CasoValidationError(`${fieldName} deve ser um inteiro válido.`);
  }
  return parsed;
}

export function ensureEnum<T extends readonly string[]>(
  fieldName: string,
  value: unknown,
  allowed: T
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new CasoValidationError(`${fieldName} inválido.`);
  }
  return value as T[number];
}

export function ensureOptionalEnum<T extends readonly string[]>(fieldName: string, value: unknown, allowed: T) {
  if (value === undefined || value === null || value === "") {
    return;
  }
  ensureEnum(fieldName, value, allowed);
}

export function extractPayload(data: Record<string, unknown>): CasePayload {
  if (isRecord(data.dados_completos_payload)) {
    return data.dados_completos_payload;
  }

  const payloadFallback = Object.entries(data).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (!META_FIELDS.has(key)) {
      acc[key] = value;
    }
    return acc;
  }, {});

  if (Object.keys(payloadFallback).length > 0) {
    return payloadFallback;
  }

  throw new CasoValidationError("dados_completos_payload deve ser um objeto.");
}

function normalizePayloadKeys(payload: CasePayload): CasePayload {
  const normalized: CasePayload = {};

  for (const [rawKey, rawValue] of Object.entries(payload)) {
    const key = LEGACY_KEY_MAP[rawKey] ?? rawKey;
    let value: unknown = trimString(rawValue);
    value = normalizeYesNoValue(value);

    if (key === "tipoViolenciaDescricoes" && value !== undefined) {
      normalized[key] = normalizeViolenceDescriptions(value);
      continue;
    }

    if (key === "sexo" && typeof value === "string") {
      normalized[key] = LEGACY_VALUE_MAP.sexo[value] ?? value;
      continue;
    }

    normalized[key] = value;
  }

  return normalized;
}

function cleanupConditionalFields(payload: CasePayload): CasePayload {
  const next = { ...payload };

  if (next.canalDenuncia !== "OUTROS") {
    next.especificacaoOutroCanal = "";
  }
  if (next.racaCor !== "INDIGENA") {
    next.etniaIndigena = "";
  }
  if (next.vinculoAgressor !== "OUTROS") {
    next.especificacaoOutroVinculo = "";
  }
  if (next.tipoResidencia === "SITUACAO_DE_RUA") {
    next.valorAluguel = null;
  }
  if (next.formaOcupacao !== "ALUGADA") {
    next.valorAluguel = null;
  }

  return next;
}

export function normalizeCaseReadPayload(payload: unknown): CasePayload {
  if (!isRecord(payload)) {
    return {};
  }

  return cleanupConditionalFields(normalizePayloadKeys(payload));
}

export function normalizePartialCasePayload(payload: Record<string, unknown>): CasePayload {
  return normalizePayloadKeys(payload);
}

export function normalizeCasePayload(payload: Record<string, unknown>): CasePayload {
  return cleanupConditionalFields(normalizePayloadKeys(payload));
}
