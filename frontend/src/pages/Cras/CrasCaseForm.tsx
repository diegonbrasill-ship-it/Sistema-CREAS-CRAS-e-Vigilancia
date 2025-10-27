// frontend/src/pages/Cras/CrasCaseForm.tsx 
// ⭐️ UPGRADE V2.2: Refatorado para 6 Abas (Fluxo de Acolhida/Diagnóstico) ⭐️

import React, { useState, useEffect } from "react";
// 🛑 REMOVIDO: useFieldArray (não mais necessário)
import { useForm, Controller, SubmitHandler } from "react-hook-form"; 
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import { toast } from "react-toastify";
// 🛑 REMOVIDO: Ícones de Benefício (DollarSign, Plus, Trash2, Calendar)
import { Loader2, ArrowLeft, Eraser } from "lucide-react"; 

// Importações de UI 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// ⭐️ Importações de API e Novas Interfaces ⭐️
import { createCase, updateCase, getCasoById, CaseDetail, CasePayload } from "../../services/api"; 
import { CRAS_UNITS } from "../../hooks/usePermissoesSUAS";


// 🛑 REMOVIDO: const beneficioSchema 🛑


// --- ESQUEMA DE VALIDAÇÃO (CRAS) - SIMPLIFICADO PARA 6 ABAS ---
const formSchema = z.object({
    // ABA 1: Acolhida e Motivação
    dataCad: z.string().min(1, "A data do cadastro é obrigatória."),
    tecRef: z.string().min(3, "O nome do técnico é obrigatório."),
    motivoAcolhida: z.string().optional().nullable(), 
    primeiraImpressao: z.string().optional().nullable(), 

    // ABA 2: Identificação e Contato
    nome: z.string().optional().nullable(),
    nis: z.string().optional().nullable(), 
    cpf: z.string().optional().nullable(), 
    idade: z.string().optional().nullable(),
    sexo: z.string().optional().nullable(),
    corEtnia: z.string().optional().nullable(),
    bairro: z.string().optional().nullable(),
    rua: z.string().optional().nullable(), 
    pontoReferencia: z.string().optional().nullable(), 
    contato: z.string().optional().nullable(), 
    
    // ABA 3: Avaliação Socioeconômica
    escolaridade: z.string().optional().nullable(),
    rendaFamiliar: z.string().optional().nullable(),
    tipoMoradia: z.string().optional().nullable(),
    recebeBPC: z.string().optional().nullable(), 
    recebePBF: z.string().optional().nullable(),
    recebeHabitacaoSocial: z.string().optional().nullable(), 
    primeiraInfSuas: z.string().optional().nullable(), 
    recebePropPai: z.string().optional().nullable(), 
    recebePAA: z.string().optional().nullable(), 
    avaliacaoRisco: z.string().optional().nullable(),
    
    // ABA 4: Plano de Acompanhamento (PAF)
    metasCurtoPrazo: z.string().optional().nullable(), 
    metasLongoPrazo: z.string().optional().nullable(), 
    proximosPassos: z.string().optional().nullable(), 

    // 🛑 REMOVIDO: beneficiosEventuais (Aba 5) 🛑
    
    // ABA 5: Serviços e Encaminhamentos (Antiga Aba 6)
    encaminhamentoSCFV: z.string().optional().nullable(), 
    segundaViaDocumentos: z.string().optional().nullable(), 
    encaminhamentoExterno: z.string().optional().nullable(), 
});

type CasoForm = z.infer<typeof formSchema>;


