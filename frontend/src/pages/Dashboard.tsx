import { useEffect, useState, useRef } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Presentation, Minimize, Users, TrendingUp, UserCheck, AlertTriangle, HandCoins, Home, BookOpen, ShieldCheck, HeartPulse, SearchCheck, Building, Briefcase, Loader2 } from "lucide-react";
import { 
    getDashboardData,
    ApiResponse, 
    DashboardApiDataType,
    getCasosFiltrados,
    CaseListEntry
} from "../services/api";
import ListaCasosModal from "@/components/DrillDown/ListaCasosModal";
import { toast } from "react-toastify";
import './Dashboard.css';

type ChartData = { name: string; value: number; };
// A interface CasoParaLista foi substituída por CaseListEntry

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#9333ea", "#dc2626", "#0ea5e9", "#64748b"];

/**
 * Mapeamento para traduzir a ação de clique do card (frontend)
 * para o campo JSONB e valor exato (backend).
 */
const CARD_FILTERS_MAP: { [key: string]: { campo: string, valor: string } | null } = {
    // Indicadores de Violência
    'violencia_confirmada': { campo: 'confirmacaoViolencia', valor: 'Confirmada' },
    'notificados_sinan': { campo: 'notificacaoSINAM', valor: 'Sim' },

    // Indicadores do Serviço
    'reincidentes': { campo: 'reincidente', valor: 'Sim' },
    'inseridos_paefi': { campo: 'inseridoPAEFI', valor: 'Sim' },

    // Perfil Socioeconômico
    'recebem_bolsa_familia': { campo: 'recebePBF', valor: 'Sim' },
    'recebem_bpc': { campo: 'recebeBPC', valor: 'Idoso' }, 
    
    // Contexto Familiar
    'dependencia_financeira': { campo: 'dependeFinanceiro', valor: 'Sim' },
    'vitima_pcd': { campo: 'vitimaPCD', valor: 'Sim' },
    'membro_carcerario': { campo: 'membroCarcerario', valor: 'Sim' },
    'membro_socioeducacao': { campo: 'membroSocioeducacao', valor: 'Sim' },
    
    // Filtros Especiais
    'todos': { campo: 'status', valor: 'Ativo' }, 
    'novos_no_mes': { campo: 'dataCad', valor: 'ultimos_30_dias' }, 
};

