// frontend/src/pages/Cras/CrasProntuarioView.tsx (NOVA VERSÃO ESTÁVEL)

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCasoById, updateCasoStatus, deleteCaso, CasoDetalhado, DemandaResumida } from '../../services/api'; 
import { Loader2, ArrowLeft, Edit, Trash2, XCircle, Users, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext'; 

// Função auxiliar de formatação de data (Essencial)
const formatDataBrasileira = (dataString: string) => {
    if (!dataString) return 'N/A';
    try {
        const date = new Date(dataString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
        return 'Data Inválida';
    }
}

export default function CrasProntuarioView() {
    const { id, unitName } = useParams<{ id: string, unitName: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [caso, setCaso] = useState<CasoDetalhado | null>(null);
    const [loading, setLoading] = useState(true);
    
    const casoId = id ? parseInt(id, 10) : undefined;
    
    // 1. Carregamento do Caso
    useEffect(() => {
        if (!id || !casoId) {
            toast.error("ID do prontuário inválido.");
            navigate(`/cras/${unitName}/consulta`, { replace: true });
            return;
        }

        const loadCaso = async () => {
            try {
                const data: CasoDetalhado = await getCasoById(id);
                // O backend (casos.ts) mescla JSONB no objeto principal, por isso esta linha funciona
                setCaso(data);
            } catch (error: any) {
                console.error("Falha ao carregar prontuário:", error);
                toast.error(`Falha ao carregar prontuário: ${error.message}`);
                // Redireciona para evitar a tela quebrada
                navigate(`/cras/${unitName}/consulta`, { replace: true });
            } finally {
                setLoading(false);
            }
        };
        loadCaso();
    }, [id, casoId, navigate, unitName]);
    
    
    // 2. Funções de Ação
    const handleEdit = () => { navigate(`/cras/${unitName}/cadastro/${id}`); };
    // ... (handleDeactivate e handleDelete inalterados)
    
    if (loading) { return <div className="text-center p-10"><Loader2 className="h-8 w-8 animate-spin mx-auto" /> <span>Carregando prontuário...</span></div>; }
    if (!caso) { return <div className="text-center p-10"><XCircle className="h-8 w-8 text-red-500 mx-auto" /> Prontuário não encontrado ou inacessível.</div>; }

    const casoData = caso as any; 

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Visualização de Prontuário - {casoData.nome} (ID: {casoData.id})</h1>
            
            {/* Botões de Ação */}
            <div className="flex justify-between items-center border-b pb-4">
                <Button variant="outline" onClick={() => navigate(`/cras/${unitName}/consulta`)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a Consulta</Button>
                <div className="space-x-2">
                    <Button variant="secondary" onClick={handleEdit}><Edit className="mr-2 h-4 w-4" /> Editar Dados</Button>
                </div>
            </div>

            {/* 1. INFORMAÇÕES BÁSICAS */}
            <Card>
                <CardHeader><CardTitle className="text-xl flex items-center gap-2"><Users className='h-5 w-5'/> Informações Básicas</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div><span className="font-bold">Status:</span> {casoData.status}</div>
                    <div><span className="font-bold">Unidade de Lotação:</span> {casoData.unit_id}</div>
                    <div><span className="font-bold">Técnico de Referência:</span> {casoData.tecRef}</div>
                    <div><span className="font-bold">Data Cad.:</span> {formatDataBrasileira(casoData.dataCad)}</div>
                    
                    <div><span className="font-bold">NIS:</span> {casoData.nis || 'N/A'}</div> 
                    <div><span className="font-bold">Idade:</span> {casoData.idade || 'N/A'}</div> 
                    <div><span className="font-bold">Sexo:</span> {casoData.sexo || 'N/A'}</div> 
                    <div><span className="font-bold">Etnia:</span> {casoData.corEtnia || 'N/A'}</div> 
                    
                    <div className="col-span-4 border-t pt-2 mt-2"><CardTitle className="text-sm">Endereço e Contato</CardTitle></div>
                    
                    <div><span className="font-bold">Bairro:</span> {casoData.bairro || 'N/A'}</div> 
                    <div><span className="font-bold">Rua:</span> {casoData.rua || 'N/A'}</div> 
                    <div><span className="font-bold">Ponto de Ref.:</span> {casoData.pontoReferencia || 'N/A'}</div>
                    <div><span className="font-bold">Contato:</span> {casoData.contato || 'N/A'}</div> 
                </CardContent>
            </Card>

            {/* 2. PROGRAMAS E BENEFÍCIOS */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2"><Check className='h-5 w-5'/> Programas e Benefícios</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div><span className="font-bold">1º Inf. SUAS:</span> {casoData.primeiraInfSuas || 'N/A'}</div>
                    <div><span className="font-bold">Prop. PAI:</span> {casoData.recebePropPai || 'N/A'}</div>
                    <div><span className="font-bold">Recebe PAA:</span> {casoData.recebePAA || 'N/A'}</div>
                    <div><span className="font-bold">Recebe BPC:</span> {casoData.recebeBPC || 'N/A'}</div>
                    <div><span className="font-bold">Habitação Social:</span> {casoData.recebeHabitacaoSocial || 'N/A'}</div>
                </CardContent>
            </Card>

            
            {/* 3. DEMANDAS VINCULADAS */}
            <Card>
                <CardHeader><CardTitle className="text-xl">Outros Dados e Acompanhamentos</CardTitle></CardHeader>
                <CardContent className='space-y-4'>
                    <div className='border-b pb-2'><span className='font-bold text-slate-700'>Demandas Vinculadas ({casoData.demandasVinculadas?.length || 0}):</span></div>
                    {casoData.demandasVinculadas?.length > 0 ? (
                        <ul className='list-disc ml-5'>
                            {casoData.demandasVinculadas.map((demanda: DemandaResumida, index: number) => (
                                <li key={index} className='text-sm'>
                                    <span className='font-medium'>{demanda.tipo_documento}</span> de {formatDataBrasileira(demanda.data_recebimento)} ({demanda.status})
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className='text-slate-500'>Nenhuma demanda vinculada a este caso.</p>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}