import type { CasoDetalhado } from "@/services/api";
import type { CasoForm } from "./schema";

export type AdapterContext = {
  tecRefFromAuth?: string;
  unitIdFromAuth?: number | null;
};

const isRecord = (v: unknown): v is Record<string, any> => typeof v === "object" && v !== null;

type TipoViolenciaValue = NonNullable<CasoForm["tipoViolencia"]>;
type TipoViolenciaDescricaoValue = NonNullable<CasoForm["tipoViolenciaDescricoes"]>[number];
type CanalDenunciaValue = NonNullable<CasoForm["canalDenuncia"]>;
type SexoValue = NonNullable<CasoForm["sexo"]>;
type RacaCorValue = NonNullable<CasoForm["racaCor"]>;
type EscolaridadeValue = NonNullable<CasoForm["escolaridade"]>;

const normalizeToken = (v: unknown): string => {
  if (v === undefined || v === null) return "";

  return String(v)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase();
};

const normalizeSimNao = (v: unknown): "Sim" | "Não" | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const upper = normalizeToken(s);
  if (upper === "SIM") return "Sim";
  if (upper === "NAO") return "Não";
  return undefined;
};

const normalizeText = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s ? s : undefined;
};

const toStringArray = (v: unknown): string[] | undefined => {
  if (Array.isArray(v)) {
    const values = v.map((item) => String(item).trim()).filter(Boolean);
    return values.length ? values : undefined;
  }

  if (typeof v !== "string") return undefined;

  const trimmed = v.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const values = parsed.map((item) => String(item).trim()).filter(Boolean);
        return values.length ? values : undefined;
      }
    } catch {
      // fallback para split simples
    }
  }

  const values = trimmed
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return values.length ? Array.from(new Set(values)) : undefined;
};

const sexoLegacyToCanon = (v: unknown): SexoValue | undefined => {
  const token = normalizeToken(v);

  if (token === "MASCULINO") return "MASCULINO";
  if (token === "FEMININO") return "FEMININO";
  if (token === "INTERSEXO") return "INTERSEXO";

  return undefined;
};

const corEtniaLegacyToRacaCorCanon = (v: unknown): RacaCorValue | undefined => {
  if (!v) return undefined;
  const token = normalizeToken(v);
  if (token === "BRANCA") return "BRANCA";
  if (token === "PRETA") return "PRETA";
  if (token === "PARDA") return "PARDA";
  if (token === "AMARELA") return "AMARELA";
  if (token === "INDIGENA") return "INDIGENA";
  if (token === "NAO_DECLARADO" || token === "NAO_DECLARADA") return "NAO_DECLARADO";
  return undefined;
};

const legacyTipoViolenciaToCanon = (v: unknown): TipoViolenciaValue | undefined => {
  if (!v) return undefined;
  const token = normalizeToken(v);
  if (token === "FISICA") return "FISICA";
  if (token === "PSICOLOGICA") return "PSICOLOGICA";
  if (token === "SEXUAL") return "SEXUAL";
  if (token === "PATRIMONIAL") return "PATRIMONIAL";
  if (token === "MORAL") return "MORAL";
  return undefined;
};

const canalDenunciaToCanon = (v: unknown): CanalDenunciaValue | undefined => {
  const token = normalizeToken(v);

  const aliases: Record<string, CanalDenunciaValue> = {
    DISQUE_100_180: "DISQUE_100_180",
    CONSELHO_TUTELAR: "CONSELHO_TUTELAR",
    PODER_JUDICIARIO_MINISTERIO_PUBLICO: "PODER_JUDICIARIO_MINISTERIO_PUBLICO",
    DELEGACIA_DE_POLICIA: "DELEGACIA_DE_POLICIA",
    DEMANDA_ESPONTANEA: "DEMANDA_ESPONTANEA",
    ENCAMINHAMENTO_DA_REDE: "ENCAMINHAMENTO_DA_REDE",
    OUTROS: "OUTROS",
  };

  return aliases[token];
};

