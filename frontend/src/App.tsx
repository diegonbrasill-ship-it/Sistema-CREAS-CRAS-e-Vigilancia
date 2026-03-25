// frontend/src/App.tsx (VERSÃO FINAL COM CORREÇÃO DE TIPAGEM E PROTEÇÃO)

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./contexts/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import Cadastro from "./pages/Cadastro";
import Consulta from "./pages/Consulta";
import CasoDetalhe from "./pages/CasoDetalhe/CasoDetalhe";
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
import { entityPermissions, SCREEN_PERMISSIONS } from "./utils/constants";
import 'leaflet/dist/leaflet.css';

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

                        <Route index element={<Navigate to="/dashboard" />} />                        {/* 🛑 ROTAS DE ANÁLISE E GESTÃO (Protegidas) 🛑 */}
                        <Route path="dashboard" element={<ProtectedRoute element={<Dashboard />} requiredPermissions={[SCREEN_PERMISSIONS.dashboard]} />}/>
                        <Route path="painel-vigilancia" element={<ProtectedRoute element={<PainelVigilancia />} requiredPermissions={[SCREEN_PERMISSIONS.vigilancia]} />} />
                        <Route path="relatorios" element={<ProtectedRoute element={<Relatorios />} requiredPermissions={[SCREEN_PERMISSIONS.relatorios]} />} />
                        <Route path="integracoes" element={<ProtectedRoute element={<Integracoes />} requiredPermissions={[SCREEN_PERMISSIONS.integracoes]} />} />{/* rotas de caso */}
                        <Route path="cadastro" element={<ProtectedRoute element={<Cadastro />} requiredPermissions={["casos.create"]} />} />
                        <Route path="cadastro/:id" element={<ProtectedRoute element={<Cadastro />} requiredPermissions={["casos.edit"]} />} />
                        <Route path="consulta" element={<ProtectedRoute element={<Consulta />} requiredPermissions={["casos.read"]} />} />
                        <Route path="caso/:id" element={<ProtectedRoute element={<CasoDetalhe />} requiredPermissions={["casos.read"]} />} />
                        {/* rotas de demandas */}
                        <Route path="demandas" element={<ProtectedRoute element={<Demandas />} requiredPermissions={["demandas.read"]} />} />
                        <Route path="demandas/:id" element={<ProtectedRoute element={<DemandaDetalhe />} requiredPermissions={["demandas.read"]} />} />
                        {/* rota do controle mse */}
                        <Route path="controle-mse" element={<ProtectedRoute element={<ControleMSE />} requiredPermissions={["mse.read"]} />} />

                        {/* rotas cras em desenvolvimento */}
                        <Route path="cras/cadastro" element={<CrasProntuario/>} />
                        <Route path="cras/cadastro/:id" element={<CrasProntuario/>} />
                        <Route path="cras/consulta" element={<CrasConsulta/>} />                        
                        {/* 🛑 ROTAS DE ADMINISTRAÇÃO 🛑 */}
                        <Route path="gerenciar-usuarios" element={<ProtectedRoute element={<GerenciarUsuarios />} requiredPermissions={["users.read"]}/>} />
                    </Route>

                    <Route path="*" element={<Navigate to="/login" />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

