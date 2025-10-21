// frontend/src/components/Layout.tsx (VERSÃO FINAL COM O REDIRECIONAMENTO REMOVIDO)

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

// 🛑 AVISO: As CONSTANTES originais que definem as unidades foram mantidas, 
// mas o CRAS_UNITS do hook DEVE ser o utilizado em um cenário real.
// Se `../hooks/usePermissoesSUAS` já exporta CRAS_UNITS, a definição LOCAL pode ser redundante/removida.
const CREAS_UNIT_ID = 1;
const CRAS_UNIT_IDS = CRAS_UNITS.map(u => u.id); // Usando a constante importada do hook

const UNIDADES_DISPONIVEIS = [
    { id: 1, nome: 'CREAS' },
    ...CRAS_UNITS.map(cras => ({ id: cras.id, nome: cras.name })), 
    { id: 6, nome: 'Vigilancia SocioAssistencial' }, 
    { id: 7, nome: 'Centro POP' },
    { id: 8, nome: 'Conselho Tutelar Norte' },
];

// ⭐️ TIPAGEM PARA ESTRUTURA DE MENU ⭐️
interface SubMenuItem {
    name: string;
    path: string;
    icon: React.ElementType;
    isVisible: boolean;
}

interface MenuItem {
    title: string;
    icon: React.ElementType; // Icone principal (opcional, mas bom para tipagem)
    isVisible: boolean;
    isCrasGroup?: boolean; // Flag para o grupo CRAS
    subItems?: SubMenuItem[];
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [openCrasUnitId, setOpenCrasUnitId] = useState<number | null>(null); 
  
  const username = user?.username || "Usuário";
  const userRole = (user?.role || '').toLowerCase().trim();
  const userUnitId = user?.unit_id;
  
  // ⭐️ UTILIZAÇÃO DO HOOK CENTRALIZADO ⭐️
  const { 
      isGestorGeral, 
      isVigilancia, 
      isLotadoNoCreas, 
      isLotadoNoCRAS, 
      canAccessAnaliseGroup, 
      canViewCreasOperacional, 
      userCrasUnit, 
      canViewCRAS 
  } = usePermissoesSUAS();
  
  const canViewAdmin = isGestorGeral || userRole.includes('coordenador'); 


  // ✅ FUNÇÃO handleLogout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ❌ REMOVIDO: BLOCO useEffect de redirecionamento. O redirecionamento será tratado na rota '/' do App.tsx.

  // Função para alternar o submenu CRAS (mantida)
  const toggleCrasMenu = (id: number) => {
    setOpenCrasUnitId(prevId => (prevId === id ? null : id));
  };


  // ⭐️ ESTRUTURA DE DADOS DO MENU (COM FILTRO DE VISIBILIDADE) ⭐️
  const menuItems: MenuItem[] = [
      // ⭐️ MÓDULOS CRAS (PROTEÇÃO CRAS)
      {
          title: userCrasUnit ? `Módulos CRAS - ${userCrasUnit.name}` : "Módulos CRAS",
          icon: Home,
          isVisible: canViewCRAS, // 🛑 CORRIGIDO: Usa a permissão correta (Gestor ou Lotado no CRAS)
          isCrasGroup: true,
          subItems: [
              // Note que as rotas precisam usar o userCrasUnit.urlName para funcionar
              // Estes subItems são apenas um 'placeholder' visual, o renderCrasLinks fará a renderização dinâmica.
          ]
      },
      
      // ⭐️ MÓDULOS OPERACIONAIS CREAS (PROTEÇÃO CREAS_OP/ANÁLISE)
      {
          title: "Atendimento Operacional CREAS",
          icon: MapPin,
          isVisible: canAccessAnaliseGroup, // Visível se puder acessar CREAS Data (Vigilância/CREAS/Gestor)
          subItems: [
              // 🟢 CORREÇÃO APLICADA: canAccessAnaliseGroup permite que a Vigilância acesse Coleta de Dados
              { name: "Coleta de Dados", path: "/cadastro", icon: PlusCircle, isVisible: canAccessAnaliseGroup }, 
              // 🟢 Mantido: canViewCreasOperacional exclui a Vigilância (apenas CREAS/Gestor)
              { name: "Controle MSE", path: "/controle-mse", icon: FileText, isVisible: canViewCreasOperacional },
              // Rotas de Consulta/Visualização (Acesso a Dados CREAS)
              { name: "Consulta de Casos", path: "/consulta", icon: Search, isVisible: canAccessAnaliseGroup },
              { name: "Gerenciamento de Demandas", path: "/demandas", icon: Inbox, isVisible: canAccessAnaliseGroup },
          ]
      },
      
      // ⭐️ MÓDULOS CREAS/VIGILÂNCIA/ANÁLISE (PROTEÇÃO CANACCESSANALIZEGROUP)
      {
          title: "Análise e Gestão",
          icon: BarChart3,
          isVisible: canAccessAnaliseGroup,
          subItems: [
              { name: "Dashboard PAEFI", path: "/dashboard", icon: LayoutDashboard, isVisible: canAccessAnaliseGroup },
              { name: "Painel de Vigilância", path: "/painel-vigilancia", icon: BarChart3, isVisible: canAccessAnaliseGroup }, // AGORA APARECE PARA CREAS E VIGILÂNCIA
              { name: "Relatórios", path: "/relatorios", icon: FileText, isVisible: canAccessAnaliseGroup },
              { name: "Integrações", path: "/integracoes", icon: Settings, isVisible: canAccessAnaliseGroup },
          ]
      },
      
      // ⭐️ ADMINISTRAÇÃO 
      {
          title: "Administração",
          icon: Users,
          isVisible: canViewAdmin,
          subItems: [
              { name: "Gerenciar Servidores", path: "/gerenciar-usuarios", icon: Users, isVisible: canViewAdmin },
          ]
      },
  ];

