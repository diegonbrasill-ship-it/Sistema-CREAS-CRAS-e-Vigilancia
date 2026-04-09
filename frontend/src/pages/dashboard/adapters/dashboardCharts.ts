import { formatOptionLabel } from "@/utils/cadastroOptionLabels";

export interface ChartDatum {
  name: string;
  value: number;
  rawName?: string;
}

function getRawChartLabel(item: any): string {
  const label =
    item?.name ??
    item?.tipo ??
    item?.fonte ??
    item?.bairro ??
    item?.racaCor ??
    item?.corEtnia ??
    item?.cor ??
    item?.sexo ??
    item?.faixaEtaria ??
    item?.label;

  return typeof label === "string" ? label.trim() : "";
}

function getFormattedChartLabel(item: any, labelField?: string): string {
  const rawLabel = getRawChartLabel(item);

  if (!labelField || !rawLabel) {
    return rawLabel;
  }

  return formatOptionLabel(labelField, rawLabel);
}

function getChartValue(item: any): number {
  const rawValue =
    item?.value ??
    item?.quantidade ??
    item?.casos ??
    item?.total ??
    item?.count;

  return Number(rawValue);
}

export function normalizeChartSeries(data?: unknown, labelField?: string): ChartDatum[] {
  if (Array.isArray(data)) {
    return data.flatMap((item: any) => {
      const rawName = getRawChartLabel(item);
      const name = getFormattedChartLabel(item, labelField);
      const value = getChartValue(item);

      if (!name || Number.isNaN(value)) {
        return [];
      }

      return [{ name, value, rawName: rawName || name }];
    });
  }

  if (data && typeof data === "object") {
    return Object.entries(data as Record<string, unknown>).flatMap(([key, rawValue]) => {
      const rawName = key.trim();
      const name = labelField ? formatOptionLabel(labelField, rawName) : rawName;
      const value = Number(rawValue);

      if (!name || Number.isNaN(value)) {
        return [];
      }

      return [{ name, value, rawName: rawName || name }];
    });
  }

  return [];
}

export function resolveChartSeries(
  graficos: Record<string, unknown> | undefined,
  possibleKeys: string[],
  labelField?: string,
): ChartDatum[] {
  if (!graficos) return [];

  for (const key of possibleKeys) {
    const series = normalizeChartSeries(graficos[key], labelField);
    if (series.length > 0) {
      return series;
    }
  }

  return [];
}

export function getClickedChartSelection(data: any): { label: string; value: string } | undefined {
  const payload = data?.payload ?? data;
  const label =
    getFormattedChartLabel(payload) ||
    getFormattedChartLabel(data);
  const value =
    (typeof payload?.rawName === "string" && payload.rawName.trim()) ||
    (typeof data?.rawName === "string" && data.rawName.trim()) ||
    getRawChartLabel(payload) ||
    getRawChartLabel(data);

  if (!label) {
    return undefined;
  }

  return {
    label,
    value: value || label,
  };
}
