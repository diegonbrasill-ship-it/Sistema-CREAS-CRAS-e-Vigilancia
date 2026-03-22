import { z } from "zod";

// Mantém as mesmas validações do arquivo legado `src/pages/Cadastro.tsx`
// para evitar regressão de comportamento.

export const validateCPF = (cpf: string | undefined | null): boolean => {
  if (!cpf || cpf.trim() === "") return true;
  const cpfClean = cpf.replace(/[^\d]/g, "");
  if (cpfClean.length !== 11 || /^(\d)\1+$/.test(cpfClean)) return false;
  return true;
};

export const validateNIS = (nis: string | undefined | null): boolean => {
  if (!nis || nis.trim() === "") return true;
  return /^\d{11}$/.test(nis.replace(/[^\d]/g, ""));
};

export const toStr = (v: unknown) => (v === undefined || v === null ? "" : v);

// PR-3: enums canônicos (baixo risco — campos já são Select na UI)
const simNaoEnum = z.enum(["Sim", "Não"]);
const sexoEnum = z.enum(["Masculino", "Feminino"]);
const corEtniaEnum = z.enum(["Branca", "Preta", "Parda"]);
const escolaridadeEnum = z.enum(["Fundamental Incompleto", "Fundamental Completo"]);
const encaminhadaScfvEnum = z.enum(["SCFV", "CDI", "Não"]);
const confirmacaoViolenciaEnum = z.enum(["Confirmada", "Em análise", "Não confirmada"]);

// PR-4: enums canônicos (novos blocos)
const tipoViolenciaCanonEnum = z.enum(["FISICA", "PSICOLOGICA", "SEXUAL", "PATRIMONIAL", "MORAL"]);
const canalOrigemEnum = z.enum([
  "DISQUE_100_180",
  "CONSELHO_TUTELAR",
  "PODER_JUDICIARIO_MINISTERIO_PUBLICO",
  "DELEGACIA_DE_POLICIA",
  "DEMANDA_ESPONTANEA",
  "ENCAMINHAMENTO_DA_REDE",
  "OUTROS",
]);
const racaCorEnum = z.enum(["BRANCA", "PRETA", "PARDA", "AMARELA", "INDIGENA", "NAO_DECLARADO"]);
const orientacaoSexualEnum = z.enum(["HETEROSSEXUAL", "HOMOSSEXUAL", "BISSEXUAL", "OUTRA", "PREFIRO_NAO_INFORMAR"]);
const identidadeGeneroEnum = z.enum(["HOMEM", "MULHER", "TRAVESTI", "NAO_BINARIO", "OUTROS"]);

const vinculoAgressorEnum = z.enum(["CONJUGE", "COMPANHEIRO", "EX_COMPANHEIRO", "PAI", "MAE", "FILHO", "IRMAO", "OUTROS"]);
const faixaEtariaAgressorEnum = z.enum(["MENOR_18", "FAIXA_18_30", "FAIXA_31_40", "FAIXA_41_50", "FAIXA_51_60", "FAIXA_61_MAIS"]);
const sexoAgressorEnum = z.enum(["HOMEM", "MULHER", "OUTRO"]);

const tipoResidenciaEnum = z.enum(["CASA", "APARTAMENTO", "COMODO_QUITINETE", "BARRACO_OCUPACAO", "UNIDADE_INSTITUCIONAL", "SITUACAO_DE_RUA"]);
const formaOcupacaoEnum = z.enum(["PROPRIA_PAGA", "PROPRIA_EM_AQUISICAO", "ALUGADA", "CEDIDA_FAMILIAR_AMIGO", "CEDIDA_EMPREGADOR", "OCUPADA_IRREGULAR"]);
const materialConstrucaoEnum = z.enum(["ALVENARIA_TIJOLO", "MADEIRA_APARELHADA", "MATERIAL_REAPROVEITADO", "SEM_CONSTRUCAO_PERMANENTE"]);

