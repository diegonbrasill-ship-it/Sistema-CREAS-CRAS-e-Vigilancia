import { Minimize, Presentation } from "lucide-react";

import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  isPresentationMode: boolean;
  onTogglePresentationMode: () => void;
}

export function DashboardHeader({
  isPresentationMode,
  onTogglePresentationMode,
}: DashboardHeaderProps) {
  return (
    <div className="flex justify-between items-start flex-wrap gap-2">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard PAEFI</h1>
        <p className="text-slate-500">Análise de dados, perfil dos atendidos e fluxo dos serviços.</p>
      </div>
      <Button variant="outline" size="sm" onClick={onTogglePresentationMode} title="Ativar/Desativar Modo Apresentação">
        {isPresentationMode ? <Minimize className="mr-2 h-4 w-4" /> : <Presentation className="mr-2 h-4 w-4" />}
        {isPresentationMode ? "Sair" : "Apresentar"}
      </Button>
    </div>
  );
}