// ⭐️ EXPORTAÇÃO PADRÃO ÚNICA AQUI ⭐️
export default function Dashboard() {
    const [dashboardData, setDashboardData] = useState<DashboardApiDataType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({ mes: "", tecRef: "", bairro: "" });
    const [filterOptions, setFilterOptions] = useState<{ meses: string[], tecnicos: string[], bairros: string[] }>({ meses: [], tecnicos: [], bairros: [] });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    // ⭐️ Usando CaseListEntry ⭐️
    const [modalCases, setModalCases] = useState<CaseListEntry[]>([]);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isPresentationMode, setIsPresentationMode] = useState(false);
    const dashboardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function loadDashboardData() {
            setIsLoading(true);
            try {
                const response: ApiResponse = await getDashboardData(filters);
                setDashboardData(response.dados);
                setFilterOptions(response.opcoesFiltro);
            } catch (error: any) {
                toast.error(`Erro ao carregar dados do dashboard: ${error.message}`);
                setDashboardData(null);
            } finally {
                setIsLoading(false);
            }
        }
        loadDashboardData();
    }, [filters]);
    
    /**
     * Lógica unificada para "drill-down" (abrir modal com a lista filtrada).
     */
    const handleDrillDown = async (action: string, valor: string | null = null, title: string) => {
        setModalTitle(title);
        setIsModalOpen(true);
        setIsModalLoading(true);
        setModalCases([]);

        const map = CARD_FILTERS_MAP[action];

        let filtroParam: string | undefined = undefined;
        let valorParam: string | undefined = undefined;

        if (map) {
            // Caso 1: Cards de Indicadores (Mapeamento Fixo)
            filtroParam = map.campo;
            valorParam = map.valor || valor || undefined;
        } else {
            // Caso 2: Gráficos e Filtros Dinâmicos ('bairro', 'sexo', 'por_violencia', etc.)
            filtroParam = action;
            valorParam = valor || undefined;
        }

        try {
            // ⭐️ getCasosFiltrados retorna CaseListEntry[] ⭐️
            const data: CaseListEntry[] = await getCasosFiltrados({ 
                filtro: filtroParam, 
                valor: valorParam, 
                ...filters, // Mantém os filtros de Mês/Técnico/Bairro aplicados
                origem: 'dashboard' 
            });
            setModalCases(data);
        } catch (err: any) {
            toast.error(`Erro ao buscar a lista de casos: ${err.message}`);
        } finally {
            setIsModalLoading(false);
        }
    };
    
    const renderValue = (value: number | string | null | undefined) => { 
        if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-slate-400" />; 
        if (value === null || value === undefined) return typeof value === 'number' ? 0 : 'N/A';
        return value;
    };
    
    const togglePresentationMode = () => { 
        const elem = dashboardRef.current; 
        if (!elem) return; 
        if (!document.fullscreenElement) { 
            elem.requestFullscreen().catch(err => { toast.error(`Erro ao entrar em tela cheia: ${err.message}`); }); 
        } else { 
            document.exitFullscreen(); 
        } 
    };

    useEffect(() => { 
        const handleFullscreenChange = () => { setIsPresentationMode(!!document.fullscreenElement); }; 
        document.addEventListener('fullscreenchange', handleFullscreenChange); 
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange); 
    }, []);

    const handleFilterChange = (filterName: 'mes' | 'tecRef' | 'bairro', value: string) => {
        setFilters(currentFilters => ({
            ...currentFilters,
            [filterName]: value === 'todos' ? '' : value
        }));
    };

    return (
        <div ref={dashboardRef} className={`space-y-6 dashboard-container ${isPresentationMode ? 'presentation-mode' : ''}`}>
            <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Dashboard PAEFI</h1>
                    <p className="text-slate-500">Análise de dados, perfil dos atendidos e fluxo dos serviços.</p>
                </div>
                <Button variant="outline" size="sm" onClick={togglePresentationMode} title="Ativar/Desativar Modo Apresentação">
                    {isPresentationMode ? <Minimize className="mr-2 h-4 w-4" /> : <Presentation className="mr-2 h-4 w-4" />}
                    {isPresentationMode ? 'Sair' : 'Apresentar'}
                </Button>
            </div>

            <Card className="card-filtros">
                <CardHeader><CardTitle className="text-base">Filtros de Análise</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap items-end gap-4">
                    <div className="grid gap-1.5">
                        <Label className="text-sm font-medium">Período (Mês/Ano)</Label>
                        <Select value={filters.mes || 'todos'} onValueChange={val => handleFilterChange('mes', val)}>
                            <SelectTrigger className="w-auto min-w-[180px]"><SelectValue placeholder="Todos os Períodos" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os Períodos</SelectItem>
                                {filterOptions.meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-sm font-medium">Técnico de Referência</Label>
                        <Select value={filters.tecRef || 'todos'} onValueChange={val => handleFilterChange('tecRef', val)}>
                            <SelectTrigger className="w-auto min-w-[180px]"><SelectValue placeholder="Todos os Técnicos" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os Técnicos</SelectItem>
                                {filterOptions.tecnicos.map(tec => <SelectItem key={tec} value={tec}>{tec}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-sm font-medium">Bairro</Label>
                        <Select value={filters.bairro || 'todos'} onValueChange={val => handleFilterChange('bairro', val)}>
                            <SelectTrigger className="w-auto min-w-[180px]"><SelectValue placeholder="Todos os Bairros" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os Bairros</SelectItem>
                                {filterOptions.bairros.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button variant="ghost" onClick={() => setFilters({ mes: "", tecRef: "", bairro: "" })}>Limpar Filtros</Button>
                </CardContent>
            </Card>

            <h2 className="text-lg font-semibold text-slate-700 pt-4">Visão Geral do Serviço</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card onClick={() => handleDrillDown("todos", null, "Total de Atendimentos")} className="cursor-pointer hover:border-blue-500 transition-all"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total de Atendimentos</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold kpi-value-large">{renderValue(dashboardData?.indicadores?.totalAtendimentos)}</div></CardContent></Card>
                <Card onClick={() => handleDrillDown("novos_no_mes", null, "Casos Novos no Mês")} className="cursor-pointer hover:border-green-500 transition-all"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Novos no Mês</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600 kpi-value-large">+{renderValue(dashboardData?.indicadores?.novosNoMes)}</div></CardContent></Card>
                <Card onClick={() => handleDrillDown("inseridos_paefi", null, "Casos Inseridos no PAEFI")} className="cursor-pointer hover:border-sky-500 transition-all"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Inseridos no PAEFI</CardTitle><UserCheck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold kpi-value-large">{renderValue(dashboardData?.indicadores?.inseridosPAEFI)}</div></CardContent></Card>
                <Card onClick={() => handleDrillDown("reincidentes", null, "Casos Reincidentes")} className="cursor-pointer hover:border-red-500 transition-all"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Casos Reincidentes</CardTitle><AlertTriangle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-600 kpi-value-large">{renderValue(dashboardData?.indicadores?.reincidentes)}</div></CardContent></Card>
            </div>
            <h2 className="text-lg font-semibold text-slate-700 pt-4">Perfil Socioeconômico</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card onClick={() => handleDrillDown("recebem_bolsa_familia", null, "Casos que Recebem Bolsa Família")} className="cursor-pointer hover:border-emerald-500 transition-all"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Recebem Bolsa Família</CardTitle><HandCoins className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold kpi-value-large">{renderValue(dashboardData?.indicadores?.recebemBolsaFamilia)}</div></CardContent></Card>
                <Card onClick={() => handleDrillDown("recebem_bpc", null, "Casos que Recebem BPC")} className="cursor-pointer hover:border-emerald-500 transition-all"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Recebem BPC</CardTitle><HandCoins className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold kpi-value-large">{renderValue(dashboardData?.indicadores?.recebemBPC)}</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Moradia Principal</CardTitle><Home className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-xl font-bold kpi-value-medium">{renderValue(dashboardData?.principais?.moradiaPrincipal)}</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Escolaridade Principal</CardTitle><BookOpen className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-xl font-bold kpi-value-medium">{renderValue(dashboardData?.principais?.escolaridadePrincipal)}</div></CardContent></Card>
            </div>
            <h2 className="text-lg font-semibold text-slate-700 pt-4">Indicadores de Violência</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Violência Principal</CardTitle><ShieldCheck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-xl font-bold kpi-value-medium">{renderValue(dashboardData?.principais?.violenciaPrincipal)}</div></CardContent></Card>
                <Card onClick={() => handleDrillDown("violencia_confirmada", null, "Casos com Violência Confirmada")} className="cursor-pointer hover:border-rose-500 transition-all"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Violência Confirmada</CardTitle><SearchCheck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600 kpi-value-large">{renderValue(dashboardData?.indicadores?.violenciaConfirmada)}</div></CardContent></Card>
                <Card onClick={() => handleDrillDown("notificados_sinan", null, "Casos Notificados no SINAN")} className="cursor-pointer hover:border-violet-500 transition-all"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Notificados no SINAN</CardTitle><HeartPulse className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold kpi-value-large">{renderValue(dashboardData?.indicadores?.notificadosSINAN)}</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Local Principal</CardTitle><Building className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-xl font-bold kpi-value-medium">{renderValue(dashboardData?.principais?.localPrincipal)}</div></CardContent></Card>
            </div>
            <h2 className="text-lg font-semibold text-slate-700 pt-4">Contexto Familiar</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card onClick={() => handleDrillDown("dependencia_financeira", null, "Casos com Dependência Financeira")} className="cursor-pointer hover:border-amber-500 transition-all"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Dependência Financeira</CardTitle><HandCoins className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold kpi-value-large">{renderValue(dashboardData?.indicadores?.contextoFamiliar?.dependenciaFinanceira)}</div></CardContent></Card>
                <Card onClick={() => handleDrillDown("vitima_pcd", null, "Casos com Vítima PCD")} className="cursor-pointer hover:border-amber-500 transition-all"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Vítima é PCD</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold kpi-value-large">{renderValue(dashboardData?.indicadores?.contextoFamiliar?.vitimaPCD)}</div></CardContent></Card>
                <Card onClick={() => handleDrillDown("membro_carcerario", null, "Casos com Membro em Sist. Carcerário")} className="cursor-pointer hover:border-amber-500 transition-all"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Membro em Sist. Carcerário</CardTitle><Briefcase className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold kpi-value-large">{renderValue(dashboardData?.indicadores?.contextoFamiliar?.membroCarcerario)}</div></CardContent></Card>
                <Card onClick={() => handleDrillDown("membro_socioeducacao", null, "Casos com Membro em Socioeducação")} className="cursor-pointer hover:border-amber-500 transition-all"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Membro em Socioeducação</CardTitle><Briefcase className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold kpi-value-large">{renderValue(dashboardData?.indicadores?.contextoFamiliar?.membroSocioeducacao)}</div></CardContent></Card>
            </div>
            <h2 className="text-lg font-semibold text-slate-700 pt-4">Análise Gráfica</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* GRÁFICOS INALTERADOS, USANDO LOGICA DE DRILLDOWN CORRIGIDA */}
                <Card className="lg:col-span-2"><CardHeader><CardTitle>Casos por Bairro (Top 5)</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart layout="vertical" data={dashboardData?.graficos?.casosPorBairro ?? []} margin={{ left: 50 }}><XAxis type="number" /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} /><Tooltip formatter={(value: number) => `${value} casos`}/><Bar dataKey="value" fill="#2563eb" onClick={(data: any) => handleDrillDown('por_bairro', data.name, `Casos no Bairro: ${data.name}`)} cursor="pointer" /></BarChart></ResponsiveContainer></CardContent></Card>
                
                <Card><CardHeader><CardTitle>Tipos de Violação</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><PieChart><Tooltip formatter={(value: number) => `${value} casos`} /><Pie data={dashboardData?.graficos?.tiposViolacao ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} onClick={(data: any) => handleDrillDown('por_violencia', data.name, `Casos de Violência: ${data.name}`)} cursor="pointer">{(dashboardData?.graficos?.tiposViolacao ?? []).map((_item: any, i: number) => <Cell key={`cell-v-${i}`} fill={COLORS[i % COLORS.length]} />)}</Pie></PieChart></ResponsiveContainer></CardContent></Card>
                
                <Card className="lg:col-span-2"><CardHeader><CardTitle>Encaminhamentos Realizados (Top 5)</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={dashboardData?.graficos?.encaminhamentosTop5 ?? []} margin={{ left: 20 }}><XAxis dataKey="name" tick={{ fontSize: 10, angle: -20, textAnchor: 'end' }} height={50} /><YAxis /><Tooltip formatter={(value: number) => `${value} casos`}/><Bar dataKey="value" fill="#16a34a" /></BarChart></ResponsiveContainer></CardContent></Card>
                
                <Card><CardHeader><CardTitle>Casos por Sexo</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><PieChart><Tooltip formatter={(value: number) => `${value} casos`} /><Pie data={dashboardData?.graficos?.casosPorSexo ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} onClick={(data: any) => handleDrillDown('sexo', data.name, `Casos por Sexo: ${data.name}`)} cursor="pointer">{(dashboardData?.graficos?.casosPorSexo ?? []).map((_item: any, i: number) => <Cell key={`cell-s-${i}`} fill={COLORS[i % COLORS.length]} />)}</Pie></PieChart></ResponsiveContainer></CardContent></Card>
                
                <Card className="lg:col-span-3"><CardHeader><CardTitle>Canal de Denúncia</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><PieChart><Tooltip formatter={(value: number) => `${value} casos`}/><Pie data={dashboardData?.graficos?.canalDenuncia ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label onClick={(data: any) => handleDrillDown('canalDenuncia', data.name, `Casos por Canal de Denúncia: ${data.name}`)} cursor="pointer">{(dashboardData?.graficos?.canalDenuncia ?? []).map((_item: any, i: number) => <Cell key={`cell-canal-${i}`} fill={COLORS[i % COLORS.length]} />)}</Pie></PieChart></ResponsiveContainer></CardContent></Card>
                
                <Card><CardHeader><CardTitle>Casos por Cor/Etnia</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><PieChart><Tooltip formatter={(value: number) => `${value} casos`} /><Pie data={dashboardData?.graficos?.casosPorCor ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} onClick={(data: any) => handleDrillDown('corEtnia', data.name, `Casos por Cor/Etnia: ${data.name}`)} cursor="pointer">{(dashboardData?.graficos?.casosPorCor ?? []).map((_item: any, i: number) => <Cell key={`cell-cor-${i}`} fill={COLORS[i % COLORS.length]} />)}</Pie></PieChart></ResponsiveContainer></CardContent></Card>
                
                <Card className="lg:col-span-2"><CardHeader><CardTitle>Casos por Faixa Etária</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={dashboardData?.graficos?.casosPorFaixaEtaria ?? []}><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis /><Tooltip formatter={(value: number) => `${value} casos`}/><Bar dataKey="value" fill="#9333ea" onClick={(data: any) => handleDrillDown('por_faixa_etaria', data.name, `Casos por Faixa Etária: ${data.name}`)} cursor="pointer" /></BarChart></ResponsiveContainer></CardContent></Card>
            </div>
            
            <ListaCasosModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalTitle}
                cases={modalCases}
                isLoading={isModalLoading}
            />
        </div>
    );
};
