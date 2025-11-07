// frontend/src/App.tsx (VERSÃO FINAL COM CORREÇÃO DE TIPAGEM E PROTEÇÃO)

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

// ⭐️ NOVO: Importar o Hook Centralizado para a Proteção de Rota ⭐️
import { usePermissoesSUAS } from "./hooks/usePermissoesSUAS";


import 'leaflet/dist/leaflet.css';

// ===============================================================
// 🛑 NOVO: PROTEÇÃO DE ROTAS DINÂMICA (Baseada no usePermissoesSUAS)
// ===============================================================
function RouteProtegida({ element, requiredAccess, fallbackPath = "/dashboard" }:
    // ✅ CORRIGIDO: Propriedade 'fallbackPath' adicionada à tipagem do componente
    { element: JSX.Element, requiredAccess: 'ANALISE' | 'CREAS_OP' | 'CRAS' | 'ADMIN' | 'VIGILANCIA', fallbackPath?: string }) {

    const { isAuthenticated, isLoading } = useAuth();
    // Desestruturamos as permissões do hook centralizado
    const {
        canAccessAnaliseGroup,
        canViewCreasOperacional,
        isLotadoNoCRAS,
        canManageUsers,
        isVigilancia
    } = usePermissoesSUAS();

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
            hasPermission = canAccessAnaliseGroup; // Dashboard, Relatórios, Consulta, Coleta de Dados
            break;
        case 'CREAS_OP':
            hasPermission = canViewCreasOperacional; // Controle MSE (Estrito)
            break;
        case 'CRAS':
            hasPermission = isLotadoNoCRAS; // Cadastro/Consulta CRAS
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
                        <Route index element={<Navigate to="/dashboard" />} />

                        {/* 🛑 ROTAS DE ANÁLISE E GESTÃO (Protegidas) 🛑 */}
                        <Route path="dashboard" element={<RouteProtegida element={<Dashboard />} requiredAccess="ANALISE" />} />
                        <Route path="painel-vigilancia" element={<RouteProtegida element={<PainelVigilancia />} requiredAccess="ANALISE" />} />
                        <Route path="relatorios" element={<RouteProtegida element={<Relatorios />} requiredAccess="ANALISE" />} />
                        <Route path="integracoes" element={<RouteProtegida element={<Integracoes />} requiredAccess="ANALISE" />} />

                        {/* 🛑 ROTAS CREAS (Operacionais e Dados) 🛑 */}
                        {/* 🟢 CORRIGIDO: Acesso à Coleta de Dados (cadastro) agora usa "ANALISE" (Gestor/CREAS/Vigilância) */}
                        <Route path="cadastro" element={<RouteProtegida element={<Cadastro />} requiredAccess="ANALISE" />} />
                        <Route path="cadastro/:id" element={<RouteProtegida element={<Cadastro />} requiredAccess="ANALISE" />} />

                        {/* Mantido como ANALISE (Gestor/CREAS/Vigilância) */}
                        <Route path="consulta" element={<RouteProtegida element={<Consulta />} requiredAccess="ANALISE" />} />
                        <Route path="caso/:id" element={<RouteProtegida element={<CasoDetalhe />} requiredAccess="ANALISE" />} />
                        <Route path="demandas" element={<RouteProtegida element={<Demandas />} requiredAccess="ANALISE" />} />
                        <Route path="demandas/:id" element={<RouteProtegida element={<DemandaDetalhe />} requiredAccess="ANALISE" />} />

                        {/* Mantido como CREAS_OP (Gestor/CREAS, excluindo Vigilância) */}
                        <Route path="controle-mse" element={<RouteProtegida element={<ControleMSE />} requiredAccess="CREAS_OP" />} />

                        {/* 🛑 ROTAS DO NOVO MÓDULO CRAS (Protegidas) 🛑 */}
                        {/* O :unitName permite ao sistema saber de qual CRAS o usuário está acessando */}
                        <Route path="cras/:unitName/cadastro" element={<RouteProtegida element={<CrasProntuario />} requiredAccess="CRAS" fallbackPath="/dashboard" />} />
                        <Route path="cras/:unitName/cadastro/:id" element={<RouteProtegida element={<CrasProntuario />} requiredAccess="CRAS" fallbackPath="/dashboard" />} />
                        <Route path="cras/:unitName/consulta" element={<RouteProtegida element={<CrasConsulta />} requiredAccess="CRAS" fallbackPath="/dashboard" />} />

                        {/* 🛑 ROTAS DE ADMINISTRAÇÃO 🛑 */}
                        <Route path="gerenciar-usuarios" element={<RouteProtegida element={<GerenciarUsuarios />} requiredAccess="ADMIN" />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/login" />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

