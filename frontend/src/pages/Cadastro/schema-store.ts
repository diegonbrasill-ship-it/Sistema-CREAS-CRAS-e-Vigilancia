import { getCasoFormSchema } from "@/services/api";
import type { CasoFormSchema } from "@/types/casoFormSchema";

let cachedCasoFormSchema: CasoFormSchema | null = null;
let inflightCasoFormSchemaRequest: Promise<CasoFormSchema> | null = null;

export function getCachedCasoFormSchema(): CasoFormSchema | null {
  return cachedCasoFormSchema;
}

export function clearCasoFormSchemaCache() {
  cachedCasoFormSchema = null;
  inflightCasoFormSchemaRequest = null;
}

export async function loadCasoFormSchema(): Promise<CasoFormSchema> {
  if (cachedCasoFormSchema) {
    return cachedCasoFormSchema;
  }

  if (inflightCasoFormSchemaRequest) {
    return inflightCasoFormSchemaRequest;
  }

  inflightCasoFormSchemaRequest = getCasoFormSchema()
    .then((schema) => {
      cachedCasoFormSchema = schema;
      return schema;
    })
    .finally(() => {
      inflightCasoFormSchemaRequest = null;
    });

  return inflightCasoFormSchemaRequest;
}
