import type { CasoDetalhado } from "@/services/api";
import type { CasoForm } from "./schema";

export type AdapterContext = {
  /** string exibida/registrada como técnico de referência (autoritativo no FE) */
  tecRefFromAuth?: string;
  /** unit_id do usuário logado (para criação) */
  unitIdFromAuth?: number | null;
};

const isRecord = (v: unknown): v is Record<string, any> => typeof v === "object" && v !== null;

export function coalesceKeys<T = unknown>(obj: Record<string, any> | undefined | null, keys: string[]): T | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return undefined;
}

/**
 * Achata a resposta do backend no formato do formulário.
 * Regras de compatibilidade:
 * - `dados_completos` é mesclado no topo.
 * - `tipo_violencia` aceita leitura por alias `tipoViolencia`.
 */
export function caseToFormValues(apiCaso: CasoDetalhado): Partial<CasoForm> {
  const dc = isRecord((apiCaso as any).dados_completos) ? ((apiCaso as any).dados_completos as Record<string, any>) : {};

  const dataCadRaw = (apiCaso as any).data_cad ?? (dc as any).data_cad;
  const data_cad = dataCadRaw ? new Date(dataCadRaw).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

  const tipo_violencia =
    coalesceKeys<string>(dc, ["tipo_violencia", "tipoViolencia"]) ??
    (apiCaso as any).tipo_violencia ??
    (apiCaso as any).tipoViolencia;

  const local_ocorrencia = coalesceKeys<string>(dc, ["local_ocorrencia", "localOcorrencia"]) ?? (apiCaso as any).local_ocorrencia;

  return {
    // top-level
    data_cad,
    tec_ref: (apiCaso as any).tec_ref ?? (apiCaso as any).tecRef,

    // atendimento (com compat)
    tipo_violencia: tipo_violencia ?? "",
    local_ocorrencia: local_ocorrencia ?? "",

    // demais campos (preferir `dados_completos`)
    nome: dc.nome ?? (apiCaso as any).nome ?? null,
    cpf: dc.cpf ?? (apiCaso as any).cpf ?? null,
    nis: dc.nis ?? (apiCaso as any).nis ?? null,
    idade: dc.idade ?? (apiCaso as any).idade ?? null,
    sexo: dc.sexo ?? (apiCaso as any).sexo ?? null,
    corEtnia: dc.corEtnia ?? (apiCaso as any).corEtnia ?? null,
    bairro: dc.bairro ?? (apiCaso as any).bairro ?? null,
    escolaridade: dc.escolaridade ?? (apiCaso as any).escolaridade ?? null,

    rendaFamiliar: dc.rendaFamiliar ?? null,
    recebePBF: dc.recebePBF ?? null,
    recebeBPC: dc.recebeBPC ?? null,
    recebeBE: dc.recebeBE ?? null,
    membrosCadUnico: dc.membrosCadUnico ?? null,
    membroPAI: dc.membroPAI ?? null,
    composicaoFamiliar: dc.composicaoFamiliar ?? null,
    tipoMoradia: dc.tipoMoradia ?? null,
    referenciaFamiliar: dc.referenciaFamiliar ?? null,
    membroCarcerario: dc.membroCarcerario ?? null,
    membroSocioeducacao: dc.membroSocioeducacao ?? null,

    vitimaPCD: dc.vitimaPCD ?? null,
    vitimaPCDDetalhe: dc.vitimaPCDDetalhe ?? null,
    tratamentoSaude: dc.tratamentoSaude ?? null,
    tratamentoSaudeDetalhe: dc.tratamentoSaudeDetalhe ?? null,
    dependeFinanceiro: dc.dependeFinanceiro ?? null,

    encaminhamento: dc.encaminhamento ?? null,
    encaminhamentoDetalhe: dc.encaminhamentoDetalhe ?? null,
    qtdAtendimentos: dc.qtdAtendimentos ?? null,
    encaminhadaSCFV: dc.encaminhadaSCFV ?? null,
    inseridoPAEFI: dc.inseridoPAEFI ?? null,
    confirmacaoViolencia: dc.confirmacaoViolencia ?? null,
    canalDenuncia: dc.canalDenuncia ?? null,
    notificacaoSINAM: dc.notificacaoSINAM ?? (dc as any).notificacaoSINAN ?? null,
    reincidente: dc.reincidente ?? null,
  };
}

/**
 * Monta payload de criação respeitando o formato existente.
 * Compat: inclui aliases canônicos quando necessário (backend tolera additionalProperties).
 */
export function formValuesToCreatePayload(values: CasoForm, ctx: AdapterContext) {
  const { data_cad, tec_ref, tipo_violencia, local_ocorrencia, ...rest } = values;

  const dados_completos_payload = {
    // legado
    tipo_violencia,
    local_ocorrencia,

    // alias canônico (para convergência gradual / vigilância)
    tipoViolencia: tipo_violencia,
    localOcorrencia: local_ocorrencia,

    // restante como o formulário já trabalha (flat)
    ...rest,
  };

  return {
    data_cad,
    tec_ref: ctx.tecRefFromAuth ?? tec_ref,
    unit_id: ctx.unitIdFromAuth ?? undefined,

    // mantém o nome usado hoje no Cadastro.tsx (não mudar contrato neste PR)
    dados_completos_payload,
  };
}

/**
 * Monta payload de update (PUT) preservando a lógica de enviar apenas campos alterados.
 * Aqui a assinatura aceita Partial, pois o update atual usa dirtyFields.
 */
export function formValuesToUpdatePayload(values: Partial<CasoForm>, ctx: AdapterContext) {
  const payload: Record<string, any> = { ...values };

  // tecnicamente autoritativo — se vier do auth, sobrescreve
  if (ctx.tecRefFromAuth) payload.tec_ref = ctx.tecRefFromAuth;

  // aliases de compat (apenas quando o campo existir no patch)
  if (payload.tipo_violencia !== undefined) payload.tipoViolencia = payload.tipo_violencia;
  if (payload.local_ocorrencia !== undefined) payload.localOcorrencia = payload.local_ocorrencia;
  if (payload.data_cad !== undefined) payload.dataCad = payload.data_cad;

  return payload;
}
