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
interface SobrecargaData { mediaCasosPorTecnico: number; limiteRecomendado: number; }
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

    const handleDrillDown = async (filtro: string, valor: string | null = null, title: string) => {
        // Limpa erros anteriores ao abrir um novo modal
        setModalError(null); 
        setModalTitle(title);
        setIsModalOpen(true);
        setIsModalLoading(true);
        setModalCases([]);

        try {
            const data = await getCasosFiltrados({ filtro, valor: valor || undefined });
            setModalCases(data);
        } catch (err: any) {
            // Em vez de fechar o modal, definimos uma mensagem de erro
            setModalError("Seu perfil não tem permissão para visualizar esta lista detalhada.");
            toast.warn("Acesso restrito para esta visualização.");
        } finally {
            setIsModalLoading(false);
        }
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
        return <div className="painel-container"><div className="error-message">{error}</div></div>;
    }

    return (
        <div className="painel-container">
            <h1 className="painel-title">Painel de Vigilância Socioassistencial</h1>
            
            <div className="painel-row">
                {painelData && (
                    <>
                        <div onClick={() => handleDrillDown('todos', null, 'Total de Casos Ativos')} className="cursor-pointer transition-transform hover:scale-105">
                            <CardKPI
                                title="Sobrecarga da Equipe"
                                subtitle="(Casos por Técnico)"
                                value={painelData.sobrecarga.mediaCasosPorTecnico}
                                status={painelData.sobrecarga.mediaCasosPorTecnico > painelData.sobrecarga.limiteRecomendado ? 'alerta' : 'ok'}
                            />
                        </div>
                        <div onClick={() => handleDrillDown('novos_no_mes', null, 'Casos Novos no Mês')} className="cursor-pointer transition-transform hover:scale-105">
                            <CardKPI
                                title="Fluxo de Demanda"
                                subtitle="(Novos casos no último mês)"
                                value={painelData.fluxo.casosNovosUltimos30Dias}
                                status='ok'
                            />
                        </div>
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
                            onMarkerClick={(bairro) => handleDrillDown('por_bairro', bairro, `Casos no Bairro: ${bairro}`)}
                        />
                    </div>
                 )}
                 <div className="painel-col-4">
                    <h2 className="painel-subtitle">Fontes de Acionamento</h2>
                    {painelData && painelData.fontesAcionamento && (
                        <GraficoBarras 
                            data={painelData.fontesAcionamento} 
                            onBarClick={(data) => handleDrillDown('por_canal', data.fonte, `Fonte de Acionamento: ${data.fonte}`)}
                        />
                    )}
                    
                    <h2 className="painel-subtitle">Perfil das Violações</h2>
                    {painelData && painelData.perfilViolacoes && (
                        <GraficoPizza 
                            data={painelData.perfilViolacoes} 
                            onSliceClick={(data) => handleDrillDown('por_violencia', data.name, `Tipo de Violência: ${data.name}`)}
                        />
                    )}
                 </div>
            </div>

            {/* A ÚNICA ALTERAÇÃO ESTÁ AQUI: Adicionamos a className */}
             <ListaCasosModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalTitle}
                cases={modalCases}
                isLoading={isModalLoading}
                errorMessage={modalError} // <-- Passando a mensagem de erro
            />
        </div>
    );
};

export default PainelVigilancia;



