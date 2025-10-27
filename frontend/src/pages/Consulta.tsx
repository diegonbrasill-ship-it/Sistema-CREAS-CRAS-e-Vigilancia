// frontend/src/pages/Consulta.tsx

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext"; 

// 🔹 Serviços e componentes
import { getCasosFiltrados, FiltrosCasos, CaseListEntry } from "../services/api"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 

// 🔹 Ícones
import { FileSearch, Search, AlertTriangle, Filter } from "lucide-react"; 

// ========================================================
// 📌 Tipagem Local (Mantida para ActiveFilter)
// ========================================================
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
    { key: 'por_violencia', label: 'Por Tipo de Violência', placeholder: 'Ex: Negligência, Física...' },
    { key: 'por_bairro', label: 'Por Bairro', placeholder: 'Ex: Centro, Jardim...' },
];

// Função auxiliar para mapear o Key do Front-end para o campo 'filtro' do Back-end
const getFilterKeyForBackend = (key: string): string | undefined => {
    // Para filtros específicos (que não são 'q' ou 'status'), usamos o prefixo 'por_'
    if (key === 'por_violencia') return 'por_violencia';
    if (key === 'por_bairro') return 'por_bairro';
    return undefined;
};


// ========================================================
// 📌 Componente Principal
// ========================================================
export default function Consulta() {
  const { user } = useAuth();
  // ⭐️ Usando a interface CaseListEntry ⭐️
  const [casos, setCasos] = useState<CaseListEntry[]>([]);
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
        // ⭐️ CORRIGIDO: Usa a nova propriedade 'q' da interface FiltrosCasos ⭐️
        filters.q = searchTerm; 
    } else if (selectedFilterKey === 'status' && searchTerm) {
        filters.status = searchTerm; 
    } else if ((selectedFilterKey === 'por_violencia' || selectedFilterKey === 'por_bairro') && searchTerm) {
        // Filtros que usam a estrutura filtro + valor
        filters.filtro = getFilterKeyForBackend(selectedFilterKey);
        filters.valor = searchTerm;
    }

    try {
      // getCasosFiltrados retorna CaseListEntry[]
      const data: CaseListEntry[] = await getCasosFiltrados(filters);

      // Mapeamento para garantir que a data seja um objeto Date para a Tabela
      const casosFormatados = data.map((caso: CaseListEntry) => ({
        ...caso,
        // Converte a data para um formato que a função formatTableDate possa usar
        dataCad: new Date(caso.dataCad).toISOString(), 
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
    // Limpa a busca ou define o valor padrão do Select
    setSearchTerm(newFilter.isSelect ? (newFilter.options?.[0].value || '') : ''); 
  };
  
  // Função auxiliar para formatação de data na tabela
  const formatTableDate = (dataString: string): string => {
    try {
      return new Date(dataString).toLocaleDateString("pt-BR", {
        timeZone: "UTC",
      });
    } catch {
      return 'N/A';
    }
  };

  // 📌 Lógica para mostrar alerta de anonimização (Visível apenas para a Vigilância)
  const isVigilancia = user?.role === 'vigilancia';
  // O Back-end coloca 'SIGILOSO' no nome quando a Vigilância acessa casos CREAS
  const displayAnonimizationWarning = isVigilancia && casos.some(caso => caso.nome.includes('SIGILOSO'));

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
                // Se for um Input de texto livre (Busca Geral, Bairro, Tipo de Violência)
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
                        {/* Indicador visual de anonimização (SIGILO é o texto do backend) */}
                        {caso.nome && caso.nome.includes('SIGILOSO') && <Badge variant="secondary" className="ml-2 bg-yellow-300 text-yellow-900">SIGILO</Badge>}
                      </TableCell>
                      <TableCell>{caso.tecRef}</TableCell>
                      <TableCell>{formatTableDate(caso.dataCad)}</TableCell>
                      <TableCell>{caso.bairro || 'N/A'}</TableCell>
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

