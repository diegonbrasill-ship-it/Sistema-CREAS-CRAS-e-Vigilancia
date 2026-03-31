import type { CasoDetalhado } from "@/services/api";
import { formatDateForInput } from "@/utils/dateUtils";
import type { CasoForm } from "./schema";
import {
  asOptional,
  canalDenunciaToCanon,
  corEtniaLegacyToRacaCorCanon,
  escolaridadeLegacyToCanon,
  firstDefined,
  isRecord,
  legacyTipoViolenciaToCanon,
  normalizeSimNao,
  normalizeText,
  tipoDeficienciaToCanon,
  normalizeTipoViolenciaDescricoes,
  sexoLegacyToCanon,
} from "./normalizers";
import type {
  CanalDenunciaValue,
  EscolaridadeValue,
  RacaCorValue,
  SexoValue,
  TipoDeficienciaValue,
  TipoViolenciaDescricaoValue,
  TipoViolenciaValue,
} from "./normalizers";

export type AdapterContext = {
  tecRefFromAuth?: string;
  unitIdFromAuth?: number | null;
};

function sanitizeCasePayload(values: Partial<CasoForm>) {
  const payload: Record<string, any> = { ...values };

  const simNaoKeys = [
    "recebePBF",
    "recebeBE",
    "membrosCadUnico",
    "membroCarcerario",
    "membroSocioeducacao",
    "vitimaPCD",
    "tratamentoSaude",
    "encaminhamento",
    "inseridoPAEFI",
    "reincidente",
    "coabitaComAgressor",
    "notificacaoSINAN",
  ] as const;

  for (const key of simNaoKeys) {
    if (payload[key] !== undefined) {
      payload[key] = normalizeSimNao(payload[key]) ?? payload[key];
    }
  }

  const textKeys = [
    "protocolo",
    "especificacaoOutroCanal",
    "etniaIndigena",
    "macroRegiao",
    "especificacaoOutroVinculo",
    "bairroAgressor",
    "referenciaFamiliar",
    "encaminhamentoDetalhe",
    "tratamentoSaudeDetalhe",
  ] as const;

  for (const key of textKeys) {
    if (payload[key] !== undefined && payload[key] !== "") {
      payload[key] = normalizeText(payload[key]) ?? payload[key];
    }
  }

  if (payload.tipoViolencia !== undefined) {
    payload.tipoViolencia = legacyTipoViolenciaToCanon(payload.tipoViolencia) ?? payload.tipoViolencia;
  }

  if (payload.canalDenuncia !== undefined) {
    payload.canalDenuncia = canalDenunciaToCanon(payload.canalDenuncia) ?? payload.canalDenuncia;
  }

  if (payload.sexo !== undefined) {
    payload.sexo = sexoLegacyToCanon(payload.sexo) ?? payload.sexo;
  }

  if (payload.racaCor !== undefined) {
    payload.racaCor = corEtniaLegacyToRacaCorCanon(payload.racaCor) ?? payload.racaCor;
  }

  if (payload.escolaridade !== undefined) {
    payload.escolaridade = escolaridadeLegacyToCanon(payload.escolaridade) ?? payload.escolaridade;
  }

  if (payload.membroPAI !== undefined) {
    payload.membroPAI = normalizeSimNao(payload.membroPAI) ?? payload.membroPAI;
  }

  if (payload.vitimaPCDDetalhe !== undefined) {
    payload.vitimaPCDDetalhe = tipoDeficienciaToCanon(payload.vitimaPCDDetalhe) ?? payload.vitimaPCDDetalhe;
  }

  if (payload.tipoViolenciaDescricoes !== undefined) {
    payload.tipoViolenciaDescricoes =
      normalizeTipoViolenciaDescricoes(payload.tipoViolenciaDescricoes, payload.tipoViolencia) ?? payload.tipoViolenciaDescricoes;
  }

  if (payload.canalDenuncia !== "OUTROS") {
    payload.especificacaoOutroCanal = payload.especificacaoOutroCanal ?? "";
  }

  if (payload.vitimaPCD !== "Sim") {
    payload.vitimaPCDDetalhe = "";
  }

  if (payload.tratamentoSaude !== "Sim") {
    payload.tratamentoSaudeDetalhe = "";
  }

  if (payload.encaminhamento !== "Sim") {
    payload.encaminhamentoDetalhe = "";
  }

  if (payload.vinculoAgressor !== "OUTROS") {
    payload.especificacaoOutroVinculo = payload.especificacaoOutroVinculo ?? "";
  }

  if (payload.racaCor !== "INDIGENA") {
    payload.etniaIndigena = payload.etniaIndigena ?? "";
  }

  if (payload.tipoResidencia === "SITUACAO_DE_RUA") {
    payload.formaOcupacao = "";
    payload.materialConstrucao = "";
    payload.valorAluguel = null;
  } else if (payload.formaOcupacao !== "ALUGADA" && payload.formaOcupacao !== undefined) {
    payload.valorAluguel = null;
  }

  return payload;
}

