// frontend/src/pages/ControleMSE.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
// 📌 FIX: Importa CheckCircle para resolver o erro 2304
import { Loader2, Search, UserPlus, FileText, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge'; 
import { Link } from 'react-router-dom';
import MseRegistroModal from '@/components/mse/MseRegistroModal';
import { getMseRegistros, MseRegistroResumido } from '../services/api'; 

// 📌 Constantes do CREAS (devem ser as mesmas do Back-end)
const UNIT_ID_CREAS = 1;

// 📌 FIX CRÍTICO 1: Tipagem dos KPIs (Sincronizada com o mse.routes.ts)
interface MseKpis {
    total_medidas: string;
    total_cumprimento: string;
    total_descumprimento: string;
    expirando_em_60_dias: string;
}

// 📌 FIX CRÍTICO 1: Define a interface da resposta COMPLETA da API
interface MseApiResponse {
    registros: MseRegistroResumido[];
    kpis: MseKpis;
}


export default function ControleMSE() {
    const { user } = useAuth();
    // 📌 FIX: Agora o estado 'registros' armazena MseRegistroResumido[]
    const [registros, setRegistros] = useState<MseRegistroResumido[]>([]);
    const [kpis, setKpis] = useState<MseKpis | null>(null); // Estado para armazenar os KPIs
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCadastroModalOpen, setIsCadastroModalOpen] = useState(false);
    const [registroToEdit, setRegistroToEdit] = useState<number | undefined>(undefined);

    const userUnitName = 'CREAS'; 
    
    // Função principal de busca
    const fetchMseRegistros = useCallback(async () => {
        setIsLoading(true);
        try {
            // 📌 SOLUÇÃO DE TIPAGEM: Forçar o tipo Unknown/MseApiResponse
            const response = await getMseRegistros({ q: searchTerm }) as unknown as MseApiResponse; 
            
            setRegistros(response.registros);
            setKpis(response.kpis); 
        } catch (error: any) {
            toast.error(error.message || "Erro ao carregar registros de MSE.");
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMseRegistros();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchMseRegistros]);

    // Lógicas de Ação
    const openCadastroModal = (id?: number) => {
        setRegistroToEdit(id);
        setIsCadastroModalOpen(true);
    }
    
    const getSituacaoVariant = (situacao: string) => {
        return situacao === 'CUMPRIMENTO' ? 'default' : 'destructive';
    };
    
    // Lógica para cor do KPI (Ex: Descumprimento acima de 20%)
    const getDescumprimentoStatus = () => {
        if (!kpis) return 'ok';
        const total = parseInt(kpis.total_medidas, 10);
        const descumprimento = parseInt(kpis.total_descumprimento, 10);
        const taxa = total > 0 ? (descumprimento / total) * 100 : 0;
        
        if (taxa > 20) return 'alerta';
        if (taxa > 10) return 'moderado';
        return 'ok';
    };

    if (isLoading) {
        return <div className="text-center p-10"><Loader2 className="mx-auto h-8 w-8 animate-spin" /> Carregando Controle de MSE...</div>;
    }
    
    // Alerta de acesso negado (Front-end)
    if (user?.unit_id !== UNIT_ID_CREAS && user?.role !== 'gestor') {
        return <div className="text-center p-10 text-red-600 font-semibold">ACESSO NEGADO. Este módulo é exclusivo para a unidade CREAS.</div>
    }


    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Controle Interno de MSE - {userUnitName}</h1>
            <p className="text-slate-500">Painel de gestão e monitoramento de Medidas Socioeducativas.</p>

            {/* 📌 PAINEL DE VISÃO GERAL (KPIs) */}
            {kpis && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* KPI 1: Total de Medidas */}
                    <Card className="shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total de Medidas Ativas</CardTitle>
                            <TrendingUp className="h-4 w-4 text-slate-500" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{parseInt(kpis.total_medidas, 10)}</div><p className="text-xs text-slate-500">registros na unidade</p></CardContent>
                    </Card>
                    
                    {/* KPI 2: Em Descumprimento */}
                    <Card className={`shadow-md border-l-4 ${getDescumprimentoStatus() === 'alerta' ? 'border-red-500' : 'border-yellow-500'}`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Casos em Descumprimento</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{parseInt(kpis.total_descumprimento, 10)}</div><p className="text-xs text-slate-500">Taxa de {((parseInt(kpis.total_descumprimento, 10) / parseInt(kpis.total_medidas, 10) || 0) * 100).toFixed(1)}%</p></CardContent>
                    </Card>
                    
                    {/* KPI 3: Próximas a Vencer */}
                    <Card className="shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Expirando (Próx. 60 dias)</CardTitle>
                            <Loader2 className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{parseInt(kpis.expirando_em_60_dias, 10)}</div><p className="text-xs text-slate-500">requer relatório final</p></CardContent>
                    </Card>
                    
                    {/* KPI 4: Cumprimento */}
                    <Card className="shadow-md border-l-4 border-green-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Em Cumprimento</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{parseInt(kpis.total_cumprimento, 10)}</div><p className="text-xs text-slate-500">em conformidade</p></CardContent>
                    </Card>
                </div>
            )}
            
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Lista de Registros MSE</CardTitle>
                        <CardDescription>Use a busca para filtrar por adolescente, NIS ou tipo de medida.</CardDescription>
                    </div>
                    <Button onClick={() => openCadastroModal()}><UserPlus className="mr-2 h-4 w-4" /> Novo Registro</Button>
                </CardHeader>

                <CardContent>
                    <div className="mb-4 relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome, NIS ou Medida..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Adolescente</TableHead>
                                    <TableHead>Idade</TableHead>
                                    <TableHead>Medida (Tipo)</TableHead>
                                    <TableHead>Início MSE</TableHead>
                                    <TableHead>Data Fim Est.</TableHead>
                                    <TableHead>Situação</TableHead>
                                    <TableHead>Registrado por</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {registros.length === 0 ? (
                                    <TableRow><TableCell colSpan={8} className="h-24 text-center">Nenhum registro de MSE encontrado para o CREAS.</TableCell></TableRow>
                                ) : (
                                    registros.map(reg => (
                                        <TableRow key={reg.id}>
                                            <TableCell className="font-medium">{reg.nome_adolescente}</TableCell>
                                            <TableCell>{reg.idade_atual} anos</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{reg.mse_tipo}</Badge>
                                            </TableCell>
                                            <TableCell>{new Date(reg.mse_data_inicio).toLocaleDateString('pt-BR')}</TableCell>
                                            {/* 🚨 NOTA: A data final precisa ser calculada ou retornada pela API */}
                                            <TableCell>Data Fim Est.</TableCell> 
                                            <TableCell>
                                                <Badge variant={getSituacaoVariant(reg.situacao)}>
                                                    {reg.situacao}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{reg.registrado_por}</TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => openCadastroModal(reg.id)}
                                                    className="mr-2"
                                                >
                                                    <FileText className="mr-2 h-4 w-4" /> Detalhes
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
            
            {/* Modal de Cadastro/Edição de MSE */}
            <MseRegistroModal 
                isOpen={isCadastroModalOpen}
                registroId={registroToEdit}
                onClose={() => setIsCadastroModalOpen(false)}
                onSuccess={() => {
                    setIsCadastroModalOpen(false);
                    fetchMseRegistros(); // Recarrega a lista após o sucesso
                }}
            />
        </div>
    );
}