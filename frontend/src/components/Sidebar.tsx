// frontend/src/components/Sidebar.tsx (VERSÃO FINAL OTIMIZADA)

import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; 

const CREAS_UNIT_ID = 1;

export default function Sidebar() {
    const { user } = useAuth();
    const userRole = user?.role;
    const userUnitId = user?.unit_id;

    // Lógica Final de Permissões
    const isGestorGeral = userRole === 'gestor';
    const isLotadoNoCreas = userUnitId === CREAS_UNIT_ID;
    
    // Perfils que podem ver os módulos
    const canManageUsers = isGestorGeral || userRole === 'coordenador';
    const canViewVigilancia = isGestorGeral || userRole === 'coordenador' || userRole === 'vigilancia'; 
    const canViewMse = isGestorGeral || isLotadoNoCreas; 

    return (
        <aside className="w-60 bg-white shadow-md h-full p-6 space-y-6">
            <h2 className="text-xl font-bold text-blue-700">SUAS Patos/PB</h2>
            <nav className="flex flex-col space-y-2">
                
                {/* GRUPO DE ATENDIMENTO */}
                <h3 className="text-md font-semibold text-slate-700 mt-4 border-t pt-3">Atendimento</h3>
                <Link to="/cadastro" className="flex items-center hover:text-blue-600">📋 Coleta de Dados</Link>
                <Link to="/consulta" className="flex items-center hover:text-blue-600">🔍 Consultar Casos</Link>
                <Link to="/demandas" className="flex items-center hover:text-blue-600">📥 Gestão de Demandas</Link>
                
                {/* 🚨 MÓDULO EXCLUSIVO DO CREAS (Controle MSE) */}
                {canViewMse && (
                    <Link to="/controle-mse" className="flex items-center hover:text-blue-600">📝 Controle MSE</Link> 
                )}

                {/* GRUPO DE ANÁLISE E GESTÃO */}
                <h3 className="text-md font-semibold text-slate-700 mt-4 border-t pt-3">Análise e Gestão</h3>
                <Link to="/dashboard" className="flex items-center hover:text-blue-600">📊 Dashboard</Link>
                <Link to="/relatorios" className="flex items-center hover:text-blue-600">📑 Relatórios</Link>
                <Link to="/integracoes" className="flex items-center hover:text-blue-600">🔗 Integrações</Link>
                
                {/* 🚨 MÓDULO DE VIGILÂNCIA */}
                {canViewVigilancia && (
                    <Link to="/painel-vigilancia" className="flex items-center hover:text-red-600">🚨 Painel de Vigilância</Link>
                )}

                {/* 🔐 MÓDULO DE ADMINISTRAÇÃO */}
                {canManageUsers && (
                    <>
                        <h3 className="text-md font-semibold text-slate-700 mt-4 border-t pt-3">Administração</h3>
                        <Link to="/gerenciar-usuarios" className="flex items-center hover:text-purple-600">👥 Gerenciar Servidores</Link> 
                    </>
                )}

            </nav>
        </aside>
    );
}
