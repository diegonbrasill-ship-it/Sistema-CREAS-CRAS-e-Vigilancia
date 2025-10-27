// frontend/src/components/atividades/AtividadeFormModal.tsx
// ⭐️ COMPONENTE CORRIGIDO: Zod e Payload ⭐️

import React, { useState, useEffect } from 'react'; 
import { useForm, Controller, SubmitHandler } from 'react-hook-form'; 
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from '@/contexts/AuthContext';

// Importa a função da API (que já deve estar no api.ts)
import { createAtividadeColetiva, AtividadeColetivaPayload } from '@/services/api'; 

// --- Tipos de Atividade (Baseado no RMA Bloco G) ---
const TIPOS_ATIVIDADE = [
    { value: "GRUPO_PAIF_GESTANTES", label: "Grupo PAIF (Gestantes)" }, // G.1.1
    { value: "GRUPO_PAIF_BPC", label: "Grupo PAIF (BPC)" }, // G.1.2
    { value: "GRUPO_PAIF_PBF", label: "Grupo PAIF (Condicionalidades PBF)" }, // G.1.3
    { value: "GRUPO_PAIF_OUTROS", label: "Grupo PAIF (Outros Temas)" }, // G.1.4
    { value: "SCFV_0_6", label: "SCFV (Crianças 0-6 anos)" }, // G.2
    { value: "SCFV_7_14", label: "SCFV (Crianças/Adolescentes 7-14 anos)" }, // G.3
    { value: "SCFV_15_17", label: "SCFV (Adolescentes 15-17 anos)" }, // G.4
    { value: "SCFV_18_59", label: "SCFV (Adultos 18-59 anos)" }, // G.5
    { value: "SCFV_IDOSOS", label: "SCFV (Idosos 60+)" }, // G.7
    { value: "SCFV_PCD", label: "SCFV (Pessoas com Deficiência)" }, // G.9
    { value: "EVENTO_PALESTRA", label: "Evento/Palestra/Oficina (Não continuado)" }, // G.10
];

// --- Esquema de Validação Zod ---
const formSchema = z.object({
    data_atividade: z.string().min(1, "A data da atividade é obrigatória."),
    tipo_atividade: z.string().min(1, "O tipo de atividade é obrigatório."),
    
    tema_grupo: z.string().optional().nullable(), 
    
    // ⭐️ CORREÇÃO 1: Trata numero_participantes como string no Zod para evitar conflito de 'unknown'
    numero_participantes: z.string().optional().nullable(),
    
    descricao: z.string().optional().nullable(),
}).refine(data => {
    // Validação condicional: Se for 'GRUPO_PAIF_OUTROS', o tema é obrigatório.
    if (data.tipo_atividade === 'GRUPO_PAIF_OUTROS' && (!data.tema_grupo || data.tema_grupo.length < 3)) {
        return false;
    }
    return true;
}, {
    message: "O 'Tema Específico' é obrigatório se o tipo for 'Grupo PAIF (Outros Temas)'.",
    path: ["tema_grupo"], // Onde o erro deve aparecer
});

type AtividadeFormData = z.infer<typeof formSchema>; 

interface AtividadeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void; // Para recarregar a lista de atividades
}

export default function AtividadeFormModal({ isOpen, onClose, onSuccess }: AtividadeFormModalProps) {
    const { user } = useAuth();
    
    const { register, handleSubmit, control, watch, formState: { errors, isSubmitting }, reset } = useForm<AtividadeFormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            data_atividade: new Date().toISOString().split('T')[0],
            tipo_atividade: TIPOS_ATIVIDADE[0].value,
            numero_participantes: "0", // ⭐️ CORREÇÃO 1: Inicia como string
            tema_grupo: null,
            descricao: null,
        },
    });

    const tipoAtividadeSelecionado = watch('tipo_atividade');

    useEffect(() => {
        if (!isOpen) {
            reset();
        }
    }, [isOpen, reset]);

    // 📌 Submissão dos dados para a nova rota /api/atividades
    const onSubmit: SubmitHandler<AtividadeFormData> = async (data) => {
        
        // ⭐️ CORREÇÃO 2: Mapeamento explícito de 'undefined' para 'null' e 'string' para 'number'
        const payload: AtividadeColetivaPayload = {
            data_atividade: data.data_atividade,
            tipo_atividade: data.tipo_atividade,
            
            // Mapeia o tema (se não for 'OUTROS', usa o label)
            tema_grupo: data.tipo_atividade === 'GRUPO_PAIF_OUTROS' 
                ? (data.tema_grupo || null) // Garante null se undefined
                : TIPOS_ATIVIDADE.find(t => t.value === data.tipo_atividade)?.label || data.tipo_atividade,
            
            publico_alvo: data.tipo_atividade.startsWith('SCFV_') 
                ? data.tipo_atividade 
                : null,
            
            // Converte string do formulário para número
            numero_participantes: Number(data.numero_participantes || 0), 
            descricao: data.descricao || null, // Garante null se undefined
        };

        try {
            await createAtividadeColetiva(payload);
            toast.success("✅ Atividade Coletiva registrada com sucesso!");
            onSuccess(); 
            onClose();
        } catch (error: any) {
            toast.error(`❌ Falha ao salvar atividade: ${error.message}`);
        }
    };

    // O restante do JSX (renderização) permanece o mesmo

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Registrar Atividade Coletiva (RMA)</DialogTitle>
                    <DialogDescription>
                        Registre atividades de grupo (PAIF, SCFV) ou eventos (Palestras) para o RMA.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 overflow-y-auto max-h-[70vh]">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="data_atividade">Data da Atividade</Label>
                            <Input id="data_atividade" type="date" {...register("data_atividade")} />
                            {errors.data_atividade && <p className="text-sm text-red-500">{errors.data_atividade.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="numero_participantes">Nº de Participantes</Label>
                            {/* ⭐️ CORREÇÃO 1: O tipo do input é 'number' para UX, mas o Zod trata como string */}
                            <Input id="numero_participantes" type="number" {...register("numero_participantes")} />
                            {errors.numero_participantes && <p className="text-sm text-red-500">{errors.numero_participantes.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Tipo de Atividade (RMA Bloco G)</Label>
                        <Controller control={control} name="tipo_atividade" render={({ field }) => ( 
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    {TIPOS_ATIVIDADE.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                                </SelectContent>
                            </Select> 
                        )}/>
                        {errors.tipo_atividade && <p className="text-sm text-red-500">{errors.tipo_atividade.message}</p>}
                    </div>
                    
                    {/* Campo Condicional */}
                    {tipoAtividadeSelecionado === 'GRUPO_PAIF_OUTROS' && (
                        <div className="space-y-2">
                            <Label htmlFor="tema_grupo">Tema Específico (Obrigatório para "Outros")</Label>
                            <Input id="tema_grupo" {...register("tema_grupo")} placeholder="Ex: Geração de Renda, Cuidados na 1ª Infância..." />
                            {errors.tema_grupo && <p className="text-sm text-red-500">{errors.tema_grupo.message}</p>}
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <Label htmlFor="descricao">Descrição (Opcional)</Label>
                        <Textarea id="descricao" {...register("descricao")} placeholder="Descreva brevemente a atividade realizada..." />
                    </div>

                    <DialogFooter className="pt-6">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Registrar Atividade
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}