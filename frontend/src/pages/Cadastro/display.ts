import { formatDateForInput } from "@/utils/dateUtils";
import { OPTION_LABEL_MAPS, TIPO_VIOLENCIA_DESCRICOES_LABEL_MAP } from "@/utils/cadastroOptionLabels";
import type { CasoForm } from "./schema";

type CadastroField = keyof CasoForm;
type DisplayValue = string | string[] | null;

const humanizeFieldName = (field: string) =>
  field
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .trim()
    .replace(/\s+/g, " ");

const FIELD_LABELS: Partial<Record<CadastroField, string>> = {
  data_cad: "Data do cadastro",
  tec_ref: "Técnico de referência",
  tipoViolencia: "Tipo de violência",
  tipoViolenciaDescricoes: "Descrição da violência",
  canalDenuncia: "Canal de denúncia",
  protocolo: "Protocolo",
  especificacaoOutroCanal: "Especificação do outro canal",
  nome: "Nome completo",
  cpf: "CPF",
  nis: "NIS",
  idade: "Idade",
  sexo: "Sexo",
  orientacaoSexual: "Orientação sexual",
  identidadeGenero: "Identidade de gênero",
  racaCor: "Raça/cor",
  etniaIndigena: "Etnia indígena",
  bairro: "Bairro",
  macroRegiao: "Macro-região",
  escolaridade: "Escolaridade",
  rendaFamiliar: "Renda familiar",
  recebePBF: "Recebe Bolsa Família",
  recebeBPC: "Recebe BPC",
  recebeBE: "Recebe BE",
  membrosCadUnico: "Membros no CadÚnico",
  membroPAI: "Membro do PAI",
  composicaoFamiliar: "Composição familiar",
  referenciaFamiliar: "Referência familiar",
  membroCarcerario: "Membro em sistema carcerário",
  membroSocioeducacao: "Membro em socioeducação",
  vitimaPCD: "Vítima PCD",
  vitimaPCDDetalhe: "Detalhes da deficiência",
  tratamentoSaude: "Tratamento de saúde",
  tratamentoSaudeDetalhe: "Detalhes do tratamento de saúde",
  encaminhamento: "Houve encaminhamento",
  encaminhamentoDetalhe: "Detalhes do encaminhamento",
  encaminhadaSCFV: "Encaminhada ao SCFV/CDI",
  inseridoPAEFI: "Inserido no PAEFI",
  confirmacaoViolencia: "Confirmação da violência",
  notificacaoSINAN: "Notificação no SINAN",
  reincidente: "Reincidente",
  vinculoAgressor: "Vínculo com o agressor",
  especificacaoOutroVinculo: "Especificação do vínculo",
  coabitaComAgressor: "Coabita com o agressor",
  faixaEtariaAgressor: "Faixa etária do agressor",
  sexoAgressor: "Sexo do agressor",
  bairroAgressor: "Bairro do agressor",
  tipoResidencia: "Tipo de residência",
  formaOcupacao: "Forma de ocupação",
  materialConstrucao: "Material da construção",
  valorAluguel: "Valor do aluguel",
};

const formatDateForDisplay = (value: string): string | null => {
  const formatted = formatDateForInput(value);
  if (!formatted) return null;

  return new Date(`${formatted}T00:00:00`).toLocaleDateString("pt-BR");
};

export const getCadastroFieldLabel = (field: CadastroField) => FIELD_LABELS[field] ?? humanizeFieldName(field);

export const formatCadastroFieldValue = (field: CadastroField, value: CasoForm[CadastroField] | undefined): DisplayValue => {
  if (value === undefined || value === null || value === "") return null;

  if (Array.isArray(value)) {
    const labels = value.map((item) => TIPO_VIOLENCIA_DESCRICOES_LABEL_MAP[String(item)] ?? String(item)).filter(Boolean);
    return labels.length > 0 ? labels : null;
  }

  if (field === "data_cad" && typeof value === "string") {
    return formatDateForDisplay(value);
  }

  if (field === "valorAluguel") {
    const normalized = Number(value);
    return Number.isFinite(normalized)
      ? normalized.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : String(value);
  }

  if (typeof value === "string") {
    const optionLabel = OPTION_LABEL_MAPS[field]?.[value];
    return optionLabel ?? value;
  }

  return String(value);
};
