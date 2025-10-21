// frontend/src/pages/Cras/CrasProntuario.tsx (VERSÃO FINAL COMPLETA COM CORREÇÃO DE PERSISTÊNCIA E FLUXO OTIMIZADO)

import React, { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import { toast } from "react-toastify";
import { Loader2, ArrowLeft, Save, Eraser, Check } from "lucide-react"; 

// Importações de UI 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// Importações de API (Assumimos que estas funções existem no seu api.ts)
import { createCase, updateCase, getCasoById, CasoDetalhado } from "../../services/api"; 


// ⭐️ CONSTANTES DO PROJETO ⭐️
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
    const [isCaseLoaded, setIsCaseLoaded] = useState(false); 
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
             // 🛑 CORREÇÃO FINAL: Todos os campos opcionais iniciam com NULL para alinhar com Zod
             nome: null,
             nis: null,
             idade: null,
             sexo: null,
             corEtnia: null,
             bairro: null,
             rua: null,
             pontoReferencia: null,
             contato: null,
             primeiraInfSuas: null,
             recebePropPai: null,
             recebePAA: null,
             recebeBPC: null,
             recebeHabitacaoSocial: null,
             escolaridade: null,
             rendaFamiliar: null,
        },
    });

    // 🛑 EFEITO DE VALIDAÇÃO DE URL (Inalterado)
    useEffect(() => {
        if (!currentCrasUnit && !isEditMode) {
            toast.error("Unidade CRAS não encontrada na URL. Redirecionando.");
            navigate('/dashboard', { replace: true });
        }
    }, [currentCrasUnit, isEditMode, navigate]);
    
    // 📌 Efeito para carregar dados em modo Edição (MAPEAMENTO EXPLÍCITO)
    useEffect(() => {
        if (isEditMode && id) {
            const loadCasoData = async () => {
                try {
                    setIsDataLoading(true);
                    const casoData: CasoDetalhado = await getCasoById(id);
                    
                    if (casoData.unit_id !== currentCrasUnit?.id) {
                         toast.error("Acesso negado. Este prontuário não pertence à sua unidade de lotação.");
                         navigate(`/cras/${unitName}/consulta`, { replace: true });
                         return;
                    }

                    // 🛑 CORREÇÃO: Mapeamento explícito para garantir que null/undefined vira string vazia no formulário
                    const dataCadDate = casoData.dataCad ? new Date(casoData.dataCad) : new Date();
                    const dataCadFormatada = dataCadDate.toISOString().split('T')[0];
                    
                    const formData: Partial<CasoForm> = {};

                    // Mapeia campos base
                    formData.dataCad = dataCadFormatada;
                    formData.tecRef = casoData.tecRef;
                    formData.nome = casoData.nome;

                    // Mapeia campos JSONB mesclados (nível superior)
                    // Garante que todos os valores (incluindo 0/null) se tornem strings vazias para o input do RHF
                    (Object.keys(formSchema.shape) as Array<keyof CasoForm>).forEach(key => {
                        if (key !== 'dataCad' && key !== 'tecRef' && key !== 'nome') {
                             const value = (casoData as any)[key];
                             // Se o valor é null/undefined/0, usa "" no input, senão usa o valor como string
                             (formData as any)[key] = value !== undefined && value !== null && value !== 0 ? value.toString() : "";
                        }
                    });

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
              // Modo CRIAÇÃO
              reset(prev => ({
                 ...prev,
                 tecRef: user.nome_completo || user.username
              }));
              setIsDataLoading(false);
        }
    }, [id, isEditMode, reset, navigate, user, unitName, currentCrasUnit]);
    
    // 📌 LÓGICA DE SUBMISSÃO (Otimizada e com correção de mapeamento)
    const onSubmit = async (data: CasoForm) => {
        // 1. Extrair os campos base
        const { dataCad, tecRef, nome, ...dados_completos_payload_raw } = data; 
        
        // 🛑 CORREÇÃO CRÍTICA: Mapeamento de Payload Completo e Limpeza de Strings Vazias.
        const dados_completos_cleaned: any = {};

        // Itera sobre o Zod Schema para garantir que TODAS as chaves opcionais são incluídas
        (Object.keys(formSchema.shape) as Array<keyof CasoForm>).forEach(key => {
            // Ignora campos base já extraídos
            if (key !== 'dataCad' && key !== 'tecRef' && key !== 'nome') {
                const rawValue = (data as any)[key];
                // 🛑 Se o valor é NULL ou "", enviamos uma STRING VAZIA para que a chave exista no req.body.
                // O Backend (casos.ts) fará a conversão final para NULL para o banco.
                dados_completos_cleaned[key] = (rawValue === null || rawValue === undefined) ? "" : rawValue;
            }
        });

        // Prepara o payload base, excluindo os campos base para o JSONB
        const basePayload = {
            dataCad,
            tecRef,
            nome,
            dados_completos: dados_completos_cleaned, // 🛑 USANDO OBJETO LIMPO E COMPLETO
        };
        
        try {
            if (isEditMode && id) {
                // CORREÇÃO 2: Garante que apenas os campos alterados (dirty) são enviados na edição
                const finalUpdatePayload: any = {};
                let hasChanges = false;
                
                // Mapeia campos base alterados
                ['dataCad', 'tecRef', 'nome'].forEach(key => {
                    if (dirtyFields[key as keyof CasoForm]) {
                        finalUpdatePayload[key] = (basePayload as any)[key];
                        hasChanges = true;
                    }
                });
                
                // Mapeia campos dados_completos alterados
                const dirtyDadosCompletos: Partial<typeof dados_completos_payload_raw> = {};
                let hasDirtyDadosCompletos = false;

                // Usa o objeto limpo para verificar quais campos estão "sujos"
                Object.keys(dados_completos_cleaned).forEach(key => {
                    // Verifica se o campo JSONB está sujo OU se o valor não é vazio/nulo (foi preenchido)
                    if (dirtyFields[key as keyof CasoForm] || (dados_completos_cleaned[key] !== null && dados_completos_cleaned[key] !== "")) {
                        (dirtyDadosCompletos as any)[key] = dados_completos_cleaned[key];
                        hasDirtyDadosCompletos = true;
                    }
                });
                
                if (hasDirtyDadosCompletos) {
                    finalUpdatePayload.dados_completos = dirtyDadosCompletos;
                    hasChanges = true;
                } else if (!hasChanges) {
                    toast.info("Nenhuma alteração para salvar.");
                    return;
                }
                
                await updateCase(id!, finalUpdatePayload);
                toast.success("✅ Progresso CRAS salvo!");
                
                reset(data, { keepValues: true, keepDefaultValues: true }); 
                // ...
            } else {
                // 📌 Ação de Criação (POST)
                
                if (!currentCrasUnit) {
                     toast.error("Unidade CRAS não identificada para salvar o novo caso.");
                     return;
                }
                
                const payloadComUnidade = { 
                    ...basePayload,
                    unit_id: currentCrasUnit.id, 
                }; 

                const response = await createCase(payloadComUnidade);
                
                if (!response.id) throw new Error("ID do caso não retornado.");
                
                toast.success("✅ Prontuário CRAS criado! Inicie o acompanhamento.");
                // Redireciona para o modo de edição
                navigate(`/cras/${unitName}/cadastro/${response.id}`, { replace: true }); 
            }
        } catch (error: any) {
            toast.error(`❌ Falha ao salvar: ${error?.response?.data?.message ?? error?.message ?? String(error)}`);
        }
    };
    
    const handleFinalize = async () => {
    if (!id) return;

    let submitFailed = false;
    await handleSubmit(onSubmit)().catch(() => {
        submitFailed = true; 
    }); 

    if (!submitFailed) { 
        toast.success("Cadastro finalizado! Redirecionando para visualização.");
        // 🛑 CORREÇÃO DE ROTA: Navegar para o caminho correto de visualização
        navigate(`/cras/${unitName}/prontuario/${id}`, { replace: true }); // <--- USAR A ROTA CORRETA
    } else {
        toast.error("Correções pendentes antes de finalizar.");
    }
};

    // Ação de limpeza de formulário (Inalterado)
    const handleClearForm = () => {
        if (isEditMode) {
             navigate(`/cras/${unitName}/cadastro`, { replace: true });
             toast.info("Formulário limpo para um novo registro.");
             return;
        }
        reset({ dataCad: getValues('dataCad'), tecRef: getValues('tecRef') });
        toast.info("Formulário limpo.");
    };
    
    if (isDataLoading) {
        return <div className="text-center p-10"><Loader2 className="h-8 w-8 animate-spin mx-auto" /> <span>Carregando prontuário CRAS...</span></div>;
    }

    const unitNameDisplay = currentCrasUnit?.name.replace('CRAS ', '') || 'Unidade Inválida';
    const headerTitle = isEditMode && id
        ? `Editando Prontuário ${unitNameDisplay} ID: ${id}` 
        : `Novo Registro CRAS - ${unitNameDisplay}`;
    
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">{headerTitle}</h1>
            
            <Link to={`/cras/${unitName}/consulta`} className="text-blue-600 hover:underline flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" /> Voltar para a Consulta
            </Link>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
                        <TabsTrigger value="atendimento">1. Identificação/Atendimento</TabsTrigger>
                        <TabsTrigger value="endereco" disabled={!isEditMode}>2. Endereço e Contato</TabsTrigger>
                        <TabsTrigger value="beneficios" disabled={!isEditMode}>3. Programas e Benefícios</TabsTrigger>
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
                                    {/* NOME COMPLETO: CORRIGIDO ONCHANGE */}
                                    <div className="space-y-2"><Label htmlFor="nome">Nome Completo</Label>
                                        <Controller name="nome" control={control} render={({ field }) => (
                                            <Input id="nome" {...field} value={field.value ?? ''} 
                                                onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                                            />
                                        )} />
                                    </div>
                                    
                                    {/* NIS: CORRIGIDO ONCHANGE */}
                                    <div className="space-y-2"><Label htmlFor="nis">NIS</Label>
                                        <Controller name="nis" control={control} render={({ field }) => (
                                            <Input 
                                                id="nis" 
                                                {...field} 
                                                value={field.value ?? ''}
                                                onChange={(e) => { field.onChange(e.target.value === '' ? null : e.target.value); }}
                                            />
                                        )} />
                                    </div>
                                    
                                    {/* IDADE: CORRIGIDO ONCHANGE */}
                                    <div className="space-y-2"><Label htmlFor="idade">Idade</Label>
                                        <Controller name="idade" control={control} render={({ field }) => (
                                            <Input 
                                                id="idade" 
                                                type="number" 
                                                {...field} 
                                                value={field.value ?? ''}
                                                onChange={(e) => { field.onChange(e.target.value === '' ? null : e.target.value); }}
                                            />
                                        )} />
                                    </div>
                                    {/* SEXO: CORRIGIDO ONVALUECHANGE */}
                                    <div className="space-y-2"><Label>Sexo</Label>
                                        <Controller control={control} name="sexo" render={({ field }) => (
                                            <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}>
                                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                <SelectContent><SelectItem value="Masculino">Masculino</SelectItem><SelectItem value="Feminino">Feminino</SelectItem></SelectContent>
                                            </Select>
                                        )} />
                                    </div>
                                    {/* ETNIA: CORRIGIDO ONVALUECHANGE */}
                                    <div className="space-y-2"><Label>Cor/Etnia</Label>
                                        <Controller control={control} name="corEtnia" render={({ field }) => (
                                            <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}>
                                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                <SelectContent><SelectItem value="Branca">Branca</SelectItem><SelectItem value="Preta">Preta</SelectItem><SelectItem value="Parda">Parda</SelectItem></SelectContent>
                                            </Select>
                                        )} />
                                    </div>
                                    {/* 1º INF. SUAS: CORRIGIDO ONVALUECHANGE */}
                                    <div className="space-y-2"><Label>1º Inf. SUAS</Label>
                                        <Controller control={control} name="primeiraInfSuas" render={({ field }) => (
                                            <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}>
                                                <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                                                <SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent>
                                            </Select>
                                        )} />
                                    </div>
                                </div>
                            </TabsContent>
                            
                            {/* ABA 2: ENDEREÇO E CONTATO */}
                            <TabsContent value="endereco" className="space-y-6">
                                <CardTitle className="text-xl mb-4 border-b pb-2">Dados de Endereço e Contato</CardTitle>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label htmlFor="bairro">Bairro</Label><Controller name="bairro" control={control} render={({ field }) => (<Input id="bairro" {...field} value={field.value ?? ''} />)} /></div>
                                    <div className="space-y-2"><Label htmlFor="rua">Rua/Logradouro</Label><Controller name="rua" control={control} render={({ field }) => (<Input id="rua" {...field} value={field.value ?? ''} />)} /></div>
                                    <div className="space-y-2"><Label htmlFor="pontoReferencia">Ponto de Referência</Label><Controller name="pontoReferencia" control={control} render={({ field }) => (<Input id="pontoReferencia" {...field} value={field.value ?? ''} />)} /></div>
                                    <div className="space-y-2"><Label htmlFor="contato">Contato/Telefone</Label><Controller name="contato" control={control} render={({ field }) => (<Input id="contato" {...field} value={field.value ?? ''} />)} /></div>
                                </div>
                            </TabsContent>

                            {/* ABA 3: PROGRAMAS E BENEFÍCIOS */}
                            <TabsContent value="beneficios" className="space-y-6">
                                <CardTitle className="text-xl mb-4 border-b pb-2">Programas Sociais e Benefícios</CardTitle>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="space-y-2"><Label>Programa Prop. PAI?</Label><Controller control={control} name="recebePropPai" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                    <div className="space-y-2"><Label>Recebe BPC?</Label><Controller control={control} name="recebeBPC" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Idoso">Idoso</SelectItem><SelectItem value="PCD">PCD</SelectItem><SelectItem value="NÃO">Não</SelectItem></SelectContent></Select>)} /></div>
                                    <div className="space-y-2"><Label>Participa do PAA?</Label><Controller control={control} name="recebePAA" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                    <div className="space-y-2"><Label>Habitação Social?</Label><Controller control={control} name="recebeHabitacaoSocial" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                </div>
                            </TabsContent>

                            {/* ABA 4: OUTRAS INFORMAÇÕES (Manter espaço para futuros campos) */}
                            <TabsContent value="outros" className="space-y-6">
                                <CardTitle className="text-xl mb-4 border-b pb-2">Outras Informações</CardTitle>
                                <p className="text-slate-500">Espaço para informações não categorizadas.</p>
                            </TabsContent>
                            
                            {/* ABA 5: FINALIZAR */}
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