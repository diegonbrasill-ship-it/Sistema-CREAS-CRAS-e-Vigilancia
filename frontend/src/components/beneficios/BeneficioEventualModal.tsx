// frontend/src/components/beneficios/BeneficioEventualModal.tsx
// ⭐️ COMPONENTE CORRIGIDO: Zod, Imports, Tipagem e Lógica ⭐️

import React, { useState, useEffect } from 'react'; 
// ⭐️ CORREÇÃO 3: Importa 'getValues' ⭐️
import { useForm, Controller, SubmitHandler } from 'react-hook-form'; 
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Loader2, Search, Link2, FileText, User } from 'lucide-react';

// ⭐️ CORREÇÃO 3: Importações de UI (Card, etc.) ⭐️
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// ⭐️ API (api.ts já deve ter essas funções) ⭐️
import { createBeneficioEventual, searchCasosByTerm, CaseListEntry, BeneficioEventualPayload } from '@/services/api'; 
import { useAuth } from '@/contexts/AuthContext';

// --- Tipos de Benefício (Baseado no Requerimento DOCX) ---
const TIPOS_BENEFICIO_EVENTUAL = [
    { value: "KIT_GESTANTE", label: "Auxílio Natalidade (Kit Enxoval)" }, 
    { value: "AUXILIO_FUNERAL", label: "Auxílio Funeral" }, 
    { value: "AJUDA_CUSTO", label: "Vulnerabilidade Temporária (Ajuda de Custo)" }, 
    { value: "ALUGUEL_SOCIAL", label: "Vulnerabilidade Temporária (Aluguel Social)" }, 
    { value: "ITENS_NECESSARIOS", label: "Vulnerabilidade Temporária (Itens básicos)" }, 
    { value: "DOCUMENTACAO", label: "Vulnerabilidade Temporária (Documentação Civil)" }, 
    { value: "CALAMIDADE", label: "Situação de Calamidade Pública" }, 
];

// ⭐️ CORREÇÃO 1: Ajuste do Schema Zod para evitar conflito de tipo 'unknown' ⭐️
const formSchema = z.object({
    // 1. Vinculação (Tratado como string para o form)
    caso_id: z.string().min(1, "É obrigatório vincular um prontuário (caso) do CRAS."),
    
    // 2. Requerimento
    processo_numero: z.string().optional().nullable(),
    data_solicitacao: z.string().min(1, "A data da solicitação é obrigatória."),
    beneficio_solicitado: z.string().min(1, "O tipo de benefício é obrigatório."),
    
    // 3. Parecer
    breve_relato: z.string().optional().nullable(),
    parecer_social: z.string().min(10, "O parecer social (deferimento/indeferimento) é obrigatório."),
    status_parecer: z.enum(['Deferido', 'Indeferido'], { message: "Status (Deferido/Indeferido) é obrigatório." }),

    // 4. Concessão (Tratado como string para o form)
    valor_concedido: z.string().optional().nullable(),
    dados_bancarios: z.string().optional().nullable(),
});

type BeneficioFormData = z.infer<typeof formSchema>; 

interface BeneficioEventualModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void; // Para recarregar a lista de instrumentais
}

