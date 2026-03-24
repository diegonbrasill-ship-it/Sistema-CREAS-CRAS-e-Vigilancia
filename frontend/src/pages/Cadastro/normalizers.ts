import type { CasoForm } from "./schema";

export type TipoViolenciaValue = NonNullable<CasoForm["tipoViolencia"]>;
export type TipoViolenciaDescricaoValue = NonNullable<CasoForm["tipoViolenciaDescricoes"]>[number];
export type CanalDenunciaValue = NonNullable<CasoForm["canalDenuncia"]>;
export type SexoValue = NonNullable<CasoForm["sexo"]>;
export type RacaCorValue = NonNullable<CasoForm["racaCor"]>;
export type EscolaridadeValue = NonNullable<CasoForm["escolaridade"]>;

export const isRecord = (v: unknown): v is Record<string, any> => typeof v === "object" && v !== null;

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

export const normalizeSimNao = (v: unknown): "Sim" | "Não" | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const upper = normalizeToken(s);
  if (upper === "SIM") return "Sim";
  if (upper === "NAO") return "Não";
  return undefined;
};

export const normalizeText = (v: unknown): string | undefined => {
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

export const sexoLegacyToCanon = (v: unknown): SexoValue | undefined => {
  const token = normalizeToken(v);

  if (token === "MASCULINO") return "MASCULINO";
  if (token === "FEMININO") return "FEMININO";
  if (token === "INTERSEXO") return "INTERSEXO";

  return undefined;
};

export const corEtniaLegacyToRacaCorCanon = (v: unknown): RacaCorValue | undefined => {
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

export const legacyTipoViolenciaToCanon = (v: unknown): TipoViolenciaValue | undefined => {
  if (!v) return undefined;
  const token = normalizeToken(v);
  if (token === "FISICA") return "FISICA";
  if (token === "PSICOLOGICA") return "PSICOLOGICA";
  if (token === "SEXUAL") return "SEXUAL";
  if (token === "PATRIMONIAL") return "PATRIMONIAL";
  if (token === "MORAL") return "MORAL";
  return undefined;
};

export const canalDenunciaToCanon = (v: unknown): CanalDenunciaValue | undefined => {
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

export const escolaridadeLegacyToCanon = (v: unknown): EscolaridadeValue | undefined => {
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

export const normalizeTipoViolenciaDescricoes = (v: unknown, tipoViolencia: unknown): TipoViolenciaDescricaoValue[] | undefined => {
  const tipo = legacyTipoViolenciaToCanon(tipoViolencia);
  const values = toStringArray(v);

  if (!tipo || !values?.length) return undefined;

  const aliases = violenciaDescricaoAliases[tipo];
  const normalized = values
    .map((item) => aliases[normalizeToken(item)])
    .filter((item): item is TipoViolenciaDescricaoValue => Boolean(item));

  return normalized.length ? Array.from(new Set(normalized)) : undefined;
};

export const asOptional = <T>(value: T | null | undefined): T | undefined => (value === null ? undefined : value);

export const firstDefined = <T = unknown>(...values: unknown[]): T | undefined => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value as T;
    }
  }
  return undefined;
};
