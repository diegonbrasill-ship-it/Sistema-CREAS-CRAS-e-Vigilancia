/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { CasoFormSchema } from "@/types/casoFormSchema";

vi.mock("@/services/api", () => ({
  getCasoFormSchema: vi.fn(),
}));

import { getCasoFormSchema } from "@/services/api";
import { clearCasoFormSchemaCache } from "../schema-store";
import { useCasoFormSchema } from "./useCasoFormSchema";

const schemaFixture: CasoFormSchema = {
  schemaKey: "casos.form",
  version: "2026-04-14",
  status: "draft-target",
  description: "Schema de teste",
  notes: [],
  tabs: [
    { key: "vitima", label: "2. Vítima", description: "Vítima", order: 2 },
    { key: "atendimento", label: "1. Atendimento", description: "Atendimento", order: 1 },
  ],
  optionSets: {
    canal_denuncia: {
      label: "Canal de denúncia",
      options: [
        { value: "DEMANDA_ESPONTANEA", label: "Demanda espontânea", isDefault: true },
        { value: "OUTROS", label: "Outro", isDefault: true },
      ],
    },
  },
  groupedOptionSets: {
    detalhes_violencia: {
      FISICA: [{ value: "CHUTES", label: "Chutes", isDefault: true }],
    },
  },
  fields: [
    {
      key: "nome",
      label: "Nome completo",
      type: "text",
      tab: "vitima",
      storage: { target: "payload", path: "nome" },
    },
    {
      key: "canalDenuncia",
      label: "Canal de denúncia",
      type: "select",
      tab: "atendimento",
      storage: { target: "payload", path: "canalDenuncia" },
      optionSet: "canal_denuncia",
    },
    {
      key: "detalhesViolencia",
      label: "Detalhamento da violência",
      type: "grouped-multiselect",
      tab: "atendimento",
      storage: { target: "payload", path: "detalhesViolencia" },
      groupedOptionSet: "detalhes_violencia",
    },
  ],
};

describe("pages/Cadastro/hooks/useCasoFormSchema", () => {
  beforeEach(() => {
    clearCasoFormSchemaCache();
    vi.clearAllMocks();
  });

  it("carrega o schema e expõe indexação, tabs derivadas e resolvers corretamente", async () => {
    vi.mocked(getCasoFormSchema).mockResolvedValue(schemaFixture);

    const { result } = renderHook(() => useCasoFormSchema());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.schema).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.schema?.version).toBe("2026-04-14");
    });

    expect(result.current.getField("canalDenuncia")?.label).toBe("Canal de denúncia");
    expect(result.current.getOptions("canalDenuncia")).toEqual([
      { value: "DEMANDA_ESPONTANEA", label: "Demanda espontânea", isDefault: true },
      { value: "OUTROS", label: "Outro", isDefault: true },
    ]);
    expect(result.current.getGroupedOptions("detalhesViolencia")).toEqual({
      FISICA: [{ value: "CHUTES", label: "Chutes", isDefault: true }],
    });
    expect(result.current.tabDefinitions).toEqual([
      { value: "atendimento", label: "1. Atendimento", fields: ["canalDenuncia", "detalhesViolencia"] },
      { value: "vitima", label: "2. Vítima", fields: ["nome"] },
    ]);
  });

  it("reutiliza o cache na segunda montagem da mesma sessão sem nova chamada HTTP", async () => {
    vi.mocked(getCasoFormSchema).mockResolvedValue(schemaFixture);

    const firstHook = renderHook(() => useCasoFormSchema());

    await waitFor(() => {
      expect(firstHook.result.current.isLoading).toBe(false);
      expect(firstHook.result.current.schema?.version).toBe("2026-04-14");
    });

    firstHook.unmount();

    const secondHook = renderHook(() => useCasoFormSchema());

    expect(secondHook.result.current.isLoading).toBe(false);
    expect(secondHook.result.current.schema?.version).toBe("2026-04-14");
    expect(getCasoFormSchema).toHaveBeenCalledTimes(1);
  });
});
