// frontend/src/pages/Cras/CrasConsulta.tsx (VERSÃO FINAL E FUNCIONAL CORRIGIDA)

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Search as SearchIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';

// 🛑 NOVAS IMPORTAÇÕES NECESSÁRIAS:
import { listCrasCases, CasoListagem } from '../../services/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CRAS_UNITS } from '../../hooks/usePermissoesSUAS'; 


export default function CrasConsulta() {
    const navigate = useNavigate();
    const { unitName } = useParams<{ unitName: string }>(); // Captura o nome da unidade da URL

    // 🛑 CORREÇÃO: Mapear o unitName para unitId usando a constante importada
    const currentCrasUnit = CRAS_UNITS.find(u => u.urlName === unitName);
    const unitIdParaFiltro = currentCrasUnit ? currentCrasUnit.id.toString() : undefined;


    const [casos, setCasos] = useState<CasoListagem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Função para carregar os dados
    const fetchCasos = async () => {
        setLoading(true);
        setError(null);

        // ⚠️ Se o unitName for inválido, paramos a requisição
        if (!unitIdParaFiltro) {
            setError("Erro de Roteamento: Unidade CRAS não identificada.");
            setLoading(false);
            return;
        }

        try {
            // 🛑 CORREÇÃO FINAL: Passamos o objeto de filtro, agora aceito pela função listCrasCases
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
        // Recarrega os casos sempre que o unitName na URL muda
        fetchCasos();
    }, [unitName]); // 🛑 Adiciona unitName às dependências

    // Handler para "Ver Prontuário"
    const handleViewProntuario = (casoId: number) => {
        // Redireciona para a rota de visualização correta
        navigate(`/cras/${unitName}/prontuario/${casoId}`);
    };

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
                    <Button onClick={fetchCasos} variant="outline" size="sm">
                        <SearchIcon className="h-4 w-4 mr-2" /> Recarregar
                    </Button>
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
                                    <TableCell>{new Date(caso.dataCad).toLocaleDateString('pt-BR')}</TableCell>
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