import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CasoFormSchema } from "@/types/casoFormSchema";

vi.mock("@/services/api", () => ({
  getCasoFormSchema: vi.fn(),
}));

import { getCasoFormSchema } from "@/services/api";
import { clearCasoFormSchemaCache, getCachedCasoFormSchema, loadCasoFormSchema } from "./schema-store";

const schemaFixture: CasoFormSchema = {
  schemaKey: "casos.form",
  version: "2026-04-14",
  status: "draft-target",
  description: "Schema de teste",
  notes: [],
  tabs: [{ key: "atendimento", label: "1. Atendimento", description: "Atendimento", order: 1 }],
  optionSets: {},
  groupedOptionSets: {},
  fields: [],
};

describe("pages/Cadastro/schema-store", () => {
  beforeEach(() => {
    clearCasoFormSchemaCache();
    vi.clearAllMocks();
  });

  it("mantém cache em memória por sessão e evita refetch sequencial", async () => {
    vi.mocked(getCasoFormSchema).mockResolvedValue(schemaFixture);

    const first = await loadCasoFormSchema();
    const second = await loadCasoFormSchema();

    expect(first).toEqual(schemaFixture);
    expect(second).toEqual(schemaFixture);
    expect(getCachedCasoFormSchema()).toEqual(schemaFixture);
    expect(getCasoFormSchema).toHaveBeenCalledTimes(1);
  });

  it("compartilha a mesma requisição em paralelo até a resolução", async () => {
    let resolveRequest!: (value: CasoFormSchema) => void;
    vi.mocked(getCasoFormSchema).mockReturnValue(
      new Promise<CasoFormSchema>((resolve) => {
        resolveRequest = resolve;
      })
    );

    const firstPromise = loadCasoFormSchema();
    const secondPromise = loadCasoFormSchema();

    expect(getCasoFormSchema).toHaveBeenCalledTimes(1);

    resolveRequest(schemaFixture);

    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    expect(first).toEqual(schemaFixture);
    expect(second).toEqual(schemaFixture);
    expect(getCachedCasoFormSchema()).toEqual(schemaFixture);
  });
});
