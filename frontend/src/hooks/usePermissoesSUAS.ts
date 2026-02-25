// frontend/src/hooks/usePermissoesSUAS.ts

import { useAuth } from "@/contexts/AuthContext";
import { entityPermissions, UNIT_OPTIONS, SCREEN_PERMISSIONS } from "@/utils/constants";

// =========================================================
// CONSTANTES DO PROJETO
// =========================================================

export const CREAS_UNIT_ID = 1;

export const CRAS_UNITS = [
  { id: 2, name: "CRAS Geralda Medeiros", urlName: "geralda-medeiros" },
  { id: 3, name: "CRAS Mariana Alves", urlName: "mariana-alves" },
  { id: 4, name: "CRAS Matheus Leitão", urlName: "matheus-leitao" },
  { id: 5, name: "CRAS Severina Celestino", urlName: "severina-celestino" },
];

export const CRAS_UNIT_IDS = CRAS_UNITS.map(u => u.id);
interface PermissoesSUAS { //tipo do retorno
  unitId: number | null;
  dashboardFilterUnits: number[];
  //perfil (legado)
  isGestorGeral: boolean;
  isVigilancia: boolean;
  isLotadoNoCreas: boolean;
  //acesso (legado)
  canViewCreasOperacional: boolean;
  canAccessAnaliseGroup: boolean;
  canManageUsers: boolean;
  //entidades
  canManageUnits: boolean;
  canManageCasos: boolean;
  canManageMse: boolean;
  canManageDemandas: boolean;
  canManageAnexos: boolean;
  canManageEncaminhamentos: boolean;
  //permissões granulares de casos
  canReadCasos: boolean;
  canEditCasos: boolean;
  canDeleteCasos: boolean;
  canCreateCasos: boolean;
  //telas
  canAccessDashboardScreen: boolean;
  canAccessVigilanciaScreen: boolean;
  canAccessIntegrationsScreen: boolean;
  canAccessRelatoriosScreen: boolean;
}

export function usePermissoesSUAS(): PermissoesSUAS {
  const { user, isAuthenticated } = useAuth();

  const role_id = user?.role_id
  const rawRole = (user?.role || "").toLowerCase().trim();
  const userUnitId = user?.unit_id ? Number(user.unit_id) : null;
  const userPermissions: string[] = Array.isArray(user?.permissions)
    ? user.permissions
    : [];

  const hasPermission = (permission: string): boolean =>
    userPermissions.includes(permission);

  const hasAllPermissions = (requiredPermissions: string[]): boolean =>
    requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

  // --------------------------------------------------------
  // Detecção de perfis
  // --------------------------------------------------------

  const isGestorGeral = ["gestor", "admin"].some(role =>
    rawRole.includes(role)
  );

  const isVigilancia = rawRole.includes("vigilancia");
  const isCoordenador = rawRole.includes("coordenador");

  const isLotadoNoCreas = userUnitId === CREAS_UNIT_ID;
  const isLotadoNoCRAS = CRAS_UNIT_IDS.includes(userUnitId as number);

  const userCrasUnit = CRAS_UNITS.find(u => u.id === userUnitId);

  // --------------------------------------------------------
  // Regras legadas
  // --------------------------------------------------------

  //entity control by permissions
  const canManageUsers = hasAllPermissions(entityPermissions.users);
  const canManageUnits = hasAllPermissions(entityPermissions.units);
  const canManageCasos = hasAllPermissions(entityPermissions.casos);
  const canManageMse = hasAllPermissions(entityPermissions.mse);
  const canManageDemandas = hasAllPermissions(entityPermissions.demandas);
  const canManageAnexos = hasAllPermissions(entityPermissions.anexos);
  const canManageEncaminhamentos = hasAllPermissions(entityPermissions.encaminhamentos);  //screen access
  const canAccessDashboardScreen = hasPermission(SCREEN_PERMISSIONS.dashboard);
  const canAccessVigilanciaScreen = hasPermission(SCREEN_PERMISSIONS.vigilancia);
  const canAccessIntegrationsScreen = hasPermission(SCREEN_PERMISSIONS.integracoes);
  const canAccessRelatoriosScreen = hasPermission(SCREEN_PERMISSIONS.relatorios);
  
  // Permissões granulares de casos
  const canReadCasos = hasPermission("casos.read");
  const canEditCasos = hasPermission("casos.edit");
  const canDeleteCasos = hasPermission("casos.delete");
  const canCreateCasos = hasPermission("casos.create");

  //legacy updated rules
  const canViewCreasOperacional = canManageCasos && canManageMse && canManageDemandas;

  const canAccessAnaliseGroup = canAccessDashboardScreen || canAccessIntegrationsScreen || canAccessRelatoriosScreen || canAccessVigilanciaScreen;

  //TODO: Trocar, para aquele que não for gestor adicionar o filtro da sua unidade
  //dashboardfilter 
  let dashboardFilterUnits: number[] = [];

  if (isGestorGeral) {
    dashboardFilterUnits = [];
  } else if (isVigilancia || isLotadoNoCreas) {
    dashboardFilterUnits = [CREAS_UNIT_ID];
  } else if (isLotadoNoCRAS && userCrasUnit) {
    dashboardFilterUnits = [userCrasUnit.id];
  }
  return {
    unitId: userUnitId,
    dashboardFilterUnits,

    // legado
    isGestorGeral,
    isVigilancia,
    isLotadoNoCreas,
    canViewCreasOperacional,
    canAccessAnaliseGroup,
    canManageUsers,

    // entidades
    canManageUnits,
    canManageCasos,
    canManageMse,
    canManageDemandas,
    canManageAnexos,
    canManageEncaminhamentos,

    // permissões granulares de casos
    canReadCasos,
    canEditCasos,
    canDeleteCasos,
    canCreateCasos,

    // screens
    canAccessDashboardScreen,
    canAccessVigilanciaScreen,
    canAccessIntegrationsScreen,
    canAccessRelatoriosScreen,
  };
}
