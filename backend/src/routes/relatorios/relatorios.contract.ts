import { AuthenticatedUser } from "../../middleware/auth/authenticated.user";
import {
  AccessScope,
  RelatorioDashboardInput,
  RelatorioGeralInput,
  RelatorioValidationError,
} from "./relatorios.contract.shared";

export * from "./relatorios.contract.shared";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const resolved = readString(item);
      if (resolved) return resolved;
    }
  }

  return undefined;
}

function ensureDate(fieldName: string, value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RelatorioValidationError(`${fieldName} deve estar no formato YYYY-MM-DD.`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new RelatorioValidationError(`${fieldName} deve ser uma data válida.`);
  }

  return value;
}

function normalizeRequester(user: AuthenticatedUser | undefined) {
  if (!user) {
    throw new RelatorioValidationError("Usuário autenticado é obrigatório.", 401);
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    unit_id: user.unit_id,
    role_id: user.role_id,
    permissions: user.permissions,
  };
}

function ensureAccessScope(accessScope: AccessScope | undefined): AccessScope {
  if (!accessScope) {
    throw new RelatorioValidationError("Escopo de acesso do relatório é obrigatório.", 403);
  }

  return accessScope;
}

function ensureMonth(fieldName: string, value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}$/.test(value)) {
    throw new RelatorioValidationError(`${fieldName} deve estar no formato YYYY-MM.`);
  }

  return value;
}

export function parseRelatorioGeralInput(
  body: unknown,
  accessScope: AccessScope | undefined,
  requestedBy: AuthenticatedUser | undefined
): RelatorioGeralInput {
  if (!isRecord(body)) {
    throw new RelatorioValidationError("Body da requisição deve ser um objeto.");
  }

  const startDate = ensureDate("startDate", body.startDate);
  const endDate = ensureDate("endDate", body.endDate);

  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  if (start > end) {
    throw new RelatorioValidationError("startDate não pode ser maior que endDate.");
  }

  return {
    startDate,
    endDate,
    accessScope: ensureAccessScope(accessScope),
    requestedBy: normalizeRequester(requestedBy),
  };
}

export function parseRelatorioDashboardInput(
  query: unknown,
  accessScope: AccessScope | undefined,
  requestedBy: AuthenticatedUser | undefined
): RelatorioDashboardInput {
  if (!isRecord(query)) {
    throw new RelatorioValidationError("Query da requisição deve ser um objeto.");
  }

  const mes = ensureMonth("mes", readString(query.mes));
  const tec_ref = readString(query.tec_ref);
  const bairro = readString(query.bairro);

  return {
    filters: {
      mes,
      tec_ref,
      bairro,
    },
    accessScope: ensureAccessScope(accessScope),
    requestedBy: normalizeRequester(requestedBy),
  };
}