const escolaridadeLegacyToCanon = (v: unknown): EscolaridadeValue | undefined => {
  const token = normalizeToken(v);

  const aliases: Record<string, EscolaridadeValue> = {
    SEM_IDADE_ESCOLAR: "SEM_IDADE_ESCOLAR",
    EJA: "EJA",
    FUNDAMENTAL_1_INCOMPLETO: "FUNDAMENTAL_1_INCOMPLETO",
    FUNDAMENTAL_I_INCOMPLETO: "FUNDAMENTAL_1_INCOMPLETO",
    FUNDAMENTAL_1_COMPLETO: "FUNDAMENTAL_1_COMPLETO",
    FUNDAMENTAL_I_COMPLETO: "FUNDAMENTAL_1_COMPLETO",
    FUNDAMENTAL_2_INCOMPLETO: "FUNDAMENTAL_2_INCOMPLETO",
    FUNDAMENTAL_II_INCOMPLETO: "FUNDAMENTAL_2_INCOMPLETO",
    FUNDAMENTAL_2_COMPLETO: "FUNDAMENTAL_2_COMPLETO",
    FUNDAMENTAL_II_COMPLETO: "FUNDAMENTAL_2_COMPLETO",
    ENSINO_MEDIO_INCOMPLETO: "ENSINO_MEDIO_INCOMPLETO",
    ENSINO_MEDIO_COMPLETO: "ENSINO_MEDIO_COMPLETO",
    TECNICO_INCOMPLETO: "TECNICO_INCOMPLETO",
    TECNICO_COMPLETO: "TECNICO_COMPLETO",
    SUPERIOR_INCOMPLETO: "SUPERIOR_INCOMPLETO",
    SUPERIOR_COMPLETO: "SUPERIOR_COMPLETO",
    FUNDAMENTAL_INCOMPLETO: "FUNDAMENTAL_2_INCOMPLETO",
    FUNDAMENTAL_COMPLETO: "FUNDAMENTAL_2_COMPLETO",
  };

  return aliases[token];
};

const violenciaDescricaoAliases: Record<TipoViolenciaValue, Record<string, TipoViolenciaDescricaoValue>> = {
  FISICA: {
    ESPANCAMENTO: "ESPANCAMENTO",
    SACUDIDAS: "SACUDIDAS",
    CHUTES: "CHUTES",
    BOFETADAS: "BOFETADAS",
    QUEIMADURAS: "QUEIMADURAS",
    EMPURROES: "EMPURROES",
    EMPURRAO: "EMPURROES",
    EMPURROE: "EMPURROES",
    ARREMESSO_DE_OBJETOS: "ARREMESSO_DE_OBJETOS",
    LESOES_COM_ARMAS: "LESOES_COM_ARMAS",
    OFENSA_A_INTEGRIDADE_CORPORAL: "OFENSA_A_INTEGRIDADE_CORPORAL",
    SOCOS: "ESPANCAMENTO",
  },
  PSICOLOGICA: {
    AMEACA: "AMEACA",
    AMEACAS: "AMEACA",
    HUMILHACAO: "HUMILHACAO",
    HUMILHACOES: "HUMILHACAO",
    ISOLAMENTO: "ISOLAMENTO",
    VIGILANCIA_CONSTANTE: "VIGILANCIA_CONSTANTE",
    PERSEGUICAO: "PERSEGUICAO",
    INSULTO: "INSULTO",
    CHANTAGEM: "CHANTAGEM",
    RIDICULARIZACAO: "RIDICULARIZACAO",
    LIMITACAO_DE_IR_E_VIR: "LIMITACAO_DE_IR_E_VIR",
    DANO_EMOCIONAL: "DANO_EMOCIONAL",
  },
  SEXUAL: {
    ESTUPRO: "ESTUPRO",
    COACAO_SEXUAL: "COACAO_SEXUAL",
    IMPEDIR_USO_DE_CONTRACEPTIVO: "IMPEDIR_USO_DE_CONTRACEPTIVO",
    FORCAR_ABORTO: "FORCAR_ABORTO",
    FORCAR_MATRIMONIO: "FORCAR_MATRIMONIO",
    PROSTITUICAO_FORCADA: "PROSTITUICAO_FORCADA",
    GRAVIDEZ_NAO_DESEJADA: "GRAVIDEZ_NAO_DESEJADA",
    ASSDIO: "COACAO_SEXUAL",
    ASSEDIO: "COACAO_SEXUAL",
    EXPLORACAO: "PROSTITUICAO_FORCADA",
  },
  PATRIMONIAL: {
    RETENCAO_DE_DOCUMENTOS: "RETENCAO_DE_DOCUMENTOS",
    SUBTRACAO_DE_BENS: "SUBTRACAO_DE_BENS",
    DESTRUICAO_DE_FERRAMENTAS: "DESTRUICAO_DE_FERRAMENTAS",
    CONTROLE_DE_SALARIO: "CONTROLE_DE_SALARIO",
    QUEBRA_DE_CELULAR: "QUEBRA_DE_CELULAR",
    DANO_PATRIMONIAL: "DANO_PATRIMONIAL",
    DESTRUICAO_BENS: "DANO_PATRIMONIAL",
    RETENCAO_RECURSOS: "CONTROLE_DE_SALARIO",
  },
  MORAL: {
    CALUNIA: "CALUNIA",
    DIFAMACAO: "DIFAMACAO",
    INJURIA: "INJURIA",
    EXPOSICAO_DE_INTIMIDADE: "EXPOSICAO_DE_INTIMIDADE",
    MENTIRAS_PUBLICAS: "MENTIRAS_PUBLICAS",
  },
};

