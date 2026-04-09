import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

import CardKPI from "../../components/vigilancia/CardKPI";
import MapaCalor from "../../components/vigilancia/MapaCalor";
import GraficoBarras from "../../components/vigilancia/GraficoBarras";
import GraficoPizza from "../../components/vigilancia/GraficoPizza";
import ListaCasosModal from "../../components/DrillDown/ListaCasosModal";
import { useCasosDrilldown } from "@/hooks/useCasosDrilldown";
import { formatOptionLabel } from "@/utils/cadastroOptionLabels";
import { getClickedChartSelection } from "../dashboard/adapters/dashboardCharts";
import {
  getVigilanciaFluxoDemanda,
  getVigilanciaSobrecargaEquipe,
  getVigilanciaIncidenciaBairros,
  getVigilanciaFontesAcionamento,
  getVigilanciaTaxaReincidencia,
  getVigilanciaPerfilViolacoes,
} from "../../services/api";

import "./PainelVigilancia.css";

interface SobrecargaData {
  mediaCasosPorTecnico: number;
  limiteRecomendado: number;
  totalCasosAtivos: number;
}

interface FluxoData {
  casosNovosUltimos30Dias: number;
}

interface ReincidenciaData {
  taxaReincidencia: number;
}

interface IncidenciaBairro {
  bairro: string;
  casos: number;
}

interface FonteAcionamento {
  fonte: string;
  quantidade: number;
}

interface PerfilViolencia {
  tipo: string;
  quantidade: number;
}

interface PainelData {
  sobrecarga: SobrecargaData;
  fluxo: FluxoData;
  reincidencia: ReincidenciaData;
  incidenciaBairros: IncidenciaBairro[];
  fontesAcionamento: FonteAcionamento[];
  perfilViolacoes: PerfilViolencia[];
}

const MODAL_PERMISSION_ERROR = "Seu perfil não tem permissão para visualizar esta lista detalhada.";

const PainelVigilancia: React.FC = () => {
  const [painelData, setPainelData] = useState<PainelData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const {
    isOpen: isModalOpen,
    title: modalTitle,
    cases: modalCases,
    isLoading: isModalLoading,
    errorMessage: modalError,
    openDrilldown,
    closeDrilldown,
  } = useCasosDrilldown({
    defaultErrorMessage: MODAL_PERMISSION_ERROR,
    onError: () => {
      toast.warn("Acesso restrito para esta visualização.");
    },
  });

  useEffect(() => {
    const fetchAllPainelData = async () => {
      try {
        const [
          fluxoRes,
          sobrecargaRes,
          incidenciaRes,
          fontesRes,
          reincidenciaRes,
          violacoesRes,
        ] = await Promise.all([
          getVigilanciaFluxoDemanda(),
          getVigilanciaSobrecargaEquipe(),
          getVigilanciaIncidenciaBairros(),
          getVigilanciaFontesAcionamento(),
          getVigilanciaTaxaReincidencia(),
          getVigilanciaPerfilViolacoes(),
        ]);

        setPainelData({
          fluxo: fluxoRes,
          sobrecarga: sobrecargaRes,
          incidenciaBairros: incidenciaRes,
          fontesAcionamento: fontesRes,
          reincidencia: reincidenciaRes,
          perfilViolacoes: violacoesRes,
        });
      } catch (err) {
        console.error("Erro ao buscar dados para o painel:", err);
        toast.error("Não foi possível carregar os dados do painel de vigilância.");
        setError("Não foi possível carregar os dados do painel de vigilância.");
      } finally {
        setLoading(false);
      }
    };

    void fetchAllPainelData();
  }, []);

  const handleDrillDown = (action: string, valor: string | null = null, title: string) => {
    void openDrilldown({
      source: "vigilancia",
      action,
      value: valor,
      title,
    });
  };

  if (loading) {
    return (
      <div className="painel-container flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        <span className="ml-4 text-slate-500">Carregando Painel de Vigilância...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="painel-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="painel-container">
      <h1 className="painel-title">Painel de Vigilância Socioassistencial</h1>

      <div className="painel-row">
        {painelData && (
          <>
            <div
              onClick={() => handleDrillDown("total_ativos", null, "Total de Casos Ativos")}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              <CardKPI
                title="Sobrecarga da Equipe"
                subtitle={`(${painelData.sobrecarga.totalCasosAtivos} Casos Ativos)`}
                value={painelData.sobrecarga.mediaCasosPorTecnico}
                status={painelData.sobrecarga.mediaCasosPorTecnico > painelData.sobrecarga.limiteRecomendado ? "alerta" : "ok"}
              />
            </div>

            <div
              onClick={() => handleDrillDown("casos_novos_30d", null, "Casos Novos no Último Mês")}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              <CardKPI
                title="Fluxo de Demanda"
                subtitle="(Novos casos no último mês)"
                value={painelData.fluxo.casosNovosUltimos30Dias}
                status="ok"
              />
            </div>

            <div
              onClick={() => handleDrillDown("reincidentes", null, "Casos Reincidentes")}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              <CardKPI
                title="Taxa de Reincidência"
                subtitle="(Últimos 12 meses)"
                value={`${painelData.reincidencia.taxaReincidencia}%`}
                status={painelData.reincidencia.taxaReincidencia > 10 ? "alerta" : "ok"}
              />
            </div>
          </>
        )}
      </div>

      <div className="painel-row painel-row--gap">
        {painelData?.incidenciaBairros && (
          <div className="painel-col-8">
            <h2 className="painel-subtitle">Incidência Territorial</h2>
            <MapaCalor
              data={painelData.incidenciaBairros}
              onMarkerClick={(bairro) => handleDrillDown("por_bairro", bairro, `Casos no Bairro: ${bairro}`)}
            />
          </div>
        )}

        <div className="painel-col-4">
          <h2 className="painel-subtitle">Fontes de Acionamento</h2>
          {painelData?.fontesAcionamento && (
            <GraficoBarras
              data={painelData.fontesAcionamento.map((item) => ({ name: item.fonte, value: item.quantidade }))}
              onBarClick={(data) => handleDrillDown("por_canal", data.name, `Fonte de Acionamento: ${data.name}`)}
            />
          )}

          <h2 className="painel-subtitle">Perfil das Violações</h2>
          {painelData?.perfilViolacoes && (
            <GraficoPizza
              data={painelData.perfilViolacoes.map((item) => ({
                name: formatOptionLabel("tipoViolencia", item.tipo),
                rawName: item.tipo,
                value: item.quantidade,
              }))}
              onSliceClick={(data) => {
                const clickedSelection = getClickedChartSelection(data);
                if (clickedSelection) {
                  handleDrillDown("por_violencia", clickedSelection.value, `Tipo de Violência: ${clickedSelection.label}`);
                }
              }}
            />
          )}
        </div>
      </div>

      <ListaCasosModal
        isOpen={isModalOpen}
        onClose={closeDrilldown}
        title={modalTitle}
        cases={modalCases}
        isLoading={isModalLoading}
        errorMessage={modalError}
      />
    </div>
  );
};

export default PainelVigilancia;