export function caseToFormValues(apiCaso: CasoDetalhado): Partial<CasoForm> {
  const dc = isRecord((apiCaso as any).dados_completos) ? ((apiCaso as any).dados_completos as Record<string, any>) : {};

  const dataCadRaw = firstDefined<string>((apiCaso as any).data_cad, (dc as any).data_cad, (apiCaso as any).dataCad);
  const data_cad = dataCadRaw ? formatDateForInput(dataCadRaw) : formatDateForInput(new Date());

  const tipoViolencia = firstDefined<TipoViolenciaValue>(
    legacyTipoViolenciaToCanon(dc.tipoViolencia),
    legacyTipoViolenciaToCanon((apiCaso as any).tipoViolencia),
    legacyTipoViolenciaToCanon(dc.tipo_violencia),
    legacyTipoViolenciaToCanon((apiCaso as any).tipo_violencia),
  );

  const bairro = firstDefined<string>(
    dc.bairro,
    (apiCaso as any).bairro,
    dc.local_ocorrencia,
    (apiCaso as any).local_ocorrencia,
  );

  const canalDenuncia = firstDefined<CanalDenunciaValue>(
    canalDenunciaToCanon(dc.canalDenuncia),
    canalDenunciaToCanon((apiCaso as any).canalDenuncia),
    canalDenunciaToCanon(dc.canalOrigem),
    canalDenunciaToCanon((apiCaso as any).canalOrigem),
  );

  const racaCor = firstDefined<RacaCorValue>(
    corEtniaLegacyToRacaCorCanon(dc.racaCor),
    corEtniaLegacyToRacaCorCanon((apiCaso as any).racaCor),
    corEtniaLegacyToRacaCorCanon(dc.corEtnia),
    corEtniaLegacyToRacaCorCanon((apiCaso as any).corEtnia),
  );

  const tipoViolenciaDescricoes = firstDefined<TipoViolenciaDescricaoValue[]>(
    normalizeTipoViolenciaDescricoes(dc.tipoViolenciaDescricoes, tipoViolencia),
    normalizeTipoViolenciaDescricoes((apiCaso as any).tipoViolenciaDescricoes, tipoViolencia),
    normalizeTipoViolenciaDescricoes((dc as any).tipo_violencia_descricoes, tipoViolencia),
    normalizeTipoViolenciaDescricoes((apiCaso as any).tipo_violencia_descricoes, tipoViolencia),
  );

  const vitimaPCDDetalhe = firstDefined<TipoDeficienciaValue>(
    tipoDeficienciaToCanon(dc.vitimaPCDDetalhe),
    tipoDeficienciaToCanon((apiCaso as any).vitimaPCDDetalhe),
    tipoDeficienciaToCanon((dc as any).tipoDeficiencia),
    tipoDeficienciaToCanon((apiCaso as any).tipoDeficiencia),
    tipoDeficienciaToCanon((dc as any).tipo_deficiencia),
    tipoDeficienciaToCanon((apiCaso as any).tipo_deficiencia),
  );

  return {
    data_cad,
    tec_ref: firstDefined<string>((apiCaso as any).tec_ref, (apiCaso as any).tecRef) ?? "",

    tipoViolencia: tipoViolencia ?? undefined,
    tipoViolenciaDescricoes: tipoViolenciaDescricoes ?? undefined,
    canalDenuncia: canalDenuncia ?? undefined,
    protocolo: asOptional(dc.protocolo),
    especificacaoOutroCanal: asOptional(dc.especificacaoOutroCanal),

    nome: asOptional(dc.nome ?? (apiCaso as any).nome),
    cpf: asOptional(dc.cpf ?? (apiCaso as any).cpf),
    nis: asOptional(dc.nis ?? (apiCaso as any).nis),
    idade: asOptional(dc.idade ?? (apiCaso as any).idade),
    sexo: firstDefined<SexoValue>(sexoLegacyToCanon(dc.sexo), sexoLegacyToCanon((apiCaso as any).sexo)) ?? undefined,
    racaCor: racaCor ?? undefined,
    bairro: bairro ?? undefined,
    macroRegiao: asOptional(dc.macroRegiao ?? (apiCaso as any).macroRegiao),
    escolaridade:
      firstDefined<EscolaridadeValue>(escolaridadeLegacyToCanon(dc.escolaridade), escolaridadeLegacyToCanon((apiCaso as any).escolaridade)) ??
      undefined,

    rendaFamiliar: asOptional(dc.rendaFamiliar),
    recebePBF: asOptional(normalizeSimNao(dc.recebePBF) ?? dc.recebePBF),
    recebeBPC: asOptional(normalizeSimNao(dc.recebeBPC) ?? dc.recebeBPC),
    recebeBE: asOptional(normalizeSimNao(dc.recebeBE) ?? dc.recebeBE),
    membrosCadUnico: asOptional(normalizeSimNao(dc.membrosCadUnico) ?? dc.membrosCadUnico),
    membroPAI: normalizeSimNao(dc.membroPAI) ?? undefined,
    composicaoFamiliar: asOptional(dc.composicaoFamiliar),
    referenciaFamiliar: asOptional(dc.referenciaFamiliar),
    membroCarcerario: asOptional(normalizeSimNao(dc.membroCarcerario) ?? dc.membroCarcerario),
    membroSocioeducacao: asOptional(normalizeSimNao(dc.membroSocioeducacao) ?? dc.membroSocioeducacao),

    vitimaPCD: asOptional(normalizeSimNao(dc.vitimaPCD) ?? dc.vitimaPCD),
    vitimaPCDDetalhe: vitimaPCDDetalhe ?? undefined,
    tratamentoSaude: asOptional(normalizeSimNao(dc.tratamentoSaude) ?? dc.tratamentoSaude),
    tratamentoSaudeDetalhe: asOptional(dc.tratamentoSaudeDetalhe),

    encaminhamento: asOptional(normalizeSimNao(dc.encaminhamento) ?? dc.encaminhamento),
    encaminhamentoDetalhe: asOptional(dc.encaminhamentoDetalhe),
    encaminhadaSCFV: asOptional(dc.encaminhadaSCFV),
    inseridoPAEFI: asOptional(normalizeSimNao(dc.inseridoPAEFI) ?? dc.inseridoPAEFI),
    confirmacaoViolencia: asOptional(dc.confirmacaoViolencia),
    notificacaoSINAN: asOptional(
      normalizeSimNao(dc.notificacaoSINAN ?? dc.notificacaoSINAM ?? (dc as any).notificacaoSINAM) ??
        (dc.notificacaoSINAN ?? dc.notificacaoSINAM ?? (dc as any).notificacaoSINAM),
    ),
    reincidente: asOptional(normalizeSimNao(dc.reincidente) ?? dc.reincidente),

    orientacaoSexual: asOptional(dc.orientacaoSexual),
    identidadeGenero: asOptional(dc.identidadeGenero),
    etniaIndigena: asOptional(dc.etniaIndigena),

    vinculoAgressor: asOptional(dc.vinculoAgressor),
    coabitaComAgressor: asOptional(normalizeSimNao(dc.coabitaComAgressor) ?? dc.coabitaComAgressor),
    especificacaoOutroVinculo: asOptional(dc.especificacaoOutroVinculo),
    faixaEtariaAgressor: asOptional(dc.faixaEtariaAgressor),
    bairroAgressor: asOptional(dc.bairroAgressor),
    sexoAgressor: asOptional(dc.sexoAgressor),

    tipoResidencia: asOptional(dc.tipoResidencia),
    formaOcupacao: asOptional(dc.formaOcupacao),
    materialConstrucao: asOptional(dc.materialConstrucao),
    valorAluguel: asOptional(dc.valorAluguel),
  };
}

export function formValuesToCreatePayload(values: CasoForm, ctx: AdapterContext) {
  const { data_cad, tec_ref, ...dadosForm } = values;

  return {
    data_cad,
    tec_ref: ctx.tecRefFromAuth ?? tec_ref,
    unit_id: ctx.unitIdFromAuth ?? undefined,
    dados_completos_payload: sanitizeCasePayload(dadosForm),
  };
}

export function formValuesToUpdatePayload(values: Partial<CasoForm>, ctx: AdapterContext) {
  const { data_cad, tec_ref, ...dadosForm } = values;
  const resolvedTecRef = tec_ref ?? ctx.tecRefFromAuth;

  return {
    ...(data_cad !== undefined ? { data_cad } : {}),
    ...(resolvedTecRef !== undefined ? { tec_ref: resolvedTecRef } : {}),
    dados_completos_payload: sanitizeCasePayload(dadosForm),
  };
}
