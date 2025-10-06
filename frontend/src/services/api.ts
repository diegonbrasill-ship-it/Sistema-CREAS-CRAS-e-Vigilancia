// frontend/src/services/api.ts

const API_BASE_URL = "http://localhost:4000";

// --- TIPOS DE DADOS E INTERFACES ---
// FIX CRÍTICO: Interface de Login COMPLETA (sincroniza com o JWT do Back-end)
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
    dataUpload: string;
}

export interface User {
    id: number;
    username: string;
    role: string;
    nome_completo: string;
    cargo: string;
    is_active: boolean;
    unit_id: number | null; // Permite NULL para Gestor Geral
}

// 📌 NOVAS INTERFACES PARA MSE (Medida Socioeducativa)
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


// Interfaces de Dashboard e Casos (MANTIDAS)
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

export interface FiltrosCasos { 
    filtro?: string; valor?: string; 
    tecRef?: string; mes?: string; status?: string;
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

// Função "Mestre" fetchWithAuth
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

// CASOS
export const createCase = (casoData: any) => fetchWithAuth('/api/casos', { method: 'POST', body: JSON.stringify(casoData) });
export const updateCase = (id: number | string, casoData: any) => fetchWithAuth(`/api/casos/${id}`, { method: 'PUT', body: JSON.stringify(casoData) });
export const updateCasoStatus = (casoId: string | number, status: string) => fetchWithAuth(`/api/casos/${casoId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const deleteCaso = (casoId: string | number) => fetchWithAuth(`/api/casos/${casoId}`, { method: 'DELETE' });
export const getCasoById = (id: string): Promise<CasoDetalhado> => fetchWithAuth(`/api/casos/${id}`);
export const getCasosFiltrados = (filters?: FiltrosCasos): Promise<any[]> => {
    const params = new URLSearchParams();
    if (filters) {
        if (filters.filtro) params.append('filtro', filters.filtro);
        if (filters.valor) params.append('valor', filters.valor);
        if (filters.tecRef) params.append('tecRef', filters.tecRef);
        if (filters.mes) params.append('mes', filters.mes);
        if (filters.status) params.append('status', filters.status); 
    }
    return fetchWithAuth(`/api/casos?${params.toString()}`);
};
export const searchCasosByTerm = (searchTerm: string): Promise<any[]> => {
    const params = new URLSearchParams({ q: searchTerm });
    return fetchWithAuth(`/api/casos?${params.toString()}`);
};

// ACOMPANHAMENTOS
export const getAcompanhamentos = (casoId: string) => fetchWithAuth(`/api/acompanhamentos/${casoId}`);
export const createAcompanhamento = (casoId: string, texto: string) => fetchWithAuth(`/api/acompanhamentos/${casoId}`, { method: 'POST', body: JSON.stringify({ texto }) });

// ENCAMINHAMENTOS
export const getEncaminhamentos = (casoId: string) => fetchWithAuth(`/api/casos/${casoId}/encaminhamentos`);
export const createEncaminhamento = (data: object) => fetchWithAuth('/api/encaminhamentos', { method: 'POST', body: JSON.stringify(data) });
export const updateEncaminhamento = (id: number, data: object) => fetchWithAuth(`/api/encaminhamentos/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// ANEXOS
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

// USUÁRIOS
export const getUsers = () => fetchWithAuth('/api/users');
export const createUser = (data: object) => fetchWithAuth('/api/users', { method: 'POST', body: JSON.stringify(data) });
export const updateUser = (id: number, data: Partial<User>) => fetchWithAuth(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const updateUserStatus = (id: number, isActive: boolean) => fetchWithAuth(`/api/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
export const reassignUserCases = (fromUserId: number, toUserId: number) => fetchWithAuth('/api/users/reatribuir', { method: 'POST', body: JSON.stringify({ fromUserId, toUserId }) });
// RELATÓRIOS
export async function generateReport(filters: { startDate: string, endDate: string }): Promise<Blob> {
    const response = await fetchWithAuth('/api/relatorios/geral', { method: 'POST', body: JSON.stringify(filters) }) as Response;
    return response.blob();
}

// DASHBOARD
export const getDashboardData = (filters?: { mes?: string, tecRef?: string, bairro?: string }): Promise<ApiResponse> => {
    const params = new URLSearchParams();
    if (filters?.mes) params.append('mes', filters.mes);
    if (filters?.tecRef) params.append('tecRef', filters.tecRef);
    if (filters?.bairro) params.append('bairro', filters.bairro);
    return fetchWithAuth(`/api/dashboard?${params.toString()}`);
};

// PAINEL DE VIGILÂNCIA
export const getVigilanciaFluxoDemanda = () => fetchWithAuth('/api/vigilancia/fluxo-demanda');
export const getVigilanciaSobrecargaEquipe = () => fetchWithAuth('/api/vigilancia/sobrecarga-equipe');
export const getVigilanciaIncidenciaBairros = () => fetchWithAuth('/api/vigilancia/incidencia-bairros');
export const getVigilanciaFontesAcionamento = () => fetchWithAuth('/api/vigilancia/fontes-acionamento');
export const getVigilanciaTaxaReincidencia = () => fetchWithAuth('/api/vigilancia/taxa-reincidencia');
export const getVigilanciaPerfilViolacoes = () => fetchWithAuth('/api/vigilancia/perfil-violacoes');

// DEMANDAS
export const getDemandas = (): Promise<Demanda[]> => fetchWithAuth('/api/demandas');
export const createDemanda = (demandaData: object): Promise<any> => fetchWithAuth('/api/demandas', { method: 'POST', body: JSON.stringify(demandaData) });
export const getDemandaById = (id: string | number): Promise<DemandaDetalhada> => fetchWithAuth(`/api/demandas/${id}`);
export const updateDemandaStatus = (id: string | number, status: string): Promise<any> => fetchWithAuth(`/api/demandas/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

// 📌 NOVO MÓDULO: CONTROLE MSE
export const getMseRegistros = (filters?: { q?: string }): Promise<MseApiResponse> => {
    const params = new URLSearchParams();
    if (filters?.q) params.append('q', filters.q);
    return fetchWithAuth(`/api/mse/registros?${params.toString()}`);
}

// 📌 FIX CRÍTICO: Implementação do unit_id no payload
export const createMseRegistro = (data: MseRegistroBody): Promise<{ message: string; registroId: number }> => {
    try {
        const userData = localStorage.getItem('user');
        let unit_id: number | null = null;
        if (userData) {
            const parsed = JSON.parse(userData);
            if (parsed?.unit_id) unit_id = Number(parsed.unit_id);
        }

        // 🚨 FIX: Injetar unit_id no payload antes de enviar (resolve o erro 'User Unit: undefined')
        const payload = { ...data, unit_id }; 

        return fetchWithAuth('/api/mse/registros', { 
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