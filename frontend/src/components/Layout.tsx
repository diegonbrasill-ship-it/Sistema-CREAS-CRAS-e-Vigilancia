// frontend/src/components/Layout.tsx

import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
// 1. Adicionado o ícone 'Inbox' para o novo menu
import { LayoutDashboard, PlusCircle, Search, User, LogOut, BarChart3, Settings, FileText, Users, Inbox } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// 2. Adicionado o novo item de menu "Gestão de Demandas"
const navItemsAtendimento = [
  { href: "/cadastro", icon: PlusCircle, label: "Coleta de Dados" },
  { href: "/consulta", icon: Search, label: "Consultar Caso" },
  { href: "/demandas", icon: Inbox, label: "Gestão de Demandas" }, // <-- NOVO ITEM
];
const navItemsAnalise = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/painel-vigilancia", icon: BarChart3, label: "Painel de Vigilância" },
    { href: "/relatorios", icon: FileText, label: "Relatórios" },
    { href: "/integracoes", icon: Settings, label: "Integrações" },
];
const navItemsAdmin = [
    { href: "/gerenciar-usuarios", icon: Users, label: "Gerenciar Usuários" },
];


export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const username = user?.username || "Usuário";
  const userRole = user?.role || null;

  return (
    <div className="min-h-screen w-full bg-slate-100 flex">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r flex flex-col shadow-sm">
        <div className="p-4 border-b flex items-center gap-3">
          <img src="/logos/rmsuas-logo.svg" alt="RMSUAS Logo" className="h-10" />
          <div>
            <h1 className="text-base font-bold text-slate-800">RMSUAS</h1>
            <p className="text-xs text-slate-500">Patos/PB</p>
          </div>
        </div>
        
        <nav className="flex-1 p-2 space-y-4">
          {/* GRUPO DE ATENDIMENTO */}
          <div>
            <h2 className="px-3 mb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Atendimento</h2>
            {navItemsAtendimento.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link key={item.label} to={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* GRUPO DE ANÁLISE E GESTÃO */}
          <div>
            <h2 className="px-3 mb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Análise e Gestão</h2>
            {navItemsAnalise.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.label} to={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* GRUPO DE ADMINISTRAÇÃO */}
          {userRole && ['coordenador', 'gestor'].includes(userRole) && (
            <div>
              <h2 className="px-3 mb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Administração</h2>
              {navItemsAdmin.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link key={item.label} to={item.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
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
                <User className="h-5 w-5 text-slate-600" />
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
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}