export default function BeneficioEventualModal({ isOpen, onClose, onSuccess }: BeneficioEventualModalProps) {
    const { user } = useAuth();
    
    const [searchNome, setSearchNome] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [matchingCasos, setMatchingCasos] = useState<CaseListEntry[]>([]);
    const [selectedCasoNome, setSelectedCasoNome] = useState<string | null>(null);

    const { 
        register, 
        handleSubmit, 
        control, 
        formState: { errors, isSubmitting }, 
        reset, 
        setValue, 
        getValues // ⭐️ CORREÇÃO 3: getValues incluído ⭐️
    } = useForm<BeneficioFormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            data_solicitacao: new Date().toISOString().split('T')[0],
            status_parecer: 'Deferido',
            processo_numero: null,
            breve_relato: null,
            valor_concedido: "0", // ⭐️ CORREÇÃO 1: Inicia como string
            dados_bancarios: null,
        },
    });

    // Limpa o formulário quando o modal é fechado
    useEffect(() => {
        if (!isOpen) {
            reset();
            setSearchNome("");
            setMatchingCasos([]);
            setSelectedCasoNome(null);
        }
    }, [isOpen, reset]);

    // Função para buscar o caso (prontuário)
    const handleSearchCaso = async () => {
        if (searchNome.length < 3) {
            toast.warn("Digite pelo menos 3 caracteres do nome.");
            return;
        }
        setIsSearching(true);
        try {
            const results = await searchCasosByTerm(searchNome);
            if (results.length === 0) {
                toast.error("Nenhum prontuário encontrado com esse nome na sua unidade.");
            }
            setMatchingCasos(results);
        } catch (error: any) {
            toast.error(`Erro ao buscar prontuário: ${error.message}`);
        } finally {
            setIsSearching(false);
        }
    };

    // Função para vincular o caso selecionado
    const handleSelectCaso = (casoId: string) => {
        const idNum = Number(casoId);
        const casoSelecionado = matchingCasos.find(c => c.id === idNum);
        if (casoSelecionado) {
            setValue("caso_id", String(idNum), { shouldValidate: true }); // ⭐️ CORREÇÃO 1: Seta como string
            setSelectedCasoNome(casoSelecionado.nome);
        }
    };

    // 📌 Submissão dos dados para a nova rota /api/beneficios
    const onSubmit: SubmitHandler<BeneficioFormData> = async (data) => {
        
        // ⭐️ CORREÇÃO 2: Conversão manual dos tipos para o payload da API ⭐️
        const payload: BeneficioEventualPayload = {
            ...data,
            caso_id: Number(data.caso_id), // Converte string para number
            valor_concedido: Number(data.valor_concedido?.replace(',', '.') || 0), // Converte string para number
        };
        
        try {
            await createBeneficioEventual(payload); 
            toast.success("✅ Requerimento de Benefício Eventual salvo!");
            onSuccess(); 
            onClose();
        } catch (error: any) {
            toast.error(`❌ Falha ao salvar requerimento: ${error.message}`);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Requerimento de Benefício Eventual (Instrumental)</DialogTitle>
                    <DialogDescription>
                        Registre o parecer técnico e a solicitação (conforme Lei Municipal nº 4.909/2017).
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 overflow-y-auto max-h-[70vh] p-1">
                    
                    {/* 1. VINCULAR PRONTUÁRIO */}
                    <Card className="bg-slate-50 border-slate-200">
                        <CardContent className="pt-6 space-y-4">
                            <CardTitle className="text-lg flex items-center gap-2"><Link2 className="h-5 w-5" /> 1. Vincular Prontuário (Obrigatório)</CardTitle>
                            
                            {/* Feedback Visual do Vínculo */}
                            {selectedCasoNome ? (
                                <div className="p-3 bg-green-100 border border-green-300 rounded-md text-green-900">
                                    <p className="font-semibold">Prontuário Vinculado: {selectedCasoNome} (ID: {getValues("caso_id")})</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex gap-2">
                                        <div className="space-y-2 flex-1">
                                            <Label htmlFor="searchNome">Buscar Nome do Requerente</Label>
                                            <Input 
                                                id="searchNome" 
                                                placeholder="Digite o nome..." 
                                                value={searchNome} 
                                                onChange={(e) => setSearchNome(e.target.value)} 
                                            />
                                        </div>
                                        <Button type="button" onClick={handleSearchCaso} disabled={isSearching} className="self-end">
                                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    
                                    {/* Resultados da Busca */}
                                    {matchingCasos.length > 0 && (
                                        <div className="space-y-2">
                                            <Label>Selecione o Prontuário Correto:</Label>
                                            <Controller
                                                control={control}
                                                name="caso_id"
                                                render={({ field }) => (
                                                    <Select onValueChange={(value) => {
                                                        field.onChange(value); // Seta a string
                                                        handleSelectCaso(value);
                                                    }}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione o prontuário encontrado..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {matchingCasos.map(caso => (
                                                                <SelectItem key={caso.id} value={String(caso.id)}>
                                                                    {/* ⭐️ CORREÇÃO 4: Remove .nis (não existe em CaseListEntry) ⭐️ */}
                                                                    {caso.nome} (Bairro: {caso.bairro || 'N/A'})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                            {errors.caso_id && <p className="text-sm text-red-500">{errors.caso_id.message}</p>}
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* 2. REQUERIMENTO */}
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5" /> 2. Dados do Requerimento</CardTitle>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="data_solicitacao">Data da Solicitação</Label>
                                    <Input id="data_solicitacao" type="date" {...register("data_solicitacao")} />
                                    {errors.data_solicitacao && <p className="text-sm text-red-500">{errors.data_solicitacao.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="processo_numero">Nº do Processo (Opcional)</Label>
                                    <Input id="processo_numero" {...register("processo_numero")} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Benefício Solicitado (Lei 4.909/2017)</Label>
                                <Controller control={control} name="beneficio_solicitado" render={({ field }) => ( 
                                    <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}>
                                        <SelectTrigger><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger>
                                        <SelectContent>
                                            {TIPOS_BENEFICIO_EVENTUAL.map(b => (<SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>))}
                                        </SelectContent>
                                    </Select> 
                                )}/>
                                {errors.beneficio_solicitado && <p className="text-sm text-red-500">{errors.beneficio_solicitado.message}</p>}
                            </div>
                        </CardContent>
                        </Card>

                    {/* 3. PARECER SOCIAL */}
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5" /> 3. Parecer Social e Concessão</CardTitle>
                                <div className="space-y-2">
                                    <Label htmlFor="breve_relato">Breve Relato do Caso (Visita/Atendimento)</Label>
                                    <Textarea id="breve_relato" {...register("breve_relato")} rows={4} placeholder="Descreva a visita domiciliar ou o atendimento que motivou o parecer..." />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="parecer_social">Parecer Social (Justificativa)</Label>
                                    <Textarea id="parecer_social" {...register("parecer_social")} rows={5} placeholder="Justifique o deferimento ou indeferimento da solicitação..." />
                                    {errors.parecer_social && <p className="text-sm text-red-500">{errors.parecer_social.message}</p>}
                                </div>
                                
                                <div className="grid md:grid-cols-3 gap-4 pt-4">
                                    <div className="space-y-2">
                                        <Label>Resultado do Parecer</Label>
                                        <Controller control={control} name="status_parecer" render={({ field }) => ( 
                                            <Select onValueChange={(val) => field.onChange(val)} value={field.value ?? ""}>
                                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Deferido">Deferido (Concedido)</SelectItem>
                                                    <SelectItem value="Indeferido">Indeferido (Negado)</SelectItem>
                                                </SelectContent>
                                            </Select> 
                                        )}/>
                                        {errors.status_parecer && <p className="text-sm text-red-500">{errors.status_parecer.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="valor_concedido">Valor Concedido (R$)</Label>
                                        <Input id="valor_concedido" type="number" step="0.01" {...register("valor_concedido")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dados_bancarios">Dados Bancários (Se houver)</Label>
                                        <Input id="dados_bancarios" {...register("dados_bancarios")} placeholder="Agência, Conta..." />
                                    </div>
                                </div>
                        </CardContent>
                        </Card>


                    <DialogFooter className="pt-6">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={isSubmitting || isSearching}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Requerimento/Parecer
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}