const pr4Fields = {
  // origem
  canalOrigem: z.preprocess(toStr, canalOrigemEnum).optional().nullable(),
  dataDenuncia: z.preprocess(toStr, z.string()).optional().nullable(),
  protocolo: z.preprocess(toStr, z.string()).optional().nullable(),
  especificacaoOutroCanal: z.preprocess(toStr, z.string()).optional().nullable(),

  // violência (canônico)
  tipoViolencia: z.preprocess(toStr, tipoViolenciaCanonEnum).optional().nullable(),
  tipoViolenciaDescricoes: z.array(z.string()).optional().nullable(),

  // raça/cor e etnia
  racaCor: z.preprocess(toStr, racaCorEnum).optional().nullable(),
  etniaIndigena: z.preprocess(toStr, z.string()).optional().nullable(),

  // sensíveis
  orientacaoSexual: z.preprocess(toStr, orientacaoSexualEnum).optional().nullable(),
  identidadeGenero: z.preprocess(toStr, identidadeGeneroEnum).optional().nullable(),

  // agressor
  vinculoAgressor: z.preprocess(toStr, vinculoAgressorEnum).optional().nullable(),
  coabitaComAgressor: z.preprocess(toStr, simNaoEnum).optional().nullable(),
  especificacaoOutroVinculo: z.preprocess(toStr, z.string()).optional().nullable(),
  faixaEtariaAgressor: z.preprocess(toStr, faixaEtariaAgressorEnum).optional().nullable(),
  bairroAgressor: z.preprocess(toStr, z.string()).optional().nullable(),
  sexoAgressor: z.preprocess(toStr, sexoAgressorEnum).optional().nullable(),

  // moradia
  tipoResidencia: z.preprocess(toStr, tipoResidenciaEnum).optional().nullable(),
  formaOcupacao: z.preprocess(toStr, formaOcupacaoEnum).optional().nullable(),
  materialConstrucao: z.preprocess(toStr, materialConstrucaoEnum).optional().nullable(),
  valorAluguel: z.preprocess(
    (v) => {
      if (v === "" || v === undefined || v === null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : v;
    },
    z.number().nonnegative().optional().nullable(),
  ),
} as const;

export const baseSchema = z
  .object({
    data_cad: z.string().min(1, "A data do cadastro é obrigatória."),
    tec_ref: z.string().min(3, "O nome do técnico é obrigatório."),
    tipo_violencia: z.string().min(1, "O tipo de violência é obrigatório."),
    local_ocorrencia: z.string().min(1, "O local da ocorrência é obrigatório."),

    nome: z.string().optional().nullable(),
    cpf: z.string().optional().nullable().refine(validateCPF, { message: "CPF inválido." }),
    nis: z.string().optional().nullable().refine(validateNIS, { message: "NIS deve conter 11 dígitos." }),
    idade: z.string().optional().nullable(),
    sexo: sexoEnum.optional().nullable(),
    corEtnia: corEtniaEnum.optional().nullable(),
    bairro: z.string().optional().nullable(),
    escolaridade: z.string().optional().nullable(),
    rendaFamiliar: z.string().optional().nullable(),
    recebePBF: z.string().optional().nullable(),
    recebeBPC: z.string().optional().nullable(),
    recebeBE: z.string().optional().nullable(),
    membrosCadUnico: z.string().optional().nullable(),
    membroPAI: z.string().optional().nullable(),
    composicaoFamiliar: z.string().optional().nullable(),
    tipoMoradia: z.string().optional().nullable(),
    referenciaFamiliar: z.string().optional().nullable(),
    membroCarcerario: z.string().optional().nullable(),
    membroSocioeducacao: z.string().optional().nullable(),
    vitimaPCD: z.string().optional().nullable(),
    vitimaPCDDetalhe: z.string().optional().nullable(),
    tratamentoSaude: z.string().optional().nullable(),
    tratamentoSaudeDetalhe: z.string().optional().nullable(),
    dependeFinanceiro: z.string().optional().nullable(),
    encaminhamento: z.string().optional().nullable(),
    encaminhamentoDetalhe: z.string().optional().nullable(),
    qtdAtendimentos: z.string().optional().nullable(),
    encaminhadaSCFV: encaminhadaScfvEnum.optional().nullable(),
    inseridoPAEFI: simNaoEnum.optional().nullable(),
    confirmacaoViolencia: confirmacaoViolenciaEnum.optional().nullable(),
    canalDenuncia: z.string().optional().nullable(),
    notificacaoSINAM: simNaoEnum.optional().nullable(),
    reincidente: simNaoEnum.optional().nullable(),
    ...pr4Fields,
  })
  .superRefine((data: any, ctx) => {
    // PR-4: condicionais
    if (data.canalOrigem === "OUTROS" && !data.especificacaoOutroCanal) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["especificacaoOutroCanal"], message: "Especifique o outro canal." });
    }

    if (data.vinculoAgressor === "OUTROS" && !data.especificacaoOutroVinculo) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["especificacaoOutroVinculo"], message: "Especifique o vínculo (Outros)." });
    }

    if (data.racaCor === "INDIGENA" && !data.etniaIndigena) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["etniaIndigena"], message: "Informe a etnia indígena." });
    }

    if (data.tipoResidencia === "SITUACAO_DE_RUA") {
      // não exigir campos dependentes
      return;
    }

    if (data.formaOcupacao === "ALUGADA" && (data.valorAluguel === null || data.valorAluguel === undefined || data.valorAluguel === "")) {
      // opcional neste ciclo (não adiciona issue)
    }
  });

