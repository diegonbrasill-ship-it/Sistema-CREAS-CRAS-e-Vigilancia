import type { CasoDetalhado } from "@/services/api";
import type { CasoForm } from "./schema";

export type AdapterContext = {
  /** string exibida/registrada como técnico de referência (autoritativo no FE) */
  tecRefFromAuth?: string;
  /** unit_id do usuário logado (para criação) */
  unitIdFromAuth?: number | null;
};

const isRecord = (v: unknown): v is Record<string, any> => typeof v === "object" && v !== null;

// PR-2: padronização de nomes canônicos/legados em um único lugar
const CANON = {
  tipoViolencia: "tipoViolencia",
  localOcorrencia: "localOcorrencia",
  dataCad: "dataCad",
  canalOrigem: "canalOrigem",
  racaCor: "racaCor",
} as const;

const LEGACY = {
  tipo_violencia: "tipo_violencia",
  local_ocorrencia: "local_ocorrencia",
  data_cad: "data_cad",
  canalDenuncia: "canalDenuncia",
  corEtnia: "corEtnia",
} as const;

const normalizeSimNao = (v: unknown): "Sim" | "Não" | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const upper = s.toUpperCase();
  if (upper === "SIM") return "Sim";
  if (upper === "NAO" || upper === "NÃO") return "Não";
  // se vier algo fora do padrão, não normaliza (mantém comportamento legado)
  return undefined;
};

const normalizeText = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s ? s : undefined;
};

const racaCorToCorEtniaLegacy = (v: unknown): "Branca" | "Preta" | "Parda" | undefined => {
  if (!v) return undefined;
  const s = String(v).trim().toUpperCase();
  if (s === "BRANCA") return "Branca";
  if (s === "PRETA") return "Preta";
  if (s === "PARDA") return "Parda";
  return undefined;
};

const corEtniaLegacyToRacaCorCanon = (v: unknown): "BRANCA" | "PRETA" | "PARDA" | undefined => {
  if (!v) return undefined;
  const s = String(v).trim().toUpperCase();
  if (s === "BRANCA") return "BRANCA";
  if (s === "PRETA") return "PRETA";
  if (s === "PARDA") return "PARDA";
  return undefined;
};

const legacyTipoViolenciaToCanon = (v: unknown): string | undefined => {
  if (!v) return undefined;
  const s = String(v).trim().toUpperCase();
  if (s === "FÍSICA" || s === "FISICA") return "FISICA";
  if (s === "PSICOLÓGICA" || s === "PSICOLOGICA") return "PSICOLOGICA";
  if (s === "SEXUAL") return "SEXUAL";
  if (s === "PATRIMONIAL") return "PATRIMONIAL";
  if (s === "MORAL") return "MORAL";
  return undefined;
};

const normalizeStringArray = (v: unknown): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const next = v.map((x) => String(x).trim()).filter(Boolean);
  return next.length ? next : undefined;
};

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
 * PR-2: leitura passa a preferir canônico e cair para legado.
 */
