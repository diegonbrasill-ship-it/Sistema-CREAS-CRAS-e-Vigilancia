import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { getDemandas, Demanda } from "../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, FileText } from "lucide-react";
// 1. Importando nosso novo componente de formulário
import DemandaFormModal from "@/components/demandas/DemandaFormModal";

export default function Demandas() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // 2. Novo estado para controlar a visibilidade do modal do formulário
  const [isFormOpen, setIsFormOpen] = useState(false);

  // 3. A lógica de busca foi movida para uma função reutilizável
  const fetchDemandas = async () => {
    try {
      setIsLoading(true);
      const data = await getDemandas();
      setDemandas(data);
    } catch (error: any) {
      toast.error(`Erro ao carregar demandas: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Efeito para buscar as demandas quando a página carrega pela primeira vez
  useEffect(() => {
    fetchDemandas();
  }, []);

  // Função para dar cor ao status da demanda
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'finalizada':
        return 'default';
      case 'em andamento':
        return 'secondary';
      case 'nova':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  
  // 4. Esta função é chamada pelo modal após um registro bem-sucedido
  const handleSuccess = () => {
    fetchDemandas(); // Re-busca a lista de demandas para mostrar o novo item
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Demandas</h1>
          <p className="text-slate-500">
            Controle e organize os ofícios, memorandos e encaminhamentos recebidos.
          </p>
        </div>
        {/* 5. O botão agora abre o modal do formulário */}
        <Button onClick={() => setIsFormOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Registrar Nova Demanda
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Demandas Recebidas</CardTitle>
          <CardDescription>
            Lista de todas as solicitações externas registradas no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Instituição de Origem</TableHead>
                  <TableHead>Caso Associado</TableHead>
                  <TableHead>Técnico Designado</TableHead>
                  <TableHead>Data de Recebimento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : demandas.length > 0 ? (
                  demandas.map((demanda) => (
                    <TableRow key={demanda.id}>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(demanda.status)}>{demanda.status}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{demanda.instituicao_origem}</TableCell>
                      <TableCell>
                        {demanda.caso_id ? (
                          <Link to={`/caso/${demanda.caso_id}`} className="text-blue-600 hover:underline">
                            {demanda.nome_caso || `ID: ${demanda.caso_id}`}
                          </Link>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>{demanda.tecnico_designado}</TableCell>
                      <TableCell>{new Date(demanda.data_recebimento).toLocaleDateString("pt-BR", { timeZone: 'UTC' })}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/demandas/${demanda.id}`}>
                            <FileText className="mr-2 h-4 w-4" />
                            Ver Detalhes
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                      Nenhuma demanda registrada até o momento.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* 6. Renderizamos o nosso novo componente de modal */}
      <DemandaFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}