// frontend/src/App.tsx 
// ⭐️ ATUALIZAÇÃO: Adicionada rota para a página de impressão de Benefício Eventual ⭐️

import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import React from 'react'; 
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Cadastro from "./pages/Cadastro";
import Consulta from "./pages/Consulta";
import CasoDetalhe from "./pages/CasoDetalhe";
import PainelVigilancia from "./pages/PainelVigilancia/PainelVigilancia";
import Relatorios from "./pages/Relatorios";
import Integracoes from "./pages/Integracoes";
import GerenciarUsuarios from "./pages/GerenciarUsuarios";
import ControleMSE from "./pages/ControleMSE";
import Demandas from "./pages/Demandas";
import DemandaDetalhe from "./pages/DemandaDetalhe";

// ⭐️ COMPONENTES CRAS PADRONIZADOS ⭐️
import CrasCaseForm from "./pages/Cras/CrasCaseForm"; 
import CrasCaseList from "./pages/Cras/CrasCaseList"; 
import CrasCaseDetail from "./pages/Cras/CrasCaseDetail"; 
// ⭐️ NOVO: Importação do módulo de Instrumentais/RMA ⭐️
import CrasInstrumentais from "./pages/Cras/CrasInstrumentais"; 
// ⭐️ NOVO (B.E. Impressão): Importação da página de impressão ⭐️
import BeneficioPrintPage from "./pages/Cras/BeneficioPrintPage"; 

import { Settings } from "lucide-react"; 

// Importar o Hook Centralizado para a Proteção de Rota
import { usePermissoesSUAS } from "./hooks/usePermissoesSUAS";


import 'leaflet/dist/leaflet.css';

// ===============================================================
// Componente EmBreve (Placeholder) - (Mantido para outras rotas)
// ===============================================================
function EmBreve() {
    return (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-lg shadow-lg">
            <Settings className="h-16 w-16 text-gray-400 mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-700">Módulo em Desenvolvimento</h1>
            <p className="text-gray-500">Esta funcionalidade será implementada em breve. Agradecemos a compreensão.</p>
        </div>
    );
}

// ===============================================================
// Componente de Redirecionamento Inicial (Inalterado)
// ===============================================================
function RedirectHome() {
    const { isAuthenticated, isLoading } = useAuth();
    const { isGestorGeral, isVigilancia, isLotadoNoCRAS, isLotadoNoCreas, userCrasUnit } = usePermissoesSUAS();
    const location = useLocation();

    if (isLoading) return <div>Carregando sistema...</div>;
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    if (location.pathname === '/') {
        if (isGestorGeral || isVigilancia) {
            return <Navigate to="/dashboard" replace />;
        }
        if (isLotadoNoCRAS && userCrasUnit) {
            return <Navigate to={`/cras/${userCrasUnit.urlName}/consulta`} replace />;
        }
        if (isLotadoNoCreas) {
            return <Navigate to="/consulta" replace />;
        }
    }
    
    // Fallback default if none of the specific roles match or path is not '/'
    return <Navigate to="/dashboard" replace />; 
}
// ===============================================================

// ===============================================================
// 🔒 PROTEÇÃO DE ROTAS DINÂMICA (Inalterado)
// ===============================================================
function RouteProtegida({ element, requiredAccess, fallbackPath = "/dashboard" }: 
    { element: JSX.Element, requiredAccess: 'ANALISE' | 'CREAS_OP' | 'CRAS' | 'ADMIN' | 'VIGILANCIA', fallbackPath?: string }) {
    
    const { isAuthenticated, isLoading } = useAuth();
    const { 
        canAccessAnaliseGroup, 
        canViewCreasOperacional, 
        isLotadoNoCRAS, 
        canManageUsers,
        isVigilancia,
        canViewCRAS 
    } = usePermissoesSUAS();
    
    // Considera que Gestor/Vigilancia podem ver módulos CRAS via canViewCRAS
    const canViewAnyCrasModule = isLotadoNoCRAS || canViewCRAS; 
    
    if (isLoading || !isAuthenticated) {
        if (!isAuthenticated && !isLoading) return <Navigate to="/login" replace />;
        return <div>Carregando sistema...</div>;
    }

    let hasPermission = false;

    switch (requiredAccess) {
        case 'ADMIN':
            hasPermission = canManageUsers;
            break;
        case 'ANALISE':
            hasPermission = canAccessAnaliseGroup; 
            break;
        case 'CREAS_OP':
            hasPermission = canViewCreasOperacional;
            break;
        case 'CRAS':
            hasPermission = canViewAnyCrasModule; 
            break;
        case 'VIGILANCIA':
            // Se a rota for VIGILANCIA, apenas Vigilancia (ou Gestor Geral que tem todas as perms)
            hasPermission = isVigilancia || canAccessAnaliseGroup; // Assumindo que Gestor está em Analise
            break;
        default:
            hasPermission = false;
    }

    return hasPermission ? element : <Navigate to={fallbackPath} replace />;
}
// ===============================================================


function PrivateRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Carregando sistema...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                
            <Route index element={<RedirectHome />} /> 
            
                {/* 🛑 ROTAS DE ANÁLISE E GESTÃO (BI - ANALISE group) 🛑 */}
            <Route path="dashboard" element={<RouteProtegida element={<Dashboard />} requiredAccess="ANALISE" />} />
            <Route path="painel-vigilancia" element={<RouteProtegida element={<PainelVigilancia />} requiredAccess="ANALISE" />} />
            <Route path="relatorios" element={<RouteProtegida element={<Relatorios />} requiredAccess="ANALISE" />} />
            <Route path="integracoes" element={<RouteProtegida element={<Integracoes />} requiredAccess="ANALISE" />} />
            
                {/* 🛑 ROTAS CREAS (Operacionais - CREAS_OP group) 🛑 */}
            <Route path="cadastro" element={<RouteProtegida element={<Cadastro />} requiredAccess="CREAS_OP" />} /> 
            <Route path="cadastro/:id" element={<RouteProtegida element={<Cadastro />} requiredAccess="CREAS_OP" />} />
            <Route path="consulta" element={<RouteProtegida element={<Consulta />} requiredAccess="CREAS_OP" />} /> 
            <Route path="caso/:id" element={<RouteProtegida element={<CasoDetalhe />} requiredAccess="CREAS_OP" />} />
            <Route path="demandas" element={<RouteProtegida element={<Demandas />} requiredAccess="CREAS_OP" />} />
            <Route path="demandas/:id" element={<RouteProtegida element={<DemandaDetalhe />} requiredAccess="CREAS_OP" />} />
            <Route path="controle-mse" element={<RouteProtegida element={<ControleMSE />} requiredAccess="CREAS_OP" />} />

                {/* 🛑 ROTAS DO NOVO MÓDULO CRAS (CRAS group) 🛑 */}
                {/* Form de Criação/Edição */}
                <Route path="cras/:unitName/cadastro" element={<RouteProtegida element={<CrasCaseForm />} requiredAccess="CRAS" fallbackPath="/dashboard" />} />
                <Route path="cras/:unitName/cadastro/:id" element={<RouteProtegida element={<CrasCaseForm />} requiredAccess="CRAS" fallbackPath="/dashboard" />} />
                {/* Lista de Casos */}
                <Route path="cras/:unitName/consulta" element={<RouteProtegida element={<CrasCaseList />} requiredAccess="CRAS" fallbackPath="/dashboard" />} />
                {/* Visualização de Detalhes (Prontuário) */}
                <Route path="cras/:unitName/prontuario/:id" element={<RouteProtegida element={<CrasCaseDetail />} requiredAccess="CRAS" fallbackPath="/dashboard" />} />
                
                {/* ⭐️ Rota de Instrumentais ATIVADA ⭐️ */}
                <Route path="cras/:unitName/instrumentais" element={<RouteProtegida element={<CrasInstrumentais />} requiredAccess="CRAS" fallbackPath="/dashboard" />} />
                {/* Rota de Gestantes (Placeholder) */}
                <Route path="cras/:unitName/gestantes" element={<RouteProtegida element={<EmBreve />} requiredAccess="CRAS" fallbackPath="/dashboard" />} />

                {/* ⭐️ NOVA ROTA (B.E. Impressão) ⭐️ */}
                <Route path="cras/:unitName/beneficio/:id/print" element={<RouteProtegida element={<BeneficioPrintPage />} requiredAccess="CRAS" fallbackPath="/dashboard" />} />


                
                {/* 🛑 ROTAS DE ADMINISTRAÇÃO 🛑 */}
            <Route path="gerenciar-usuarios" element={<RouteProtegida element={<GerenciarUsuarios />} requiredAccess="ADMIN" />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
