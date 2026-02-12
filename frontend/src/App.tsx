// frontend/src/App.tsx (VERSÃO FINAL COM CORREÇÃO DE TIPAGEM E PROTEÇÃO)

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./contexts/ProtectedRoute";
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
import CrasProntuario from "./pages/Cras/CrasProntuario";
import CrasConsulta from "./pages/Cras/CrasConsulta";
import { usePermissoesSUAS } from "./hooks/usePermissoesSUAS";
import { entityPermissions } from "./utils/constants";
import 'leaflet/dist/leaflet.css';
import { string } from "zod";

function RouteProtegida({ element, requiredAccess, fallbackPath = "/dashboard" }: 
    { element: JSX.Element, requiredAccess: 'ANALISE' | 'CREAS_OP' | 'CRAS' | 'ADMIN' | 'VIGILANCIA', fallbackPath?: string }) {


    const { isAuthenticated, isLoading } = useAuth();
    // Desestruturamos as permissões do hook centralizado
    const {
        canAccessAnaliseGroup,
        canViewCreasOperacional,
        canManageUsers,
        isVigilancia,
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
        case 'VIGILANCIA':
            hasPermission = isVigilancia;
            break;
        default:
            hasPermission = false;
    }

    return hasPermission ? element : <Navigate to={fallbackPath} replace />;
}


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
                        <Route path="dashboard" element={<ProtectedRoute element={<Dashboard />} requiredPermissions={["screen.dashboard.access"]} />}/>
                        <Route path="painel-vigilancia" element={<ProtectedRoute element={<PainelVigilancia />} requiredPermissions={["screen.dashbord.access"]} />} />
                        <Route path="relatorios" element={<ProtectedRoute element={<Relatorios />} requiredPermissions={["screen.relatorios.access"]} />} />
                        <Route path="integracoes" element={<ProtectedRoute element={<Integracoes />} requiredPermissions={["screen.integrations.access"]} />} />

                        {/* rotas de caso */}
                        <Route path="cadastro" element={<ProtectedRoute element={<Cadastro />} requiredPermissions= {entityPermissions.casos} />} />
                        <Route path="cadastro/:id" element={<ProtectedRoute element={<Cadastro />} requiredPermissions={entityPermissions.casos} />} />
                        <Route path="consulta" element={<ProtectedRoute element={<Consulta />} requiredPermissions={entityPermissions.casos} />} />
                        <Route path="caso/:id" element={<ProtectedRoute element={<CasoDetalhe />} requiredPermissions={entityPermissions.casos} />} />
                        {/* rotas de demandas */}
                        <Route path="demandas" element={<ProtectedRoute element={<Demandas />} requiredPermissions={entityPermissions.demandas} />} />
                        <Route path="demandas/:id" element={<ProtectedRoute element={<DemandaDetalhe />} requiredPermissions={entityPermissions.demandas} />} />
                        {/* rota do controle mse */}
                        <Route path="controle-mse" element={<ProtectedRoute element={<ControleMSE />} requiredPermissions={entityPermissions.mse} />} />

                        {/* rotas cras em desenvolvimento */}
                        <Route path="cras/cadastro" element={<CrasProntuario/>} />
                        <Route path="cras/cadastro/:id" element={<CrasProntuario/>} />
                        <Route path="cras/consulta" element={<CrasConsulta/>} />

                        {/* 🛑 ROTAS DE ADMINISTRAÇÃO 🛑 */}
                        <Route path="gerenciar-usuarios" element={<ProtectedRoute element={<GerenciarUsuarios />} requiredPermissions={entityPermissions.users}/>} />
                    </Route>

                    <Route path="*" element={<Navigate to="/login" />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

