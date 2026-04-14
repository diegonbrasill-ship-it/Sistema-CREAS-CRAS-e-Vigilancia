/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CasoFormSchema } from "@/types/casoFormSchema";
import { clearCasoFormSchemaCache } from "./schema-store";

const navigateMock = vi.fn();
const mockUser = {
  id: 1,
  username: "tecnico",
  nome_completo: "Tecnica Maria",
  cargo: "Assistente Social",
  role: "tecnico_superior",
  unit_id: 42,
};

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({}),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

vi.mock("react-toastify", () => ({
  toast: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/services/api", () => ({
  createCase: vi.fn(),
  getCasoById: vi.fn(),
  getCasoFormSchema: vi.fn(),
  updateCase: vi.fn(),
}));

import { getCasoFormSchema } from "@/services/api";
import { useCadastroForm } from "./useCadastroForm";

const schemaFixture: CasoFormSchema = {
  schemaKey: "casos.form",
  version: "2026-04-14",
  status: "draft-target",
  description: "Schema de teste",
  notes: [],
  tabs: [{ key: "atendimento", label: "1. Atendimento", description: "Atendimento", order: 1 }],
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
      key: "tiposViolencia",
      label: "Tipos principais de violência",
      type: "multiselect",
      tab: "atendimento",
      storage: { target: "payload", path: "tiposViolencia" },
    },
    {
      key: "detalhesViolencia",
      label: "Detalhamento da violência",
      type: "grouped-multiselect",
      tab: "atendimento",
      storage: { target: "payload", path: "detalhesViolencia" },
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
      key: "especificacaoOutroCanal",
      label: "Especificar outro canal",
      type: "text",
      tab: "atendimento",
      storage: { target: "payload", path: "especificacaoOutroCanal" },
      visibleWhen: [{ field: "canalDenuncia", equals: "OUTROS" }],
      clearWhenHidden: true,
    },
  ],
};

describe("pages/Cadastro/useCadastroForm", () => {
  beforeEach(() => {
    clearCasoFormSchemaCache();
    vi.clearAllMocks();
  });

  it("usa as tabs derivadas do schema com compatibilidade para o form atual", async () => {
    vi.mocked(getCasoFormSchema).mockResolvedValue(schemaFixture);

    const { result } = renderHook(() => useCadastroForm());

    await waitFor(() => {
      expect(result.current.casoSchema.isLoading).toBe(false);
    });

    expect(result.current.runtimeTabDefinitions).toEqual([
      {
        value: "atendimento",
        label: "1. Atendimento",
        fields: ["tipoViolencia", "tipoViolenciaDescricoes", "canalDenuncia", "especificacaoOutroCanal"],
      },
    ]);
  });

  it("limpa automaticamente campo oculto com clearWhenHidden quando a regra do schema deixa de valer", async () => {
    vi.mocked(getCasoFormSchema).mockResolvedValue(schemaFixture);

    const { result } = renderHook(() => useCadastroForm());

    await waitFor(() => {
      expect(result.current.casoSchema.isLoading).toBe(false);
    });

    act(() => {
      result.current.form.setValue("canalDenuncia", "OUTROS");
      result.current.form.setValue("especificacaoOutroCanal", "Aplicativo");
    });

    expect(result.current.form.getValues("especificacaoOutroCanal")).toBe("Aplicativo");

    act(() => {
      result.current.form.setValue("canalDenuncia", "DEMANDA_ESPONTANEA");
    });

    await waitFor(() => {
      expect(result.current.form.getValues("especificacaoOutroCanal")).toBe("");
    });
  });
});
