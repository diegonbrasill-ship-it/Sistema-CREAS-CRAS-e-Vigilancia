import { useEffect, useRef, useState, type ReactNode } from "react";

import { Bar, BarChart, Cell, LabelList, Legend, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardApiDataType } from "@/services/api";

import { type ChartDatum, getClickedChartName } from "../adapters/dashboardCharts";

interface DashboardChartSectionProps {
  dashboardData: DashboardApiDataType | null;
  tiposViolacaoData: ChartDatum[];
  casosPorCorData: ChartDatum[];
  isPrintMode: boolean;
  onDrillDown: (action: string, value: string | null, title: string) => void;
}

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#9333ea", "#dc2626", "#0ea5e9", "#64748b"];
const BAR_LEGEND_TEXT = "Quantidade de casos";

function formatLegendLabel(value: string, dataset?: ChartDatum[]) {
  if (!dataset?.length) {
    return value;
  }

  const matchingItem = dataset.find((item) => item.name === value);
  if (!matchingItem) {
    return value;
  }

  return `${matchingItem.name} (${matchingItem.value})`;
}

function renderPieValueLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  value,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  value?: number;
}) {
  if (
    typeof cx !== "number" ||
    typeof cy !== "number" ||
    typeof midAngle !== "number" ||
    typeof innerRadius !== "number" ||
    typeof outerRadius !== "number" ||
    typeof value !== "number" ||
    value <= 0
  ) {
    return null;
  }

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
  const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);

  return (
    <text
      x={x}
      y={y}
      fill="#0f172a"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
    >
      {value}
    </text>
  );
}

function renderPrintLegendList(data: ChartDatum[]) {
  return (
    <div className="dashboard-print-chart-legend">
      {data.map((item, index) => (
        <div key={`${item.name}-${index}`} className="dashboard-print-chart-legend-item">
          <span
            className="dashboard-print-chart-legend-color"
            style={{ backgroundColor: COLORS[index % COLORS.length] }}
            aria-hidden="true"
          />
          <span className="dashboard-print-chart-legend-text">
            {item.name} ({item.value})
          </span>
        </div>
      ))}
    </div>
  );
}

interface ChartViewportProps {
  children: (dimensions: { width: number; height: number }) => ReactNode;
  height: number;
  printHeight?: number;
  isPrintMode: boolean;
}

