// frontend/src/pages/Consulta.tsx

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

// 🔹 Serviços e componentes
// 1. ALTERADO: Importamos a função correta que agora existe no nosso api.ts
import { getCasosFiltrados } from "../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

// 🔹 Ícones
import { FileSearch, Search } from "lucide-react";

// ========================================================
// 📌 Tipagem (sem alterações)
// ========================================================
type CasoNaLista = {
  id: number;
  nome: string;
  tecRef: string;
  dataCad: string;
  bairro: string;
};

// ========================================================
// 📌 Componente Principal
// ========================================================
export default function Consulta() {
  const [casos, setCasos] = useState<CasoNaLista[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const timerId = setTimeout(() => {
      fetchCasos();
    }, 300);

    return () => clearTimeout(timerId);
  }, [searchTerm]);

  const fetchCasos = async () => {
    setIsLoading(true);
    try {
      // 2. ALTERADO: Usamos a nova função getCasosFiltrados.
      // A estrutura do filtro { tecRef: searchTerm } já é compatível.
      const data = await getCasosFiltrados({ tecRef: searchTerm });

      const casosFormatados = data.map((caso: any) => ({
        ...caso,
        dataCad: new Date(caso.dataCad).toLocaleDateString("pt-BR", {
          timeZone: "UTC",
        }),
      }));

      setCasos(casosFormatados);
    } catch (error: any) {
      toast.error(`Erro ao carregar casos: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================================
  // 📌 Renderização (sem alterações)
  // ========================================================
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">
          Consultar Atendimentos
        </h1>
        <p className="text-slate-500">
          Visualize e acesse os prontuários de todos os casos registrados.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Casos Registrados</CardTitle>
          <CardDescription>
            Busque por técnico ou navegue pela lista completa de atendimentos.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-4 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do Técnico de Referência..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Vítima</TableHead>
                  <TableHead>Técnico de Ref.</TableHead>
                  <TableHead>Data do Cadastro</TableHead>
                  <TableHead>Bairro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : casos.length > 0 ? (
                  casos.map((caso) => (
                    <TableRow key={caso.id}>
                      <TableCell className="font-medium">{caso.nome}</TableCell>
                      <TableCell>{caso.tecRef}</TableCell>
                      <TableCell>{caso.dataCad}</TableCell>
                      <TableCell>{caso.bairro}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/caso/${caso.id}`}>
                            <FileSearch className="mr-2 h-4 w-4" />
                            Ver Prontuário
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Nenhum caso encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

