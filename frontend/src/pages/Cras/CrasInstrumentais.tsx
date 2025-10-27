// frontend/src/pages/Cras/CrasInstrumentais.tsx
// ⭐️ ATUALIZADO: Foco no registro de Instrumentais (Atividades Coletivas e Benefícios Eventuais) ⭐️

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// ⭐️ ATUALIZADO: Adicionado HandCoins (Benefícios) ⭐️
import { PlusCircle, Loader2, FileText, HandCoins } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, Link } from 'react-router-dom';

// ⭐️ Importa AMBOS os modais ⭐️
import AtividadeFormModal from '@/components/atividades/AtividadeFormModal';
import BeneficioEventualModal from '@/components/beneficios/BeneficioEventualModal'; // ⭐️ NOVO (Ação 2)

// ⭐️ ATUALIZADO: Importa as APIs necessárias ⭐️
import { getAtividadesColetivas, getBeneficiosEventuais, AtividadeListada, BeneficioListado } from '@/services/api'; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CRAS_UNITS } from '../../hooks/usePermissoesSUAS';
// 🛑 REMOVIDO: Imports do RMA (Select, Label)

// --- (Função auxiliar de data, mantida) ---
const formatDataBrasileira = (dataString: string | null) => {
    if (!dataString) return 'N/A';
    try {
        const date = new Date(dataString);
        return new Date(date.toISOString().split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR');
    } catch (e) {
        return 'Data Inválida';
    }
}

// 🛑 REMOVIDO: Componente RmaDisplay (Ação 3) 🛑


export default function CrasInstrumentais() {
    const { unitName } = useParams<{ unitName: string }>();
    const { user } = useAuth();
    
    const currentCrasUnit = CRAS_UNITS.find(u => u.urlName === unitName);
    const unitIdParaFiltro = currentCrasUnit ? currentCrasUnit.id : user?.unit_id;

    const [isAtividadeModalOpen, setIsAtividadeModalOpen] = useState(false);
    // ⭐️ NOVO: Estado para o modal de Benefício ⭐️
    const [isBeneficioModalOpen, setIsBeneficioModalOpen] = useState(false); 

    const [atividades, setAtividades] = useState<AtividadeListada[]>([]);
    // ⭐️ NOVO: Estado para a lista de Benefícios (requerimentos) ⭐️
    const [beneficios, setBeneficios] = useState<BeneficioListado[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);

    // 🛑 REMOVIDO: Estados do RMA (isLoadingRMA, rmaData, mes, ano) 🛑

    // Função para carregar TODOS os dados da página (Atividades e Benefícios)
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // ⭐️ ATUALIZADO: Busca os dois tipos de instrumentais em paralelo ⭐️
            const [atividadesData, beneficiosData] = await Promise.all([
                getAtividadesColetivas(), // A API já filtra pela unidade do usuário
                getBeneficiosEventuais() // A API já filtra pela unidade do usuário
            ]);
            
            setAtividades(atividadesData);
            setBeneficios(beneficiosData);

        } catch (error: any) {
            toast.error(`Erro ao carregar instrumentais: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, []); // Dependência vazia, busca todos da unidade

    // Carrega os dados quando o componente é montado
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // O que fazer quando um modal de criação for bem-sucedido
    const handleSuccess = () => {
        fetchData(); // Recarrega todos os dados da página
    };

    // 🛑 REMOVIDO: handleGerarRMA 🛑


    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Instrumentais (PAIF)</h1>
                    <p className="text-slate-500">
                        Registre atividades coletivas e requerimentos de benefícios eventuais.
                    </p>
                </div>
                
                {/* ⭐️ ATUALIZADO: Botões de Ação ⭐️ */}
                <div className="flex gap-2">
                    <Button onClick={() => setIsAtividadeModalOpen(true)} variant="outline">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Registrar Atividade Coletiva
                    </Button>
                    
                    {/* ⭐️ NOVO BOTÃO (Ação 2) ⭐️ */}
                    <Button onClick={() => setIsBeneficioModalOpen(true)}>
                        <HandCoins className="mr-2 h-4 w-4" />
                        Novo Requerimento de B.E.
                    </Button>
                </div>
            </header>

            {/* 🛑 REMOVIDO: Card de Geração do RMA 🛑 */}
            {/* 🛑 REMOVIDO: {rmaData && <RmaDisplay data={rmaData} />} 🛑 */}


            {/* ⭐️ NOVO: Card para Listagem de Benefícios Eventuais Recentes ⭐️ */}
            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Benefícios Eventuais (Requerimentos)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data Solicitação</TableHead>
                                <TableHead>Requerente (Prontuário)</TableHead>
                                <TableHead>Benefício Solicitado</TableHead>
                                <TableHead>Status Parecer</TableHead>
                                <TableHead>Técnico Resp.</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" /></TableCell></TableRow>
                            ) : beneficios.length > 0 ? (
                                beneficios.map((beneficio) => (
                                    <TableRow key={beneficio.id}>
                                        <TableCell>{formatDataBrasileira(beneficio.data_solicitacao)}</TableCell>
                                        <TableCell className="font-medium">
                                            {/* O Link para o prontuário */}
                                            <Link to={`/cras/${unitName}/prontuario/${beneficio.caso_id}`} className="text-blue-600 hover:underline">
                                                {beneficio.nome_caso || `(Prontuário ID: ${beneficio.caso_id})`}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{beneficio.beneficio_solicitado}</TableCell>
                                        <TableCell>{beneficio.status_parecer}</TableCell>
                                        <TableCell>{beneficio.tecnico_nome}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                        Nenhum Requerimento de Benefício Eventual registrado nesta unidade.
                                    </TableCell>
                 </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Card para Listagem de Atividades Coletivas Recentes */}
            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Atividades Coletivas (RMA Bloco G)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Tipo de Atividade</TableHead>
                                <TableHead>Tema/Público</TableHead>
                                <TableHead>Nº Participantes</TableHead>
                                <TableHead>Registrado Por</TableHead>
                       </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                 <TableRow>
                               <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                                    </TableCell>
                                </TableRow>
             ) : atividades.length > 0 ? (
                                atividades.map((atividade) => (
                                    <TableRow key={atividade.id}>
                                        <TableCell>{formatDataBrasileira(atividade.data_atividade)}</TableCell>
                                        <TableCell className="font-medium">{atividade.tipo_atividade}</TableCell>
                                        <TableCell>{atividade.tema_grupo || atividade.publico_alvo || 'N/A'}</TableCell>
                                        <TableCell>{atividade.numero_participantes}</TableCell>
                                        <TableCell>{atividade.registrado_por}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                   <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                 Nenhuma atividade coletiva registrada ainda.
                                    </TableCell>
                                </TableRow>
                        )}
                        </TableBody>
               </Table>
                 </CardContent>
            </Card>

            {/* MODAIS (Renderizados mas ocultos) */}
            <AtividadeFormModal 
                isOpen={isAtividadeModalOpen}
                onClose={() => setIsAtividadeModalOpen(false)}
                onSuccess={handleSuccess}
            />
            
            {/* ⭐️ NOVO MODAL (Ação 2) ⭐️ */}
            <BeneficioEventualModal 
                isOpen={isBeneficioModalOpen}
                onClose={() => setIsBeneficioModalOpen(false)}
                onSuccess={handleSuccess}
            />
        </div>
    );
}