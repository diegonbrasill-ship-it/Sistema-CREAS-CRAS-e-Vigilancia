// frontend/src/pages/ControleMSE.tsx

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Loader2, Search, UserPlus, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge'; 
import { Link } from 'react-router-dom';

// 📌 FIX CRÍTICO: Corrigindo o caminho de importação para ../services/api
import { getMseRegistros, MseRegistroResumido } from '../services/api'; 
import MseRegistroModal from '@/components/mse/MseRegistroModal'; // Importa o modal de cadastro/edição


// 📌 Constante do CREAS (deve ser a mesma do Back-end)
const UNIT_ID_CREAS = 1;


export default function ControleMSE() {
    const { user } = useAuth();
    const [registros, setRegistros] = useState<MseRegistroResumido[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCadastroModalOpen, setIsCadastroModalOpen] = useState(false);
    const [registroToEdit, setRegistroToEdit] = useState<number | undefined>(undefined);

    // Nome da unidade do usuário logado (usado apenas para exibição)
    const userUnitName = 'CREAS'; 
    
    // Função principal de busca (agora real)
    const fetchMseRegistros = async () => {
        setIsLoading(true);
        try {
            // A API já filtra automaticamente para a unidade CREAS (Unit ID 1)
            const data = await getMseRegistros({ q: searchTerm });
            setRegistros(data);
        } catch (error: any) {
            // O 403 (acesso negado) é tratado aqui se o middleware authorizeCreasOnly bloquear
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMseRegistros();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Lógicas de Ação
    const openCadastroModal = (id?: number) => {
        setRegistroToEdit(id);
        setIsCadastroModalOpen(true);
    }
    
    const getSituacaoVariant = (situacao: string) => {
        return situacao === 'CUMPRIMENTO' ? 'default' : 'destructive';
    };


    if (isLoading) {
        return <div className="text-center p-10"><Loader2 className="mx-auto h-8 w-8 animate-spin" /> Carregando Controle de MSE...</div>;
    }
    
    // 🚨 Aviso: Se o Back-end retornou um erro 403 (não é CREAS), o Front-end deve ser avisado
    if (user?.unit_id !== UNIT_ID_CREAS && user?.role !== 'gestor') {
        return <div className="text-center p-10 text-red-600 font-semibold">ACESSO NEGADO. Este módulo é exclusivo para a unidade CREAS.</div>
    }


    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Controle Interno de MSE - {userUnitName}</h1>
            <p className="text-slate-500">Gestão exclusiva dos registros de Medida Socioeducativa da sua unidade ({user?.unit_id}).</p>

            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Registros Ativos de Adolescentes</CardTitle>
                        <CardDescription>Lista de MSEs sob acompanhamento.</CardDescription>
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
                                    <TableHead>Situação</TableHead>
                                    <TableHead>Registrado por</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {registros.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="h-24 text-center">Nenhum registro de MSE encontrado para o CREAS.</TableCell></TableRow>
                                ) : (
                                    registros.map(reg => (
                                        <TableRow key={reg.id}>
                                            <TableCell className="font-medium">{reg.nome_adolescente}</TableCell>
                                            <TableCell>{reg.idade_atual} anos</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{reg.mse_tipo}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getSituacaoVariant(reg.situacao)}>
                                                    {reg.situacao}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{new Date(reg.mse_data_inicio).toLocaleDateString('pt-BR')}</TableCell>
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