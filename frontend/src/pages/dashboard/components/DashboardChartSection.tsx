import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardApiDataType } from "@/services/api";

import { type ChartDatum, getClickedChartName } from "../adapters/dashboardCharts";

interface DashboardChartSectionProps {
  dashboardData: DashboardApiDataType | null;
  tiposViolacaoData: ChartDatum[];
  casosPorCorData: ChartDatum[];
  onDrillDown: (action: string, value: string | null, title: string) => void;
}

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#9333ea", "#dc2626", "#0ea5e9", "#64748b"];

export function DashboardChartSection({
  dashboardData,
  tiposViolacaoData,
  casosPorCorData,
  onDrillDown,
}: DashboardChartSectionProps) {
  return (
    <>
      <h2 className="text-lg font-semibold text-slate-700 pt-4">Análise Gráfica</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Casos por Bairro (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart layout="vertical" data={dashboardData?.graficos?.casosPorBairro ?? []} margin={{ left: 50 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `${value} casos`} />
                <Bar
                  dataKey="value"
                  fill="#2563eb"
                  onClick={(data: any) => onDrillDown("por_bairro", data.name, `Casos no Bairro: ${data.name}`)}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tipos de Violação</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Tooltip formatter={(value: number) => `${value} casos`} />
                <Pie
                  data={tiposViolacaoData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
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
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Encaminhamentos Realizados (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData?.graficos?.encaminhamentosTop5 ?? []} margin={{ left: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, angle: -20, textAnchor: "end" }} height={50} />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value} casos`} />
                <Bar dataKey="value" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Casos por Sexo</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Tooltip formatter={(value: number) => `${value} casos`} />
                <Pie
                  data={dashboardData?.graficos?.casosPorSexo ?? []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  onClick={(data: any) => onDrillDown("sexo", data.name, `Casos por Sexo: ${data.name}`)}
                  cursor="pointer"
                >
                  {(dashboardData?.graficos?.casosPorSexo ?? []).map((_item, index) => (
                    <Cell key={`cell-s-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Canal de Denúncia</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Tooltip formatter={(value: number) => `${value} casos`} />
                <Pie
                  data={dashboardData?.graficos?.canalDenuncia ?? []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                  onClick={(data: any) => onDrillDown("canalDenuncia", data.name, `Casos por Canal de Denúncia: ${data.name}`)}
                  cursor="pointer"
                >
                  {(dashboardData?.graficos?.canalDenuncia ?? []).map((_item, index) => (
                    <Cell key={`cell-canal-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Casos por Cor/Etnia</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Tooltip formatter={(value: number) => `${value} casos`} />
                <Pie
                  data={casosPorCorData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
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
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Casos por Faixa Etária</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData?.graficos?.casosPorFaixaEtaria ?? []}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value} casos`} />
                <Bar
                  dataKey="value"
                  fill="#9333ea"
                  onClick={(data: any) => onDrillDown("por_faixa_etaria", data.name, `Casos por Faixa Etária: ${data.name}`)}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
