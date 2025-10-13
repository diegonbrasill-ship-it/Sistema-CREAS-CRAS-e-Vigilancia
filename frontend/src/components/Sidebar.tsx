// frontend/src/components/Sidebar.tsx (VERSÃO ESTÁVEL E SEGREGADA FINAL)

import { Link, useNavigate } from "react-router-dom"; 
import { useAuth } from "../contexts/AuthContext"; 
import { useEffect } from "react"; 
import React from "react"; 
// ✅ CORREÇÃO CRÍTICA: Importação completa de todos os ícones necessários
import { 
    Home, Users, BarChart3, FileText, Settings, Inbox, UserCheck, 
    PlusCircle, Search, BookOpen, LayoutDashboard, User as UserIcon // Use um apelido para evitar conflito com 'user' do hook
} from 'lucide-react'; 

// ⭐️ CONSTANTES DO PROJETO ⭐️
const CREAS_UNIT_ID = 1; // Unidade CREAS
const CRAS_UNITS = [
    { id: 2, name: "CRAS Geralda Medeiros", urlName: "geralda-medeiros" },
    { id: 3, name: "CRAS Mariana Alves", urlName: "mariana-alves" },
    { id: 4, name: "CRAS Matheus Leitão", urlName: "matheus-leitao" },
    { id: 5, name: "CRAS Severina Celestino", urlName: "severina-celestino" },
];

// IDs de todas as unidades CRAS
const CRAS_UNIT_IDS = CRAS_UNITS.map(u => u.id);