export const editSchema = z
  .object({
    data_cad: z.preprocess(toStr, z.string().min(1, "A data do cadastro é obrigatória.")),
    tec_ref: z.preprocess(toStr, z.string().min(3, "O nome do técnico é obrigatório.")),
    tipo_violencia: z.preprocess(toStr, z.string().min(1, "O tipo de violência é obrigatório.")),
    local_ocorrencia: z.preprocess(toStr, z.string().min(1, "O local da ocorrência é obrigatório.")),
    nome: z.preprocess(toStr, z.string().min(1, "O nome completo é obrigatório.")),
    cpf: z.preprocess(toStr, z.string().min(1, "O CPF é obrigatório.").refine(validateCPF, { message: "CPF inválido." })),
    nis: z.preprocess(toStr, z.string().min(1, "O NIS é obrigatório.").refine(validateNIS, { message: "NIS deve conter 11 dígitos." })),
    idade: z.preprocess(toStr, z.string().min(1, "A idade é obrigatória.")),
    sexo: z.preprocess(toStr, sexoEnum),
    corEtnia: z.preprocess(toStr, corEtniaEnum),
    bairro: z.preprocess(toStr, z.string().min(1, "O bairro é obrigatório.")),
    escolaridade: z.preprocess(toStr, escolaridadeEnum),
    rendaFamiliar: z.preprocess(toStr, z.string().min(1, "A renda familiar é obrigatória.")),
    recebePBF: z.preprocess(toStr, z.string().min(1, "Informe se recebe Bolsa Família.")),
    recebeBPC: z.preprocess(toStr, z.string().min(1, "Informe se recebe BPC.")),
    recebeBE: z.preprocess(toStr, z.string().min(1, "Informe se recebe Benefício de Erradicação.")),
    membrosCadUnico: z.preprocess(toStr, z.string().min(1, "Informe se possui membros no CadÚnico.")),
    membroPAI: z.string().optional().nullable(),
    composicaoFamiliar: z.preprocess(toStr, z.string().min(1, "A composição familiar é obrigatória.")),
    tipoMoradia: z.preprocess(toStr, z.string().min(1, "O tipo de moradia é obrigatório.")),
    referenciaFamiliar: z.preprocess(toStr, z.string().min(1, "A referência familiar é obrigatória.")),
    membroCarcerario: z.preprocess(toStr, z.string().min(1, "Informe se há membro em sistema carcerário.")),
    membroSocioeducacao: z.preprocess(toStr, z.string().min(1, "Informe se há membro em socioeducação.")),
    vitimaPCD: z.preprocess(toStr, z.string().min(1, "Informe se a vítima é PCD.")),
    vitimaPCDDetalhe: z.string().optional().nullable(),
    tratamentoSaude: z.preprocess(toStr, z.string().min(1, "Informe se faz tratamento de saúde.")),
    tratamentoSaudeDetalhe: z.string().optional().nullable(),
    dependeFinanceiro: z.preprocess(toStr, z.string().min(1, "Informe se depende financeiramente do agressor.")),
    encaminhamento: z.preprocess(toStr, z.string().min(1, "Informe se houve encaminhamento.")),
    encaminhamentoDetalhe: z.string().optional().nullable(),
    qtdAtendimentos: z.preprocess(toStr, z.string().min(1, "A quantidade de atendimentos é obrigatória.")),
    encaminhadaSCFV: z.preprocess(toStr, encaminhadaScfvEnum),
    inseridoPAEFI: z.preprocess(toStr, simNaoEnum),
    confirmacaoViolencia: z.preprocess(toStr, confirmacaoViolenciaEnum),
    canalDenuncia: z.preprocess(toStr, z.string().min(1, "O canal de denúncia é obrigatório.")),
    notificacaoSINAM: z.preprocess(toStr, simNaoEnum),
    reincidente: z.preprocess(toStr, simNaoEnum),
    ...pr4Fields,
  })
  .superRefine((data: any, ctx) => {
    // mesmas condicionais do baseSchema
    if (data.canalOrigem === "OUTROS" && !data.especificacaoOutroCanal) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["especificacaoOutroCanal"], message: "Especifique o outro canal." });
    }

    if (data.vinculoAgressor === "OUTROS" && !data.especificacaoOutroVinculo) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["especificacaoOutroVinculo"], message: "Especifique o vínculo (Outros)." });
    }

    if (data.racaCor === "INDIGENA" && !data.etniaIndigena) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["etniaIndigena"], message: "Informe a etnia indígena." });
    }
  });

