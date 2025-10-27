// frontend/src/services/api.ts
// ⭐️ ATUALIZAÇÃO: Adicionada interface e função para buscar dados de impressão do B.E.

const API_BASE_URL = "http://localhost:4000";
const CRAS_BASE_URL = '/api/cras'; 

// -------------------------------------------------------------------
// --- TIPOS DE DADOS E INTERFACEs BASE (PADRONIZAÇÃO CRÍTICA) ---
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
        cress?: string | null; // ⭐️ NOVO (B.E.)
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
    cress?: string | null; // ⭐️ NOVO (B.E.)
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
    q?: string; // Busca Geral
    origem?: 'vigilancia' | 'dashboard' | 'consulta' | 'cras';
}

export interface DemandaResumida {
    id: number; tipo_documento: string; instituicao_origem: string; data_recebimento: string; status: string;
}

// ⭐️ INTERFACE BASE PARA CASO ⭐️
export interface BaseCase {
    id: number; 
    nome: string; 
    dataCad: string; 
    tecRef: string; 
    status: string;
    unit_id: number; 
    nis: string | null;
    idade: number | null;
    sexo: string | null;
    corEtnia: string | null;
    primeiraInfSuas: string | null; 
    bairro: string | null;
    rua: string | null; 
    pontoReferencia: string | null; 
    contato: string | null;
    recebePropPai: string | null;
    recebePAA: string | null;
    recebeBPC: string | null;
    recebeHabitacaoSocial: string | null;
    escolaridade: string | null;
    rendaFamiliar: string | null;
    cpf?: string | null; 
    // Campos adicionais que podem vir do JSONB
    rg?: string | null; 
    dataNasc?: string | null; 
    [key: string]: any; 
}

// ⭐️ TIPO DE PAYLOAD PARA CRIAÇÃO/EDIÇÃO (Omite ID) ⭐️
export type CasePayload = Omit<BaseCase, 'id'>;

// ⭐️ INTERFACE REFATORADA 1: DETALHES ⭐️
export interface CaseDetail extends BaseCase {
    demandasVinculadas: DemandaResumida[];
}

// ⭐️ INTERFACE REFATORADA 2: LISTAGEM ⭐️
export interface CaseListEntry {
    id: number;
    dataCad: string;
    tecRef: string;
    nome: string;
    status: string;
    unit_id: number;
    bairro: string | null;
}

export interface Demanda {
    id: number; tipo_documento: string; instituicao_origem: string; data_recebimento: string; prazo_resposta?: string; 
    status: string; nome_caso?: string; caso_id?: number; tecnico_designado: string; registrado_por: string;
}

export interface DemandaDetalhada extends Demanda {
    numero_documento?: string; assunto?: string; caso_associado_id?: number; tecnico_designado_id: number; 
    registrado_por_id: number; created_at: string; anexos: Anexo[];
}

// ⭐️ NOVO (RMA Bloco G): Tipagem para o payload de Atividades Coletivas ⭐️
export interface AtividadeColetivaPayload {
    data_atividade: string;
    tipo_atividade: string;
    tema_grupo: string | null;
    publico_alvo: string | null;
    numero_participantes: number;
    descricao: string | null;
}

// ⭐️ NOVO (RMA Bloco G): Interface 'AtividadeListada' (corrigida) ⭐️
export interface AtividadeListada {
    id: number;
    data_atividade: string;
    tipo_atividade: string;
    tema_grupo: string | null;
    publico_alvo: string | null; 
    numero_participantes: number;
    descricao: string | null;
    registrado_por: string; 
}

