import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";

import { useCasosDrilldown } from "@/hooks/useCasosDrilldown";

import { resolveChartSeries } from "./adapters/dashboardCharts";
import { DashboardChartSection } from "./components/DashboardChartSection";
import { DashboardFilters } from "./components/DashboardFilters";
import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardKpiSection } from "./components/DashboardKpiSection";
import { DashboardModal } from "./components/DashboardModal";
import "./Dashboard.css";
import { useDashboardData } from "./hooks/useDashboardData";
import { useDashboardPresentation } from "./hooks/useDashboardPresentation";

export default function Dashboard() {
  const {
    dashboardData,
    isLoading,
    filters,
    filterOptions,
    handleFilterChange,
    clearFilters,
  } = useDashboardData();
  const { dashboardRef, isPresentationMode, togglePresentationMode } = useDashboardPresentation({
    onFullscreenError: (message) => {
      toast.error(`Erro ao entrar em tela cheia: ${message}`);
    },
  });
  const {
    isOpen: isModalOpen,
    title: modalTitle,
    cases: modalCases,
    isLoading: isModalLoading,
    errorMessage: modalError,
    openDrilldown,
    closeDrilldown,
  } = useCasosDrilldown({
    onError: (message) => {
      toast.error(`Erro ao buscar a lista de casos: ${message}`);
    },
  });

  const handleDrillDown = (action: string, value: string | null = null, title: string) => {
    void openDrilldown({
      source: "dashboard",
      action,
      value,
      title,
      uiFilters: filters,
    });
  };

  const renderValue = (value: number | string | null | undefined) => {
    if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-slate-400" />;
    if (value === null || value === undefined) return typeof value === "number" ? 0 : "...";
    return value;
  };

  const tiposViolacaoData = resolveChartSeries(dashboardData?.graficos as Record<string, unknown> | undefined, [
    "tiposViolacao",
    "tiposViolencia",
    "perfilViolacoes",
    "perfilViolencia",
    "tipoViolencia",
  ]);
  const casosPorCorData = resolveChartSeries(dashboardData?.graficos as Record<string, unknown> | undefined, [
    "casosPorCor",
    "casosPorCorEtnia",
    "casosPorRacaCor",
    "corEtnia",
    "racaCor",
  ]);

  return (
    <div ref={dashboardRef} className={`space-y-6 dashboard-container ${isPresentationMode ? "presentation-mode" : ""}`}>
      <DashboardHeader
        isPresentationMode={isPresentationMode}
        onTogglePresentationMode={togglePresentationMode}
      />
      <DashboardFilters
        filters={filters}
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
      />
      <DashboardKpiSection
        dashboardData={dashboardData}
        renderValue={renderValue}
        onDrillDown={handleDrillDown}
      />
      <DashboardChartSection
        dashboardData={dashboardData}
        tiposViolacaoData={tiposViolacaoData}
        casosPorCorData={casosPorCorData}
        onDrillDown={handleDrillDown}
      />
      <DashboardModal
        isOpen={isModalOpen}
        onClose={closeDrilldown}
        title={modalTitle}
        cases={modalCases}
        isLoading={isModalLoading}
        errorMessage={modalError}
      />
    </div>
  );
}
