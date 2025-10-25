// frontend/src/services/api.ts

const API_BASE_URL = "http://localhost:4000";

// 🟢 NOVO: Interface base para os filtros de Dashboards/PainelVigilancia/Consultas.
// Esta interface resolve os erros de tipagem "unidades does not exist"
export interface FiltrosBase {
    mes?: string;
    tecRef?: string;
    bairro?: string;

    // Filtros de Unidade (NOVOS CAMPOS)
    unidades?: string; // Lista de IDs separadas por vírgula (dashboardFilterUnits.join(','))
    isFiltroTotal?: boolean; // Flag para Gestor Geral
}


// --- TIPOS DE DADOS E INTERFACES ---
type LoginResponse = {
    message: string;
    token: string;
    user: {
        id: number;
        username: string;
        role: string;
        nome_completo: string;
        cargo: string;
        is_active: boolean;
        unit_id: number;
    };
};
type ChartData = { name: string; value: number; };

export interface Anexo {
    id: number;
    nomeOriginal: string;
    tamanhoArquivo?: number;
    dataUpload: string;
    descricao?: string;
    uploadedBy?: string;
}

export interface User {
    id: number;
    username: string;
    role: string;
    nome_completo: string;
    cargo: string;
    is_active: boolean;
    unit_id: number | null;
}

// ... (MseTipo, MseSituacao e interfaces MSE mantidas) ...

export type MseTipo = 'LA' | 'PSC' | 'LA + PSC';
export type MseSituacao = 'CUMPRIMENTO' | 'DESCUMPRIMENTO';

export interface MseRegistroBody {
    nome_adolescente: string; data_nascimento: string; responsavel?: string; endereco?: string; contato?: string; nis?: string;
    mse_tipo: MseTipo; mse_data_inicio: string; mse_duracao_meses: number; situacao: MseSituacao;
    local_descumprimento?: string; pia_data_elaboracao?: string; pia_status?: string;
}

export interface MseRegistroResumido {
    id: number; nome_adolescente: string; data_nascimento: string; idade_atual: number; mse_tipo: MseTipo;
    mse_data_inicio: string; situacao: MseSituacao; registrado_por: string; mse_data_final?: string;
}

export interface MseKpis {
    total_medidas: string;
    total_cumprimento: string;
    total_descumprimento: string;
    expirando_em_60_dias: string;
}

export interface MseApiResponse {
    registros: MseRegistroResumido[];
    kpis: MseKpis;
}


// Interfaces de Dashboard
export interface DashboardApiDataType {
    indicadores: {
        totalAtendimentos: number; novosNoMes: number; inseridosPAEFI: number; reincidentes: number;
        recebemBolsaFamilia: number; recebemBPC: number; violenciaConfirmada: number; notificadosSINAN: number;
        contextoFamiliar: { dependenciaFinanceira: number; vitimaPCD: number; membroCarcerario: number; membroSocioeducacao: number; };
    };
    principais: { moradiaPrincipal: string; escolaridadePrincipal: string; violenciaPrincipal: string; localPrincipal: string; };
    graficos: { tiposViolacao: ChartData[]; casosPorBairro: ChartData[]; casosPorSexo: ChartData[]; encaminhamentosTop5: ChartData[]; canalDenuncia: ChartData[]; casosPorCor: ChartData[]; casosPorFaixaEtaria: ChartData[]; };
}
export interface ApiResponse {
    dados: DashboardApiDataType;
    opcoesFiltro: { meses: string[]; tecnicos: string[]; bairros: string[]; };
}

// ✅ CORREÇÃO 1: Interface FiltrosCasos agora estende FiltrosBase
export interface FiltrosCasos extends FiltrosBase {
    filtro?: string;
    valor?: string;
    status?: string;
    origem?: 'vigilancia' | 'dashboard' | 'consulta'; // Propriedade para direcionar o endpoint
}

export interface DemandaResumida {
    id: number; tipo_documento: string; instituicao_origem: string; data_recebimento: string; status: string;
}

export interface CasoDetalhado {
    id: number; nome: string; dataCad: string; tecRef: string; status: string;
    [key: string]: any;
    demandasVinculadas: DemandaResumida[];
}
export interface Demanda {
    id: number; tipo_documento: string; instituicao_origem: string; data_recebimento: string; prazo_resposta?: string;
    status: string; nome_caso?: string; caso_id?: number; tecnico_designado: string; registrado_por: string;
}

