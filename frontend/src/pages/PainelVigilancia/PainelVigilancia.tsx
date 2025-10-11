// frontend/src/pages/PainelVigilancia.tsx

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';

// Nossos componentes visuais
import CardKPI from '../../components/vigilancia/CardKPI';
import MapaCalor from '../../components/vigilancia/MapaCalor';
import GraficoBarras from '../../components/vigilancia/GraficoBarras';
import GraficoPizza from '../../components/vigilancia/GraficoPizza';
import ListaCasosModal from '../../components/DrillDown/ListaCasosModal';

// Nossas funções da API
import { 
  getVigilanciaFluxoDemanda, 
  getVigilanciaSobrecargaEquipe, 
  getVigilanciaIncidenciaBairros, 
  getVigilanciaFontesAcionamento, 
  getVigilanciaTaxaReincidencia,
  getVigilanciaPerfilViolacoes, 
  getCasosFiltrados
} from '../../services/api'; 

import './PainelVigilancia.css';

// --- Interfaces ---
interface SobrecargaData { mediaCasosPorTecnico: number; limiteRecomendado: number; totalCasosAtivos: number; } 
interface FluxoData { casosNovosUltimos30Dias: number; }
interface ReincidenciaData { taxaReincidencia: number; }
interface IncidenciaBairro { bairro: string; casos: number; }
interface FonteAcionamento { fonte: string; quantidade: number; }
interface PerfilViolencia { tipo: string; quantidade: number; }

interface PainelData {
  sobrecarga: SobrecargaData;
  fluxo: FluxoData;
  reincidencia: ReincidenciaData;
  incidenciaBairros: IncidenciaBairro[];
  fontesAcionamento: FonteAcionamento[];
  perfilViolacoes: PerfilViolencia[];
}

interface CasoParaLista {
  id: number;
  nome?: string;
  tecRef: string;
  dataCad: string;
  bairro?: string;
}

// ⭐️ MAPA DE FILTROS PARA VIGILÂNCIA ⭐️
const VIGILANCIA_FILTERS_MAP: { [key: string]: { campo: string, valor?: string } | null } = {
    // KPI's de Acesso
    'total_ativos': { campo: 'status', valor: 'Ativo' }, 
    'novos_no_mes': { campo: 'mes', valor: new Date().toISOString().substring(0, 7) }, 
    'reincidentes': { campo: 'reincidente', valor: 'Sim' }, 
    
    // Filtros de Gráfico
    'por_bairro': { campo: 'bairro' }, 
    'por_canal': { campo: 'canalDenuncia' }, 
    'por_violencia': { campo: 'tipoViolencia' }, 
    
    // Casos Específicos
    'casos_novos_30d': { campo: 'dataCad', valor: 'ultimos_30_dias' }, 
};


