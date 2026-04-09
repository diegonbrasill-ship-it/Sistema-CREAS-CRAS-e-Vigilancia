import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";

import { useCasosDrilldown } from "@/hooks/useCasosDrilldown";

import { normalizeChartSeries, resolveChartSeries } from "./adapters/dashboardCharts";
import { DashboardChartSection } from "./components/DashboardChartSection";
import { DashboardFilters } from "./components/DashboardFilters";
import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardKpiSection } from "./components/DashboardKpiSection";
import { DashboardModal } from "./components/DashboardModal";
import "./Dashboard.css";
import { useDashboardData } from "./hooks/useDashboardData";
import { useDashboardPresentation } from "./hooks/useDashboardPresentation";

export default function Dashboard() {
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printGeneratedAt, setPrintGeneratedAt] = useState<string | null>(null);
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

  const generatedAtLabel = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(printGeneratedAt ? new Date(printGeneratedAt) : new Date());

  const printFilterSummary = [
    { label: "Período", value: filters.mes || "Todos os períodos" },
    { label: "Técnico de Referência", value: filters.tecRef || "Todos os técnicos" },
    { label: "Bairro", value: filters.bairro || "Todos os bairros" },
  ];

  useEffect(() => {
    const handleBeforePrint = () => {
      closeDrilldown();
      setPrintGeneratedAt(new Date().toISOString());
      setIsPrintMode(true);
      setIsPrinting(true);
    };

    const handleAfterPrint = () => {
      setIsPrintMode(false);
      setIsPrinting(false);
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [closeDrilldown]);

  useEffect(() => {
    document.body.classList.toggle("dashboard-print-active", isPrintMode);

    return () => {
      document.body.classList.remove("dashboard-print-active");
    };
  }, [isPrintMode]);

  const handlePrint = () => {
    if (isLoading || !dashboardData || isPrinting) {
      return;
    }

    closeDrilldown();
    setPrintGeneratedAt(new Date().toISOString());
    setIsPrintMode(true);
    setIsPrinting(true);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
        window.setTimeout(() => {
          window.print();
        }, 150);
      });
    });
  };

  const tiposViolacaoData = resolveChartSeries(dashboardData?.graficos as Record<string, unknown> | undefined, [
    "tiposViolacao",
    "tiposViolencia",
    "perfilViolacoes",
    "perfilViolencia",
    "tipoViolencia",
  ], "tipoViolencia");
  const casosPorCorData = resolveChartSeries(dashboardData?.graficos as Record<string, unknown> | undefined, [
    "casosPorCor",
    "casosPorCorEtnia",
    "casosPorRacaCor",
    "corEtnia",
    "racaCor",
  ], "racaCor");
  const canalDenunciaData = normalizeChartSeries(dashboardData?.graficos?.canalDenuncia ?? [], "canalDenuncia");
  const casosPorSexoData = normalizeChartSeries(dashboardData?.graficos?.casosPorSexo ?? [], "sexo");

  return (
    <div
      ref={dashboardRef}
      className={`space-y-6 dashboard-container dashboard-print-root ${isPresentationMode ? "presentation-mode" : ""} ${isPrintMode ? "print-mode" : ""}`}
    >
      <DashboardHeader
        isPresentationMode={isPresentationMode}
        isPrinting={isPrinting}
        canPrint={!isLoading && !!dashboardData}
        onTogglePresentationMode={togglePresentationMode}
        onPrint={handlePrint}
      />
      <section className="print-only dashboard-print-report-header">
        <div className="dashboard-print-report-title-row">
          <div>
            <h2 className="dashboard-print-report-title">Relatório do Dashboard PAEFI</h2>
            <p className="dashboard-print-report-subtitle">
              Exportação da visualização atual do dashboard em formato para impressão.
            </p>
          </div>
          <div className="dashboard-print-report-meta">
            <span className="dashboard-print-report-meta-label">Gerado em</span>
            <strong>{generatedAtLabel}</strong>
          </div>
        </div>
        <div className="dashboard-print-filter-list">
          {printFilterSummary.map((item) => (
            <div key={item.label} className="dashboard-print-filter-item">
              <span className="dashboard-print-filter-label">{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>
      <div className="dashboard-print-content">
        <DashboardFilters
          filters={filters}
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
        />
        <section className="dashboard-print-section dashboard-print-section--kpis">
          <DashboardKpiSection
            dashboardData={dashboardData}
            renderValue={renderValue}
            onDrillDown={handleDrillDown}
          />
        </section>
        <section className="dashboard-print-section dashboard-print-section--charts">
          <DashboardChartSection
            dashboardData={dashboardData}
            tiposViolacaoData={tiposViolacaoData}
            casosPorCorData={casosPorCorData}
            canalDenunciaData={canalDenunciaData}
            casosPorSexoData={casosPorSexoData}
            isPrintMode={isPrintMode}
            onDrillDown={handleDrillDown}
          />
        </section>
      </div>
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
