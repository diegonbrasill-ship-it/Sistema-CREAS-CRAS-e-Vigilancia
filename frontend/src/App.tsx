// frontend/src/App.tsx (VERSÃO FINAL COM FLUXO DE ROTAS E ESTABILIZAÇÃO DE FLUXO)

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

// ⭐️ NOVOS COMPONENTES CRAS IMPORTADOS ⭐️
import CrasProntuario from "./pages/Cras/CrasProntuario"; 
import CrasConsulta from "./pages/Cras/CrasConsulta"; 
// 🛑 CORRIGIDO: Adicionando a importação do componente de visualização
import CrasProntuarioView from "./pages/Cras/CrasProntuarioView"; 
// ⚠️ Importar ícone para o EmBreve
import { Settings } from "lucide-react"; 

// ⭐️ NOVO: Importar o Hook Centralizado para a Proteção de Rota ⭐️
import { usePermissoesSUAS } from "./hooks/usePermissoesSUAS";


import 'leaflet/dist/leaflet.css';

// ===============================================================
// 🛑 Componente EmBreve (Placeholder)
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
// 🛑 Componente de Redirecionamento Inicial (Substitui o Route Index)
// ===============================================================
function RedirectHome() {
    const { isAuthenticated, isLoading } = useAuth();
    const { isGestorGeral, isVigilancia, isLotadoNoCRAS, isLotadoNoCreas, userCrasUnit } = usePermissoesSUAS();
    const location = useLocation();

    if (isLoading) return <div>Carregando sistema...</div>;
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    // 🛑 Lógica para decidir para onde ir APENAS na rota raiz (/) 🛑
    if (location.pathname === '/') {
        if (isGestorGeral) {
            return <Navigate to="/dashboard" replace />;
        }
        if (isVigilancia) {
            return <Navigate to="/painel-vigilancia" replace />;
        }
        if (isLotadoNoCRAS && userCrasUnit) {
            return <Navigate to={`/cras/${userCrasUnit.urlName}/cadastro`} replace />;
        }
        if (isLotadoNoCreas) {
            return <Navigate to="/cadastro" replace />;
        }
    }
    
    // Se o usuário está autenticado mas não tem rota padrão na raiz, ele deve ir para o Dashboard
    return <Navigate to="/dashboard" replace />;
}
// ===============================================================

// ===============================================================
// 🔒 PROTEÇÃO DE ROTAS DINÂMICA
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
    
    // ⚠️ Garante que a permissão mais abrangente é usada para o Gestor e CRAS
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
            // 🛑 CORREÇÃO: Usamos a variável mais abrangente para o CRAS
            hasPermission = canViewAnyCrasModule; 
            break;
        case 'VIGILANCIA':
            hasPermission = isVigilancia;
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
                {/* 🛑 CORREÇÃO: Usa o componente RedirectHome na rota raiz 🛑 */}
            <Route index element={<RedirectHome />} /> 
            
                {/* 🛑 ROTAS DE ANÁLISE E GESTÃO (Protegidas) 🛑 */}
            <Route path="dashboard" element={<RouteProtegida element={<Dashboard />} requiredAccess="ANALISE" />} />
            <Route path="painel-vigilancia" element={<RouteProtegida element={<PainelVigilancia />} requiredAccess="ANALISE" />} />
            <Route path="relatorios" element={<RouteProtegida element={<Relatorios />} requiredAccess="ANALISE" />} />
            <Route path="integracoes" element={<RouteProtegida element={<Integracoes />} requiredAccess="ANALISE" />} />
            
                {/* 🛑 ROTAS CREAS (Operacionais e Dados) 🛑 */}
            <Route path="cadastro" element={<RouteProtegida element={<Cadastro />} requiredAccess="ANALISE" />} /> 
            <Route path="cadastro/:id" element={<RouteProtegida element={<Cadastro />} requiredAccess="ANALISE" />} />
            <Route path="consulta" element={<RouteProtegida element={<Consulta />} requiredAccess="ANALISE" />} /> 
            <Route path="caso/:id" element={<RouteProtegida element={<CasoDetalhe />} requiredAccess="ANALISE" />} />
            <Route path="demandas" element={<RouteProtegida element={<Demandas />} requiredAccess="ANALISE" />} />
            <Route path="demandas/:id" element={<RouteProtegida element={<DemandaDetalhe />} requiredAccess="ANALISE" />} />
            <Route path="controle-mse" element={<RouteProtegida element={<ControleMSE />} requiredAccess="CREAS_OP" />} />

                {/* 🛑 ROTAS DO NOVO MÓDULO CRAS (Protegidas) 🛑 */}
                <Route path="cras/:unitName/cadastro" element={<RouteProtegida element={<CrasProntuario />} requiredAccess="CRAS" fallbackPath="/dashboard" />} />
                <Route path="cras/:unitName/cadastro/:id" element={<RouteProtegida element={<CrasProntuario />} requiredAccess="CRAS" fallbackPath="/dashboard" />} />
                <Route path="cras/:unitName/consulta" element={<RouteProtegida element={<CrasConsulta />} requiredAccess="CRAS" fallbackPath="/dashboard" />} />
                
                {/* 🛑 CORREÇÃO FINAL: Rota de visualização deve renderizar o componente de VIEW 🛑 */}
                <Route path="cras/:unitName/prontuario/:id" element={<RouteProtegida element={<CrasProntuarioView />} requiredAccess="CRAS" fallbackPath="/dashboard" />} />
                
                {/* 🛑 CORRIGIDO: Substituir Dashboard por Componente Em Breve (para evitar loops) */}
                <Route path="cras/:unitName/gestantes" element={<RouteProtegida element={<EmBreve />} requiredAccess="CRAS" fallbackPath="/dashboard" />} />
                <Route path="cras/:unitName/instrumentais" element={<RouteProtegida element={<EmBreve />} requiredAccess="CRAS" fallbackPath="/dashboard" />} />


                
                {/* 🛑 ROTAS DE ADMINISTRAÇÃO 🛑 */}
            <Route path="gerenciar-usuarios" element={<RouteProtegida element={<GerenciarUsuarios />} requiredAccess="ADMIN" />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
