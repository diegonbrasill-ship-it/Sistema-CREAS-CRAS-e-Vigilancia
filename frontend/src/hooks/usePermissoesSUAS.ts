// frontend/src/hooks/usePermissoesSUAS.ts

import { useAuth } from "@/contexts/AuthContext";

// =========================================================
// ⭐️ CONSTANTES DO PROJETO CENTRALIZADAS (Exportadas para uso global) ⭐️
// =========================================================
export const CREAS_UNIT_ID = 1; 

// 💡 Nota: Em um projeto real, esses dados viriam de uma API ou Store central.
// Mantendo a estrutura para seguir o seu código.
export const CRAS_UNITS = [
    { id: 2, name: "CRAS Geralda Medeiros", urlName: "geralda-medeiros" },
    { id: 3, name: "CRAS Mariana Alves", urlName: "mariana-alves" },
    { id: 4, name: "CRAS Matheus Leitão", urlName: "matheus-leitao" },
    { id: 5, name: "CRAS Severina Celestino", urlName: "severina-celestino" },
];

export const CRAS_UNIT_IDS = CRAS_UNITS.map(u => u.id);


// =========================================================
// ⭐️ INTERFACE DE RETORNO DO HOOK (CORRIGIDA) ⭐️
// =========================================================
interface PermissoesSUAS {
    // Info do usuário (NOVOS ADICIONADOS)
    unitId: number | null; // 🟢 NOVO: ID da unidade do usuário
    userCrasUnit: typeof CRAS_UNITS[0] | undefined;
    dashboardFilterUnits: number[]; // 🟢 NOVO: Array de IDs de unidade para filtrar dados em Dashboard/Vigilância
    
    // Status de lotação e perfis principais
    isGestorGeral: boolean;
    isVigilancia: boolean;
    isLotadoNoCRAS: boolean;
    isLotadoNoCreas: boolean;
    
    // Permissões de Acesso Finais (o que o usuário pode fazer)
    canViewCRAS: boolean;
    canAccessCreasData: boolean;
    canViewCreasOperacional: boolean;
    canAccessAnaliseGroup: boolean;
    canManageUsers: boolean;
}


export function usePermissoesSUAS(): PermissoesSUAS {
    const { user } = useAuth();
    
    // Sanitização e Preparação dos Dados
    const rawRole = (user?.role || '').toString().toLowerCase().trim();
    // Garante que unit_id é um número ou null
    const userUnitIdNum = user?.unit_id ? Number(user.unit_id) : null; 
    
    // =========================================================
    // 1. Detecção de Perfis e Lotação
    // =========================================================
    const isGestorGeral = ['gestor', 'admin'].some(r => rawRole.includes(r));
    const isVigilancia = rawRole.includes('vigilancia');
    const isCoordenador = rawRole.includes('coordenador');

    const isLotadoNoCreas = userUnitIdNum === CREAS_UNIT_ID;
    const isLotadoNoCRAS = CRAS_UNIT_IDS.includes(userUnitIdNum as number);
    const userCrasUnit = CRAS_UNITS.find(u => u.id === userUnitIdNum);


    // =========================================================
    // 2. REGRAS DE ACESSO
    // =========================================================

    // Acesso a Cadastro/MSE (Operacional CREAS estrito)
    const canViewCreasOperacional = isGestorGeral || isLotadoNoCreas;

    // Acesso ao grupo Análise/Dashboard/Dados CREAS
    const canAccessAnaliseGroup = isGestorGeral || isLotadoNoCreas || isVigilancia;
    
    // Variáveis mantidas por compatibilidade
    const canAccessCreasData = canAccessAnaliseGroup; 
    const canViewCRAS = isGestorGeral || isLotadoNoCRAS;
    const canManageUsers = isGestorGeral || isCoordenador;
    
    // =========================================================
    // ⭐️ 3. LÓGICA DE FILTRO DE DADOS (PARA DASHBOARDS/PAINÉIS) ⭐️
    // =========================================================
    let dashboardFilterUnits: number[] = [-99]; // Padrão: Acesso negado

    if (isGestorGeral) {
        // Gestor Geral vê todos os dados (array vazio sinaliza 'sem filtro' no backend)
        dashboardFilterUnits = []; 
    } else if (isVigilancia || isLotadoNoCreas) {
        // Vigilância e Servidor CREAS veem SOMENTE os dados do CREAS (ID 1).
        dashboardFilterUnits = [CREAS_UNIT_ID];
    } else if (isLotadoNoCRAS && userCrasUnit) {
        // Servidor CRAS vê apenas os seus dados (Não relevante para o Dashboard PAEFI, mas útil para rotas CRAS)
        dashboardFilterUnits = [userCrasUnit.id];
    }
    // Para todos os outros perfis sem permissão explícita, permanece [-99]

    // =========================================================
    // 4. RETORNO DE PERMISSÕES (ATUALIZADO)
    // =========================================================
    return {
        unitId: userUnitIdNum, // 🟢 NOVO: ID da unidade
        userCrasUnit,
        dashboardFilterUnits, // 🟢 NOVO: Array de filtro
        isGestorGeral, 
        isVigilancia, 
        isLotadoNoCRAS, 
        isLotadoNoCreas,
        canViewCRAS, 
        canAccessCreasData, 
        canViewCreasOperacional,
        canAccessAnaliseGroup, 
        canManageUsers
    };
}