// ⭐️ NOVO (RMA Geração): Interface para os dados do RMA (baseado no rma.ts) ⭐️
export interface RmaData {
    A3_novas_familias_paif: string;
    A3_1_novas_primeira_infancia: string;
    A3_2_novas_scfv: string;
    A4_desligadas_paif: string;
    A5_desistencias_paif: string;
    B1_pbf: string;
    B4_bpc: string;
    B5_trabalho_infantil: string;
    B6_membro_acolhimento: string;
    B8_acompanhamento_creas: string;
    C1_1_atend_paif: string;
    C1_2_atend_vd: string;
    C2_1_1_espontanea: string;
    C2_1_2_busca_ativa: string;
    C2_1_3_enc_rede_assist: string;
    C2_1_4_enc_outras_pol: string;
    C3_1_enc_cadunico: string;
    C8_documentacao_basica: string;
    D4_auxilio_natalidade: string;
    D5_auxilio_funeral: string;
    G1_1_grupo_gestantes: string | null;
    G1_2_grupo_bpc: string | null;
    G1_3_grupo_pbf: string | null;
    G1_4_grupo_outros: string | null;
    G2_scfv_0_6: string | null;
    G3_scfv_7_14: string | null;
    G4_scfv_15_17: string | null;
    G5_scfv_18_59: string | null;
    G7_scfv_idosos: string | null;
    G9_scfv_pcd: string | null;
    G10_eventos: string | null;
}

// ⭐️ ATUALIZADO (B.E.): Interface para Payload (baseado no REQUERIMENTO [cite: 20-41]) ⭐️
export interface BeneficioEventualPayload {
    caso_id: number;
    processo_numero?: string | null;
    data_solicitacao: string;
    beneficio_solicitado: string; // Ex: 'Vulnerabilidade Temporária'
    beneficio_subtipo?: string | null; // ⭐️ NOVO (Ex: 'Ajuda de Custo')
    breve_relato?: string | null;
    parecer_social: string;
    status_parecer: 'Deferido' | 'Indeferido';
    valor_concedido?: number | null;
    dados_bancarios?: string | null;
    observacao?: string | null; // ⭐️ NOVO

    // ⭐️ NOVOS (Dados do Requerente - [cite: 20-41]) ⭐️
    nome_requerente?: string | null;
    dn_requerente?: string | null; // Data de Nascimento (string 'YYYY-MM-DD')
    rg_requerente?: string | null;
    cpf_requerente?: string | null;
    nis_requerente?: string | null;
    endereco_requerente?: string | null;
    bairro_requerente?: string | null;
    ponto_referencia_requerente?: string | null;
    cidade_requerente?: string | null;
    telefone_requerente?: string | null;
    possui_cadastro_cras?: boolean; 
}

// ⭐️ ATUALIZADO (B.E.): Interface para Listagem ⭐️
export interface BeneficioListado {
    id: number;
    data_solicitacao: string;
    beneficio_solicitado: string;
    status_parecer: string;
    tecnico_nome: string; 
    caso_id: number;
    nome_caso?: string; 
    nome_requerente?: string | null; // ⭐️ NOVO (Se for diferente do caso)
}

// ⭐️ NOVO (B.E.): Interface para Dados de Impressão ⭐️
// Combina dados do Benefício, do Caso associado e do Técnico
export interface BeneficioImpressaoData extends BeneficioEventualPayload, BaseCase {
    // Campos específicos do benefício já estão em BeneficioEventualPayload
    // Campos específicos do caso já estão em BaseCase (e herdados)
    
    // Identificadores únicos para evitar conflitos de nome (embora a API os envie)
    beneficio_id: number; // = id do benefício
    caso_id: number;      // = id do caso
    
    // Dados específicos do técnico
    tecnico_nome: string;
    tecnico_cargo: string | null;
    tecnico_cress: string | null;
}