  // FUNÇÃO: Renderizar links de CRAS (CORRIGIDA - APENAS LINKS ÚTEIS)
  // ============================================================
  const renderCrasLinks = (cras: typeof CRAS_UNITS[0], userCrasUnit: typeof CRAS_UNITS[0] | undefined, isGestorGeral: boolean) => {
      const isCurrentOpen = openCrasUnitId === cras.id;
      const linkClasses = "flex items-center text-sm gap-2 pl-3 py-1";
      const activeLinkClass = "font-bold bg-green-50 text-green-700 rounded-sm";
      const inactiveLinkClass = "text-slate-600 hover:bg-slate-100";
      
      // Renderiza se for Gestor Geral OU se for o CRAS lotado do usuário
      const renderableCras = isGestorGeral || userCrasUnit?.id === cras.id;

      if (!renderableCras) return null;

      return (
          <div key={cras.id} className="w-full">
              <div 
                  className={`flex justify-between items-center px-3 py-2 cursor-pointer transition-colors rounded-md ${isCurrentOpen ? 'bg-green-100 text-green-800 font-semibold' : 'hover:bg-slate-100 text-slate-700'}`}
                  onClick={() => toggleCrasMenu(cras.id)}
              >
                  {cras.name}
                  {isCurrentOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>

              {isCurrentOpen && ( // Renderiza os links CRAS apenas se a unidade estiver aberta
                  <div className="ml-2 pl-2 space-y-1 border-l border-green-300 transition-all duration-300 ease-in-out">
                      
                        {/* NOVO REGISTRO */}
                      <Link to={`/cras/${cras.urlName}/cadastro`} className={`${linkClasses} ${location.pathname.startsWith(`/cras/${cras.urlName}/cadastro`) ? activeLinkClass : inactiveLinkClass}`}>
                          <PlusCircle className="h-5 w-5" /> Novo Registro
                      </Link>

                        {/* CONSULTAR USUÁRIO */}
                      <Link to={`/cras/${cras.urlName}/consulta`} className={`${linkClasses} ${location.pathname.startsWith(`/cras/${cras.urlName}/consulta`) ? activeLinkClass : inactiveLinkClass}`}>
                          <Search className="h-5 w-5" /> Consultar Usuário
                      </Link>
                        
                        {/* ⚠️ MÓDULOS DE ACOMPANHAMENTO (Apenas links estáticos) */}
                      <Link to={`/cras/${cras.urlName}/gestantes`} className={`${linkClasses} ${location.pathname.endsWith('/gestantes') ? activeLinkClass : inactiveLinkClass}`}>
                          <UserCheck className="h-5 w-5" /> Controle Gestantes
                      </Link>
                      <Link to={`/cras/${cras!.urlName}/instrumentais`} className={`${linkClasses} ${location.pathname.endsWith('/instrumentais') ? activeLinkClass : inactiveLinkClass}`}>
                          <BookOpen className="h-5 w-5" /> Instrumentais
                      </Link>
                  </div>
              )}
          </div>
      );
  };

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
    <div className="min-h-screen w-full bg-slate-100 flex">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r flex flex-col shadow-sm">
        <div className="p-4 border-b flex items-center gap-3">
          <img src="/logos/rmsuas-logo.svg" alt="RMSUAS Logo" className="h-10" />
          <div>
            <h1 className="text-base font-bold text-slate-800">SUAS</h1>
            <p className="text-xs text-slate-500">Patos/PB</p>
          </div>
        </div>
        
        <nav className="flex-1 p-2 space-y-4">
            
            {/* 🛑 BLOCO DE DIAGNÓSTICO (Para fins de teste) - AJUSTADO PARA O HOOK 🛑 */}
            <div className="text-xs p-2 bg-yellow-100 border border-yellow-300 rounded">
                <p>ROLE: <strong>{userRole || 'VAZIO'}</strong></p>
                <p>UNIT ID: <strong>{String(userUnitId) || 'VAZIO'}</strong></p>
                <p>CAN ACCESS ANÁLISE?: <strong>{canAccessAnaliseGroup ? 'SIM' : 'NÃO'}</strong></p>
                <p>VER CREAS OP?: <strong>{canViewCreasOperacional ? 'SIM' : 'NÃO'}</strong></p>
            </div>
            {/* 🛑 FIM DO CÓDIGO DE DEBUG 🛑 */}


            {/* ⭐️ RENDERIZAÇÃO DINÂMICA DO MENU ⭐️ */}
            {menuItems.map((group, index) => {
                if (!group.isVisible) return null;
                
                // Define a cor da tag e do link baseado no título
                let titleColor = "slate";
                if (group.isCrasGroup) titleColor = "green";
                else if (group.title.includes("CREAS")) titleColor = "blue";
                else if (group.title.includes("Análise")) titleColor = "purple";


                return (
                    <div key={index} className="border-t pt-3 space-y-2">
                        <h3 className={`px-3 mb-1 text-xs font-semibold text-${titleColor}-700 uppercase tracking-wider`}>
                            {group.title}
                        </h3>
                        
                        {/* Se for o grupo CRAS, usa a renderização especial para submenus dinâmicos */}
                        {group.isCrasGroup ? (
                            CRAS_UNITS.map(cras => renderCrasLinks(cras, userCrasUnit, isGestorGeral))
                        ) : (
                            // Renderiza os subitens para outros grupos
                            group.subItems?.map((item, subIndex) => renderSubMenuItem(item, subIndex, titleColor))
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
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b h-16 flex items-center justify-end px-6">
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
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
        
      </div>
    </div>
  );
}