export type CasoSchemaVisibilityRule =
  | { field: string; equals: string }
  | { field: string; notEquals: string }
  | { field: string; includes: string };

export type CasoSchemaOption = {
  value: string;
  label: string;
  isDefault?: boolean;
};

export type CasoSchemaOptionSet = {
  label: string;
  allowCustomOption?: boolean;
  customOptionConfig?: {
    triggerValue: string;
    customLabelFieldKey: string;
    promoteToOptionCatalog: boolean;
    promotionScope: "unit" | "global";
    normalizedValueStrategy: "slug_uppercase";
  };
  options: CasoSchemaOption[];
};

export type CasoSchemaField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "number" | "select" | "multiselect" | "grouped-multiselect";
  tab: string;
  storage: { target: "meta" | "payload"; path: string };
  required?: boolean;
  width?: "full" | "half" | "third";
  optionSet?: string;
  groupedOptionSet?: string;
  visibleWhen?: CasoSchemaVisibilityRule[];
  clearWhenHidden?: boolean;
  helpText?: string;
  validation?: {
    validator?: "cpf" | "nis";
    min?: number;
    max?: number;
    minSelections?: number;
    minSelectionsPerGroup?: number;
    requireSelectedGroupsFrom?: string;
  };
  summary?: { show: boolean };
  filters?: { enabled: boolean; key?: string };
};

export type CasoSchemaTab = {
  key: string;
  label: string;
  description: string;
  order: number;
};

export type CasoFormSchema = {
  schemaKey: "casos.form";
  version: string;
  status: string;
  description: string;
  notes: string[];
  tabs: CasoSchemaTab[];
  optionSets: Record<string, CasoSchemaOptionSet>;
  groupedOptionSets: Record<string, Record<string, CasoSchemaOption[]>>;
  fields: CasoSchemaField[];
};
