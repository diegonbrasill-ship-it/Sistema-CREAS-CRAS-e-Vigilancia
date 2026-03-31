import { z } from "zod";
import { validateCPF, validateNIS } from "@/utils/validators";

import {
  CANAL_ORIGEM_VALUES,
  CONFIRMACAO_VIOLENCIA_VALUES,
  ENCAMINHADA_SCFV_VALUES,
  ESCOLARIDADE_VALUES,
  FAIXA_ETARIA_AGRESSOR_VALUES,
  FORMA_OCUPACAO_VALUES,
  getOptionValues,
  IDENTIDADE_GENERO_VALUES,
  MATERIAL_CONSTRUCAO_VALUES,
  ORIENTACAO_SEXUAL_VALUES,
  RACA_COR_VALUES,
  SEXO_AGRESSOR_VALUES,
  SEXO_VALUES,
  SIM_NAO_VALUES,
  TIPO_DEFICIENCIA_VALUES,
  TIPO_RESIDENCIA_VALUES,
  TIPO_VIOLENCIA_DESCRICOES_MAP,
  TIPO_VIOLENCIA_VALUES,
  VINCULO_AGRESSOR_VALUES,
} from "./options";

export const toStr = (v: unknown) => (v === undefined || v === null ? "" : v);
const isBlank = (v: unknown) => v === undefined || v === null || String(v).trim() === "";

const orientacaoSexualEnum = z.enum(ORIENTACAO_SEXUAL_VALUES);
const identidadeGeneroEnum = z.enum(IDENTIDADE_GENERO_VALUES);
const faixaEtariaAgressorEnum = z.enum(FAIXA_ETARIA_AGRESSOR_VALUES);
const tipoResidenciaEnum = z.enum(TIPO_RESIDENCIA_VALUES);
const formaOcupacaoEnum = z.enum(FORMA_OCUPACAO_VALUES);
const materialConstrucaoEnum = z.enum(MATERIAL_CONSTRUCAO_VALUES);

const requiredTextField = (message: string) => z.preprocess(toStr, z.string().min(1, message));
const optionalTextField = () => z.string().optional().nullable();

const requiredValidatedTextField = (requiredMessage: string, validate: (value: string) => boolean, invalidMessage: string) =>
  z.preprocess(
    toStr,
    z
      .string()
      .min(1, requiredMessage)
      .refine((value) => validate(value), { message: invalidMessage }),
  );

const optionalValidatedTextField = (validate: (value: string | undefined | null) => boolean, invalidMessage: string) =>
  z.string().optional().nullable().refine(validate, { message: invalidMessage });

const requiredEnumField = <T extends [string, ...string[]]>(values: T, message: string) =>
  z.preprocess(toStr, z.string().min(1, message).pipe(z.enum(values, { error: message })));

const optionalEnumField = <T extends [string, ...string[]]>(values: T) => z.preprocess(toStr, z.enum(values)).optional().nullable();

