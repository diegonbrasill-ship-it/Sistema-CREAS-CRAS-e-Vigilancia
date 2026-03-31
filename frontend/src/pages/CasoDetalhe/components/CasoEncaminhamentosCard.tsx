import { CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CasoEncaminhamento } from "@/services/api";

const LISTA_DE_SERVICOS = [
  "CRAS",
  "CREAS",
  "Conselho Tutelar",
  "Ministério Público",
  "Defensoria Pública",
  "Poder Judiciário",
  "Delegacia Especializada de Atendimento à Mulher (DEAM)",
  "Delegacia de Proteção à Criança e ao Adolescente (DPCA)",
  "Centro de Referência da Mulher",
  "CAPS I (Infantil)",
  "CAPS AD (Álcool e Drogas)",
  "CAPS III (Transtorno Mental)",
  "Unidade de Saúde (UBS/PSF)",
  "Maternidade / Hospital",
  "Secretaria de Educação",
  "Secretaria de Habitação",
  "INSS",
  "Programa Criança Feliz",
  "Serviço de Convivência e Fortalecimento de Vínculos (SCFV)",
  "Consultório na Rua",
  "Abordagem Social",
  "Centro POP",
  "Acolhimento Institucional (Abrigo)",
  "Outros",
];

type Props = {
  encaminhamentos: CasoEncaminhamento[];
  isSavingEnc: boolean;
  updatingEncId: number | null;
  novoEncaminhamentoServico: string;
  novoEncaminhamentoData: string;
  novoEncaminhamentoObs: string;
  onNovoEncaminhamentoServicoChange: (value: string) => void;
  onNovoEncaminhamentoDataChange: (value: string) => void;
  onNovoEncaminhamentoObsChange: (value: string) => void;
  onSalvar: () => void;
  onAtualizarStatus: (encaminhamentoId: number, novoStatus: string) => void;
};

export function CasoEncaminhamentosCard({
  encaminhamentos,
  isSavingEnc,
  updatingEncId,
  novoEncaminhamentoServico,
  novoEncaminhamentoData,
  novoEncaminhamentoObs,
  onNovoEncaminhamentoServicoChange,
  onNovoEncaminhamentoDataChange,
  onNovoEncaminhamentoObsChange,
  onSalvar,
  onAtualizarStatus,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestão de Encaminhamentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 rounded-lg border bg-slate-50 p-4">
          <h3 className="text-md font-semibold">Registrar Novo Encaminhamento</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="servico-destino">Serviço de Destino</Label>
              <Select value={novoEncaminhamentoServico} onValueChange={onNovoEncaminhamentoServicoChange}>
                <SelectTrigger id="servico-destino">
                  <SelectValue placeholder="Selecione o serviço..." />
                </SelectTrigger>
                <SelectContent>
                  {LISTA_DE_SERVICOS.map((servico) => (
                    <SelectItem key={servico} value={servico}>
                      {servico}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="data-encaminhamento">Data do Encaminhamento</Label>
              <Input
                id="data-encaminhamento"
                type="date"
                value={novoEncaminhamentoData}
                onChange={(event) => onNovoEncaminhamentoDataChange(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="obs-encaminhamento">Observações</Label>
            <Textarea
              id="obs-encaminhamento"
              placeholder="Detalhes do encaminhamento, contatos, etc..."
              value={novoEncaminhamentoObs}
              onChange={(event) => onNovoEncaminhamentoObsChange(event.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={onSalvar} disabled={isSavingEnc}>
            {isSavingEnc && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Encaminhamento
          </Button>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h3 className="mb-2 text-md font-semibold">Histórico de Encaminhamentos</h3>
          {encaminhamentos.length > 0 ? (
            encaminhamentos.map((encaminhamento) => {
              const isUpdating = updatingEncId === encaminhamento.id;

              return (
                <div key={encaminhamento.id} className="rounded-md border bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{encaminhamento.servico_destino}</p>
                      <p className="text-xs text-slate-500">
                        Encaminhado por: <span className="font-semibold">{encaminhamento.tec_ref}</span> em{" "}
                        {new Date(encaminhamento.data_encaminhamento).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${
                        encaminhamento.status === "Pendente" ? "bg-yellow-200 text-yellow-800" : "bg-green-200 text-green-800"
                      }`}
                    >
                      {encaminhamento.status}
                    </span>
                  </div>
                  {encaminhamento.observacoes && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{encaminhamento.observacoes}</p>
                  )}
                  {encaminhamento.status === "Pendente" && (
                    <div className="mt-3 flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => onAtualizarStatus(encaminhamento.id, "Realizado")} disabled={isUpdating}>
                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        Marcar como Realizado
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="py-4 text-center text-sm text-slate-500">Nenhum encaminhamento registrado para este caso.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