// -------------------------------------------------------------------
// 📌 FUNÇÃO MESTRE: fetchWithAuth (Mantida a versão estável)
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
        
        const contentType = response.headers.get('content-type');
        let errorData;

        if (contentType && contentType.includes('application/json')) {
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { message: `Erro ${response.status}: Falha de comunicação/JSON vazio.` };
            }
        } else {
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
const appendFiltros = (filters?: FiltrosBase | { [key: string]: any }): string => {
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
export const createCase = (casoData: CasePayload) => fetchWithAuth(`/api/casos`, { method: 'POST', body: JSON.stringify(casoData) });
export const updateCase = (id: number | string, casoData: Partial<CasePayload>) => fetchWithAuth(`/api/casos/${id}`, { method: 'PUT', body: JSON.stringify(casoData) });
export const updateCasoStatus = (casoId: string | number, status: string) => fetchWithAuth(`/api/casos/${casoId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const deleteCaso = (casoId: string | number) => fetchWithAuth(`/api/casos/${casoId}`, { method: 'DELETE' });
export const getCasoById = (id: string): Promise<CaseDetail> => fetchWithAuth(`/api/casos/${id}`);

// Função de Listagem CRAS
export const listCrasCases = (filters?: { unitId?: string }): Promise<CaseListEntry[]> => {
    const params = filters?.unitId ? `?unitId=${filters.unitId}` : '';
    return fetchWithAuth(`${CRAS_BASE_URL}/casos${params}`);
};


// -------------------------------------------------------------------
// --- FUNÇÕES DA API (DEMANDAS, DASHBOARD, VIGILÂNCIA, MSE) ---
// -------------------------------------------------------------------
export const getCasosFiltrados = (filters?: FiltrosCasos): Promise<CaseListEntry[]> => {
    let endpoint = '/api/casos'; 
    if (filters?.origem === 'vigilancia') {
        endpoint = '/api/vigilancia/casos-filtrados'; 
    }

    const paramsString = appendFiltros(filters);
    return fetchWithAuth(`${endpoint}${paramsString}`);
};

export const searchCasosByTerm = (searchTerm: string): Promise<CaseListEntry[]> => {
    const params = new URLSearchParams({ q: searchTerm });
    return fetchWithAuth(`/api/casos?${params.toString()}`);
};

export const getAcompanhamentos = (casoId: string) => fetchWithAuth(`/api/acompanhamentos/${casoId}`);

// ⭐️ ALTERAÇÃO EXECUTADA: Revertido para aceitar apenas (casoId, texto) ⭐️
export const createAcompanhamento = (casoId: string | number, texto: string) => {
    return fetchWithAuth(`/api/acompanhamentos/${casoId}`, { 
        method: 'POST', 
        body: JSON.stringify({ texto: texto }) // Envia apenas o texto
    });
};

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
export const getDemandAS = (): Promise<Demanda[]> => fetchWithAuth(`/api/demandas`);
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
    
// ATUALIZADO: Função updateMseRegistro
export const updateMseRegistro = (id: number | string, data: MseRegistroBody) => fetchWithAuth(`/api/mse/registros/${id}`, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
});

// ⭐️ NOVA FUNÇÃO (RMA Bloco G): Criar Atividade ⭐️
export const createAtividadeColetiva = (data: AtividadeColetivaPayload): Promise<{ message: string; atividadeId: number }> => {
    return fetchWithAuth(`/api/atividades`, { 
        method: 'POST', 
        body: JSON.stringify(data),
    });
};

// ⭐️ NOVA FUNÇÃO (RMA Bloco G): Listar Atividades ⭐️
export const getAtividadesColetivas = (): Promise<AtividadeListada[]> => {
    return fetchWithAuth(`/api/atividades`);
};

// ⭐️ NOVA FUNÇÃO (RMA Etapa 3): Gerar Relatório Automático ⭐️
export const gerarRMA = (filters: { mes: string; ano: string; unitId: number }): Promise<RmaData> => {
    const paramsString = appendFiltros(filters);
    return fetchWithAuth(`/api/rma/gerar${paramsString}`);
};

// -------------------------------------------------------------------
// --- FUNÇÕES DA API (BENEFÍCIOS EVENTUAIS) ---
// -------------------------------------------------------------------

// ⭐️ FUNÇÃO EXISTENTE (Ação 2 - Criar Benefício Eventual) ⭐️
export const createBeneficioEventual = (data: BeneficioEventualPayload): Promise<{ message: string; beneficioId: number }> => {
    return fetchWithAuth(`/api/beneficios`, { 
        method: 'POST', 
        body: JSON.stringify(data),
     });
};

// ⭐️ FUNÇÃO EXISTENTE (Ação 2 - Listar Benefícios) ⭐️
export const getBeneficiosEventuais = (filters?: { unitId?: number, casoId?: number }): Promise<BeneficioListado[]> => {
    // A rota GET /api/beneficios filtrará pela unidade do usuário se unitId não for passado
    const paramsString = appendFiltros(filters);
    return fetchWithAuth(`/api/beneficios${paramsString}`);
};

// ⭐️ NOVA FUNÇÃO (B.E. Impressão) ⭐️
export const getBeneficioParaImpressao = (id: number | string): Promise<BeneficioImpressaoData> => {
    return fetchWithAuth(`/api/beneficios/${id}/impressao`);
};