import {
  CANAL_ORIGEM_OPTIONS,
  CONFIRMACAO_VIOLENCIA_OPTIONS,
  ENCAMINHADA_SCFV_OPTIONS,
  ESCOLARIDADE_OPTIONS,
  FAIXA_ETARIA_AGRESSOR_OPTIONS,
  FORMA_OCUPACAO_OPTIONS,
  IDENTIDADE_GENERO_OPTIONS,
  MATERIAL_CONSTRUCAO_OPTIONS,
  ORIENTACAO_SEXUAL_OPTIONS,
  RACA_COR_OPTIONS,
  SIM_NAO_OPTIONS,
  SEXO_AGRESSOR_OPTIONS,
  SEXO_OPTIONS,
  TIPO_DEFICIENCIA_OPTIONS,
  TIPO_RESIDENCIA_OPTIONS,
  TIPO_VIOLENCIA_DESCRICOES_MAP,
  TIPO_VIOLENCIA_OPTIONS,
  VINCULO_AGRESSOR_OPTIONS,
} from "@/pages/Cadastro/options";

type OptionLike = {
  readonly value: string;
  readonly label: string;
};

const buildOptionLabelMap = (options: readonly OptionLike[]) =>
  Object.fromEntries(options.map((option) => [option.value, option.label])) as Record<string, string>;

export const OPTION_LABEL_MAPS: Record<string, Record<string, string>> = {
  tipoViolencia: buildOptionLabelMap(TIPO_VIOLENCIA_OPTIONS),
  canalDenuncia: buildOptionLabelMap(CANAL_ORIGEM_OPTIONS),
  sexo: buildOptionLabelMap(SEXO_OPTIONS),
  orientacaoSexual: buildOptionLabelMap(ORIENTACAO_SEXUAL_OPTIONS),
  identidadeGenero: buildOptionLabelMap(IDENTIDADE_GENERO_OPTIONS),
  racaCor: buildOptionLabelMap(RACA_COR_OPTIONS),
  corEtnia: buildOptionLabelMap(RACA_COR_OPTIONS),
  escolaridade: buildOptionLabelMap(ESCOLARIDADE_OPTIONS),
  membroPAI: buildOptionLabelMap(SIM_NAO_OPTIONS),
  vitimaPCD: buildOptionLabelMap(SIM_NAO_OPTIONS),
  vitimaPCDDetalhe: buildOptionLabelMap(TIPO_DEFICIENCIA_OPTIONS),
  encaminhadaSCFV: buildOptionLabelMap(ENCAMINHADA_SCFV_OPTIONS),
  confirmacaoViolencia: buildOptionLabelMap(CONFIRMACAO_VIOLENCIA_OPTIONS),
  vinculoAgressor: buildOptionLabelMap(VINCULO_AGRESSOR_OPTIONS),
  faixaEtariaAgressor: buildOptionLabelMap(FAIXA_ETARIA_AGRESSOR_OPTIONS),
  sexoAgressor: buildOptionLabelMap(SEXO_AGRESSOR_OPTIONS),
  tipoResidencia: buildOptionLabelMap(TIPO_RESIDENCIA_OPTIONS),
  formaOcupacao: buildOptionLabelMap(FORMA_OCUPACAO_OPTIONS),
  materialConstrucao: buildOptionLabelMap(MATERIAL_CONSTRUCAO_OPTIONS),
};

export const TIPO_VIOLENCIA_DESCRICOES_LABEL_MAP = buildOptionLabelMap(
  Object.values(TIPO_VIOLENCIA_DESCRICOES_MAP).flatMap((options) => [...options]),
);

export function formatOptionLabel(field: string, value: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return value;
  }

  return OPTION_LABEL_MAPS[field]?.[normalizedValue] ?? normalizedValue;
}
