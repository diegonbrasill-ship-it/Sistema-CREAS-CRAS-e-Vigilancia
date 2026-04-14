import type { CasoFormSchema, CasoSchemaField } from "@/types/casoFormSchema";
import type { CasoForm } from "./schema";
import { deriveCasoSchemaTabDefinitions } from "./schema-client";

type LegacyTabDefinition = {
  value: string;
  label: string;
  fields: (keyof CasoForm)[];
};

const FRONTEND_FIELD_COMPAT_MAP: Record<string, Array<keyof CasoForm>> = {
  tiposViolencia: ["tipoViolencia"],
  detalhesViolencia: ["tipoViolenciaDescricoes"],
};

function getComparableValue(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }

  return value;
}

export function mapSchemaFieldKeyToFrontendFormKeys(fieldKey: string): string[] {
  return FRONTEND_FIELD_COMPAT_MAP[fieldKey] ?? [fieldKey];
}

export function buildRuntimeTabDefinitions(
  schema: CasoFormSchema | null | undefined,
  fallbackTabDefinitions: readonly LegacyTabDefinition[]
): LegacyTabDefinition[] {
  if (!schema) {
    return [...fallbackTabDefinitions];
  }

  return deriveCasoSchemaTabDefinitions(schema).map((tab) => ({
    value: tab.value,
    label: tab.label,
    fields: tab.fields.flatMap((fieldKey) => mapSchemaFieldKeyToFrontendFormKeys(fieldKey)) as Array<keyof CasoForm>,
  }));
}

export function isSchemaFieldVisible(field: CasoSchemaField, values: Partial<Record<string, unknown>>): boolean {
  if (!field.visibleWhen || field.visibleWhen.length === 0) {
    return true;
  }

  return field.visibleWhen.every((rule) => {
    const currentValue = getComparableValue(values[rule.field]);

    if ("equals" in rule) {
      return currentValue === rule.equals;
    }

    if ("notEquals" in rule) {
      return currentValue !== rule.notEquals;
    }

    if (Array.isArray(currentValue)) {
      return currentValue.includes(rule.includes);
    }

    if (typeof currentValue === "string") {
      return currentValue.split(/[;,|]/).map((item) => item.trim()).includes(rule.includes);
    }

    return false;
  });
}

export function getVisibleFrontendFieldKeys(
  tabKey: string,
  schema: CasoFormSchema | null | undefined,
  values: Partial<Record<string, unknown>>,
  fallbackTabDefinitions: readonly LegacyTabDefinition[]
): string[] {
  if (!schema) {
    return fallbackTabDefinitions.find((tab) => tab.value === tabKey)?.fields.map(String) ?? [];
  }

  return schema.fields
    .filter((field) => field.tab === tabKey)
    .filter((field) => isSchemaFieldVisible(field, values))
    .flatMap((field) => mapSchemaFieldKeyToFrontendFormKeys(field.key));
}

function getClearedFieldValue(currentValue: unknown): unknown {
  if (Array.isArray(currentValue)) {
    return [];
  }

  if (typeof currentValue === "number") {
    return null;
  }

  if (currentValue === null) {
    return null;
  }

  return "";
}

export function getClearableHiddenFrontendFields(
  schema: CasoFormSchema | null | undefined,
  values: Partial<Record<string, unknown>>
): Array<{ key: string; value: unknown }> {
  if (!schema) {
    return [];
  }

  return schema.fields
    .filter((field) => field.clearWhenHidden)
    .filter((field) => !isSchemaFieldVisible(field, values))
    .flatMap((field) =>
      mapSchemaFieldKeyToFrontendFormKeys(field.key).map((fieldKey) => ({
        key: fieldKey,
        value: getClearedFieldValue(values[fieldKey]),
      }))
    );
}
