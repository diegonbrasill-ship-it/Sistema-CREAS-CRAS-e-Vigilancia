import { Minimize, Presentation, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  isPresentationMode: boolean;
  isPrinting: boolean;
  canPrint: boolean;
  onTogglePresentationMode: () => void;
  onPrint: () => void;
}

export function DashboardHeader({
  isPresentationMode,
  isPrinting,
  canPrint,
  onTogglePresentationMode,
  onPrint,
}: DashboardHeaderProps) {
  return (
    <div className="flex justify-between items-start flex-wrap gap-2">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard PAEFI</h1>
        <p className="text-slate-500">Análise de dados, perfil dos atendidos e fluxo dos serviços.</p>
      </div>
      <div className="flex items-center gap-2 no-print">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrint}
          disabled={!canPrint || isPrinting}
          title="Imprimir ou salvar em PDF"
        >
          <Printer className="mr-2 h-4 w-4" />
          {isPrinting ? "Preparando..." : "Imprimir"}
        </Button>
        <Button variant="outline" size="sm" onClick={onTogglePresentationMode} title="Ativar/Desativar Modo Apresentação">
          {isPresentationMode ? <Minimize className="mr-2 h-4 w-4" /> : <Presentation className="mr-2 h-4 w-4" />}
          {isPresentationMode ? "Sair" : "Apresentar"}
        </Button>
      </div>
    </div>
  );
}
