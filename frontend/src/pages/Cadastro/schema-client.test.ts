import { describe, expect, it } from "vitest";
import type { CasoFormSchema } from "@/types/casoFormSchema";
import {
  buildCasoFormSchemaIndex,
  deriveCasoSchemaTabDefinitions,
  getCasoSchemaField,
  getCasoSchemaFieldOptions,
  getCasoSchemaGroupedFieldOptions,
} from "./schema-client";

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
    tipo_violencia: {
      label: "Tipos principais de violência",
      options: [
        { value: "FISICA", label: "Física", isDefault: true },
        { value: "PSICOLOGICA", label: "Psicológica", isDefault: true },
      ],
    },
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
      FISICA: [
        { value: "CHUTES", label: "Chutes", isDefault: true },
        { value: "ESPANCAMENTO", label: "Espancamento", isDefault: true },
      ],
      PSICOLOGICA: [{ value: "AMEACA", label: "Ameaça", isDefault: true }],
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
      key: "tiposViolencia",
      label: "Tipos principais de violência",
      type: "multiselect",
      tab: "atendimento",
      storage: { target: "payload", path: "tiposViolencia" },
      optionSet: "tipo_violencia",
    },
    {
      key: "detalhesViolencia",
      label: "Detalhamento da violência",
      type: "grouped-multiselect",
      tab: "atendimento",
      storage: { target: "payload", path: "detalhesViolencia" },
      groupedOptionSet: "detalhes_violencia",
    },
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

describe("pages/Cadastro/schema-client", () => {
  it("indexa tabs e fields do schema por chave", () => {
    const index = buildCasoFormSchemaIndex(schemaFixture);

    expect(getCasoSchemaField(index, "canalDenuncia")?.label).toBe("Canal de denúncia");
    expect(index.tabMap.atendimento?.label).toBe("1. Atendimento");
  });

  it("resolve corretamente as opções simples a partir do optionSet do field", () => {
    const index = buildCasoFormSchemaIndex(schemaFixture);

    expect(getCasoSchemaFieldOptions(index, "canalDenuncia")).toEqual([
      { value: "DEMANDA_ESPONTANEA", label: "Demanda espontânea", isDefault: true },
      { value: "OUTROS", label: "Outro", isDefault: true },
    ]);
  });

  it("resolve corretamente as opções agrupadas para violência cumulativa", () => {
    const index = buildCasoFormSchemaIndex(schemaFixture);

    expect(getCasoSchemaGroupedFieldOptions(index, "detalhesViolencia")).toEqual({
      FISICA: [
        { value: "CHUTES", label: "Chutes", isDefault: true },
        { value: "ESPANCAMENTO", label: "Espancamento", isDefault: true },
      ],
      PSICOLOGICA: [{ value: "AMEACA", label: "Ameaça", isDefault: true }],
    });
  });

  it("deriva tabDefinitions ordenadas a partir do schema recebido da API", () => {
    expect(deriveCasoSchemaTabDefinitions(schemaFixture)).toEqual([
      {
        value: "atendimento",
        label: "1. Atendimento",
        fields: ["tiposViolencia", "detalhesViolencia", "canalDenuncia"],
      },
      {
        value: "vitima",
        label: "2. Vítima",
        fields: ["nome"],
      },
    ]);
  });
});