const PainelVigilancia: React.FC = () => {
    const [painelData, setPainelData] = useState<PainelData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalCases, setModalCases] = useState<CasoParaLista[]>([]);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAllPainelData = async () => {
            try {
                const [
                    fluxoRes, sobrecargaRes, incidenciaRes, 
                    fontesRes, reincidenciaRes, violacoesRes
                ] = await Promise.all([
                    getVigilanciaFluxoDemanda(),
                    getVigilanciaSobrecargaEquipe(),
                    getVigilanciaIncidenciaBairros(),
                    getVigilanciaFontesAcionamento(),
                    getVigilanciaTaxaReincidencia(),
                    getVigilanciaPerfilViolacoes()
                ]);

                setPainelData({
                    fluxo: fluxoRes,
                    sobrecarga: sobrecargaRes,
                    incidenciaBairros: incidenciaRes,
                    fontesAcionamento: fontesRes,
                    reincidencia: reincidenciaRes,
                    perfilViolacoes: violacoesRes,
                });

            } catch (err: any) {
                console.error("Erro ao buscar dados para o painel:", err);
                toast.error("Não foi possível carregar os dados do painel de vigilância.");
                setError("Não foi possível carregar os dados do painel de vigilância.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllPainelData();
    }, []);

    // LÓGICA CORRIGIDA PARA TRADUÇÃO DE FILTROS E CHAMADA DA API
    const handleDrillDown = async (action: string, valor: string | null = null, title: string) => {
        setModalError(null); 
        setModalTitle(title);
        setIsModalOpen(true);
        setIsModalLoading(true);
        setModalCases([]);
        
        const map = VIGILANCIA_FILTERS_MAP[action];
        let filtroParam: string | undefined = undefined;
        let valorParam: string | undefined = undefined;

        if (map) {
            filtroParam = map.campo;
            valorParam = map.valor || valor || undefined;
        } else {
             filtroParam = action;
             valorParam = valor || undefined;
        }

        try {
            // ✅ CORRIGIDO: Passando a 'origem' para que o api.ts chame o endpoint correto
            const data = await getCasosFiltrados({ filtro: filtroParam, valor: valorParam, origem: 'vigilancia' });
            setModalCases(data);
        } catch (err: any) {
            setModalError("Seu perfil não tem permissão para visualizar esta lista detalhada.");
            toast.warn("Acesso restrito para esta visualização.");
        } finally {
            setIsModalLoading(false);
        }
    };

    if (loading) {
// ... (código de carregamento inalterado)
        return (
            <div className="painel-container flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                <span className="ml-4 text-slate-500">Carregando Painel de Vigilância...</span>
            </div>
        );
    }

    if (error) {
        return <div className="painel-container"><div className="error-message">{error}</div></div>;
    }

    return (
        <div className="painel-container">
            <h1 className="painel-title">Painel de Vigilância Socioassistencial</h1>
            
            <div className="painel-row">
                {painelData && (
                    <>
                        {/* KPI Sobrecarga: DrillDown para todos os casos ativos */}
                        <div onClick={() => handleDrillDown('total_ativos', null, 'Total de Casos Ativos')} className="cursor-pointer transition-transform hover:scale-105">
                            <CardKPI
                                title="Sobrecarga da Equipe"
                                subtitle={`(${painelData.sobrecarga.totalCasosAtivos} Casos Ativos)`}
                                value={painelData.sobrecarga.mediaCasosPorTecnico}
                                status={painelData.sobrecarga.mediaCasosPorTecnico > painelData.sobrecarga.limiteRecomendado ? 'alerta' : 'ok'}
                            />
                        </div>
                        {/* KPI Fluxo de Demanda: DrillDown para casos dos últimos 30 dias */}
                        <div onClick={() => handleDrillDown('casos_novos_30d', null, 'Casos Novos no Último Mês')} className="cursor-pointer transition-transform hover:scale-105">
                            <CardKPI
                                title="Fluxo de Demanda"
                                subtitle="(Novos casos no último mês)"
                                value={painelData.fluxo.casosNovosUltimos30Dias}
                                status='ok'
                            />
                        </div>
                        {/* KPI Reincidência: DrillDown para casos reincidentes */}
                        <div onClick={() => handleDrillDown('reincidentes', null, 'Casos Reincidentes')} className="cursor-pointer transition-transform hover:scale-105">
                            <CardKPI 
                                title="Taxa de Reincidência" 
                                subtitle="(Últimos 12 meses)" 
                                value={`${painelData.reincidencia.taxaReincidencia}%`} 
                                status={painelData.reincidencia.taxaReincidencia > 10 ? 'alerta' : 'ok'} 
                            />
                        </div>
                    </>
                )}
            </div>
            
            <div className="painel-row painel-row--gap">
                 {painelData && painelData.incidenciaBairros && (
                    <div className="painel-col-8">
                       <h2 className="painel-subtitle">Incidência Territorial</h2>
                       <MapaCalor 
                            data={painelData.incidenciaBairros} 
                            // Filtro de mapa clica no nome do bairro (valor dinâmico)
                            onMarkerClick={(bairro) => handleDrillDown('por_bairro', bairro, `Casos no Bairro: ${bairro}`)}
                        />
                    </div>
                 )}
                 <div className="painel-col-4">
                    <h2 className="painel-subtitle">Fontes de Acionamento</h2>
                    {painelData && painelData.fontesAcionamento && (
                        <GraficoBarras 
                            // ✅ CORREÇÃO: Mapeamento de nome/valor
                            data={painelData.fontesAcionamento.map(d => ({ name: d.fonte, value: d.quantidade }))} 
                            onBarClick={(data) => handleDrillDown('por_canal', data.name, `Fonte de Acionamento: ${data.name}`)}
                        />
                    )}
                    
                    <h2 className="painel-subtitle">Perfil das Violações</h2>
                    {painelData && painelData.perfilViolacoes && (
                        <GraficoPizza 
                            // ✅ CORREÇÃO: Mapeamento de nome/valor
                            data={painelData.perfilViolacoes.map(d => ({ name: d.tipo, value: d.quantidade }))} 
                            onSliceClick={(data) => handleDrillDown('por_violencia', data.name, `Tipo de Violência: ${data.name}`)}
                        />
                    )}
                 </div>
            </div>

             <ListaCasosModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalTitle}
                cases={modalCases}
                isLoading={isModalLoading}
                errorMessage={modalError} 
            />
        </div>
    );
};

export default PainelVigilancia;