// ⭐️ NOVO NOME DO COMPONENTE: CrasCaseForm ⭐️
export default function CrasCaseForm() {
    
    const { id, unitName } = useParams<{ id: string, unitName: string }>(); 
    const navigate = useNavigate();
    const isEditMode = !!id;
    const { user } = useAuth();
    
    const currentCrasUnit = CRAS_UNITS.find(u => u.urlName === unitName);
    
    const [isDataLoading, setIsDataLoading] = useState(isEditMode);
    const [activeTab, setActiveTab] = useState("acolhida");

    const {
        register, 
        handleSubmit, control,
        formState: { isSubmitting, errors }, 
        reset, getValues,
    } = useForm<CasoForm>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            dataCad: new Date().toISOString().split('T')[0],
            tecRef: user?.nome_completo || "", 
            
            // 🛑 REMOVIDO: beneficiosEventuais 🛑
            nome: null, nis: null, cpf: null, idade: null, sexo: null, corEtnia: null,
            bairro: null, rua: null, pontoReferencia: null, contato: null,
            escolaridade: null, rendaFamiliar: null, tipoMoradia: null,
            recebeBPC: null, recebePBF: null, recebeHabitacaoSocial: null, 
            primeiraInfSuas: null, recebePropPai: null, recebePAA: null,
            motivoAcolhida: null, primeiraImpressao: null, metasCurtoPrazo: null,
            metasLongoPrazo: null, proximosPassos: null, avaliacaoRisco: null,
            encaminhamentoSCFV: null, segundaViaDocumentos: null, encaminhamentoExterno: null,
        },
    });
    
    // 🛑 REMOVIDO: useFieldArray (beneficiosFields) 🛑

    
    // 📌 Efeito para carregar dados em modo Edição (MAPEAMENTO EXPLÍCITO)
    useEffect(() => {
        if (isEditMode && id) {
            const loadCasoData = async () => {
                try {
                    setIsDataLoading(true);
                    const casoData: CaseDetail = await getCasoById(id);
                    
                    if (casoData.unit_id !== currentCrasUnit?.id) {
                         toast.error("Acesso negado. Este prontuário não pertence à sua unidade de lotação.");
                         navigate(`/cras/${unitName}/consulta`);
                         return;
                    }

                    const dataCadDate = casoData.dataCad ? new Date(casoData.dataCad) : new Date();
                    const dataCadFormatada = dataCadDate.toISOString().split('T')[0];
                    
                    const formData: Partial<CasoForm> = {};

                    // Mapeia campos do schema (incluindo os novos)
                    (Object.keys(formSchema.shape) as Array<keyof CasoForm>).forEach(key => {
                        const value = (casoData as any)[key];
                        
                        if (key === 'dataCad') {
                            (formData as any)[key] = dataCadFormatada;
                        } 
                        // 🛑 REMOVIDO: else if (key === 'beneficiosEventuais') 🛑
                        else {
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
    const onSubmit: SubmitHandler<CasoForm> = async (data) => {
        const payload: Partial<CasePayload> = {};
        
        // Itera sobre os dados do formulário
        (Object.keys(data) as Array<keyof CasoForm>).forEach(key => {
            const rawValue = data[key];
            
            // 🛑 REMOVIDO: Bloco 'if (key === 'beneficiosEventuais')' 🛑
            // Mapeamento: Converte "" para NULL
            const finalValue = rawValue === "" || rawValue === undefined ? null : rawValue;
            (payload as any)[key] = finalValue;
        });
        
        try {
            if (isEditMode && id) {
                await updateCase(id!, payload);
                toast.success("✅ Progresso CRAS salvo!");
                reset(data, { keepValues: true, keepDefaultValues: true }); 
            } else {
                // Ação de Criação (POST)
                if (!currentCrasUnit) {
                     toast.error("Unidade CRAS não identificada para salvar o novo caso.");
                     return;
                }
                
                const payloadComUnidade: CasePayload = { 
                    ...payload,
                    unit_id: currentCrasUnit.id, 
                } as CasePayload; 
                
                const response = await createCase(payloadComUnidade);
                if (!response.id) throw new Error("ID do caso não retornado.");
                
                toast.success("✅ Prontuário CRAS criado! Continue nas próximas abas.");
                navigate(`/cras/${unitName}/cadastro/${response.id}`, { replace: true });
            }
        } catch (error: any) {
            toast.error(`❌ Falha ao salvar: ${error?.response?.data?.message ?? error?.message ?? String(error)}`);
        }
    };
    
    // Função para navegar para a tela de visualização
    const handleFinalize = async () => {
        if (!id) return;

        let submitFailed = false;
        await handleSubmit(onSubmit)().catch(() => {
            submitFailed = true; 
        }); 

        if (!submitFailed) { 
            toast.success("Cadastro finalizado! Redirecionando para visualização.");
            navigate(`/cras/${unitName}/prontuario/${id}`, { replace: true }); 
        } else {
            toast.error("Correções pendentes antes de finalizar.");
        }
    };

    // Ação de limpeza de formulário
    const handleClearForm = () => {
        navigate(`/cras/${unitName}/cadastro`, { replace: true });
        toast.info("Formulário limpo para um novo registro.");
    };
    
    // ----------------------------------------------------------------------
    // ⭐️ INÍCIO DA RENDERIZAÇÃO (JSX) ⭐️
    // ----------------------------------------------------------------------
    
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
                    {/* ⭐️ ABAS DE NAVEGAÇÃO (6 ABAS) ⭐️ */}
                    <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
                        <TabsTrigger value="acolhida">1. Acolhida</TabsTrigger> 
                        <TabsTrigger value="identificacao" disabled={!isEditMode}>2. Identificação</TabsTrigger>
                        <TabsTrigger value="avaliacao" disabled={!isEditMode}>3. Avaliação</TabsTrigger> 
                        <TabsTrigger value="plano_acao" disabled={!isEditMode}>4. PAF</TabsTrigger> 
                        <TabsTrigger value="servicos" disabled={!isEditMode}>5. Serviços</TabsTrigger> 
                        <TabsTrigger value="finalizar" disabled={!isEditMode}>6. Finalizar</TabsTrigger>
                    </TabsList>

                    <Card className="mt-4">
                        <CardContent className="pt-6 space-y-6">
                            
                            {/* ABA 1: ACOLHIDA E MOTIVAÇÃO */}
                            <TabsContent value="acolhida" className="space-y-6">
                                <CardTitle className="text-xl mb-4 border-b pb-2">1. Acolhida e Motivação do Atendimento</CardTitle>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {/* Data e Técnico (Mantido) */}
                                   <div className="space-y-2"><Label htmlFor="dataCad">Data do Cadastro</Label><Input id="dataCad" type="date" {...register("dataCad")} /></div>
                                    <div className="space-y-2"><Label htmlFor="tecRef">Técnico Responsável</Label><Input id="tecRef" {...register("tecRef")} disabled={true} /></div>
                                    
                                    {/* Motivo da Acolhida (Mapeia RMA C.2.1) */}
                                    <div className="space-y-2 col-span-2">
                                        <Label>Motivo do Contato/Acolhida</Label>
                                        <Controller control={control} name="motivoAcolhida" render={({ field }) => (
                                            <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}>
                                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Espontanea">Espontânea (Procura direta)</SelectItem>
                                                    <SelectItem value="Busca Ativa">Busca Ativa (Visita)</SelectItem>
                                                    <SelectItem value="Encaminhamento">Encaminhamento da Rede</SelectItem>
                                                    <SelectItem value="Solicitacao">Solicitação de Serviço Específico</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )} />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label htmlFor="primeiraImpressao">Primeira Impressão e Descrição da Demanda</Label>
                                        <Textarea id="primeiraImpressao" {...register("primeiraImpressao")} rows={3} placeholder="Descreva brevemente a situação atual da família e o objetivo da acolhida." />
                                    </div>

                                </div>
                            </TabsContent>
                            
                            {/* ABA 2: IDENTIFICAÇÃO E CONTATO */}
                            <TabsContent value="identificacao" className="space-y-6">
                                <CardTitle className="text-xl mb-4 border-b pb-2">2. Identificação e Contato</CardTitle>
                                
                                <CardTitle className="text-base mb-4 border-b pb-2">Dados Pessoais</CardTitle>
                                <div className="grid md:grid-cols-4 gap-4">
                                    {/* ⭐️ Tipagem explícita 'e' para React.ChangeEvent<HTMLInputElement> ⭐️ */}
                                    <div className="space-y-2 col-span-2"><Label htmlFor="nome">Nome Completo</Label><Controller name="nome" control={control} render={({ field }) => (<Input id="nome" {...field} value={field.value ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value === '' ? null : e.target.value)} />)} /></div>
                                    <div className="space-y-2"><Label htmlFor="nis">NIS</Label><Controller name="nis" control={control} render={({ field }) => (<Input id="nis" {...field} value={field.value ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value === '' ? null : e.target.value)} />)} /></div>
                                    <div className="space-y-2"><Label htmlFor="cpf">CPF</Label><Controller name="cpf" control={control} render={({ field }) => (<Input id="cpf" {...field} value={field.value ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value === '' ? null : e.target.value)} />)} /></div>
                                    <div className="space-y-2"><Label htmlFor="idade">Idade</Label><Controller name="idade" control={control} render={({ field }) => (<Input id="idade" type="number" {...field} value={field.value ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value === '' ? null : e.target.value)} />)} /></div>
                                    
                                    <div className="space-y-2"><Label>Sexo</Label><Controller control={control} name="sexo" render={({ field }) => (
                                        <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}>
                                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Masculino">Masculino</SelectItem>
                                                <SelectItem value="Feminino">Feminino</SelectItem>
                                                <SelectItem value="Outro">Outro</SelectItem>
                                                <SelectItem value="NaoInformado">Não Informado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )} /></div>
                                    
                                    <div className="space-y-2"><Label>Cor/Etnia</Label><Controller control={control} name="corEtnia" render={({ field }) => (
                                        <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}>
                                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Branca">Branca</SelectItem>
                                                <SelectItem value="Preta">Preta</SelectItem>
                                                <SelectItem value="Parda">Parda</SelectItem>
                                                <SelectItem value="Amarela">Amarela</SelectItem>
                                                <SelectItem value="Indigena">Indígena</SelectItem>
                                                <SelectItem value="NaoInformado">Não Informado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )} /></div>
                                </div>
                                
                                <CardTitle className="text-base mb-4 border-b pb-2">Endereço e Contato</CardTitle>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label htmlFor="bairro">Bairro</Label><Controller name="bairro" control={control} render={({ field }) => (<Input id="bairro" {...field} value={field.value ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value === '' ? null : e.target.value)} />)} /></div>
                                    <div className="space-y-2"><Label htmlFor="rua">Rua/Logradouro</Label><Controller name="rua" control={control} render={({ field }) => (<Input id="rua" {...field} value={field.value ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value === '' ? null : e.target.value)} />)} /></div>
                                    <div className="space-y-2"><Label htmlFor="pontoReferencia">Ponto de Referência</Label><Controller name="pontoReferencia" control={control} render={({ field }) => (<Input id="pontoReferencia" {...field} value={field.value ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value === '' ? null : e.target.value)} />)} /></div>
                                    <div className="space-y-2"><Label htmlFor="contato">Contato/Telefone</Label><Controller name="contato" control={control} render={({ field }) => (<Input id="contato" {...field} value={field.value ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value === '' ? null : e.target.value)} />)} /></div>
                                </div>
                            </TabsContent>

                            {/* ABA 3: AVALIAÇÃO SOCIOECONÔMICA E DE RISCO */}
                            <TabsContent value="avaliacao" className="space-y-6">
                                <CardTitle className="text-xl mb-4 border-b pb-2">3. Avaliação Socioeconômica e Benefícios</CardTitle>
                                <div className="grid md:grid-cols-3 gap-4">
                                    {/* ⭐️ CORREÇÃO: Opções do Select adicionadas ⭐️ */}
                                    <div className="space-y-2"><Label htmlFor="rendaFamiliar">Renda Familiar Estimada</Label><Input id="rendaFamiliar" {...register("rendaFamiliar")} /></div>
                                    <div className="space-y-2"><Label>Escolaridade</Label><Controller control={control} name="escolaridade" render={({ field }) => (
                                        <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}>
                                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Fundamental Incompleto">Fundamental Incompleto</SelectItem>
                                                <SelectItem value="Fundamental Completo">Fundamental Completo</SelectItem>
                                                <SelectItem value="Medio Incompleto">Médio Incompleto</SelectItem>
                                                <SelectItem value="Medio Completo">Médio Completo</SelectItem>
                                            <SelectItem value="Superior Incompleto">Superior Incompleto</SelectItem>
                                                <SelectItem value="Superior Completo">Superior Completo</SelectItem>
                                                <SelectItem value="Nao Alfabetizado">Não Alfabetizado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )} /></div>
                                    <div className="space-y-2"><Label>Situação de Moradia</Label><Controller control={control} name="tipoMoradia" render={({ field }) => (
                                        <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}>
                                            <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Propria">Própria</SelectItem>
                                                <SelectItem value="Alugada">Alugada</SelectItem>
                                                <SelectItem value="Cedida">Cedida</SelectItem>
                                                <SelectItem value="Ocupacao">Ocupação/Invasão</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )} /></div>
                                    
                                    {/* Benefícios (Antiga aba 3) */}
                                    <div className="space-y-2"><Label>Recebe Bolsa Família (PBF)?</Label><Controller control={control} name="recebePBF" render={({ field }) => (<Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                    <div className="space-y-2"><Label>Recebe BPC?</Label><Controller control={control} name="recebeBPC" render={({ field }) => (
                                        <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}>
                                            <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Idoso">Idoso</SelectItem>
                                                <SelectItem value="PCD">PCD</SelectItem>
                                                <SelectItem value="NÃO">Não</SelectItem>
                                       </SelectContent>
                                        </Select>
                                    )} /></div>
                                    <div className="space-y-2"><Label>Programa Prop. PAI?</Label><Controller control={control} name="recebePropPai" render={({ field }) => (
                                        <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}>
                                            <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Sim">Sim</SelectItem>
                                                <SelectItem value="Não">Não</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )} /></div>
                                 <div className="space-y-2"><Label>Habitação Social?</Label><Controller control={control} name="recebeHabitacaoSocial" render={({ field }) => (
                                        <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}>
                                            <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Sim">Sim</SelectItem>
                                       <SelectItem value="Não">Não</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )} /></div>
                                    <div className="space-y-2"><Label>Participa do PAA?</Label><Controller control={control} name="recebePAA" render={({ field }) => (
                                        <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}>
                                            <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                                 <SelectContent>
                                                <SelectItem value="Sim">Sim</SelectItem>
                                                <SelectItem value="Não">Não</SelectItem>
                                            </SelectContent>
                                 </Select>
                                    )} /></div>
                                    <div className="space-y-2"><Label>1º Inf. SUAS</Label><Controller control={control} name="primeiraInfSuas" render={({ field }) => (
                                        <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}>
                                            <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Sim">Sim</SelectItem>
                                                <SelectItem value="Não">Não</SelectItem>
                                 </SelectContent>
                                        </Select>
                                    )} /></div>

                                    {/* 🛑 CAMPOS DO RMA B.5, B.6, B.8 REMOVIDOS A PEDIDO 🛑 */}

                               {/* Avaliação de Risco */}
                                    <div className="space-y-2 col-span-3">
                                        <Label htmlFor="avaliacaoRisco">Nível de Risco Social Identificado</Label>
                                 <Textarea id="avaliacaoRisco" {...register("avaliacaoRisco")} rows={3} placeholder="Justificativa da classificação do risco..." />
                                    </div>

                                </div>
                         </TabsContent>

                            {/* ABA 4: PLANO DE ACOMPANHAMENTO FAMILIAR (PAF) */}
                            <TabsContent value="plano_acao" className="space-y-6">
                                <CardTitle className="text-xl mb-4 border-b pb-2">4. Plano de Acompanhamento Familiar (PAF)</CardTitle>
                                <div className="space-y-4">
                                    <div className="space-y-2"><Label htmlFor="metasCurtoPrazo">Metas de Curto Prazo</Label><Textarea id="metasCurtoPrazo" {...register("metasCurtoPrazo")} rows={3} placeholder="Ex: Inclusão no CadÚnico, emissão de 2ª via de CPF, etc." /></div>
                                    <div className="space-y-2"><Label htmlFor="metasLongoPrazo">Metas de Longo Prazo</Label><Textarea id="metasLongoPrazo" {...register("metasLongoPrazo")} rows={3} placeholder="Ex: Inclusão produtiva, autonomia financeira, resolução de conflito familiar." /></div>
                                    <div className="space-y-2"><Label htmlFor="proximosPassos">Próximos Passos Operacionais</Label><Textarea id="proximosPassos" {...register("proximosPassos")} rows={2} placeholder="Próxima visita: 05/11. Buscar relatório escolar." /></div>
                                </div>
                            </TabsContent>
                            
                            {/* 🛑 ABA 5 REMOVIDA 🛑 */}
                            
                            {/* ABA 5: SERVIÇOS E ENCAMINHAMENTOS (Antiga Aba 6) */}
                            <TabsContent value="servicos" className="space-y-6">
                                <CardTitle className="text-xl mb-4 border-b pb-2">5. Encaminhamento e Serviços Integrados</CardTitle>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        <Label htmlFor="encaminhamentoSCFV">Encaminhamento para Oficinas / SCFV (Mapeia RMA A.3.2)</Label>
                                        <Controller control={control} name="encaminhamentoSCFV" render={({ field }) => (
                                            <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}>
                                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="SCFV_OFC">SCFV - Inclusão em Oficinas</SelectItem>
                                                    <SelectItem value="SCFV_ACOMP">SCFV - Acompanhamento Periódico</SelectItem>
                                        <SelectItem value="NAO_ENC">Não Encaminhado</SelectItem>
                                                </SelectContent>
                                 </Select>
                                        )} />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label htmlFor="segundaViaDocumentos">Solicitação/Encaminhamento de 2ª Via de Documentos (Mapeia RMA C.8)</Label>
                                        <Textarea id="segundaViaDocumentos" {...register("segundaViaDocumentos")} rows={2} placeholder="Ex: Encaminhado para Defensoria Pública para 2ª via de CPF e Certidão de Nascimento." />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label htmlFor="encaminhamentoExterno">Outros Encaminhamentos de Rede (Saúde, Educação, etc.)</Label>
                                 <Textarea id="encaminhamentoExterno" {...register("encaminhamentoExterno")} rows={3} placeholder="Descreva encaminhamentos para a rede intersetorial." />
                                    </div>
                                </div>
                 </TabsContent>

                            {/* ABA 6: FINALIZAÇÃO (Antiga Aba 7) */}
                            <TabsContent value="finalizar" className="space-y-6">
                                <CardTitle className="text-xl mb-4 pb-2">6. Pronto para Finalizar</CardTitle>
                              <p className="text-slate-600">Verifique se o **Plano de Ação (Aba 4)** está completo. Ao clicar em "Finalizar e Ver Prontuário", você será direcionado para a tela de visualização, onde poderá adicionar **Acompanhamentos** continuamente.</p>
                                <Button type="button" onClick={handleFinalize} disabled={isSubmitting} size="lg">
                              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Finalizar e Ver Prontuário
                                </Button>
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
                       {isSubmitting ? "Salvando..." : (isEditMode ? "💾 Salvar Progresso" : "💾 Salvar e Próxima Aba")}
                        </Button>
                    </div>
                </div>
       </form>
        </div>
    );
}