// frontend/src/services/api.ts (VERSÃO FINAL COM listCrasCases CORRIGIDA)

const API_BASE_URL = "http://localhost:4000";
const CRAS_BASE_URL = '/api/cras'; 

// -------------------------------------------------------------------
// --- TIPOS DE DADOS E INTERFACES BASE (MANTIDOS) ---
// -------------------------------------------------------------------

export interface FiltrosBase {
    mes?: string;
    tecRef?: string;
    bairro?: string;
    unidades?: string; 
    isFiltroTotal?: boolean; 
}

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

export interface FiltrosCasos extends FiltrosBase { 
    filtro?: string; 
    valor?: string; 
    status?: string;
    origem?: 'vigilancia' | 'dashboard' | 'consulta' | 'cras';
}

export interface DemandaResumida {
    id: number; tipo_documento: string; instituicao_origem: string; data_recebimento: string; status: string;
}

export interface CasoDetalhado {
    id: number; nome: string; dataCad: string; tecRef: string; status: string;
    [key: string]: any; 
    demandasVinculadas: DemandaResumida[];
    unit_id: number; 
}
export interface Demanda {
    id: number; tipo_documento: string; instituicao_origem: string; data_recebimento: string; prazo_resposta?: string; 
    status: string; nome_caso?: string; caso_id?: number; tecnico_designado: string; registrado_por: string;
}

export interface DemandaDetalhada extends Demanda {
    numero_documento?: string; assunto?: string; caso_associado_id?: number; tecnico_designado_id: number; 
    registrado_por_id: number; created_at: string; anexos: Anexo[];
}

export interface CasoListagem {
    id: number;
    dataCad: string;
    tecRef: string;
    nome: string;
    status: string;
    unit_id: number;
    bairro: string;
}


// -------------------------------------------------------------------
// 📌 FUNÇÃO MESTRE: fetchWithAuth (CORRIGIDA PARA TRATAMENTO ROBUSTO DE ERRO)
// -------------------------------------------------------------------

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    
    if (!token) throw new Error('UNAUTHORIZED_SESSION_EXPIRED'); 
    
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    
    if (!(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    
    if (!response.ok) {
        
        if (response.status === 401) {
            throw new Error('UNAUTHORIZED_SESSION_EXPIRED'); 
        }
        if (response.status === 403) {
            throw new Error('FORBIDDEN_PERMISSION_DENIED'); 
        }
        
        // 🛑 CORREÇÃO CRÍTICA: Tenta ler o JSON, mas usa o status text se o corpo estiver vazio/inválido
        const contentType = response.headers.get('content-type');
        let errorData;

        if (contentType && contentType.includes('application/json')) {
            try {
                errorData = await response.json();
            } catch (e) {
                // Se falhar ao ler JSON (corpo vazio/malformado), usa uma mensagem padrão
                errorData = { message: `Erro ${response.status}: Falha de comunicação/JSON vazio.` };
            }
        } else {
            // Se não é JSON (ex: HTML de erro), usa a mensagem padrão de status
            errorData = { message: `Erro ${response.status}: ${response.statusText}` };
        }
        
        throw new Error(errorData.message || 'Ocorreu um erro na requisição');
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('application/pdf') || contentType.includes('application/octet-stream'))) {
        return response;
    }
    return response.json();
}

// 🟢 Função auxiliar para adicionar parâmetros de filtro
const appendFiltros = (filters?: FiltrosBase): string => {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                params.append(key, String(value));
            }
        });
    }
    return `?${params.toString()}`;
};


