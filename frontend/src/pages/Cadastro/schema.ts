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

export const baseSchema = z.object({
  data_cad: z.string().min(1, "A data do cadastro é obrigatória."),
  tec_ref: z.string().min(3, "O nome do técnico é obrigatório."),
  tipo_violencia: z.string().min(1, "O tipo de violência é obrigatório."),
  local_ocorrencia: z.string().min(1, "O local da ocorrência é obrigatório."),

  nome: z.string().optional().nullable(),
  cpf: z.string().optional().nullable().refine(validateCPF, { message: "CPF inválido." }),
  nis: z.string().optional().nullable().refine(validateNIS, { message: "NIS deve conter 11 dígitos." }),
  idade: z.string().optional().nullable(),
  sexo: z.string().optional().nullable(),
  corEtnia: z.string().optional().nullable(),
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
  encaminhadaSCFV: z.string().optional().nullable(),
  inseridoPAEFI: z.string().optional().nullable(),
  confirmacaoViolencia: z.string().optional().nullable(),
  canalDenuncia: z.string().optional().nullable(),
  notificacaoSINAM: z.string().optional().nullable(),
  reincidente: z.string().optional().nullable(),
});

export const editSchema = z.object({
  data_cad: z.preprocess(toStr, z.string().min(1, "A data do cadastro é obrigatória.")),
  tec_ref: z.preprocess(toStr, z.string().min(3, "O nome do técnico é obrigatório.")),
  tipo_violencia: z.preprocess(toStr, z.string().min(1, "O tipo de violência é obrigatório.")),
  local_ocorrencia: z.preprocess(toStr, z.string().min(1, "O local da ocorrência é obrigatório.")),
  nome: z.preprocess(toStr, z.string().min(1, "O nome completo é obrigatório.")),
  cpf: z.preprocess(toStr, z.string().min(1, "O CPF é obrigatório.").refine(validateCPF, { message: "CPF inválido." })),
  nis: z.preprocess(toStr, z.string().min(1, "O NIS é obrigatório.").refine(validateNIS, { message: "NIS deve conter 11 dígitos." })),
  idade: z.preprocess(toStr, z.string().min(1, "A idade é obrigatória.")),
  sexo: z.preprocess(toStr, z.string().min(1, "O sexo é obrigatório.")),
  corEtnia: z.preprocess(toStr, z.string().min(1, "A cor/etnia é obrigatória.")),
  bairro: z.preprocess(toStr, z.string().min(1, "O bairro é obrigatório.")),
  escolaridade: z.preprocess(toStr, z.string().min(1, "A escolaridade é obrigatória.")),
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
  encaminhadaSCFV: z.preprocess(toStr, z.string().min(1, "Informe se foi encaminhada ao SCFV/CDI.")),
  inseridoPAEFI: z.preprocess(toStr, z.string().min(1, "Informe se foi inserida no PAEFI.")),
  confirmacaoViolencia: z.preprocess(toStr, z.string().min(1, "A confirmação da violência é obrigatória.")),
  canalDenuncia: z.preprocess(toStr, z.string().min(1, "O canal de denúncia é obrigatório.")),
  notificacaoSINAM: z.preprocess(toStr, z.string().min(1, "Informe sobre a notificação no SINAM.")),
  reincidente: z.preprocess(toStr, z.string().min(1, "Informe se é caso de reincidência.")),
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
};