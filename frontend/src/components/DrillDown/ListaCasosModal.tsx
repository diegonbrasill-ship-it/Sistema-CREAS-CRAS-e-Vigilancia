import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Eye } from "lucide-react";
import { type CasoDrilldownListItem } from "@/services/casosDrilldown";

// A prop 'className' foi removida para simplificar
interface ListaCasosModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  cases: CasoDrilldownListItem[];
  isLoading: boolean;
  errorMessage?: string | null;
}

const formatCaseDate = (value?: string) => {
  if (!value) return "---";

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

export default function ListaCasosModal({ isOpen, onClose, title, cases, isLoading, errorMessage }: ListaCasosModalProps  ) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* 📌 A CORREÇÃO ESTÁ AQUI 
        Adicionamos a propriedade 'style' para forçar o z-index.
        Isso garante que o modal sempre apareça na frente de outros elementos, como o mapa.
      */}
      <DialogContent
        className="max-w-4xl h-[80vh] flex flex-col"
        style={{ zIndex: 2000 }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          <DialogDescription>
            {errorMessage
              ? errorMessage
              : `Lista detalhada de casos correspondentes ao indicador selecionado.${cases.length > 0 ? ` Total: ${cases.length} caso(s).` : ""}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
              <p className="ml-4 text-slate-500">Buscando casos...</p>
            </div>
          ) : errorMessage ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-600">
              {errorMessage}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID do Caso</TableHead>
                  <TableHead>Nome (Vítima)</TableHead>
                  <TableHead>Técnico Resp.</TableHead>
                  <TableHead>Bairro</TableHead>
                  <TableHead>Data Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.length > 0 ? (
                  cases.map((caso) => (
                    <TableRow key={caso.id}>
                      <TableCell className="font-medium">{caso.id}</TableCell>
                      <TableCell>{caso.nome || '---'}</TableCell>
                      <TableCell>{caso.tec_ref}</TableCell>
                      <TableCell>{caso.bairro || 'Não informado'}</TableCell>
                      <TableCell>{formatCaseDate(caso.data_cad)}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/caso/${caso.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Prontuário
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Nenhum caso encontrado para este filtro.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