// -------------------------------------------------------------------
// --- FUNÇÕES DA API (CRUD PADRÃO) ---
// -------------------------------------------------------------------

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
export const createCase = (casoData: any) => fetchWithAuth(`/api/casos`, { method: 'POST', body: JSON.stringify(casoData) });
export const updateCase = (id: number | string, casoData: any) => fetchWithAuth(`/api/casos/${id}`, { method: 'PUT', body: JSON.stringify(casoData) });
export const updateCasoStatus = (casoId: string | number, status: string) => fetchWithAuth(`/api/casos/${casoId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const deleteCaso = (casoId: string | number) => fetchWithAuth(`/api/casos/${casoId}`, { method: 'DELETE' });
export const getCasoById = (id: string): Promise<CasoDetalhado> => fetchWithAuth(`/api/casos/${id}`);

// 🛑 CORRIGIDO: Função de Listagem CRAS agora aceita filtros
export const listCrasCases = (filters?: { unitId?: string }): Promise<CasoListagem[]> => {
    // Monta o parâmetro de query se o unitId for fornecido
    const params = filters?.unitId ? `?unitId=${filters.unitId}` : '';
    
    // A rota deve ser chamada com o filtro: /api/cras/casos?unitId=3
    return fetchWithAuth(`${CRAS_BASE_URL}/casos${params}`);
};


// -------------------------------------------------------------------
// --- FUNÇÕES DA API (DEMANDAS, DASHBOARD, VIGILÂNCIA, MSE) ---
// -------------------------------------------------------------------
// ... (O restante das funções API MSE, DASHBOARD, etc. permanecem inalteradas)
export const getCasosFiltrados = (filters?: FiltrosCasos): Promise<any[]> => {
    let endpoint = '/api/casos'; 
    if (filters?.origem === 'vigilancia') {
        endpoint = '/api/vigilancia/casos-filtrados'; 
    }

    const paramsString = appendFiltros(filters);
    return fetchWithAuth(`${endpoint}${paramsString}`);
};

export const searchCasosByTerm = (searchTerm: string): Promise<any[]> => {
    const params = new URLSearchParams({ q: searchTerm });
    return fetchWithAuth(`/api/casos?${params.toString()}`);
};

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

// USUÁRIOS
export const getUsers = () => fetchWithAuth(`/api/users`);
export const createUser = (data: object) => fetchWithAuth(`/api/users`, { method: 'POST', body: JSON.stringify(data) });
export const updateUser = (id: number, data: object) => fetchWithAuth(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const updateUserStatus = (id: number, isActive: boolean) => fetchWithAuth(`/api/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
export const reassignUserCases = (fromUserId: number, toUserId: number) => fetchWithAuth(`/api/users/reatribuir`, { method: 'POST', body: JSON.stringify({ fromUserId, toUserId }) });

// RELATÓRIOS
export async function generateReport(filters: { startDate: string, endDate: string }): Promise<Blob> {
    const response = await fetchWithAuth(`/api/relatorios/geral`, { method: 'POST', body: JSON.stringify(filters) }) as Response;
    return response.blob();
}

// DASHBOARD
export const getDashboardData = (filters?: FiltrosCasos) => fetchWithAuth(`/api/dashboard${appendFiltros(filters)}`);

// PAINEL DE VIGILÂNCIA
export const getVigilanciaFluxoDemanda = (filters?: FiltrosBase) => fetchWithAuth(`/api/vigilancia/fluxo-demanda${appendFiltros(filters)}`);
export const getVigilanciaSobrecargaEquipe = (filters?: FiltrosBase) => fetchWithAuth(`/api/vigilancia/sobrecarga-equipe${appendFiltros(filters)}`);
export const getVigilanciaIncidenciaBairros = (filters?: FiltrosBase) => fetchWithAuth(`/api/vigilancia/incidencia-bairros${appendFiltros(filters)}`);
export const getVigilanciaFontesAcionamento = (filters?: FiltrosBase) => fetchWithAuth(`/api/vigilancia/fontes-acionamento${appendFiltros(filters)}`);
export const getVigilanciaTaxaReincidencia = (filters?: FiltrosBase) => fetchWithAuth(`/api/vigilancia/taxa-reincidencia${appendFiltros(filters)}`);
export const getVigilanciaPerfilViolacoes = (filters?: FiltrosCasos) => fetchWithAuth(`/api/vigilancia/perfil-violacoes${appendFiltros(filters)}`);

// DEMANDAS, MSE
export const getDemandas = (): Promise<Demanda[]> => fetchWithAuth(`/api/demandas`);
export const createDemanda = (demandaData: object) => fetchWithAuth(`/api/demandas`, { method: 'POST', body: JSON.stringify(demandaData) });
export const getDemandaById = (id: string | number): Promise<DemandaDetalhada> => fetchWithAuth(`/api/demandas/${id}`);
export const updateDemandaStatus = (id: string | number, status: string) => fetchWithAuth(`/api/demandas/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

export const getMseRegistros = (filters?: { q?: string }) => {
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