export function caseToFormValues(apiCaso: CasoDetalhado): Partial<CasoForm> {
  const dc = isRecord((apiCaso as any).dados_completos) ? ((apiCaso as any).dados_completos as Record<string, any>) : {};

  const dataCadRaw = (apiCaso as any).data_cad ?? (dc as any)[LEGACY.data_cad] ?? (dc as any)[CANON.dataCad] ?? (apiCaso as any)[CANON.dataCad];
  const data_cad = dataCadRaw ? new Date(dataCadRaw).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

  const tipo_violencia =
    // canônico-first
    coalesceKeys<string>(dc, [CANON.tipoViolencia, LEGACY.tipo_violencia]) ?? 
    (apiCaso as any)[CANON.tipoViolencia] ?? 
    (apiCaso as any)[LEGACY.tipo_violencia];

  const local_ocorrencia =
    coalesceKeys<string>(dc, [CANON.localOcorrencia, LEGACY.local_ocorrencia]) ?? 
    (apiCaso as any)[CANON.localOcorrencia] ?? 
    (apiCaso as any)[LEGACY.local_ocorrencia];

  const canalOrigem =
    coalesceKeys<string>(dc, [CANON.canalOrigem, LEGACY.canalDenuncia]) ??
    (apiCaso as any)[CANON.canalOrigem] ??
    (apiCaso as any)[LEGACY.canalDenuncia];

  // PR-4: racaCor canônico-first; cair para legado `corEtnia` quando houver mapeamento seguro
  const racaCor =
    coalesceKeys<string>(dc, [CANON.racaCor]) ??
    (apiCaso as any)[CANON.racaCor] ??
    corEtniaLegacyToRacaCorCanon((dc as any)[LEGACY.corEtnia] ?? (apiCaso as any)[LEGACY.corEtnia]);

  const tipoViolenciaCanon =
    coalesceKeys<string>(dc, [CANON.tipoViolencia]) ?? (apiCaso as any)[CANON.tipoViolencia] ?? legacyTipoViolenciaToCanon(tipo_violencia);

  return {
    // top-level
    data_cad,
    tec_ref: (apiCaso as any).tec_ref ?? (apiCaso as any).tecRef,

    // atendimento (mantém nome do RHF por compat do ciclo)
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
    recebePBF: normalizeSimNao(dc.recebePBF) ?? (dc.recebePBF ?? null),
    recebeBPC: normalizeSimNao(dc.recebeBPC) ?? (dc.recebeBPC ?? null),
    recebeBE: normalizeSimNao(dc.recebeBE) ?? (dc.recebeBE ?? null),
    membrosCadUnico: normalizeSimNao(dc.membrosCadUnico) ?? (dc.membrosCadUnico ?? null),
    membroPAI: dc.membroPAI ?? null,
    composicaoFamiliar: dc.composicaoFamiliar ?? null,
    tipoMoradia: dc.tipoMoradia ?? null,
    referenciaFamiliar: dc.referenciaFamiliar ?? null,
    membroCarcerario: normalizeSimNao(dc.membroCarcerario) ?? (dc.membroCarcerario ?? null),
    membroSocioeducacao: normalizeSimNao(dc.membroSocioeducacao) ?? (dc.membroSocioeducacao ?? null),

    vitimaPCD: normalizeSimNao(dc.vitimaPCD) ?? (dc.vitimaPCD ?? null),
    vitimaPCDDetalhe: dc.vitimaPCDDetalhe ?? null,
    tratamentoSaude: normalizeSimNao(dc.tratamentoSaude) ?? (dc.tratamentoSaude ?? null),
    tratamentoSaudeDetalhe: dc.tratamentoSaudeDetalhe ?? null,
    dependeFinanceiro: normalizeSimNao(dc.dependeFinanceiro) ?? (dc.dependeFinanceiro ?? null),

    encaminhamento: normalizeSimNao(dc.encaminhamento) ?? (dc.encaminhamento ?? null),
    encaminhamentoDetalhe: dc.encaminhamentoDetalhe ?? null,
    qtdAtendimentos: dc.qtdAtendimentos ?? null,
    encaminhadaSCFV: normalizeSimNao(dc.encaminhadaSCFV) ?? (dc.encaminhadaSCFV ?? null),
    inseridoPAEFI: normalizeSimNao(dc.inseridoPAEFI) ?? (dc.inseridoPAEFI ?? null),
    confirmacaoViolencia: dc.confirmacaoViolencia ?? null,
    canalDenuncia: normalizeText(dc.canalDenuncia) ?? (dc.canalDenuncia ?? null),
    notificacaoSINAM: normalizeSimNao(dc.notificacaoSINAM ?? (dc as any).notificacaoSINAN) ?? (dc.notificacaoSINAM ?? (dc as any).notificacaoSINAN ?? null),
    reincidente: normalizeSimNao(dc.reincidente) ?? (dc.reincidente ?? null),

    // PR-4: novos campos canônicos (com coalesce para legado quando fizer sentido)
    canalOrigem: canalOrigem ?? null,
    dataDenuncia: dc.dataDenuncia ?? null,
    protocolo: dc.protocolo ?? null,
    especificacaoOutroCanal: dc.especificacaoOutroCanal ?? null,

    tipoViolencia: tipoViolenciaCanon ?? null,
    tipoViolenciaDescricoes: normalizeStringArray(dc.tipoViolenciaDescricoes) ?? (dc.tipoViolenciaDescricoes ?? null),

    racaCor: racaCor ?? null,
    etniaIndigena: dc.etniaIndigena ?? null,

    orientacaoSexual: dc.orientacaoSexual ?? null,
    identidadeGenero: dc.identidadeGenero ?? null,

    vinculoAgressor: dc.vinculoAgressor ?? null,
    coabitaComAgressor: normalizeSimNao(dc.coabitaComAgressor) ?? (dc.coabitaComAgressor ?? null),
    especificacaoOutroVinculo: dc.especificacaoOutroVinculo ?? null,
    faixaEtariaAgressor: dc.faixaEtariaAgressor ?? null,
    bairroAgressor: dc.bairroAgressor ?? null,
    sexoAgressor: dc.sexoAgressor ?? null,

    tipoResidencia: dc.tipoResidencia ?? null,
    formaOcupacao: dc.formaOcupacao ?? null,
    materialConstrucao: dc.materialConstrucao ?? null,
    valorAluguel: dc.valorAluguel ?? null,
  };
}