export interface DemandaDetalhada extends Demanda {
    numero_documento?: string; assunto?: string; caso_associado_id?: number; tecnico_designado_id: number;
    registrado_por_id: number; created_at: string; anexos: Anexo[];
}

// Função "Mestre" fetchWithAuth (mantida)
async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Usuário não autenticado. Por favor, faça o login novamente.');
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (!(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Erro ${response.status}: ${response.statusText}` }));
        throw new Error(errorData.message || 'Ocorreu um erro na requisição');
    }
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('application/pdf') || contentType.includes('application/octet-stream'))) {
        return response;
    }
    return response.json();
}

// 🟢 Função auxiliar para adicionar parâmetros de filtro à URL (Usada nas funções de Dashboard e Vigilância)
const appendFiltros = (filters?: FiltrosBase): string => {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            // Garante que apenas valores não nulos/vazios sejam anexados
            if (value !== null && value !== undefined && value !== '') {
                params.append(key, String(value));
            }
        });
    }
    return `?${params.toString()}`;
};

// --- FUNÇÕES DA API ---

// AUTENTICAÇÃO
export async function login(username: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erro de autenticação');
    return data;
}

// CASOS (Funções base mantidas)
export const createCase = (casoData: any) => fetchWithAuth(`/api/casos`, { method: 'POST', body: JSON.stringify(casoData) });
export const updateCase = (id: number | string, casoData: any) => fetchWithAuth(`/api/casos/${id}`, { method: 'PUT', body: JSON.stringify(casoData) });
export const updateCasoStatus = (casoId: string | number, status: string) => fetchWithAuth(`/api/casos/${casoId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const deleteCaso = (casoId: string | number) => fetchWithAuth(`/api/casos/${casoId}`, { method: 'DELETE' });
export const getCasoById = (id: string): Promise<CasoDetalhado> => fetchWithAuth(`/api/casos/${id}`);

// ✅ CORREÇÃO 2: getCasosFiltrados agora aceita FiltrosCasos
export const getCasosFiltrados = (filters?: FiltrosCasos): Promise<any[]> => {
    // ⭐️ Determinar o endpoint
    let endpoint = '/api/casos'; // Padrão: Dashboard/Consulta
    if (filters?.origem === 'vigilancia') {
        endpoint = '/api/vigilancia/casos-filtrados'; // Rota para o Painel de Vigilância
    }

    // Garante que os parâmetros de filtro (incluindo unidades) sejam anexados
    const paramsString = appendFiltros(filters);

    return fetchWithAuth(`${endpoint}${paramsString}`);
};

export const searchCasosByTerm = (searchTerm: string): Promise<any[]> => {
    const params = new URLSearchParams({ q: searchTerm });
    return fetchWithAuth(`/api/casos?${params.toString()}`);
};

// ACOMPANHAMENTOS, ENCAMINHAMENTOS, ANEXOS (MANTIDAS)
export const getAcompanhamentos = (casoId: string) => fetchWithAuth(`/api/acompanhamentos/${casoId}`);
export const createAcompanhamento = (casoId: string, texto: string) => fetchWithAuth(`/api/acompanhamentos/${casoId}`, { method: 'POST', body: JSON.stringify({ texto }) });
export const getEncaminhamentos = (casoId: string) => fetchWithAuth(`/api/casos/${casoId}/encaminhamentos`);
export const createEncaminhamento = (data: object) => fetchWithAuth(`/api/encaminhamentos`, { method: 'POST', body: JSON.stringify(data) });
export const updateEncaminhamento = (id: number, data: object) => fetchWithAuth(`/api/encaminhamentos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const getAnexosByCasoId = (casoId: string) => fetchWithAuth(`/api/anexos/casos/${casoId}`);
export const uploadAnexoParaCaso = (casoId: string | number, formData: FormData) => fetchWithAuth(`/api/anexos/upload/caso/${casoId}`, { method: 'POST', body: formData });
export const uploadAnexoParaDemanda = (demandaId: string | number, formData: FormData) => fetchWithAuth(`/api/anexos/upload/demanda/${demandaId}`, { method: 'POST', body: formData });

export async function downloadAnexo(anexoId: number): Promise<{ blob: Blob, filename: string }> {
    const response = await fetchWithAuth(`/api/anexos/download/${anexoId}`) as Response;
    const disposition = response.headers.get('content-disposition');
    let filename = 'arquivo_anexo';
    if (disposition?.includes('attachment')) {
        const filenameMatch = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (filenameMatch?.[1]) {
            filename = filenameMatch[1].replace(/['"]/g, '');
        }
    }
    const blob = await response.blob();
    return { blob, filename };
}

// USUÁRIOS (MANTIDAS)
export const getUsers = () => fetchWithAuth(`/api/users`);
export const createUser = (data: object) => fetchWithAuth(`/api/users`, { method: 'POST', body: JSON.stringify(data) });
export const updateUser = (id: number, data: Partial<User>) => fetchWithAuth(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const updateUserStatus = (id: number, isActive: boolean) => fetchWithAuth(`/api/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
export const reassignUserCases = (fromUserId: number, toUserId: number) => fetchWithAuth(`/api/users/reatribuir`, { method: 'POST', body: JSON.stringify({ fromUserId, toUserId }) });

// RELATÓRIOS
export async function generateReport(filters: { startDate: string, endDate: string }): Promise<Blob> {
    const response = await fetchWithAuth(`/api/relatorios/geral`, { method: 'POST', body: JSON.stringify(filters) }) as Response;
    return response.blob();
}

// DASHBOARD
// ✅ CORREÇÃO 3: getDashboardData agora aceita FiltrosBase
export const getDashboardData = (filters?: FiltrosBase): Promise<ApiResponse> => {
    // 🟢 Utiliza a função auxiliar para anexar todos os filtros (incluindo unidades)
    const paramsString = appendFiltros(filters);
    return fetchWithAuth(`/api/dashboard${paramsString}`);
};

// PAINEL DE VIGILÂNCIA
// ✅ CORREÇÃO 4: Funções de Vigilância agora aceitam FiltrosBase
export const getVigilanciaFluxoDemanda = (filters?: FiltrosBase) => fetchWithAuth(`/api/vigilancia/fluxo-demanda${appendFiltros(filters)}`);
export const getVigilanciaSobrecargaEquipe = (filters?: FiltrosBase) => fetchWithAuth(`/api/vigilancia/sobrecarga-equipe${appendFiltros(filters)}`);
export const getVigilanciaIncidenciaBairros = (filters?: FiltrosBase) => fetchWithAuth(`/api/vigilancia/incidencia-bairros${appendFiltros(filters)}`);
export const getVigilanciaFontesAcionamento = (filters?: FiltrosBase) => fetchWithAuth(`/api/vigilancia/fontes-acionamento${appendFiltros(filters)}`);
export const getVigilanciaTaxaReincidencia = (filters?: FiltrosBase) => fetchWithAuth(`/api/vigilancia/taxa-reincidencia${appendFiltros(filters)}`);
export const getVigilanciaPerfilViolacoes = (filters?: FiltrosBase) => fetchWithAuth(`/api/vigilancia/perfil-violacoes${appendFiltros(filters)}`);

// DEMANDAS, MSE (MANTIDAS)
export const getDemandas = (): Promise<Demanda[]> => fetchWithAuth(`/api/demandas`);
export const createDemanda = (demandaData: object): Promise<any> => fetchWithAuth(`/api/demandas`, { method: 'POST', body: JSON.stringify(demandaData) });
export const getDemandaById = (id: string | number): Promise<DemandaDetalhada> => fetchWithAuth(`/api/demandas/${id}`);
export const updateDemandaStatus = (id: string | number, status: string): Promise<any> => fetchWithAuth(`/api/demandas/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

// ... (Restante do código MSE mantido)
export const getMseRegistros = (filters?: { q?: string }): Promise<any> => {
    const params = new URLSearchParams();
    if (filters?.q) params.append('q', filters.q);
    return fetchWithAuth(`/api/mse/registros?${params.toString()}`);
}

export const createMseRegistro = (data: MseRegistroBody): Promise<{ message: string; registroId: number }> => {
    try {
        const userData = localStorage.getItem('user');
        let unit_id: number | null = null;
        if (userData) {
            const parsed = JSON.parse(userData);
            if (parsed?.unit_id) unit_id = Number(parsed.unit_id);
        }

        const payload = { ...data, unit_id };

        return fetchWithAuth(`/api/mse/registros`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    } catch (err) {
        console.error("Erro ao recuperar unit_id do usuário para MSE:", err);
        throw new Error("Falha ao incluir unidade do usuário na requisição MSE.");
    }
};

export const getMseRegistroById = (id: number): Promise<MseRegistroBody> =>
    fetchWithAuth(`/api/mse/registros/${id}`);