const normalizeTipoViolenciaDescricoes = (v: unknown, tipoViolencia: unknown): TipoViolenciaDescricaoValue[] | undefined => {
  const tipo = legacyTipoViolenciaToCanon(tipoViolencia);
  const values = toStringArray(v);

  if (!tipo || !values?.length) return undefined;

  const aliases = violenciaDescricaoAliases[tipo];
  const normalized = values
    .map((item) => aliases[normalizeToken(item)])
    .filter((item): item is TipoViolenciaDescricaoValue => Boolean(item));

  return normalized.length ? Array.from(new Set(normalized)) : undefined;
};

const asOptional = <T>(value: T | null | undefined): T | undefined => (value === null ? undefined : value);

const firstDefined = <T = unknown>(...values: unknown[]): T | undefined => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value as T;
    }
  }
  return undefined;
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
    "membroPAI",
    "encaminhamentoDetalhe",
    "vitimaPCDDetalhe",
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

  if (payload.tipoViolenciaDescricoes !== undefined) {
    payload.tipoViolenciaDescricoes =
      normalizeTipoViolenciaDescricoes(payload.tipoViolenciaDescricoes, payload.tipoViolencia) ?? payload.tipoViolenciaDescricoes;
  }

  if (payload.canalDenuncia !== "OUTROS") {
    payload.especificacaoOutroCanal = payload.especificacaoOutroCanal ?? "";
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
  const data_cad = dataCadRaw ? new Date(dataCadRaw).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

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
    membroPAI: asOptional(dc.membroPAI),
    composicaoFamiliar: asOptional(dc.composicaoFamiliar),
    referenciaFamiliar: asOptional(dc.referenciaFamiliar),
    membroCarcerario: asOptional(normalizeSimNao(dc.membroCarcerario) ?? dc.membroCarcerario),
    membroSocioeducacao: asOptional(normalizeSimNao(dc.membroSocioeducacao) ?? dc.membroSocioeducacao),

    vitimaPCD: asOptional(normalizeSimNao(dc.vitimaPCD) ?? dc.vitimaPCD),
    vitimaPCDDetalhe: asOptional(dc.vitimaPCDDetalhe),
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

  return {
    ...(data_cad !== undefined ? { data_cad } : {}),
    ...(ctx.tecRefFromAuth || tec_ref !== undefined ? { tec_ref: ctx.tecRefFromAuth ?? tec_ref } : {}),
    dados_completos_payload: sanitizeCasePayload(dadosForm),
  };
}
