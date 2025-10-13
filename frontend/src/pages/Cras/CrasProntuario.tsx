// frontend/src/pages/Cras/CrasProntuario.tsx

import React, { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import { toast } from "react-toastify";
import { Loader2, ArrowLeft, Save, Eraser } from "lucide-react";

// Importações de UI 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// Importações de API (Assumimos que estas funções existem no seu api.ts)
import { createCase, updateCase, getCasoById, CasoDetalhado } from "../../services/api"; 

// ⭐️ CONSTANTES CORRIGIDAS E REAIS DO PROJETO (REPLICADAS DA SIDEBAR) ⭐️
const CRAS_UNITS = [
    { id: 2, name: "CRAS Geralda Medeiros", urlName: "geralda-medeiros" },
    { id: 3, name: "CRAS Mariana Alves", urlName: "mariana-alves" },
    { id: 4, name: "CRAS Matheus Leitão", urlName: "matheus-leitao" },
    { id: 5, name: "CRAS Severina Celestino", urlName: "severina-celestino" },
];


// --- ESQUEMA DE VALIDAÇÃO (CRAS) ---
const formSchema = z.object({
    // Campos principais (obrigatórios)
    dataCad: z.string().min(1, "A data do cadastro é obrigatória."),
    tecRef: z.string().min(3, "O nome do técnico é obrigatório."),
    
    // 1. Dados de Identificação (Padrão + Novos)
    nome: z.string().optional().nullable(),
    nis: z.string().optional().nullable(), 
    idade: z.string().optional().nullable(),
    sexo: z.string().optional().nullable(),
    corEtnia: z.string().optional().nullable(),
    
    // ⭐️ CAMPOS ESPECÍFICOS CRAS (Endereço e Contato)
    bairro: z.string().optional().nullable(),
    rua: z.string().optional().nullable(), 
    pontoReferencia: z.string().optional().nullable(), 
    contato: z.string().optional().nullable(), 
    
    // 2. Benefícios e Programas (Novos)
    primeiraInfSuas: z.string().optional().nullable(), 
    recebePropPai: z.string().optional().nullable(), 
    recebePAA: z.string().optional().nullable(), 
    recebeBPC: z.string().optional().nullable(), 
    recebeHabitacaoSocial: z.string().optional().nullable(), 
    
    // Outros campos existentes (mantidos para o JSONB)
    escolaridade: z.string().optional().nullable(),
    rendaFamiliar: z.string().optional().nullable(),
    // NOTE: Adicione aqui outros campos do seu prontuário que são importantes para o CRAS
});

type CasoForm = z.infer<typeof formSchema>;


export default function CrasProntuario() {
    // ⭐️ CORREÇÃO: Extrair o unitName da URL ⭐️
    const { id, unitName } = useParams<{ id: string, unitName: string }>(); 
    const navigate = useNavigate();
    const isEditMode = !!id;
    const { user } = useAuth();
    
    // Encontra a unidade CRAS atual
    const currentCrasUnit = CRAS_UNITS.find(u => u.urlName === unitName);
    
    const [isDataLoading, setIsDataLoading] = useState(isEditMode);
    const [activeTab, setActiveTab] = useState("atendimento");

    const {
        register, 
        handleSubmit, control,
        formState: { isSubmitting, dirtyFields, errors }, 
        reset, getValues,
    } = useForm<CasoForm>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            dataCad: new Date().toISOString().split('T')[0],
            tecRef: user?.nome_completo || "", 
        },
    });

    // 🛑 EFEITO DE VALIDAÇÃO DE URL
    useEffect(() => {
        if (!currentCrasUnit && !isEditMode) {
            toast.error("Unidade CRAS não encontrada na URL. Redirecionando.");
            navigate('/dashboard', { replace: true });
        }
    }, [currentCrasUnit, isEditMode, navigate]);
    

    // 📌 Efeito para carregar dados em modo Edição
    useEffect(() => {
        if (isEditMode && id) {
            const loadCasoData = async () => {
                try {
                    setIsDataLoading(true);
                    const casoData: CasoDetalhado = await getCasoById(id);
                    
                    const dataCadFormatada = casoData.dataCad ? new Date(casoData.dataCad).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

                    // Mescla dados de nível superior e JSONB para preencher o form
                    const formData = {
                        ...casoData.dados_completos, // Campos JSONB
                        dataCad: dataCadFormatada,
                        tecRef: casoData.tecRef,
                        nome: casoData.nome,
                        // Mapeamento de colunas de nível superior
                    };
                    reset(formData as CasoForm);
                } catch (error) {
                    toast.error("Não foi possível carregar os dados do prontuário CRAS.");
                    navigate(`/cras/${unitName}/consulta`);
                } finally {
                    setIsDataLoading(false);
                }
            };
            loadCasoData();
        } else if (user) {
             // Modo CRIAÇÃO: Preenche o Técnico de Referência automaticamente
             reset(prev => ({
                 ...prev,
                 tecRef: user.nome_completo || user.username
             }));
             setIsDataLoading(false);
        }
    }, [id, isEditMode, reset, navigate, user, unitName]);
    
    // 📌 LÓGICA DE SUBMISSÃO
    const onSubmit = async (data: CasoForm) => {
        // Separa colunas SQL de dados_completos
        const { dataCad, tecRef, nome, ...dados_completos_payload } = data;
        
        try {
            if (isEditMode) {
                // ... (Lógica de Edição)
                const dirtyData: Partial<CasoForm> = {};
                
                (Object.keys(dirtyFields) as Array<keyof CasoForm>).forEach(key => {
                    (dirtyData as any)[key] = getValues(key);
                });
                
                // Incluir campos SQL obrigatórios no PUT
                (dirtyData as any).dataCad = dataCad;
                (dirtyData as any).tecRef = tecRef;
                (dirtyData as any).nome = nome;
                
                if (Object.keys(dirtyFields).length === 0) {
                    toast.info("Nenhuma alteração para salvar.");
                    return;
                }
                
                await updateCase(id!, dirtyData);
                toast.success("✅ Progresso CRAS salvo!");
                reset(data, { keepValues: true, keepDefaultValues: true }); 
            } else {
                // 📌 Ação de Criação (POST)
                
                if (!currentCrasUnit) {
                     toast.error("Unidade CRAS não identificada para salvar o novo caso.");
                     return;
                }
                
                const payloadComUnidade = { 
                    ...data,
                    // ⭐️ Vincula o caso ao ID da unidade que está na URL ⭐️
                    unit_id: currentCrasUnit.id, 
                }; 

                const response = await createCase(payloadComUnidade);
                
                if (!response.id) throw new Error("ID do caso não retornado.");
                
                toast.success("✅ Prontuário CRAS criado! Inicie o acompanhamento.");
                // Redireciona para o modo edição do novo prontuário, mantendo o unitName
                navigate(`/cras/${unitName}/cadastro/${response.id}`, { replace: true }); 
            }
        } catch (error: any) {
            toast.error(`❌ Falha ao salvar: ${error?.message ?? String(error)}`);
        }
    };
    
    const handleFinalize = async () => {
        if (!id) return;
        // Salva as últimas alterações e navega
        await handleSubmit(onSubmit)(); 
        toast.success("Prontuário finalizado!");
        navigate(`/cras/${unitName}/caso/${id}`); // Redireciona para a view do prontuário CRAS
    };

    // Ação de limpeza de formulário
    const handleClearForm = () => {
        if (isEditMode) {
            toast.warn("Não é possível limpar um prontuário em edição. Use o botão 'Novo Registro Limpo'.");
            return;
        }
        // Redireciona para a rota base, mantendo o unitName
        navigate(`/cras/${unitName}/cadastro`, { replace: true });
        toast.info("Formulário limpo para um novo registro.");
    };
    
    if (isDataLoading) {
        return <div className="text-center p-10"><Loader2 className="h-8 w-8 animate-spin mx-auto" /> <span>Carregando prontuário CRAS...</span></div>;
    }

    // ⭐️ CORRIGIDO: Mostrar o nome da unidade no cabeçalho
    const unitNameDisplay = currentCrasUnit?.name.replace('CRAS ', '') || 'Unidade Inválida';
    const headerTitle = isEditMode 
        ? `Editando Prontuário ${unitNameDisplay} ID: ${id}` 
        : `Novo Registro CRAS - ${unitNameDisplay}`;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">{headerTitle}</h1>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    {/* ⭐️ CORRIGIDO: Tags TabsTrigger fechadas corretamente ⭐️ */}
                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
                        <TabsTrigger value="atendimento">1. Identificação/Atendimento</TabsTrigger>
                        <TabsTrigger value="endereco" disabled={!isEditMode}>2. Endereço e Contato</TabsTrigger>
                        <TabsTrigger value="beneficios" disabled={!isEditMode}>3. Programas e Benefícios</TabsTrigger>
                        <TabsTrigger value="outros" disabled={!isEditMode}>4. Outras Informações</TabsTrigger>
                        <TabsTrigger value="finalizar" disabled={!isEditMode}>5. Finalizar</TabsTrigger>
                    </TabsList>

                    <Card className="mt-4">
                        <CardContent className="pt-6 space-y-6">
                            {/* ---------------------------------------------------- */}
                            {/* ABA 1: IDENTIFICAÇÃO E ATENDIMENTO */}
                            {/* ---------------------------------------------------- */}
                            <TabsContent value="atendimento" className="space-y-6">
                                <CardTitle className="text-xl mb-4 border-b pb-2">Dados de Atendimento e Identificação Básica</CardTitle>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="dataCad">Data do Cadastro</Label>
                                        <Input id="dataCad" type="date" {...register("dataCad")} />
                                        {errors.dataCad && <p className="text-sm text-red-500 mt-1 h-4">{errors.dataCad.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="tecRef">Técnico Responsável</Label>
                                        <Input id="tecRef" placeholder="Nome do técnico - Cargo" {...register("tecRef")} disabled={true} />
                                        {errors.tecRef && <p className="text-sm text-red-500 mt-1 h-4">{errors.tecRef.message}</p>}
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-4 gap-4">
                                    <div className="space-y-2"><Label htmlFor="nome">Nome Completo</Label><Controller name="nome" control={control} render={({ field }) => (<Input id="nome" {...field} value={field.value ?? ''} />)} /></div>
                                    <div className="space-y-2"><Label htmlFor="nis">NIS</Label><Controller name="nis" control={control} render={({ field }) => (<Input id="nis" {...field} value={field.value ?? ''} />)} /></div>
                                    <div className="space-y-2"><Label htmlFor="idade">Idade</Label><Controller name="idade" control={control} render={({ field }) => (<Input id="idade" type="number" {...field} value={field.value ?? ''} />)} /></div>
                                    <div className="space-y-2"><Label>Sexo</Label><Controller control={control} name="sexo" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="Masculino">Masculino</SelectItem><SelectItem value="Feminino">Feminino</SelectItem></SelectContent></Select>)} /></div>
                                    <div className="space-y-2"><Label>Cor/Etnia</Label><Controller control={control} name="corEtnia" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="Branca">Branca</SelectItem><SelectItem value="Preta">Preta</SelectItem><SelectItem value="Parda">Parda</SelectItem></SelectContent></Select>)} /></div>
                                    <div className="space-y-2"><Label>1º Inf. SUAS</Label><Controller control={control} name="primeiraInfSuas" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                </div>
                            </TabsContent>
                            
                            {/* ---------------------------------------------------- */}
                            {/* ABA 2: ENDEREÇO E CONTATO */}
                            {/* ---------------------------------------------------- */}
                            <TabsContent value="endereco" className="space-y-6">
                                <CardTitle className="text-xl mb-4 border-b pb-2">Dados de Endereço e Contato</CardTitle>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label htmlFor="bairro">Bairro</Label><Controller name="bairro" control={control} render={({ field }) => (<Input id="bairro" {...field} value={field.value ?? ''} />)} /></div>
                                    <div className="space-y-2"><Label htmlFor="rua">Rua/Logradouro</Label><Controller name="rua" control={control} render={({ field }) => (<Input id="rua" {...field} value={field.value ?? ''} />)} /></div>
                                    <div className="space-y-2"><Label htmlFor="pontoReferencia">Ponto de Referência</Label><Controller name="pontoReferencia" control={control} render={({ field }) => (<Input id="pontoReferencia" {...field} value={field.value ?? ''} />)} /></div>
                                    <div className="space-y-2"><Label htmlFor="contato">Contato/Telefone</Label><Controller name="contato" control={control} render={({ field }) => (<Input id="contato" {...field} value={field.value ?? ''} />)} /></div>
                                </div>
                            </TabsContent>

                            {/* ---------------------------------------------------- */}
                            {/* ABA 3: PROGRAMAS E BENEFÍCIOS */}
                            {/* ---------------------------------------------------- */}
                            <TabsContent value="beneficios" className="space-y-6">
                                <CardTitle className="text-xl mb-4 border-b pb-2">Programas Sociais e Benefícios</CardTitle>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="space-y-2"><Label>Programa Prop. PAI?</Label><Controller control={control} name="recebePropPai" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                    <div className="space-y-2"><Label>Recebe BPC?</Label><Controller control={control} name="recebeBPC" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Idoso">Idoso</SelectItem><SelectItem value="PCD">PCD</SelectItem><SelectItem value="NÃO">Não</SelectItem></SelectContent></Select>)} /></div>
                                    <div className="space-y-2"><Label>Participa do PAA?</Label><Controller control={control} name="recebePAA" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                    <div className="space-y-2"><Label>Habitação Social?</Label><Controller control={control} name="recebeHabitacaoSocial" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                </div>
                            </TabsContent>

                            {/* ---------------------------------------------------- */}
                            {/* ABA 4: OUTRAS INFORMAÇÕES (Manter espaço para futuros campos) */}
                            {/* ---------------------------------------------------- */}
                            <TabsContent value="outros" className="space-y-6">
                                <CardTitle className="text-xl mb-4 border-b pb-2">Outras Informações</CardTitle>
                                <p className="text-slate-500">Espaço para informações não categorizadas.</p>
                            </TabsContent>
                            
                            {/* ---------------------------------------------------- */}
                            {/* ABA 5: FINALIZAR */}
                            {/* ---------------------------------------------------- */}
                            <TabsContent value="finalizar" className="space-y-6">
                                <CardTitle className="text-xl mb-4 pb-2">Pronto para Finalizar</CardTitle>
                                <p>Clique no botão "Finalizar e Ver Prontuário" abaixo para salvar as últimas alterações e visualizar o prontuário completo, onde você poderá adicionar acompanhamentos e instrumentais (pareceres).</p>
                            </TabsContent>
                        </CardContent>
                    </Card>
                </Tabs>

                <div className="flex justify-between items-center mt-6">
                    <Button type="button" variant="outline" size="lg" onClick={handleClearForm}>
                        <Eraser className="mr-2 h-4 w-4" /> Novo Registro Limpo
                    </Button>

                    <div className="flex items-center gap-4">
                        {/* Botão de Salvar Progresso (Muda o texto se não for edição) */}
                        <Button type="submit" disabled={isSubmitting} size="lg" variant="secondary">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? "Salvando..." : (isEditMode ? "💾 Salvar Progresso" : "💾 Salvar e Iniciar Prontuário")}
                        </Button>
                        
                        {/* Botão de Finalizar só aparece em modo edição */}
                        {isEditMode && (
                            <Button type="button" onClick={handleFinalize} disabled={isSubmitting} size="lg">
                                Finalizar e Ver Prontuário
                            </Button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}