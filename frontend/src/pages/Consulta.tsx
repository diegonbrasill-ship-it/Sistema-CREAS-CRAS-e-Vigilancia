// frontend/src/pages/Consulta.tsx

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext"; 

// 🔹 Serviços e componentes
import { getCasosFiltrados, FiltrosCasos } from "../services/api"; // Importando a interface FiltrosCasos
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // 📌 NOVO: Componente Select para filtros

// 🔹 Ícones
import { FileSearch, Search, AlertTriangle, Filter } from "lucide-react"; 

// ========================================================
// 📌 Tipagem
// ========================================================
type CasoNaLista = {
  id: number;
  nome: string;
  tecRef: string;
  dataCad: string;
  bairro: string;
  unit_id: number; 
};

// Interface para o filtro ativo (Otimizada)
interface ActiveFilter {
    key: 'q' | 'status' | 'por_violencia' | 'por_bairro';
    label: string;
    placeholder: string;
    isSelect?: boolean;
    options?: { value: string; label: string }[];
}

// ========================================================
// 📌 Dados Estáticos de Filtros
// ========================================================
const FILTRO_OPCOES: ActiveFilter[] = [
    { key: 'q', label: 'Busca Geral', placeholder: 'Nome, NIS, CPF, Técnico...' },
    { key: 'status', label: 'Status do Caso', placeholder: 'Filtrar por status...', isSelect: true, options: [
        { value: 'Ativo', label: 'Ativo' },
        { value: 'Desligado', label: 'Desligado' },
        { value: 'Arquivado', label: 'Arquivado' },
        { value: 'todos', label: 'Todos os Status' },
    ]},
    // Mapeamos o label para o valor de 'filtro' que o Back-end espera
    { key: 'por_violencia', label: 'Por Tipo de Violência', placeholder: 'Ex: Negligência, Física...' },
    { key: 'por_bairro', label: 'Por Bairro', placeholder: 'Ex: Centro, Jardim...' },
];

// Função auxiliar para mapear o Key do Front-end para o campo 'filtro' do Back-end
const getFilterKeyForBackend = (key: string): string | undefined => {
    if (key === 'por_violencia') return 'por_violencia';
    if (key === 'por_bairro') return 'por_bairro';
    return undefined;
};


// ========================================================
// 📌 Componente Principal
// ========================================================
export default function Consulta() {
  const { user } = useAuth();
  const [casos, setCasos] = useState<CasoNaLista[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilterKey, setSelectedFilterKey] = useState<string>('q'); // Guarda a chave de filtro ativa
  const [selectedFilter, setSelectedFilter] = useState<ActiveFilter>(FILTRO_OPCOES[0]); // Objeto do filtro ativo

  useEffect(() => {
    const timerId = setTimeout(() => {
      fetchCasos();
    }, 300);

    return () => clearTimeout(timerId);
  }, [searchTerm, selectedFilterKey]); // 📌 Dispara fetch ao mudar busca ou filtro

  const fetchCasos = async () => {
    setIsLoading(true);
    
    const filters: FiltrosCasos = {};

    // 📌 LÓGICA DE MONTAGEM DO FILTRO PARA O BACK-END
    if (selectedFilterKey === 'q' && searchTerm) {
        // Se for busca geral, Back-end entende 'q' no filtro e searchTerm no valor.
        filters.filtro = 'q'; 
        filters.valor = searchTerm; 
    } else if (selectedFilterKey === 'status' && searchTerm) {
        filters.status = searchTerm; 
    } else if ((selectedFilterKey === 'por_violencia' || selectedFilterKey === 'por_bairro') && searchTerm) {
        // Envia a chave e o valor para os filtros específicos (que usam a estrutura filtro + valor)
        filters.filtro = getFilterKeyForBackend(selectedFilterKey);
        filters.valor = searchTerm;
    }

    // Nota: O Back-end já garante que apenas dados da unidade do usuário logado são retornados.

    try {
      const data = await getCasosFiltrados(filters);

      const casosFormatados = data.map((caso: any) => ({
        ...caso,
        dataCad: new Date(caso.dataCad).toLocaleDateString("pt-BR", {
          timeZone: "UTC",
        }),
        nome: caso.nome || '', 
      }));

      setCasos(casosFormatados);
    } catch (error: any) {
      toast.error(`Erro ao carregar casos: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFilterChange = (filterLabel: string) => {
    const newFilter = FILTRO_OPCOES.find(op => op.label === filterLabel) || FILTRO_OPCOES[0];
    setSelectedFilter(newFilter);
    setSelectedFilterKey(newFilter.key); // Atualiza a chave de filtro
    setSearchTerm(newFilter.isSelect ? (newFilter.options?.[0].value || '') : ''); // Limpa a busca ou define o valor padrão do Select
  };

  // 📌 Lógica para mostrar alerta de anonimização (Visível apenas para a Vigilância)
  const isVigilancia = user?.role === 'vigilancia';
  const displayAnonimizationWarning = isVigilancia && casos.some(caso => caso.nome.includes('DADO SIGILOSO'));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">
          Consultar Atendimentos ({user?.role.toUpperCase()} - Unit ID: {user?.unit_id})
        </h1>
        <p className="text-slate-500">
          Visualize e acesse os prontuários de casos da sua unidade de trabalho.
        </p>
      </header>

      {/* Alerta de Anonimização para Vigilância */}
      {displayAnonimizationWarning && (
        <div className="flex items-center p-3 text-sm text-yellow-800 bg-yellow-100 border border-yellow-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
          <span className="font-medium">ALERTA DE SIGILO:</span> Alguns dados nominais do CREAS estão anonimizados conforme a Lei de Proteção.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Casos Registrados</CardTitle>
          <CardDescription>
            Use os filtros avançados para refinar a busca dentro da sua unidade.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex gap-3 mb-4">
            {/* 1. SELETOR DE FILTRO AVANÇADO */}
            {/* O valor do Select é o label do filtro, que aciona o handleFilterChange */}
            <Select onValueChange={handleFilterChange} value={selectedFilter.label}> 
                <SelectTrigger className="w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Tipo de Filtro" />
                </SelectTrigger>
                <SelectContent>
                    {FILTRO_OPCOES.map(op => (
                        <SelectItem key={op.label} value={op.label}>
                            {op.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* 2. CAMPO DE BUSCA (Adaptável) */}
            {selectedFilter.isSelect ? (
                // Se for um filtro de Select (ex: Status)
                <Select onValueChange={setSearchTerm} value={searchTerm || selectedFilter.options?.[0].value}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder={selectedFilter.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {selectedFilter.options?.map(op => (
                            <SelectItem key={op.value} value={op.value}>
                                {op.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                // Se for um Input de texto livre (ex: Busca Geral, Bairro, Tipo de Violência)
                <div className="relative w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={selectedFilter.placeholder}
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            )}
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
                      Carregando casos da Unidade {user?.unit_id}...
                    </TableCell>
                  </TableRow>
                ) : casos.length > 0 ? (
                  casos.map((caso) => (
                    <TableRow key={caso.id}>
                      <TableCell className="font-medium">
                        {caso.nome}
                        {/* Indicador visual de anonimização */}
                        {caso.nome.includes('DADO SIGILOSO') && <Badge variant="secondary" className="ml-2 bg-yellow-300 text-yellow-900">SIGILO</Badge>}
                      </TableCell>
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
                      Nenhum caso encontrado na sua unidade.
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

