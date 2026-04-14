import { useCallback, useEffect, useMemo, useState } from "react";
import type { CasoFormSchema, CasoSchemaField, CasoSchemaOption, CasoSchemaTab } from "@/types/casoFormSchema";
import {
  buildCasoFormSchemaIndex,
  deriveCasoSchemaTabDefinitions,
  getCasoSchemaField,
  getCasoSchemaFieldOptions,
  getCasoSchemaGroupedFieldOptions,
  type CasoFormSchemaIndex,
  type CasoSchemaTabDefinition,
} from "../schema-client";
import { getCachedCasoFormSchema, loadCasoFormSchema } from "../schema-store";

type UseCasoFormSchemaOptions = {
  enabled?: boolean;
};

export type UseCasoFormSchemaResult = {
  schema: CasoFormSchema | null;
  isLoading: boolean;
  error: Error | null;
  schemaIndex: CasoFormSchemaIndex | null;
  fieldMap: Record<string, CasoSchemaField>;
  tabMap: Record<string, CasoSchemaTab>;
  tabDefinitions: CasoSchemaTabDefinition[];
  getField(fieldKey: string): CasoSchemaField | undefined;
  getOptions(fieldKey: string): CasoSchemaOption[];
  getGroupedOptions(fieldKey: string): Record<string, CasoSchemaOption[]>;
};

export function useCasoFormSchema(options: UseCasoFormSchemaOptions = {}): UseCasoFormSchemaResult {
  const enabled = options.enabled ?? true;
  const cachedSchema = enabled ? getCachedCasoFormSchema() : null;
  const [schema, setSchema] = useState<CasoFormSchema | null>(cachedSchema);
  const [isLoading, setIsLoading] = useState(enabled && !cachedSchema);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    if (schema) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    loadCasoFormSchema()
      .then((nextSchema) => {
        if (cancelled) return;
        setSchema(nextSchema);
        setError(null);
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        setError(nextError instanceof Error ? nextError : new Error(String(nextError)));
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, schema]);

  const schemaIndex = useMemo(() => (schema ? buildCasoFormSchemaIndex(schema) : null), [schema]);
  const tabDefinitions = useMemo(() => (schema ? deriveCasoSchemaTabDefinitions(schema) : []), [schema]);

  const getField = useCallback(
    (fieldKey: string) => (schemaIndex ? getCasoSchemaField(schemaIndex, fieldKey) : undefined),
    [schemaIndex]
  );

  const getOptions = useCallback(
    (fieldKey: string) => (schemaIndex ? getCasoSchemaFieldOptions(schemaIndex, fieldKey) : []),
    [schemaIndex]
  );

  const getGroupedOptions = useCallback(
    (fieldKey: string) => (schemaIndex ? getCasoSchemaGroupedFieldOptions(schemaIndex, fieldKey) : {}),
    [schemaIndex]
  );

  return {
    schema,
    isLoading,
    error,
    schemaIndex,
    fieldMap: schemaIndex?.fieldMap ?? {},
    tabMap: schemaIndex?.tabMap ?? {},
    tabDefinitions,
    getField,
    getOptions,
    getGroupedOptions,
  };
}
