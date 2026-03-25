import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type CasoAcompanhamento = {
  id: number;
  tecRef: string;
  data: string;
  texto: string;
};

type Props = {
  acompanhamentos: CasoAcompanhamento[];
  novoAcompanhamento: string;
  isSaving: boolean;
  onNovoAcompanhamentoChange: (value: string) => void;
  onSalvar: () => void;
};

export function CasoAcompanhamentosCard({
  acompanhamentos,
  novoAcompanhamento,
  isSaving,
  onNovoAcompanhamentoChange,
  onSalvar,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Acompanhamentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="novo-acompanhamento" className="text-base">
            Registrar Nova Evolução / Atendimento
          </Label>
          <Textarea
            id="novo-acompanhamento"
            placeholder="Descreva aqui o atendimento, encaminhamento, visita domiciliar ou evolução do caso..."
            value={novoAcompanhamento}
            onChange={(event) => onNovoAcompanhamentoChange(event.target.value)}
            rows={4}
          />
          <Button onClick={onSalvar} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Acompanhamento
          </Button>
        </div>
        <div className="space-y-4 border-t pt-4">
          {acompanhamentos.length > 0 ? (
            acompanhamentos.map((acompanhamento) => (
              <div key={acompanhamento.id} className="rounded-md border bg-slate-50 p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                  <p>
                    Registrado por: <span className="font-semibold">{acompanhamento.tecRef}</span>
                  </p>
                  <p>{new Date(acompanhamento.data).toLocaleString("pt-BR")}</p>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-700">{acompanhamento.texto}</p>
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-slate-500">Nenhum acompanhamento registrado para este caso.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
