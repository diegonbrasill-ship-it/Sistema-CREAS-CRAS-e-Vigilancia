// frontend/src/components/Layout.tsx 

import React, { useEffect, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
// ⭐️ IMPORTAÇÃO DO HOOK CENTRALIZADO ⭐️
import { usePermissoesSUAS, CRAS_UNITS } from '../hooks/usePermissoesSUAS'; 

// Importação completa de ícones
import { LayoutDashboard, PlusCircle, Search, User, LogOut, BarChart3, Settings, FileText, Users, Inbox, UserCheck, BookOpen, Home, ChevronDown, ChevronRight, MapPin } from "lucide-react"; 
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; 

interface SubMenuItem {
    name: string;
    path: string;
    icon: React.ElementType;
    isVisible: boolean;
}

interface MenuItem {
    title: string;
    icon: React.ElementType; // Icone principal (opcional, mas bom para tipagem)
    isVisible: boolean; // Flag para o grupo CRAS
    subItems?: SubMenuItem[];
}


export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const username = user?.username || "Usuário";
  const userRole = (user?.role || '').toLowerCase().trim();
  const userUnitId = user?.unit_id;
  
  // ⭐️ UTILIZAÇÃO DO HOOK CENTRALIZADO ⭐️
  const { 
      canAccessAnaliseGroup, 
      canViewCreasOperacional,
      canAccessIntegrationsScreen,
      canAccessDashboardScreen,
      canAccessRelatoriosScreen,
      canAccessVigilanciaScreen,
      canManageCasos,
      canManageUsers,
      canManageDemandas,
      canManageMse,
  } = usePermissoesSUAS(); 
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  useEffect(() => {
       
       if (
        location.pathname !== '/' && 
        location.pathname !== '/cadastro' && 
        location.pathname !== '/consulta' && 
        location.pathname !== '/dashboard' && 
        location.pathname !== '/painel-vigilancia'
      ) {
            return;
       }
      
       if (canAccessDashboardScreen && location.pathname === '/') {
            navigate('/dashboard', { replace: true });
            return;
       }
      if (canAccessVigilanciaScreen && location.pathname === '/') {
           navigate('/painel-vigilancia', { replace: true });
           return;
       }
       if (canViewCreasOperacional && location.pathname === '/') {
           navigate('/cadastro', { replace: true });
           return;
       }
   }, [ navigate, location.pathname, canAccessDashboardScreen,canAccessVigilanciaScreen, canViewCreasOperacional]);
  
 
  // ESTRUTURA DE DADOS DO MENU (COM FILTRO DE VISIBILIDADE)
  const menuItems: MenuItem[] = [
      // ⭐️ MÓDULOS CRAS (PROTEÇÃO CRAS)
      {
          title: "MODULO CRAS",
          icon: Home,
          isVisible: false,
          subItems: [
            { name: "Novo Registro", path: "/cras/cadastro", icon: PlusCircle, isVisible: true },
            { name: "Consulta", path: "/cras/consulta", icon: Search, isVisible: true },
        ]
      },
      
      // ⭐️ MÓDULOS OPERACIONAIS CREAS (PROTEÇÃO CREAS_OP/ANÁLISE)
      {
          title: "Atendimento Operacional CREAS",
          icon: MapPin,
          isVisible: canViewCreasOperacional, // Visível se puder acessar CREAS Data (Vigilância/CREAS/Gestor)
          subItems: [
              { name: "Coleta de Dados", path: "/cadastro", icon: PlusCircle, isVisible: canManageCasos }, 
              { name: "Controle MSE", path: "/controle-mse", icon: FileText, isVisible: canManageMse },
              { name: "Consulta de Casos", path: "/consulta", icon: Search, isVisible: canManageCasos },
              { name: "Gerenciamento de Demandas", path: "/demandas", icon: Inbox, isVisible: canManageDemandas },
          ]
      },
      
      // ⭐️ MÓDULOS CREAS/VIGILÂNCIA/ANÁLISE (PROTEÇÃO CANACCESSANALIZEGROUP)
      {
          title: "Análise e Gestão",
          icon: BarChart3,
          isVisible: canAccessAnaliseGroup,
          subItems: [
              { name: "Dashboard PAEFI", path: "/dashboard", icon: LayoutDashboard, isVisible: canAccessDashboardScreen },
              { name: "Painel de Vigilância", path: "/painel-vigilancia", icon: BarChart3, isVisible: canAccessVigilanciaScreen }, // AGORA APARECE PARA CREAS E VIGILÂNCIA
              { name: "Relatórios", path: "/relatorios", icon: FileText, isVisible: canAccessRelatoriosScreen },
              { name: "Integrações", path: "/integracoes", icon: Settings, isVisible: canAccessIntegrationsScreen },
          ]
      },
      
      // ⭐️ ADMINISTRAÇÃO 
      {
          title: "Administração",
          icon: Users,
          isVisible: canManageUsers,
          subItems: [
              { name: "Gerenciar Servidores", path: "/gerenciar-usuarios", icon: Users, isVisible: canManageUsers },
          ]
      },
  ];

  // ⭐️ FUNÇÃO AUXILIAR PARA RENDERIZAR LINKS DE SUBMENU ⭐️
  const renderSubMenuItem = (item: SubMenuItem, index: number, linkColorClass: string) => {
      if (!item.isVisible) return null;

      const Icon = item.icon; // Componente do ícone
      const isActive = location.pathname.startsWith(item.path) || location.pathname === item.path;
      
      // Define a classe de cor para o link ativo
      const activeLinkClass = `bg-${linkColorClass}-100 text-${linkColorClass}-700`;
      const inactiveLinkClass = "text-slate-600 hover:bg-slate-100 hover:text-slate-900";

      return (
          <Link 
              key={index} 
              to={item.path} 
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? activeLinkClass : inactiveLinkClass}`}
          >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
          </Link>
      );
  };
  return (
    <div className="app-shell min-h-screen w-full bg-slate-100 flex">
      {/* SIDEBAR */}
      <aside className="app-sidebar no-print w-64 bg-white border-r flex flex-col shadow-sm">
        <div className="p-4 border-b flex items-center gap-3">
          <div>
            <h1 className="text-base font-bold text-slate-800">Nobly SIMAS PRO</h1>
            <p className="text-xs text-slate-500">Patos/PB</p>
          </div>
        </div>
        
        <nav className="flex-1 p-2 space-y-4">
              {/* 🛑 BLOCO DE DIAGNÓSTICO — visível apenas em desenvolvimento 🛑 */}
            {import.meta.env.DEV && (
            <div className="text-xs p-2 bg-yellow-100 border border-yellow-300 rounded">
                <p>ROLE: <strong>{userRole || 'VAZIO'}</strong></p>
                <p>UNIT ID: <strong>{String(userUnitId) || 'VAZIO'}</strong></p>
                <p>access to analise?: <strong>{canAccessAnaliseGroup ? 'SIM' : 'NÃO'}</strong></p>
                <p>access to creas?: <strong>{canViewCreasOperacional ? 'SIM' : 'NÃO'}</strong></p>
                <p>manage casos?: <strong>{canManageCasos ? 'SIM' : 'NÃO'}</strong></p>
                <p>manage mse?: <strong>{canManageMse ? 'SIM' : 'NÃO'}</strong></p>
                <p>manage demandas?: <strong>{canManageDemandas ? 'SIM' : 'NÃO'}</strong></p>
                <p>manage users?: <strong>{canManageUsers ? 'SIM' : 'NÃO'}</strong></p>
            </div>
            )}


            {/* ⭐️ RENDERIZAÇÃO DINÂMICA DO MENU ⭐️ */}
            {menuItems.map((group, index) => {
                if (!group.isVisible) return null;
                
                // Define a cor da tag e do link baseado no título
                let titleColor = "slate";
                if (group.title.includes("CREAS")) titleColor = "blue";
                else if (group.title.includes("Análise")) titleColor = "purple";


                return (
                    <div key={index} className="border-t pt-3 space-y-2">
                        <h3 className={`px-3 mb-1 text-xs font-semibold text-${titleColor}-700 uppercase tracking-wider`}>
                            {group.title}
                        </h3>
                        
                        {group.subItems?.map((item, subIndex) =>
                          renderSubMenuItem(item, subIndex, titleColor)
                        )} 
                    </div>
                );
            })}
        </nav>

        <div className="p-2 border-t">
          <Button variant="ghost" className="w-full justify-start text-left" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO */}
      <div className="app-content-shell flex-1 flex flex-col">
        <header className="app-topbar no-print bg-white border-b h-16 flex items-center justify-end px-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-auto justify-start gap-2">
                <User className="h-5 w-5" />
                <span className="font-medium text-slate-700">{username}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Logado como</p>
                  <p className="text-xs leading-none text-muted-foreground">{username}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="app-main-content flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
        
      </div>
    </div>
  );
}