export type CasoForm = z.infer<typeof editSchema>;

export const tabFields: Record<string, (keyof CasoForm)[]> = {
  "1. Atendimento": ["data_cad", "tec_ref", "tipo_violencia", "local_ocorrencia"],
  "2. Vítima": ["nome", "cpf", "nis", "idade", "sexo", "corEtnia", "bairro", "escolaridade"],
  "3. Família": [
    "rendaFamiliar",
    "recebePBF",
    "recebeBPC",
    "recebeBE",
    "membrosCadUnico",
    "membroPAI",
    "composicaoFamiliar",
    "tipoMoradia",
    "referenciaFamiliar",
    "membroCarcerario",
    "membroSocioeducacao",
  ],
  "4. Saúde": ["vitimaPCD", "vitimaPCDDetalhe", "tratamentoSaude", "tratamentoSaudeDetalhe", "dependeFinanceiro"],
  "5. Encaminhamentos": [
    "encaminhamento",
    "encaminhamentoDetalhe",
    "qtdAtendimentos",
    "encaminhadaSCFV",
    "inseridoPAEFI",
    "confirmacaoViolencia",
    "canalDenuncia",
    "notificacaoSINAM",
    "reincidente",
  ],
  "6. Agressor": ["vinculoAgressor", "especificacaoOutroVinculo", "coabitaComAgressor", "faixaEtariaAgressor", "sexoAgressor", "bairroAgressor"],
  "7. Moradia": ["tipoResidencia", "formaOcupacao", "materialConstrucao", "valorAluguel"],
};