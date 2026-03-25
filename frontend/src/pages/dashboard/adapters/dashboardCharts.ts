export interface ChartDatum {
  name: string;
  value: number;
}

function getChartLabel(item: any): string {
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

function getChartValue(item: any): number {
  const rawValue =
    item?.value ??
    item?.quantidade ??
    item?.casos ??
    item?.total ??
    item?.count;

  return Number(rawValue);
}

export function normalizeChartSeries(data?: unknown): ChartDatum[] {
  if (Array.isArray(data)) {
    return data.flatMap((item: any) => {
      const name = getChartLabel(item);
      const value = getChartValue(item);

      if (!name || Number.isNaN(value)) {
        return [];
      }

      return [{ name, value }];
    });
  }

  if (data && typeof data === "object") {
    return Object.entries(data as Record<string, unknown>).flatMap(([key, rawValue]) => {
      const name = key.trim();
      const value = Number(rawValue);

      if (!name || Number.isNaN(value)) {
        return [];
      }

      return [{ name, value }];
    });
  }

  return [];
}

export function resolveChartSeries(
  graficos: Record<string, unknown> | undefined,
  possibleKeys: string[],
): ChartDatum[] {
  if (!graficos) return [];

  for (const key of possibleKeys) {
    const series = normalizeChartSeries(graficos[key]);
    if (series.length > 0) {
      return series;
    }
  }

  return [];
}

export function getClickedChartName(data: any): string | undefined {
  const label = getChartLabel(data) || getChartLabel(data?.payload);
  return label || undefined;
}