function ChartViewport({ children, height, printHeight, isPrintMode }: ChartViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const resolvedHeight = isPrintMode ? (printHeight ?? height) : height;

  useEffect(() => {
    const element = viewportRef.current;

    if (!element) {
      return;
    }

    const updateSize = () => {
      const nextWidth = Math.floor(element.clientWidth);
      if (nextWidth > 0) {
        setWidth(nextWidth);
      }
    };

    updateSize();

    const frameId = window.requestAnimationFrame(updateSize);
    const timeoutId = window.setTimeout(updateSize, 100);

    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => updateSize())
      : null;

    observer?.observe(element);
    window.addEventListener("resize", updateSize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      observer?.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [isPrintMode]);

  return (
    <div
      ref={viewportRef}
      className="dashboard-chart-viewport"
      style={{ height: `${resolvedHeight}px` }}
    >
      {width > 0 ? children({ width, height: resolvedHeight }) : null}
    </div>
  );
}

export function DashboardChartSection({
  dashboardData,
  tiposViolacaoData,
  casosPorCorData,
  isPrintMode,
  onDrillDown,
}: DashboardChartSectionProps) {
  return (
    <section className="dashboard-chart-section">
      <h2 className="dashboard-chart-section-title text-lg font-semibold text-slate-700 pt-4">Análise Gráfica</h2>
      <div className="dashboard-chart-grid grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="dashboard-chart-card dashboard-chart-card--wide print-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Casos por Bairro (Top 5)</CardTitle>
          </CardHeader>
          <CardContent className="dashboard-chart-card-content">
            <ChartViewport isPrintMode={isPrintMode} height={300} printHeight={240}>
              {({ width, height }) => (
                <BarChart width={width} height={height} layout="vertical" data={dashboardData?.graficos?.casosPorBairro ?? []} margin={{ left: 50 }}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `${value} casos`} />
                  <Legend verticalAlign="top" height={36} formatter={() => BAR_LEGEND_TEXT} />
                  <Bar
                    dataKey="value"
                    fill="#2563eb"
                    isAnimationActive={!isPrintMode}
                    onClick={(data: any) => onDrillDown("por_bairro", data.name, `Casos no Bairro: ${data.name}`)}
                    cursor="pointer"
                  >
                    <LabelList dataKey="value" position="right" fill="#0f172a" fontSize={11} />
                  </Bar>
                </BarChart>
              )}
            </ChartViewport>
          </CardContent>
        </Card>

        <Card className="dashboard-chart-card print-card">
          <CardHeader><CardTitle>Tipos de Violação</CardTitle></CardHeader>
          <CardContent className="dashboard-chart-card-content">
            <ChartViewport isPrintMode={isPrintMode} height={300} printHeight={220}>
              {({ width, height }) => (
                <PieChart width={width} height={height}>
                  <Tooltip formatter={(value: number) => `${value} casos`} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => formatLegendLabel(String(value), tiposViolacaoData)}
                  />
                  <Pie
                    data={tiposViolacaoData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    label={renderPieValueLabel}
                    labelLine={false}
                    isAnimationActive={!isPrintMode}
                    onClick={(data: any) => {
                      const clickedName = getClickedChartName(data);
                      if (clickedName) {
                        onDrillDown("por_violencia", clickedName, `Casos de Violência: ${clickedName}`);
                      }
                    }}
                    cursor="pointer"
                  >
                    {tiposViolacaoData.map((_item, index) => <Cell key={`cell-v-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              )}
            </ChartViewport>
          </CardContent>
        </Card>

        <Card className="dashboard-chart-card dashboard-chart-card--wide print-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Encaminhamentos Realizados (Top 5)</CardTitle>
          </CardHeader>
          <CardContent className="dashboard-chart-card-content">
            <ChartViewport isPrintMode={isPrintMode} height={300} printHeight={240}>
              {({ width, height }) => (
                <BarChart width={width} height={height} data={dashboardData?.graficos?.encaminhamentosTop5 ?? []} margin={{ left: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, angle: -20, textAnchor: "end" }} height={50} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${value} casos`} />
                  <Legend verticalAlign="top" height={36} formatter={() => BAR_LEGEND_TEXT} />
                  <Bar dataKey="value" fill="#16a34a" isAnimationActive={!isPrintMode}>
                    <LabelList dataKey="value" position="top" fill="#0f172a" fontSize={11} />
                  </Bar>
                </BarChart>
              )}
            </ChartViewport>
          </CardContent>
        </Card>

        <Card className="dashboard-chart-card print-card">
          <CardHeader><CardTitle>Casos por Sexo</CardTitle></CardHeader>
          <CardContent className="dashboard-chart-card-content">
            <ChartViewport isPrintMode={isPrintMode} height={300} printHeight={220}>
              {({ width, height }) => (
                <PieChart width={width} height={height}>
                  <Tooltip formatter={(value: number) => `${value} casos`} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => formatLegendLabel(String(value), dashboardData?.graficos?.casosPorSexo ?? [])}
                  />
                  <Pie
                    data={dashboardData?.graficos?.casosPorSexo ?? []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    label={renderPieValueLabel}
                    labelLine={false}
                    isAnimationActive={!isPrintMode}
                    onClick={(data: any) => onDrillDown("sexo", data.name, `Casos por Sexo: ${data.name}`)}
                    cursor="pointer"
                  >
                    {(dashboardData?.graficos?.casosPorSexo ?? []).map((_item, index) => (
                      <Cell key={`cell-s-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              )}
            </ChartViewport>
          </CardContent>
        </Card>

        <Card className="dashboard-chart-card dashboard-chart-card--full print-card lg:col-span-3">
          <CardHeader><CardTitle>Canal de Denúncia</CardTitle></CardHeader>
          <CardContent className="dashboard-chart-card-content">
            {isPrintMode ? (
              <div className="dashboard-print-chart-layout dashboard-print-chart-layout--canal">
                {renderPrintLegendList(dashboardData?.graficos?.canalDenuncia ?? [])}
                <div className="dashboard-print-chart-canvas">
                  <ChartViewport isPrintMode={isPrintMode} height={300} printHeight={300}>
                    {({ width, height }) => (
                      <PieChart width={width} height={height}>
                        <Tooltip formatter={(value: number) => `${value} casos`} />
                        <Pie
                          data={dashboardData?.graficos?.canalDenuncia ?? []}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={Math.max(112, Math.min(138, Math.floor(Math.min(width, height) * 0.47)))}
                          label={renderPieValueLabel}
                          labelLine={false}
                          isAnimationActive={false}
                          onClick={(data: any) => onDrillDown("canalDenuncia", data.name, `Casos por Canal de Denúncia: ${data.name}`)}
                          cursor="pointer"
                        >
                          {(dashboardData?.graficos?.canalDenuncia ?? []).map((_item, index) => (
                            <Cell key={`cell-canal-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    )}
                  </ChartViewport>
                </div>
              </div>
            ) : (
              <ChartViewport isPrintMode={isPrintMode} height={300} printHeight={240}>
                {({ width, height }) => (
                  <PieChart width={width} height={height}>
                    <Tooltip formatter={(value: number) => `${value} casos`} />
                    <Legend
                      align="center"
                      layout="horizontal"
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => formatLegendLabel(String(value), dashboardData?.graficos?.canalDenuncia ?? [])}
                    />
                    <Pie
                      data={dashboardData?.graficos?.canalDenuncia ?? []}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={renderPieValueLabel}
                      labelLine={false}
                      isAnimationActive={!isPrintMode}
                      onClick={(data: any) => onDrillDown("canalDenuncia", data.name, `Casos por Canal de Denúncia: ${data.name}`)}
                      cursor="pointer"
                    >
                      {(dashboardData?.graficos?.canalDenuncia ?? []).map((_item, index) => (
                        <Cell key={`cell-canal-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                )}
              </ChartViewport>
            )}
          </CardContent>
        </Card>

        <Card className="dashboard-chart-card print-card">
          <CardHeader><CardTitle>Casos por Cor/Etnia</CardTitle></CardHeader>
          <CardContent className="dashboard-chart-card-content">
            <ChartViewport isPrintMode={isPrintMode} height={300} printHeight={220}>
              {({ width, height }) => (
                <PieChart width={width} height={height}>
                  <Tooltip formatter={(value: number) => `${value} casos`} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => formatLegendLabel(String(value), casosPorCorData)}
                  />
                  <Pie
                    data={casosPorCorData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={renderPieValueLabel}
                    labelLine={false}
                    isAnimationActive={!isPrintMode}
                    onClick={(data: any) => {
                      const clickedName = getClickedChartName(data);
                      if (clickedName) {
                        onDrillDown("racaCor", clickedName, `Casos por Cor/Etnia: ${clickedName}`);
                      }
                    }}
                    cursor="pointer"
                  >
                    {casosPorCorData.map((_item, index) => <Cell key={`cell-cor-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              )}
            </ChartViewport>
          </CardContent>
        </Card>

        <Card className="dashboard-chart-card dashboard-chart-card--wide print-card lg:col-span-2">
          <CardHeader><CardTitle>Casos por Faixa Etária</CardTitle></CardHeader>
          <CardContent className="dashboard-chart-card-content">
            <ChartViewport isPrintMode={isPrintMode} height={300} printHeight={240}>
              {({ width, height }) => (
                <BarChart width={width} height={height} data={dashboardData?.graficos?.casosPorFaixaEtaria ?? []}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${value} casos`} />
                  <Legend verticalAlign="top" height={36} formatter={() => BAR_LEGEND_TEXT} />
                  <Bar
                    dataKey="value"
                    fill="#9333ea"
                    isAnimationActive={!isPrintMode}
                    onClick={(data: any) => onDrillDown("por_faixa_etaria", data.name, `Casos por Faixa Etária: ${data.name}`)}
                    cursor="pointer"
                  >
                    <LabelList dataKey="value" position="top" fill="#0f172a" fontSize={11} />
                  </Bar>
                </BarChart>
              )}
            </ChartViewport>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