const optionalNumberField = () =>
  z.preprocess(
    (v) => {
      if (v === "" || v === undefined || v === null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : v;
    },
    z.number().nonnegative().optional().nullable(),
  );

const violenciaDescricoesByTipo = {
  FISICA: getOptionValues(TIPO_VIOLENCIA_DESCRICOES_MAP.FISICA),
  PSICOLOGICA: getOptionValues(TIPO_VIOLENCIA_DESCRICOES_MAP.PSICOLOGICA),
  SEXUAL: getOptionValues(TIPO_VIOLENCIA_DESCRICOES_MAP.SEXUAL),
  PATRIMONIAL: getOptionValues(TIPO_VIOLENCIA_DESCRICOES_MAP.PATRIMONIAL),
  MORAL: getOptionValues(TIPO_VIOLENCIA_DESCRICOES_MAP.MORAL),
} as const satisfies Record<(typeof TIPO_VIOLENCIA_VALUES)[number], readonly string[]>;

const sharedOptionalFields = {
  protocolo: z.preprocess(toStr, z.string()).optional().nullable(),
  especificacaoOutroCanal: z.preprocess(toStr, z.string()).optional().nullable(),
  tipoViolenciaDescricoes: z.array(z.string()).optional().nullable(),
  etniaIndigena: z.preprocess(toStr, z.string()).optional().nullable(),
  macroRegiao: z.preprocess(toStr, z.string()).optional().nullable(),
  orientacaoSexual: z.preprocess(toStr, orientacaoSexualEnum).optional().nullable(),
  identidadeGenero: z.preprocess(toStr, identidadeGeneroEnum).optional().nullable(),
  especificacaoOutroVinculo: z.preprocess(toStr, z.string()).optional().nullable(),
  faixaEtariaAgressor: z.preprocess(toStr, faixaEtariaAgressorEnum).optional().nullable(),
  bairroAgressor: z.preprocess(toStr, z.string()).optional().nullable(),
  tipoResidencia: z.preprocess(toStr, tipoResidenciaEnum).optional().nullable(),
  formaOcupacao: z.preprocess(toStr, formaOcupacaoEnum).optional().nullable(),
  materialConstrucao: z.preprocess(toStr, materialConstrucaoEnum).optional().nullable(),
  valorAluguel: optionalNumberField(),
} as const;

type SchemaMode = "base" | "edit";

const buildModeFields = (mode: SchemaMode) => {
  const isEdit = mode === "edit";

  const conditionalTextField = (message: string) => (isEdit ? requiredTextField(message) : optionalTextField());
  const conditionalEnumField = <T extends [string, ...string[]]>(values: T, message: string) =>
    isEdit ? requiredEnumField(values, message) : optionalEnumField(values);

  return {
    data_cad: requiredTextField("A data do cadastro é obrigatória."),
    tec_ref: requiredTextField("O nome do técnico é obrigatório."),
    tipoViolencia: requiredEnumField(TIPO_VIOLENCIA_VALUES, "Selecione o tipo de violência."),
    canalDenuncia: conditionalEnumField(CANAL_ORIGEM_VALUES, "Selecione o canal de denúncia."),

    nome: conditionalTextField("O nome completo é obrigatório."),
    cpf: isEdit
      ? requiredValidatedTextField("O CPF é obrigatório.", validateCPF, "CPF inválido.")
      : optionalValidatedTextField(validateCPF, "CPF inválido."),
    nis: isEdit
      ? requiredValidatedTextField("O NIS é obrigatório.", validateNIS, "NIS deve conter 11 dígitos.")
      : optionalValidatedTextField(validateNIS, "NIS deve conter 11 dígitos."),
    idade: conditionalTextField("A idade é obrigatória."),
    sexo: conditionalEnumField(SEXO_VALUES, "Selecione o sexo."),
    racaCor: conditionalEnumField(RACA_COR_VALUES, "Selecione a raça/cor."),
    bairro: conditionalTextField("O bairro é obrigatório."),
    escolaridade: conditionalEnumField(ESCOLARIDADE_VALUES, "Selecione a escolaridade."),

    rendaFamiliar: conditionalTextField("A renda familiar é obrigatória."),
    recebePBF: conditionalTextField("Informe se recebe Bolsa Família."),
    recebeBPC: conditionalTextField("Informe se recebe BPC."),
    recebeBE: conditionalTextField("Informe se recebe Benefício de Erradicação."),
    membrosCadUnico: conditionalTextField("Informe se possui membros no CadÚnico."),
    membroPAI: conditionalEnumField(SIM_NAO_VALUES, "Informe se há membro PAI."),
    composicaoFamiliar: conditionalTextField("A composição familiar é obrigatória."),
    referenciaFamiliar: conditionalTextField("A referência familiar é obrigatória."),
    membroCarcerario: conditionalTextField("Informe se há membro em sistema carcerário."),
    membroSocioeducacao: conditionalTextField("Informe se há membro em socioeducação."),

    vitimaPCD: conditionalTextField("Informe se a vítima é PCD."),
    vitimaPCDDetalhe: optionalEnumField(TIPO_DEFICIENCIA_VALUES),
    tratamentoSaude: conditionalTextField("Informe se faz tratamento de saúde."),
    tratamentoSaudeDetalhe: optionalTextField(),

    encaminhamento: conditionalTextField("Informe se houve encaminhamento."),
    encaminhamentoDetalhe: optionalTextField(),
    encaminhadaSCFV: conditionalEnumField(ENCAMINHADA_SCFV_VALUES, "Informe se a vítima foi encaminhada ao SCFV/CDI."),
    inseridoPAEFI: conditionalEnumField(SIM_NAO_VALUES, "Informe se a vítima foi inserida no PAEFI."),
    confirmacaoViolencia: conditionalEnumField(CONFIRMACAO_VIOLENCIA_VALUES, "Selecione a confirmação da violência."),
    notificacaoSINAN: conditionalEnumField(SIM_NAO_VALUES, "Informe se houve notificação no SINAN."),
    reincidente: conditionalEnumField(SIM_NAO_VALUES, "Informe se é um caso de reincidência."),

    vinculoAgressor: conditionalEnumField(VINCULO_AGRESSOR_VALUES, "Selecione o vínculo com o agressor."),
    coabitaComAgressor: conditionalEnumField(SIM_NAO_VALUES, "Informe se a vítima coabita com o agressor."),
    sexoAgressor: conditionalEnumField(SEXO_AGRESSOR_VALUES, "Selecione o sexo do agressor."),
  };
};

const applySharedRefinements = (data: Record<string, any>, ctx: z.RefinementCtx, mode: SchemaMode) => {
  const descricoes = Array.isArray(data.tipoViolenciaDescricoes) ? data.tipoViolenciaDescricoes.filter((item: unknown) => !isBlank(item)) : [];
  const descricoesPermitidas: readonly string[] =
    data.tipoViolencia && Object.prototype.hasOwnProperty.call(violenciaDescricoesByTipo, data.tipoViolencia)
      ? violenciaDescricoesByTipo[data.tipoViolencia as keyof typeof violenciaDescricoesByTipo]
      : [];

  if (descricoes.length === 0) {
    ctx.addIssue({ code: "custom", path: ["tipoViolenciaDescricoes"], message: "Selecione ao menos uma descrição da violência." });
  } else if (descricoesPermitidas.length > 0 && descricoes.some((item: string) => !descricoesPermitidas.includes(item))) {
    ctx.addIssue({ code: "custom", path: ["tipoViolenciaDescricoes"], message: "As descrições devem corresponder ao tipo de violência selecionado." });
  }

  if (data.canalDenuncia === "OUTROS" && !data.especificacaoOutroCanal) {
    ctx.addIssue({ code: "custom", path: ["especificacaoOutroCanal"], message: "Especifique o outro canal." });
  }

  if (data.vinculoAgressor === "OUTROS" && !data.especificacaoOutroVinculo) {
    ctx.addIssue({ code: "custom", path: ["especificacaoOutroVinculo"], message: "Especifique o vínculo (Outros)." });
  }

  if (data.racaCor === "INDIGENA" && !data.etniaIndigena) {
    ctx.addIssue({ code: "custom", path: ["etniaIndigena"], message: "Informe a etnia indígena." });
  }

  if (data.vitimaPCD === "Sim" && isBlank(data.vitimaPCDDetalhe)) {
    ctx.addIssue({ code: "custom", path: ["vitimaPCDDetalhe"], message: "Selecione o tipo de deficiência." });
  }

  if (mode === "base") {
    if (data.tipoResidencia === "SITUACAO_DE_RUA") {
      return;
    }

    if (!isBlank(data.tipoResidencia)) {
      if (isBlank(data.formaOcupacao)) {
        ctx.addIssue({ code: "custom", path: ["formaOcupacao"], message: "Informe a forma de ocupação." });
      }

      if (isBlank(data.materialConstrucao)) {
        ctx.addIssue({ code: "custom", path: ["materialConstrucao"], message: "Informe o material da construção." });
      }
    }

    return;
  }

  if (data.tipoResidencia !== "SITUACAO_DE_RUA") {
    if (isBlank(data.formaOcupacao)) {
      ctx.addIssue({ code: "custom", path: ["formaOcupacao"], message: "Informe a forma de ocupação." });
    }

    if (isBlank(data.materialConstrucao)) {
      ctx.addIssue({ code: "custom", path: ["materialConstrucao"], message: "Informe o material da construção." });
    }
  }
};

const buildCasoSchema = (mode: SchemaMode) =>
  z
    .object({
      ...buildModeFields(mode),
      ...sharedOptionalFields,
    })
    .superRefine((data, ctx) => applySharedRefinements(data, ctx, mode));

export const baseSchema = buildCasoSchema("base");
export const editSchema = buildCasoSchema("edit");
export const submitSchema = editSchema;

export type CasoForm = z.infer<typeof submitSchema>;

export const tabDefinitions = [
  {
    value: "atendimento",
    label: "1. Atendimento",
    fields: ["data_cad", "tec_ref", "tipoViolencia", "tipoViolenciaDescricoes", "canalDenuncia", "protocolo", "especificacaoOutroCanal"],
  },
  {
    value: "vitima",
    label: "2. Vítima",
    fields: ["nome", "cpf", "nis", "idade", "sexo", "orientacaoSexual", "identidadeGenero", "racaCor", "etniaIndigena", "bairro", "macroRegiao", "escolaridade"],
  },
  {
    value: "familia",
    label: "3. Família",
    fields: ["rendaFamiliar", "recebePBF", "recebeBPC", "recebeBE", "membrosCadUnico", "membroPAI", "composicaoFamiliar", "referenciaFamiliar", "membroCarcerario", "membroSocioeducacao"],
  },
  {
    value: "saude",
    label: "4. Saúde",
    fields: ["vitimaPCD", "vitimaPCDDetalhe", "tratamentoSaude", "tratamentoSaudeDetalhe"],
  },
  {
    value: "encaminhamentos",
    label: "5. Encaminhamentos",
    fields: ["encaminhamento", "encaminhamentoDetalhe", "encaminhadaSCFV", "inseridoPAEFI", "confirmacaoViolencia", "notificacaoSINAN", "reincidente"],
  },
  {
    value: "agressor",
    label: "6. Agressor",
    fields: ["vinculoAgressor", "especificacaoOutroVinculo", "coabitaComAgressor", "faixaEtariaAgressor", "sexoAgressor", "bairroAgressor"],
  },
  {
    value: "moradia",
    label: "7. Moradia",
    fields: ["tipoResidencia", "formaOcupacao", "materialConstrucao", "valorAluguel"],
  },
] as const satisfies Array<{ value: string; label: string; fields: (keyof CasoForm)[] }>;
