import type {
  CasoFormSchema,
  CasoSchemaField,
  CasoSchemaOption,
  CasoSchemaTab,
} from "@/types/casoFormSchema";

export type CasoSchemaTabDefinition = {
  value: string;
  label: string;
  fields: string[];
};

export type CasoFormSchemaIndex = {
  schema: CasoFormSchema;
  fieldMap: Record<string, CasoSchemaField>;
  tabMap: Record<string, CasoSchemaTab>;
};

export function buildCasoFormSchemaIndex(schema: CasoFormSchema): CasoFormSchemaIndex {
  const fieldMap = Object.fromEntries(schema.fields.map((field) => [field.key, field]));
  const tabMap = Object.fromEntries(schema.tabs.map((tab) => [tab.key, tab]));

  return {
    schema,
    fieldMap,
    tabMap,
  };
}

export function getCasoSchemaField(index: CasoFormSchemaIndex, fieldKey: string): CasoSchemaField | undefined {
  return index.fieldMap[fieldKey];
}

export function getCasoSchemaFieldOptions(index: CasoFormSchemaIndex, fieldKey: string): CasoSchemaOption[] {
  const field = getCasoSchemaField(index, fieldKey);
  if (!field?.optionSet) {
    return [];
  }

  return index.schema.optionSets[field.optionSet]?.options ?? [];
}

export function getCasoSchemaGroupedFieldOptions(
  index: CasoFormSchemaIndex,
  fieldKey: string
): Record<string, CasoSchemaOption[]> {
  const field = getCasoSchemaField(index, fieldKey);
  if (!field?.groupedOptionSet) {
    return {};
  }

  return index.schema.groupedOptionSets[field.groupedOptionSet] ?? {};
}

export function deriveCasoSchemaTabDefinitions(schema: CasoFormSchema): CasoSchemaTabDefinition[] {
  return [...schema.tabs]
    .sort((left, right) => left.order - right.order)
    .map((tab) => ({
      value: tab.key,
      label: tab.label,
      fields: schema.fields.filter((field) => field.tab === tab.key).map((field) => field.key),
    }));
}
