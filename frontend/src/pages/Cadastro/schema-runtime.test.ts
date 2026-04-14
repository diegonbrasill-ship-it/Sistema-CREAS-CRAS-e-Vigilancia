import { describe, expect, it } from "vitest";
import type { CasoFormSchema } from "@/types/casoFormSchema";
import {
  buildRuntimeTabDefinitions,
  getClearableHiddenFrontendFields,
  getVisibleFrontendFieldKeys,
  isSchemaFieldVisible,
  mapSchemaFieldKeyToFrontendFormKeys,
} from "./schema-runtime";

const fallbackTabs = [
  {
    value: "atendimento",
    label: "1. Atendimento",
    fields: [
      "data_cad",
      "tec_ref",
      "tipoViolencia",
      "tipoViolenciaDescricoes",
      "canalDenuncia",
      "protocolo",
      "especificacaoOutroCanal",
    ],
  },
] as const;

const schemaFixture: CasoFormSchema = {
  schemaKey: "casos.form",
  version: "2026-04-14",
  status: "draft-target",
  description: "Schema de teste",
  notes: [],
  tabs: [{ key: "atendimento", label: "1. Atendimento", description: "Atendimento", order: 1 }],
  optionSets: {},
  groupedOptionSets: {},
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
    {
      key: "valorAluguel",
      label: "Valor aluguel",
      type: "number",
      tab: "atendimento",
      storage: { target: "payload", path: "valorAluguel" },
      visibleWhen: [{ field: "formaOcupacao", equals: "ALUGADA" }],
      clearWhenHidden: true,
    },
  ],
};

describe("pages/Cadastro/schema-runtime", () => {
  it("mapeia os campos novos de violência para as chaves legadas do frontend atual", () => {
    expect(mapSchemaFieldKeyToFrontendFormKeys("tiposViolencia")).toEqual(["tipoViolencia"]);
    expect(mapSchemaFieldKeyToFrontendFormKeys("detalhesViolencia")).toEqual(["tipoViolenciaDescricoes"]);
    expect(mapSchemaFieldKeyToFrontendFormKeys("canalDenuncia")).toEqual(["canalDenuncia"]);
  });

  it("deriva tabs runtime do schema preservando compatibilidade com o form atual", () => {
    expect(buildRuntimeTabDefinitions(schemaFixture, fallbackTabs)).toEqual([
      {
        value: "atendimento",
        label: "1. Atendimento",
        fields: [
          "tipoViolencia",
          "tipoViolenciaDescricoes",
          "canalDenuncia",
          "especificacaoOutroCanal",
          "valorAluguel",
        ],
      },
    ]);
  });

  it("resolve visibilidade por schema e retorna os campos visíveis da aba", () => {
    const outroCanalField = schemaFixture.fields.find((field) => field.key === "especificacaoOutroCanal")!;

    expect(isSchemaFieldVisible(outroCanalField, { canalDenuncia: "OUTROS" })).toBe(true);
    expect(isSchemaFieldVisible(outroCanalField, { canalDenuncia: "DEMANDA_ESPONTANEA" })).toBe(false);

    expect(
      getVisibleFrontendFieldKeys(
        "atendimento",
        schemaFixture,
        { canalDenuncia: "DEMANDA_ESPONTANEA", formaOcupacao: "ALUGADA" },
        fallbackTabs
      )
    ).toEqual(["tipoViolencia", "tipoViolenciaDescricoes", "canalDenuncia", "valorAluguel"]);
  });

  it("identifica campos ocultos com clearWhenHidden e calcula o valor limpo correto", () => {
    expect(
      getClearableHiddenFrontendFields(schemaFixture, {
        canalDenuncia: "DEMANDA_ESPONTANEA",
        especificacaoOutroCanal: "Aplicativo",
        formaOcupacao: "PROPRIA_PAGA",
        valorAluguel: 350,
      })
    ).toEqual([
      { key: "especificacaoOutroCanal", value: "" },
      { key: "valorAluguel", value: null },
    ]);
  });
});
