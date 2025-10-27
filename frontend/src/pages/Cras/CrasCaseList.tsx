// frontend/src/pages/Cras/CrasCaseList.tsx 
// ⭐️ Padrão de Nomenclatura: 'CaseList' indica a responsabilidade de listagem/consulta. ⭐️

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Search as SearchIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';

// 🛑 NOVAS IMPORTAÇÕES: Usando a interface padronizada CaseListEntry
import { listCrasCases, CaseListEntry } from '../../services/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// Importação do usePermissoesSUAS (para obter a constante CRAS_UNITS)
import { CRAS_UNITS } from '../../hooks/usePermissoesSUAS'; 


// ⭐️ NOVO NOME DO COMPONENTE: CrasCaseList ⭐️
export default function CrasCaseList() {
    const navigate = useNavigate();
    const { unitName } = useParams<{ unitName: string }>(); // Captura o nome da unidade da URL

    // Mapear o unitName para unitId usando a constante importada
    const currentCrasUnit = CRAS_UNITS.find(u => u.urlName === unitName);
    // O ID é enviado como string, conforme exigido por URLSearchParams/query params
    const unitIdParaFiltro = currentCrasUnit ? currentCrasUnit.id.toString() : undefined;


    // 🛑 ATUALIZADO: Usando a interface CaseListEntry 🛑
    const [casos, setCasos] = useState<CaseListEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Função para carregar os dados
    const fetchCasos = async () => {
        setLoading(true);
        setError(null);

        // Se o unitName for inválido, paramos a requisição
        if (!unitIdParaFiltro) {
            // No Front-end, para o Gestor Geral que quer ver TODOS, o Back-end
            // deve responder. Mas para o Servidor CRAS, o unitIdParaFiltro é obrigatório.
            // Vamos assumir que, se o Front-end não forneceu, a rota está sendo acessada incorretamente.
            setError("Erro de Roteamento: Unidade CRAS não identificada na URL.");
            setLoading(false);
            return;
        }

        try {
            // listCrasCases usa o filtro para buscar apenas casos daquela unidade (Risco A mitigado)
            const data = await listCrasCases({ unitId: unitIdParaFiltro }); 
            setCasos(data);
        } catch (err: any) {
            console.error("Erro ao carregar lista de casos CRAS:", err);
            setError("Não foi possível carregar a lista de casos. Verifique o servidor.");
            toast.error("Erro de comunicação com o servidor.");
        } finally {
            setLoading(false);
        }
    };

    // Efeito para carregar os dados na montagem
    useEffect(() => {
        // Dependência de fetchCasos removida (é uma função de fora), mas a dependência
        // de unitName é mantida.
        fetchCasos();
    }, [unitName, unitIdParaFiltro]); // Adicionado unitIdParaFiltro como dependência de segurança

    // Handler para "Ver Prontuário"
    const handleViewProntuario = (casoId: number) => {
        // ⭐️ ROTA ATUALIZADA: Redireciona para o componente de detalhe (CrasCaseDetail.tsx) ⭐️
        navigate(`/cras/${unitName}/prontuario/${casoId}`);
    };

    // Handler para "Novo Cadastro"
    const handleNewCase = () => {
        // ⭐️ ROTA ATUALIZADA: Redireciona para o componente de formulário (CrasCaseForm.tsx) ⭐️
        navigate(`/cras/${unitName}/cadastro`);
    };
    
    // Função auxiliar de formatação de data (simples)
    const formatData = (dataString: string) => {
        try {
            return new Date(dataString).toLocaleDateString('pt-BR');
        } catch {
            return 'N/A';
        }
    }

    if (loading) {
        return <div className="text-center p-10"><Loader2 className="h-8 w-8 animate-spin mx-auto" /> <span>Carregando listagem...</span></div>;
    }
    
    if (error) {
        return <div className="text-center p-10 text-red-600">{error}</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    Consulta e Listagem de Casos CRAS - {currentCrasUnit?.name || unitName}
                    <div className='space-x-2'>
                        <Button onClick={fetchCasos} variant="outline" size="sm">
                            <SearchIcon className="h-4 w-4 mr-2" /> Recarregar
                        </Button>
                        <Button onClick={handleNewCase} size="sm">
                            + Novo Cadastro
                        </Button>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {casos.length === 0 ? (
                    <p className="text-slate-500">Nenhum registro de caso ativo encontrado para esta unidade.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">ID</TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>Técnico Ref.</TableHead>
                                <TableHead>Data Cad.</TableHead>
                                <TableHead>Bairro</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {casos.map((caso) => (
                                <TableRow key={caso.id}>
                                    <TableCell className="font-medium">{caso.id}</TableCell>
                                    <TableCell>{caso.nome}</TableCell>
                                    <TableCell>{caso.tecRef}</TableCell>
                                    <TableCell>{formatData(caso.dataCad)}</TableCell>
                                    <TableCell>{caso.bairro || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            onClick={() => handleViewProntuario(caso.id)} 
                                            variant="link" 
                                            size="sm"
                                        >
                                            Ver Prontuário
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}