/**
 * Monta payload de criação respeitando o formato existente.
 * PR-2: escrita canônico-first em `dados_completos_payload`, mantendo legado como alias.
 */
export function formValuesToCreatePayload(values: CasoForm, ctx: AdapterContext) {
  const { data_cad, tec_ref, tipo_violencia, local_ocorrencia, ...rest } = values;

  const dados_completos_payload = {
    // canônico-first
    [CANON.tipoViolencia]: tipo_violencia,
    [CANON.localOcorrencia]: local_ocorrencia,

    // legado/alias (período de convivência)
    [LEGACY.tipo_violencia]: tipo_violencia,
    [LEGACY.local_ocorrencia]: tipo_violencia,

    // restante como o formulário já trabalha (flat)
    ...rest,
  };

  // PR-3: normalização de outputs (apenas quando o valor existir)
  if (dados_completos_payload.encaminhamento) dados_completos_payload.encaminhamento = normalizeSimNao(dados_completos_payload.encaminhamento) ?? dados_completos_payload.encaminhamento;
  if (dados_completos_payload.recebePBF) dados_completos_payload.recebePBF = normalizeSimNao(dados_completos_payload.recebePBF) ?? dados_completos_payload.recebePBF;
  if (dados_completos_payload.recebeBPC) dados_completos_payload.recebeBPC = normalizeSimNao(dados_completos_payload.recebeBPC) ?? dados_completos_payload.recebeBPC;
  if (dados_completos_payload.recebeBE) dados_completos_payload.recebeBE = normalizeSimNao(dados_completos_payload.recebeBE) ?? dados_completos_payload.recebeBE;
  if (dados_completos_payload.membrosCadUnico) dados_completos_payload.membrosCadUnico = normalizeSimNao(dados_completos_payload.membrosCadUnico) ?? dados_completos_payload.membrosCadUnico;
  if (dados_completos_payload.membroCarcerario) dados_completos_payload.membroCarcerario = normalizeSimNao(dados_completos_payload.membroCarcerario) ?? dados_completos_payload.membroCarcerario;
  if (dados_completos_payload.membroSocioeducacao) dados_completos_payload.membroSocioeducacao = normalizeSimNao(dados_completos_payload.membroSocioeducacao) ?? dados_completos_payload.membroSocioeducacao;
  if (dados_completos_payload.vitimaPCD) dados_completos_payload.vitimaPCD = normalizeSimNao(dados_completos_payload.vitimaPCD) ?? dados_completos_payload.vitimaPCD;
  if (dados_completos_payload.tratamentoSaude) dados_completos_payload.tratamentoSaude = normalizeSimNao(dados_completos_payload.tratamentoSaude) ?? dados_completos_payload.tratamentoSaude;
  if (dados_completos_payload.dependeFinanceiro) dados_completos_payload.dependeFinanceiro = normalizeSimNao(dados_completos_payload.dependeFinanceiro) ?? dados_completos_payload.dependeFinanceiro;

  if (dados_completos_payload.inseridoPAEFI) dados_completos_payload.inseridoPAEFI = normalizeSimNao(dados_completos_payload.inseridoPAEFI) ?? dados_completos_payload.inseridoPAEFI;
  if (dados_completos_payload.notificacaoSINAM) dados_completos_payload.notificacaoSINAM = normalizeSimNao(dados_completos_payload.notificacaoSINAM) ?? dados_completos_payload.notificacaoSINAM;
  if (dados_completos_payload.reincidente) dados_completos_payload.reincidente = normalizeSimNao(dados_completos_payload.reincidente) ?? dados_completos_payload.reincidente;

  if (dados_completos_payload.canalDenuncia) dados_completos_payload.canalDenuncia = normalizeText(dados_completos_payload.canalDenuncia) ?? dados_completos_payload.canalDenuncia;

  // PR-4: limpar campos texto novos
  if (dados_completos_payload.protocolo) dados_completos_payload.protocolo = normalizeText(dados_completos_payload.protocolo) ?? dados_completos_payload.protocolo;
  if (dados_completos_payload.especificacaoOutroCanal) dados_completos_payload.especificacaoOutroCanal = normalizeText(dados_completos_payload.especificacaoOutroCanal) ?? dados_completos_payload.especificacaoOutroCanal;
  if (dados_completos_payload.etniaIndigena) dados_completos_payload.etniaIndigena = normalizeText(dados_completos_payload.etniaIndigena) ?? dados_completos_payload.etniaIndigena;
  if (dados_completos_payload.especificacaoOutroVinculo) dados_completos_payload.especificacaoOutroVinculo = normalizeText(dados_completos_payload.especificacaoOutroVinculo) ?? dados_completos_payload.especificacaoOutroVinculo;
  if (dados_completos_payload.bairroAgressor) dados_completos_payload.bairroAgressor = normalizeText(dados_completos_payload.bairroAgressor) ?? dados_completos_payload.bairroAgressor;

  // PR-4: garantir array normalizado (sem strings vazias)
  const cleanedDescricoes = normalizeStringArray(dados_completos_payload.tipoViolenciaDescricoes);
  if (cleanedDescricoes) dados_completos_payload.tipoViolenciaDescricoes = cleanedDescricoes;

  // PR-4: aliases adicionais de compat
  if (dados_completos_payload.canalOrigem && !dados_completos_payload.canalDenuncia) {
    // Painel/Dashboard ainda dependem de `canalDenuncia`
    dados_completos_payload.canalDenuncia = dados_completos_payload.canalOrigem;
  }

  if (dados_completos_payload.racaCor && !dados_completos_payload.corEtnia) {
    // compat temporária (apenas quando houver mapeamento válido)
    const mapped = racaCorToCorEtniaLegacy(dados_completos_payload.racaCor);
    if (mapped) dados_completos_payload.corEtnia = mapped;
  }

  // PR-4: coerência — se o formulário trouxe tipoViolencia canônico, mantém (e não sobrescreve com legado)
  if (dados_completos_payload.tipoViolencia) {
    const legacyForCanon = legacyTipoViolenciaToCanon(dados_completos_payload[LEGACY.tipo_violencia]);
    if (!dados_completos_payload[CANON.tipoViolencia] && legacyForCanon) {
      dados_completos_payload[CANON.tipoViolencia] = legacyForCanon;
    }
  }

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
 * PR-2: quando vier legado no patch, escreve também canônico (e vice-versa).
 */
export function formValuesToUpdatePayload(values: Partial<CasoForm>, ctx: AdapterContext) {
  const payload: Record<string, any> = { ...values };

  // autoritativo — se vier do auth, sobrescreve
  if (ctx.tecRefFromAuth) payload.tec_ref = ctx.tecRefFromAuth;

  // aliases de compat (apenas quando o campo existir no patch)
  const hasLegacyTipo = payload[LEGACY.tipo_violencia] !== undefined;
  const hasCanonTipo = payload[CANON.tipoViolencia] !== undefined;
  if (hasLegacyTipo && !hasCanonTipo) payload[CANON.tipoViolencia] = payload[LEGACY.tipo_violencia];
  if (hasCanonTipo && !hasLegacyTipo) payload[LEGACY.tipo_violencia] = payload[CANON.tipoViolencia];

  const hasLegacyLocal = payload[LEGACY.local_ocorrencia] !== undefined;
  const hasCanonLocal = payload[CANON.localOcorrencia] !== undefined;
  if (hasLegacyLocal && !hasCanonLocal) payload[CANON.localOcorrencia] = payload[LEGACY.local_ocorrencia];
  if (hasCanonLocal && !hasLegacyLocal) payload[LEGACY.local_ocorrencia] = payload[CANON.localOcorrencia];

  // dataCad é apenas alias de filtro; manter quando aplicar (patch inclui data_cad)
  if (payload[LEGACY.data_cad] !== undefined && payload[CANON.dataCad] === undefined) payload[CANON.dataCad] = payload[LEGACY.data_cad];

  // PR-3: normalizações no patch (quando presentes)
  if (payload.encaminhamento) payload.encaminhamento = normalizeSimNao(payload.encaminhamento) ?? payload.encaminhamento;
  if (payload.recebePBF) payload.recebePBF = normalizeSimNao(payload.recebePBF) ?? payload.recebePBF;
  if (payload.recebeBPC) payload.recebeBPC = normalizeSimNao(payload.recebeBPC) ?? payload.recebeBPC;
  if (payload.recebeBE) payload.recebeBE = normalizeSimNao(payload.recebeBE) ?? payload.recebeBE;
  if (payload.membrosCadUnico) payload.membrosCadUnico = normalizeSimNao(payload.membrosCadUnico) ?? payload.membrosCadUnico;
  if (payload.membroCarcerario) payload.membroCarcerario = normalizeSimNao(payload.membroCarcerario) ?? payload.membroCarcerario;
  if (payload.membroSocioeducacao) payload.membroSocioeducacao = normalizeSimNao(payload.membroSocioeducacao) ?? payload.membroSocioeducacao;
  if (payload.vitimaPCD) payload.vitimaPCD = normalizeSimNao(payload.vitimaPCD) ?? payload.vitimaPCD;
  if (payload.tratamentoSaude) payload.tratamentoSaude = normalizeSimNao(payload.tratamentoSaude) ?? payload.tratamentoSaude;
  if (payload.dependeFinanceiro) payload.dependeFinanceiro = normalizeSimNao(payload.dependeFinanceiro) ?? payload.dependeFinanceiro;

  if (payload.inseridoPAEFI) payload.inseridoPAEFI = normalizeSimNao(payload.inseridoPAEFI) ?? payload.inseridoPAEFI;
  if (payload.notificacaoSINAM) payload.notificacaoSINAM = normalizeSimNao(payload.notificacaoSINAM) ?? payload.notificacaoSINAM;
  if (payload.reincidente) payload.reincidente = normalizeSimNao(payload.reincidente) ?? payload.reincidente;

  if (payload.canalDenuncia) payload.canalDenuncia = normalizeText(payload.canalDenuncia) ?? payload.canalDenuncia;

  // PR-4: aliases adicionais (patch)
  if (payload.canalOrigem !== undefined && payload.canalDenuncia === undefined) payload.canalDenuncia = payload.canalOrigem;
  if (payload.canalDenuncia !== undefined && payload.canalOrigem === undefined) payload.canalOrigem = payload.canalDenuncia;

  if (payload.racaCor !== undefined && payload.corEtnia === undefined) {
    const mapped = racaCorToCorEtniaLegacy(payload.racaCor);
    if (mapped) payload.corEtnia = mapped;
  }

  // PR-4: se veio `corEtnia` no patch (legado), tenta preencher `racaCor` canônico quando for seguro
  if (payload.corEtnia !== undefined && payload.racaCor === undefined) {
    const mapped = corEtniaLegacyToRacaCorCanon(payload.corEtnia);
    if (mapped) payload.racaCor = mapped;
  }

  // garantir normalização nos novos sim/não
  if (payload.coabitaComAgressor) payload.coabitaComAgressor = normalizeSimNao(payload.coabitaComAgressor) ?? payload.coabitaComAgressor;

  // PR-4: normalizar textos novos quando presentes
  if (payload.protocolo) payload.protocolo = normalizeText(payload.protocolo) ?? payload.protocolo;
  if (payload.especificacaoOutroCanal) payload.especificacaoOutroCanal = normalizeText(payload.especificacaoOutroCanal) ?? payload.especificacaoOutroCanal;
  if (payload.etniaIndigena) payload.etniaIndigena = normalizeText(payload.etniaIndigena) ?? payload.etniaIndigena;
  if (payload.especificacaoOutroVinculo) payload.especificacaoOutroVinculo = normalizeText(payload.especificacaoOutroVinculo) ?? payload.especificacaoOutroVinculo;
  if (payload.bairroAgressor) payload.bairroAgressor = normalizeText(payload.bairroAgressor) ?? payload.bairroAgressor;

  // PR-4: normalizar array quando presente
  if (payload.tipoViolenciaDescricoes) {
    const cleaned = normalizeStringArray(payload.tipoViolenciaDescricoes);
    if (cleaned) payload.tipoViolenciaDescricoes = cleaned;
  }

  return payload;
}
