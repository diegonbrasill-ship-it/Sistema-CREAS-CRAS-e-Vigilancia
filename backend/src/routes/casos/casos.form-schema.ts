type FieldType = "text" | "textarea" | "date" | "number" | "select" | "multiselect" | "grouped-multiselect";
type Width = "full" | "half" | "third";
type VisibilityRule =
  | { field: string; equals: string }
  | { field: string; notEquals: string }
  | { field: string; includes: string };

import {
  CASO_GROUPED_OPTION_SETS,
  CASO_OPTION_SETS,
  type CatalogOption,
  type CatalogOptionSet,
} from "./casos.option-catalog";

type Field = {
  key: string;
  label: string;
  type: FieldType;
  tab: string;
  storage: { target: "meta" | "payload"; path: string };
  required?: boolean;
  width?: Width;
  optionSet?: string;
  groupedOptionSet?: string;
  visibleWhen?: VisibilityRule[];
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

type Tab = { key: string; label: string; description: string; order: number };

export type CasoFormSchema = {
  schemaKey: "casos.form";
  version: string;
  status: "draft-target";
  description: string;
  notes: string[];
  tabs: Tab[];
  optionSets: Record<string, CatalogOptionSet>;
  groupedOptionSets: Record<string, Record<string, readonly CatalogOption[]>>;
  fields: Field[];
};

const field = (input: Field): Field => ({
  width: "third",
  summary: { show: true },
  filters: { enabled: false },
  ...input,
});

const tabs: Tab[] = [
  { key: "atendimento", label: "1. Atendimento", description: "Classificação do caso, violência e origem da denúncia.", order: 1 },
  { key: "vitima", label: "2. Vítima", description: "Identificação e perfil da vítima.", order: 2 },
  { key: "familia", label: "3. Família", description: "Contexto familiar e social.", order: 3 },
  { key: "saude", label: "4. Saúde", description: "Deficiência e tratamento de saúde.", order: 4 },
  { key: "encaminhamentos", label: "5. Encaminhamentos", description: "Fluxos de atendimento e rede.", order: 5 },
  { key: "agressor", label: "6. Agressor", description: "Informações mínimas sobre o agressor.", order: 6 },
  { key: "moradia", label: "7. Moradia", description: "Condições de moradia e ocupação.", order: 7 },
];
const optionSets: CasoFormSchema["optionSets"] = CASO_OPTION_SETS;
const groupedOptionSets: CasoFormSchema["groupedOptionSets"] = CASO_GROUPED_OPTION_SETS;

const fields: Field[] = [
  field({ key: "data_cad", label: "Data do cadastro", type: "date", tab: "atendimento", required: true, width: "half", storage: { target: "meta", path: "data_cad" } }),
  field({ key: "tec_ref", label: "Técnico responsável", type: "text", tab: "atendimento", required: true, width: "half", storage: { target: "meta", path: "tec_ref" }, filters: { enabled: true, key: "tec_ref" } }),
  field({
    key: "tiposViolencia",
    label: "Tipos principais de violência",
    type: "multiselect",
    tab: "atendimento",
    required: true,
    width: "full",
    optionSet: "tipo_violencia",
    helpText: "Permite classificar o caso com um ou mais tipos principais de violência.",
    storage: { target: "payload", path: "tiposViolencia" },
    validation: { minSelections: 1 },
    filters: { enabled: true, key: "tiposViolencia" },
  }),
  field({
    key: "detalhesViolencia",
    label: "Detalhamento da violência",
    type: "grouped-multiselect",
    tab: "atendimento",
    required: true,
    width: "full",
    groupedOptionSet: "detalhes_violencia",
    clearWhenHidden: true,
    helpText: "Abre um grupo de descrições por tipo de violência selecionado e exige ao menos uma descrição por grupo.",
    storage: { target: "payload", path: "detalhesViolencia" },
    validation: { minSelectionsPerGroup: 1, requireSelectedGroupsFrom: "tiposViolencia" },
  }),
  field({ 
    key: "canalDenuncia", 
    label: "Canal de denúncia", 
    type: "select", 
    tab: "atendimento", 
    required: true, 
    width: "half", 
    optionSet: "canal_denuncia", 
    storage: { 
      target: "payload", 
      path: "canalDenuncia" }, 
    filters: {
       enabled: true, 
       key: "canalDenuncia" } 
  }),
  field({ 
    key: "especificacaoOutroCanal", 
    label: "Especificar outro canal", 
    type: "text", 
    tab: "atendimento", 
    width: "half", 
    visibleWhen: [{ 
      field: "canalDenuncia", 
      equals: "OUTROS" 
    }], 
    clearWhenHidden: true, 
    storage: { 
      target: "payload", 
      path: "especificacaoOutroCanal" 
    } 
    }),
  field({ key: "protocolo", label: "Protocolo", type: "text", tab: "atendimento", width: "half", storage: { target: "payload", path: "protocolo" } }),
  field({ key: "nome", label: "Nome completo", type: "text", tab: "vitima", required: true, width: "full", storage: { target: "payload", path: "nome" } }),
  field({ key: "cpf", label: "CPF", type: "text", tab: "vitima", required: true, storage: { target: "payload", path: "cpf" }, validation: { validator: "cpf" }, filters: { enabled: true, key: "cpf" } }),
  field({ key: "nis", label: "NIS", type: "text", tab: "vitima", required: true, storage: { target: "payload", path: "nis" }, validation: { validator: "nis" }, filters: { enabled: true, key: "nis" } }),
  field({ key: "idade", label: "Idade", type: "number", tab: "vitima", required: true, storage: { target: "payload", path: "idade" }, validation: { min: 0, max: 130 } }),
  field({ key: "sexo", label: "Sexo", type: "select", tab: "vitima", required: true, optionSet: "sexo", storage: { target: "payload", path: "sexo" }, filters: { enabled: true, key: "sexo" } }),
  field({ key: "orientacaoSexual", label: "Orientação sexual", type: "select", tab: "vitima", optionSet: "orientacao_sexual", storage: { target: "payload", path: "orientacaoSexual" } }),
  field({ key: "identidadeGenero", label: "Identidade de gênero", type: "select", tab: "vitima", optionSet: "identidade_genero", storage: { target: "payload", path: "identidadeGenero" } }),
  field({ key: "racaCor", label: "Raça/cor", type: "select", tab: "vitima", required: true, optionSet: "raca_cor", storage: { target: "payload", path: "racaCor" }, filters: { enabled: true, key: "racaCor" } }),
  field({ key: "etniaIndigena", label: "Etnia indígena", type: "text", tab: "vitima", visibleWhen: [{ field: "racaCor", equals: "INDIGENA" }], clearWhenHidden: true, storage: { target: "payload", path: "etniaIndigena" } }),
  field({ key: "bairro", label: "Bairro", type: "text", tab: "vitima", required: true, storage: { target: "payload", path: "bairro" }, filters: { enabled: true, key: "bairro" } }),
  field({ key: "macroRegiao", label: "Macro-região", type: "text", tab: "vitima", storage: { target: "payload", path: "macroRegiao" } }),
  field({ key: "escolaridade", label: "Escolaridade", type: "select", tab: "vitima", required: true, optionSet: "escolaridade", storage: { target: "payload", path: "escolaridade" }, filters: { enabled: true, key: "escolaridade" } }),
  field({ key: "rendaFamiliar", label: "Renda familiar", type: "select", tab: "familia", required: true, optionSet: "renda_familiar", storage: { target: "payload", path: "rendaFamiliar" } }),
  field({ key: "recebePBF", label: "Recebe Bolsa Família", type: "select", tab: "familia", required: true, optionSet: "sim_nao", storage: { target: "payload", path: "recebePBF" }, filters: { enabled: true, key: "recebePBF" } }),
  field({ key: "recebeBPC", label: "Recebe BPC", type: "select", tab: "familia", required: true, optionSet: "recebe_bpc", storage: { target: "payload", path: "recebeBPC" }, filters: { enabled: true, key: "recebeBPC" } }),
  field({ key: "recebeBE", label: "Recebe Benefício de Erradicação", type: "select", tab: "familia", required: true, optionSet: "sim_nao", storage: { target: "payload", path: "recebeBE" } }),
  field({ key: "membrosCadUnico", label: "Membros no CadÚnico", type: "select", tab: "familia", required: true, optionSet: "sim_nao", storage: { target: "payload", path: "membrosCadUnico" } }),
  field({ key: "membroPAI", label: "Membro PAI", type: "select", tab: "familia", required: true, optionSet: "sim_nao", storage: { target: "payload", path: "membroPAI" } }),
  field({ key: "composicaoFamiliar", label: "Composição familiar", type: "select", tab: "familia", required: true, optionSet: "composicao_familiar", storage: { target: "payload", path: "composicaoFamiliar" } }),
  field({ key: "referenciaFamiliar", label: "Referência familiar", type: "text", tab: "familia", required: true, storage: { target: "payload", path: "referenciaFamiliar" } }),
  field({ key: "membroCarcerario", label: "Membro em sistema carcerário", type: "select", tab: "familia", required: true, optionSet: "sim_nao", storage: { target: "payload", path: "membroCarcerario" }, filters: { enabled: true, key: "membroCarcerario" } }),
  field({ key: "membroSocioeducacao", label: "Membro em socioeducação", type: "select", tab: "familia", required: true, optionSet: "sim_nao", storage: { target: "payload", path: "membroSocioeducacao" }, filters: { enabled: true, key: "membroSocioeducacao" } }),
  field({ key: "vitimaPCD", label: "Vítima PCD", type: "select", tab: "saude", required: true, optionSet: "sim_nao", storage: { target: "payload", path: "vitimaPCD" }, filters: { enabled: true, key: "vitimaPCD" } }),
  field({ key: "vitimaPCDDetalhe", label: "Tipo de deficiência", type: "select", tab: "saude", optionSet: "tipo_deficiencia", visibleWhen: [{ field: "vitimaPCD", equals: "Sim" }], clearWhenHidden: true, storage: { target: "payload", path: "vitimaPCDDetalhe" } }),
  field({ key: "tratamentoSaude", label: "Faz tratamento de saúde", type: "select", tab: "saude", required: true, optionSet: "sim_nao", storage: { target: "payload", path: "tratamentoSaude" } }),
  field({ key: "tratamentoSaudeDetalhe", label: "Onde faz tratamento", type: "text", tab: "saude", visibleWhen: [{ field: "tratamentoSaude", equals: "Sim" }], clearWhenHidden: true, storage: { target: "payload", path: "tratamentoSaudeDetalhe" } }),
  field({ key: "encaminhamento", label: "Encaminhamento realizado", type: "select", tab: "encaminhamentos", required: true, optionSet: "sim_nao", storage: { target: "payload", path: "encaminhamento" } }),
  field({ key: "encaminhamentoDetalhe", label: "Detalhe do encaminhamento", type: "text", tab: "encaminhamentos", visibleWhen: [{ field: "encaminhamento", equals: "Sim" }], clearWhenHidden: true, storage: { target: "payload", path: "encaminhamentoDetalhe" } }),
  field({ key: "encaminhadaSCFV", label: "Encaminhada ao SCFV/CDI", type: "select", tab: "encaminhamentos", required: true, optionSet: "encaminhada_scfv", storage: { target: "payload", path: "encaminhadaSCFV" } }),
  field({ key: "inseridoPAEFI", label: "Inserido no PAEFI", type: "select", tab: "encaminhamentos", required: true, optionSet: "sim_nao", storage: { target: "payload", path: "inseridoPAEFI" }, filters: { enabled: true, key: "inseridoPAEFI" } }),
  field({ key: "confirmacaoViolencia", label: "Confirmação da violência", type: "select", tab: "encaminhamentos", required: true, optionSet: "confirmacao_violencia", storage: { target: "payload", path: "confirmacaoViolencia" }, filters: { enabled: true, key: "confirmacaoViolencia" } }),
  field({ key: "notificacaoSINAN", label: "Notificação no SINAN", type: "select", tab: "encaminhamentos", required: true, optionSet: "sim_nao", storage: { target: "payload", path: "notificacaoSINAN" }, filters: { enabled: true, key: "notificacaoSINAN" } }),
  field({ key: "reincidente", label: "Reincidente", type: "select", tab: "encaminhamentos", required: true, optionSet: "sim_nao", storage: { target: "payload", path: "reincidente" }, filters: { enabled: true, key: "reincidente" } }),
  field({ key: "vinculoAgressor", label: "Vínculo com o agressor", type: "select", tab: "agressor", required: true, optionSet: "vinculo_agressor", storage: { target: "payload", path: "vinculoAgressor" }, filters: { enabled: true, key: "vinculoAgressor" } }),
  field({ key: "especificacaoOutroVinculo", label: "Especificar outro vínculo", type: "text", tab: "agressor", visibleWhen: [{ field: "vinculoAgressor", equals: "OUTROS" }], clearWhenHidden: true, storage: { target: "payload", path: "especificacaoOutroVinculo" } }),
  field({ key: "coabitaComAgressor", label: "Coabita com o agressor", type: "select", tab: "agressor", required: true, optionSet: "sim_nao", storage: { target: "payload", path: "coabitaComAgressor" }, filters: { enabled: true, key: "coabitaComAgressor" } }),
  field({ key: "faixaEtariaAgressor", label: "Faixa etária do agressor", type: "select", tab: "agressor", optionSet: "faixa_etaria_agressor", storage: { target: "payload", path: "faixaEtariaAgressor" }, filters: { enabled: true, key: "faixaEtariaAgressor" } }),
  field({ key: "sexoAgressor", label: "Sexo do agressor", type: "select", tab: "agressor", required: true, optionSet: "sexo_agressor", storage: { target: "payload", path: "sexoAgressor" }, filters: { enabled: true, key: "sexoAgressor" } }),
  field({ key: "bairroAgressor", label: "Bairro do agressor", type: "text", tab: "agressor", storage: { target: "payload", path: "bairroAgressor" } }),
  field({ key: "tipoResidencia", label: "Tipo de residência", type: "select", tab: "moradia", optionSet: "tipo_residencia", storage: { target: "payload", path: "tipoResidencia" }, filters: { enabled: true, key: "tipoResidencia" } }),
  field({ key: "formaOcupacao", label: "Forma de ocupação", type: "select", tab: "moradia", optionSet: "forma_ocupacao", visibleWhen: [{ field: "tipoResidencia", notEquals: "SITUACAO_DE_RUA" }], clearWhenHidden: true, storage: { target: "payload", path: "formaOcupacao" }, filters: { enabled: true, key: "formaOcupacao" } }),
  field({ key: "materialConstrucao", label: "Material da construção", type: "select", tab: "moradia", optionSet: "material_construcao", visibleWhen: [{ field: "tipoResidencia", notEquals: "SITUACAO_DE_RUA" }], clearWhenHidden: true, storage: { target: "payload", path: "materialConstrucao" }, filters: { enabled: true, key: "materialConstrucao" } }),
  field({ key: "valorAluguel", label: "Valor do aluguel", type: "number", tab: "moradia", visibleWhen: [{ field: "formaOcupacao", equals: "ALUGADA" }], clearWhenHidden: true, storage: { target: "payload", path: "valorAluguel" }, validation: { min: 0 } }),
];

export const CASO_FORM_SCHEMA: CasoFormSchema = {
  schemaKey: "casos.form",
  version: "2026-04-13",
  status: "draft-target",
  description: "Schema declarativo alvo do formulário de casos, incluindo violência cumulativa e opções customizáveis.",
  notes: [
    "A rota /api/casos/schema expõe o estado alvo do formulário.",
    "As rotas atuais de create/update ainda precisam ser adaptadas para consumir este shape integralmente.",
    "Campos com Outro devem promover a nova entrada para o catálogo persistido do campo.",
  ],
  tabs,
  optionSets,
  groupedOptionSets,
  fields,
};

export function getCasoFormSchema(): CasoFormSchema {
  return CASO_FORM_SCHEMA;
}