export default function Sidebar() {
    const { user } = useAuth();
    const navigate = useNavigate(); 
    
    // Garante que userRole é uma string EM MINÚSCULAS para checagem robusta
    const userRole = (user?.role || '').toLowerCase().trim();
    const userUnitId = user?.unit_id;
    
    // 🛑 LÓGICA DE SEGURANÇA E ACESSO ESTREITA 🛑
    const isGestorGeral = userRole.includes('gestor') || userRole.includes('admin'); 
    const isCoordenador = userRole.includes('coordenador');

    // Checagem estrita de lotação
    const isLotadoNoCreas = userUnitId === CREAS_UNIT_ID;
    const isLotadoNoCRAS = CRAS_UNIT_IDS.includes(userUnitId as number);
    const userCrasUnit = CRAS_UNITS.find(u => u.id === userUnitId);
    
    // Regras de Visualização
    const canViewCRAS = isGestorGeral || isLotadoNoCRAS;
    const canViewVigilancia = isGestorGeral || userRole.includes('vigilancia'); 
    
    const canViewCreasAtendimento = isGestorGeral || isLotadoNoCreas;
    const canManageUsers = isGestorGeral || isCoordenador; 
    const canViewMse = canViewCreasAtendimento; // Mesma regra do CREAS


    // ⭐️ Redirecionamento Padrão no Login ⭐️
    useEffect(() => {
        if (isGestorGeral) {
             navigate('/dashboard', { replace: true });
        } else if (isLotadoNoCRAS && userCrasUnit) {
            // Se ele logar como CRAS, vá direto para a rota do CRAS dele
            navigate(`/cras/${userCrasUnit.urlName}/cadastro`, { replace: true });
        }
        else if (isLotadoNoCreas) {
            navigate('/cadastro', { replace: true });
        }
    }, [isGestorGeral, isLotadoNoCRAS, isLotadoNoCreas, userCrasUnit, navigate]);


    return (
        <aside className="w-60 bg-white shadow-md h-full p-6 space-y-6">
            <h2 className="text-xl font-bold text-blue-700">SUAS Patos/PB</h2>
            
            {/* 🛑 BLOCO DE DIAGNÓSTICO (Para confirmar o que o sistema lê) 🛑 */}
            <div className="text-xs p-2 bg-yellow-100 border border-yellow-300 rounded">
                <p>ROLE: <strong>{userRole || 'VAZIO'}</strong></p>
                <p>UNIT ID: <strong>{String(userUnitId) || 'VAZIO'}</strong></p>
                <p>PODE VER CRAS?: <strong>{canViewCRAS ? 'SIM' : 'NÃO'}</strong></p>
                <p>PODE VER CREAS?: <strong>{canViewCreasAtendimento ? 'SIM' : 'NÃO'}</strong></p>
            </div>
            {/* 🛑 FIM DO BLOCO DE DIAGNÓSTICO 🛑 */}

            <nav className="flex flex-col space-y-2">
                
                {/* GRUPO DE ATENDIMENTO */}
                <h3 className="text-md font-semibold text-slate-700 mt-4 border-t pt-3">Atendimento</h3>
                
                {/* 🚨 1. MÓDULO CRAS: Exibição Segregada */}
                {canViewCRAS && (
                    <div className="border-t pt-3">
                        <h3 className="text-md font-semibold text-green-700 mb-2">MÓDULO CRAS</h3>
                        
                        {/* Renderização: Gestor vê todas as 4; Usuário CRAS vê APENAS a sua. */}
                        {(isGestorGeral ? CRAS_UNITS : [userCrasUnit]).filter(Boolean).map(cras => (
                            <div key={cras!.id} className="ml-2 border-l pl-2 space-y-1">
                                <h4 className="text-sm font-medium text-slate-700 mt-2">📍 {cras!.name.replace('CRAS ', '')}</h4>
                                <Link 
                                    to={`/cras/${cras!.urlName}/cadastro`} 
                                    className="flex items-center text-sm hover:text-green-600 gap-2"
                                >
                                    <PlusCircle className="h-4 w-4" /> Cadastrar
                                </Link>
                                <Link 
                                    to={`/cras/${cras!.urlName}/consulta`} 
                                    className="flex items-center text-sm hover:text-green-600 gap-2"
                                >
                                    <Search className="h-4 w-4" /> Consultar Casos
                                </Link>
                                {/* Link para Controle de Gestantes */}
                                <Link to={`/cras/${cras!.urlName}/gestantes`} className="flex items-center text-sm hover:text-green-600 gap-2">
                                    <UserCheck className="h-4 w-4" /> Controle Gestantes
                                </Link>
                                {/* Link para Instrumentais */}
                                <Link to={`/cras/${cras!.urlName}/instrumentais`} className="flex items-center text-sm hover:text-green-600 gap-2">
                                    <BookOpen className="h-4 w-4" /> Instrumentais
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* 🚨 2. MÓDULO CREAS */}
                {canViewCreasAtendimento && (
                    <div className="border-t pt-3">
                        <h3 className="text-md font-semibold text-blue-700 mb-2">MÓDULO CREAS</h3>
                        
                        <Link to="/cadastro" className="flex items-center hover:text-blue-600 gap-2 pl-2">
                            <PlusCircle className="h-4 w-4" /> Coleta de Dados
                        </Link>
                        <Link to="/consulta" className="flex items-center hover:text-blue-600 gap-2 pl-2">
                            <Search className="h-4 w-4" /> Consultar Casos
                        </Link>
                        <Link to="/demandas" className="flex items-center hover:text-blue-600 gap-2 pl-2">
                            <Inbox className="h-4 w-4" /> Gestão de Demandas
                        </Link>
                        
                        {/* Controle MSE é do CREAS */}
                        {canViewMse && (
                            <Link to="/controle-mse" className="flex items-center hover:text-blue-600 gap-2 pl-2">
                                <FileText className="h-4 w-4" /> Controle MSE
                            </Link> 
                        )}
                    </div>
                )}
                
                {/* GRUPO DE ANÁLISE E GESTÃO (COMUM) */}
                <div className="border-t pt-3">
                    <h3 className="text-md font-semibold text-slate-700 mb-2">ANÁLISE E GESTÃO</h3>
                    
                    <Link to="/dashboard" className="flex items-center hover:text-blue-600 gap-2 pl-2">
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    
                    {/* MÓDULO DE VIGILÂNCIA */}
                    {canViewVigilancia && (
                        <Link to="/painel-vigilancia" className="flex items-center hover:text-red-600 gap-2 pl-2">
                            <BarChart3 className="h-4 w-4" /> Painel de Vigilância
                        </Link>
                    )}

                    <Link to="/relatorios" className="flex items-center hover:text-blue-600 gap-2 pl-2">
                        <FileText className="h-4 w-4" /> Relatórios
                    </Link>
                    <Link to="/integracoes" className="flex items-center hover:text-blue-600 gap-2 pl-2">
                        <Settings className="h-4 w-4" /> Integrações
                    </Link>
                </div>

                {/* 🔐 GRUPO DE ADMINISTRAÇÃO */}
                {canManageUsers && (
                    <div className="border-t pt-3">
                        <h3 className="text-md font-semibold text-slate-700 mb-2">ADMINISTRAÇÃO</h3>
                        <Link to="/gerenciar-usuarios" className="flex items-center hover:text-purple-600 gap-2 pl-2">
                            <Users className="h-4 w-4" /> Gerenciar Servidores
                        </Link>
                    </div>
                )}
            </nav>
        </aside>
    );
}
