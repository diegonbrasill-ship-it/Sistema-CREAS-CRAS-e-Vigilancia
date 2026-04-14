import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CasoFormSchema } from "@/types/casoFormSchema";

const schemaFixture: CasoFormSchema = {
  schemaKey: "casos.form",
  version: "2026-04-14",
  status: "draft-target",
  description: "Schema de teste",
  notes: [],
  tabs: [
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
      key: "canalDenuncia",
      label: "Canal de denúncia",
      type: "select",
      tab: "atendimento",
      storage: { target: "payload", path: "canalDenuncia" },
      optionSet: "canal_denuncia",
    },
  ],
};

class LocalStorageMock {
  private store = new Map<string, string>();

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe("services/api.getCasoFormSchema", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
    vi.stubGlobal("localStorage", new LocalStorageMock());
    localStorage.setItem("token", "token-de-teste");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("busca o schema de casos no endpoint correto com Authorization e devolve o payload JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: () => "application/json",
      },
      json: async () => schemaFixture,
    });

    vi.stubGlobal("fetch", fetchMock);

    const { getCasoFormSchema } = await import("./api");
    const result = await getCasoFormSchema();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/casos/schema",
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer token-de-teste");
    expect(result).toEqual(schemaFixture);
  });
});
