import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="w-60 bg-white shadow-md h-full p-6 space-y-6">
      <h2 className="text-xl font-bold text-blue-700">Vigilância</h2>
      <nav className="flex flex-col space-y-4">
        <Link to="/cadastro" className="hover:text-blue-600">📋 Cadastro</Link>
        <Link to="/consulta" className="hover:text-blue-600">🔍 Consultar</Link>
        <Link to="/dashboard" className="hover:text-blue-600">📊 Dashboard</Link>
        <Link to="/painel-vigilancia" className="hover:text-red-600">🚨 Painel de Vigilância</Link>
        <Link to="/relatorios" className="hover:text-blue-600">📑 Relatórios</Link>
        <Link to="/integracoes" className="hover:text-blue-600">🔗 Integrações</Link>
      </nav>
    </aside>
  );
}
