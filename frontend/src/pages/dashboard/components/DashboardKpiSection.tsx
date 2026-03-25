import type { ReactNode } from "react";

import {
  AlertTriangle,
  BookOpen,
  Briefcase,
  Building,
  HandCoins,
  HeartPulse,
  Home,
  SearchCheck,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardApiDataType } from "@/services/api";

interface DashboardKpiSectionProps {
  dashboardData: DashboardApiDataType | null;
  renderValue: (value: number | string | null | undefined) => ReactNode;
  onDrillDown: (action: string, value: string | null, title: string) => void;
}

interface KpiCardConfig {
  title: string;
  icon: LucideIcon;
  value: number | string | null | undefined;
  prefix?: string;
  action?: string;
  drilldownTitle?: string;
  cardClassName?: string;
  valueClassName: string;
}

interface KpiSectionConfig {
  title: string;
  cards: KpiCardConfig[];
}

function renderKpiCard(
  card: KpiCardConfig,
  renderValue: DashboardKpiSectionProps["renderValue"],
  onDrillDown: DashboardKpiSectionProps["onDrillDown"],
) {
  const Icon = card.icon;
  const isClickable = !!card.action && !!card.drilldownTitle;
  const clickableClassName = isClickable ? `cursor-pointer ${card.cardClassName ?? ""}`.trim() : "";

  return (
    <Card
      key={card.title}
      onClick={isClickable ? () => onDrillDown(card.action!, null, card.drilldownTitle!) : undefined}
      className={clickableClassName}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={card.valueClassName}>
          {card.prefix}
          {renderValue(card.value)}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardKpiSection({
  dashboardData,
  renderValue,
  onDrillDown,
}: DashboardKpiSectionProps) {
  const sections: KpiSectionConfig[] = [
    {
      title: "Visão Geral do Serviço",
      cards: [
        {
          title: "Total de Atendimentos",
          icon: Users,
          value: dashboardData?.indicadores?.totalAtendimentos,
          action: "todos",
          drilldownTitle: "Total de Atendimentos",
          cardClassName: "hover:border-blue-500 transition-all",
          valueClassName: "text-2xl font-bold kpi-value-large",
        },
        {
          title: "Novos no Mês",
          icon: TrendingUp,
          value: dashboardData?.indicadores?.novosNoMes,
          prefix: "+",
          action: "novos_no_mes",
          drilldownTitle: "Casos Novos no Mês",
          cardClassName: "hover:border-green-500 transition-all",
          valueClassName: "text-2xl font-bold text-green-600 kpi-value-large",
        },
        {
          title: "Inseridos no PAEFI",
          icon: UserCheck,
          value: dashboardData?.indicadores?.inseridosPAEFI,
          action: "inseridos_paefi",
          drilldownTitle: "Casos Inseridos no PAEFI",
          cardClassName: "hover:border-sky-500 transition-all",
          valueClassName: "text-2xl font-bold kpi-value-large",
        },
        {
          title: "Casos Reincidentes",
          icon: AlertTriangle,
          value: dashboardData?.indicadores?.reincidentes,
          action: "reincidentes",
          drilldownTitle: "Casos Reincidentes",
          cardClassName: "hover:border-red-500 transition-all",
          valueClassName: "text-2xl font-bold text-red-600 kpi-value-large",
        },
      ],
    },
    {
      title: "Perfil Socioeconômico",
      cards: [
        {
          title: "Recebem Bolsa Família",
          icon: HandCoins,
          value: dashboardData?.indicadores?.recebemBolsaFamilia,
          action: "recebem_bolsa_familia",
          drilldownTitle: "Casos que Recebem Bolsa Família",
          cardClassName: "hover:border-emerald-500 transition-all",
          valueClassName: "text-2xl font-bold kpi-value-large",
        },
        {
          title: "Recebem BPC",
          icon: HandCoins,
          value: dashboardData?.indicadores?.recebemBPC,
          action: "recebem_bpc",
          drilldownTitle: "Casos que Recebem BPC",
          cardClassName: "hover:border-emerald-500 transition-all",
          valueClassName: "text-2xl font-bold kpi-value-large",
        },
        {
          title: "Moradia Principal",
          icon: Home,
          value: dashboardData?.principais?.moradiaPrincipal,
          valueClassName: "text-xl font-bold kpi-value-medium",
        },
        {
          title: "Escolaridade Principal",
          icon: BookOpen,
          value: dashboardData?.principais?.escolaridadePrincipal,
          valueClassName: "text-xl font-bold kpi-value-medium",
        },
      ],
    },
    {
      title: "Indicadores de Violência",
      cards: [
        {
          title: "Violência Principal",
          icon: ShieldCheck,
          value: dashboardData?.principais?.violenciaPrincipal,
          valueClassName: "text-xl font-bold kpi-value-medium",
        },
        {
          title: "Violência Confirmada",
          icon: SearchCheck,
          value: dashboardData?.indicadores?.violenciaConfirmada,
          action: "violencia_confirmada",
          drilldownTitle: "Casos com Violência Confirmada",
          cardClassName: "hover:border-rose-500 transition-all",
          valueClassName: "text-2xl font-bold text-blue-600 kpi-value-large",
        },
        {
          title: "Notificados no SINAN",
          icon: HeartPulse,
          value: dashboardData?.indicadores?.notificadosSINAN,
          action: "notificados_sinan",
          drilldownTitle: "Casos Notificados no SINAN",
          cardClassName: "hover:border-violet-500 transition-all",
          valueClassName: "text-2xl font-bold kpi-value-large",
        },
        {
          title: "Local Principal",
          icon: Building,
          value: dashboardData?.principais?.localPrincipal,
          valueClassName: "text-xl font-bold kpi-value-medium",
        },
      ],
    },
    {
      title: "Contexto Familiar",
      cards: [
        {
          title: "Dependência Financeira",
          icon: HandCoins,
          value: dashboardData?.indicadores?.contextoFamiliar?.dependenciaFinanceira,
          action: "dependencia_financeira",
          drilldownTitle: "Casos com Dependência Financeira",
          cardClassName: "hover:border-amber-500 transition-all",
          valueClassName: "text-2xl font-bold kpi-value-large",
        },
        {
          title: "Vítima é PCD",
          icon: Users,
          value: dashboardData?.indicadores?.contextoFamiliar?.vitimaPCD,
          action: "vitima_pcd",
          drilldownTitle: "Casos com Vítima PCD",
          cardClassName: "hover:border-amber-500 transition-all",
          valueClassName: "text-2xl font-bold kpi-value-large",
        },
        {
          title: "Membro em Sist. Carcerário",
          icon: Briefcase,
          value: dashboardData?.indicadores?.contextoFamiliar?.membroCarcerario,
          action: "membro_carcerario",
          drilldownTitle: "Casos com Membro em Sist. Carcerário",
          cardClassName: "hover:border-amber-500 transition-all",
          valueClassName: "text-2xl font-bold kpi-value-large",
        },
        {
          title: "Membro em Socioeducação",
          icon: Briefcase,
          value: dashboardData?.indicadores?.contextoFamiliar?.membroSocioeducacao,
          action: "membro_socioeducacao",
          drilldownTitle: "Casos com Membro em Socioeducação",
          cardClassName: "hover:border-amber-500 transition-all",
          valueClassName: "text-2xl font-bold kpi-value-large",
        },
      ],
    },
  ];

  return (
    <>
      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="text-lg font-semibold text-slate-700 pt-4">{section.title}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {section.cards.map((card) => renderKpiCard(card, renderValue, onDrillDown))}
          </div>
        </div>
      ))}
    </>
  );
}
