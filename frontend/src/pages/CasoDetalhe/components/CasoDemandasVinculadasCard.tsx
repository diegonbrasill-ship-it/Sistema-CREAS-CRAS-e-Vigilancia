import { Link } from "react-router-dom";
import { Inbox, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DemandaResumida } from "@/services/api";

export function CasoDemandasVinculadasCard({ demandas }: { demandas: DemandaResumida[] }) {
  if (demandas.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Inbox className="mr-2 h-5 w-5 text-slate-600" />
          Demandas Externas Vinculadas
        </CardTitle>
        <CardDescription>Histórico de ofícios e solicitações formais associadas a este caso.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {demandas.map((demanda) => (
          <div key={demanda.id} className="flex items-center justify-between rounded-md border bg-slate-50 p-3 transition-colors hover:bg-slate-100">
            <div>
              <p className="font-semibold text-slate-800">
                {demanda.tipo_documento} - {demanda.instituicao_origem}
              </p>
              <p className="text-xs text-slate-500">
                Recebido em: {new Date(demanda.data_recebimento).toLocaleDateString("pt-BR", { timeZone: "UTC" })} | Status: {demanda.status}
              </p>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link to={`/demandas/${demanda.id}`}>
                <FileText className="mr-2 h-4 w-4" />
                Ver Detalhes
              </Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
