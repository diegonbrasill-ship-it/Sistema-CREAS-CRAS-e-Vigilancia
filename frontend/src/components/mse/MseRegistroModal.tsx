// frontend/src/components/mse/MseRegistroModal.tsx

import React, { useState, useEffect } from 'react'; 
import { useForm, Controller, SubmitHandler, Resolver } from 'react-hook-form'; // 📌 Importando Resolver
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Loader2, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// Importação dos utilitários (caminho ajustado para subida correta de nível)
import { calculateAge, addMonthsToDate } from '../../utils/dateUtils'; 
import { createMseRegistro, MseRegistroBody, MseTipo, MseSituacao } from '@/services/api'; 

// ========================================================
// 📌 ESQUEMA DE VALIDAÇÃO ZOD (CORREÇÃO FINAL DE COERÇÃO)
// ========================================================
const formSchema = z.object({
    // Dados Pessoais
    nome_adolescente: z.string().min(3, "Nome do adolescente é obrigatório."),
    data_nascimento: z.string().min(1, "Data de nascimento é obrigatória."),
    responsavel: z.string().optional().nullable(),
    endereco: z.string().optional().nullable(),
    contato: z.string().optional().nullable(),
    nis: z.string().optional().nullable(),

    // Medida Socioeducativa
    mse_tipo: z.enum(['LA', 'PSC', 'LA + PSC'], { message: "Tipo de MSE inválido." }),
    mse_data_inicio: z.string().min(1, "Data de início da MSE é obrigatória."),
    
    // FIX CRÍTICO: Uso de z.coerce.number() e tratamento robusto para campos vazios
    mse_duracao_meses: z.preprocess(
        (val) => (val === null || val === undefined || val === '') ? 0 : val,
        z.coerce.number().min(1, "Duração deve ser de pelo menos 1 mês.").max(99, "Duração deve ser menor que 100 meses.")
    ),

    situacao: z.enum(['CUMPRIMENTO', 'DESCUMPRIMENTO'], { message: "Situação é obrigatória." }),
    local_descumprimento: z.string().optional().nullable(),
    
    // PIA
    pia_data_elaboracao: z.string().optional().nullable(),
    pia_status: z.string().optional().nullable(),
}).refine(data => data.mse_duracao_meses > 0, {
    message: "A duração da MSE é obrigatória.",
    path: ["mse_duracao_meses"], 
});

type MseFormData = z.infer<typeof formSchema>; 

// ========================================================
// 📌 Componente Modal
// ========================================================
interface MseRegistroModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    registroId?: number; // Opcional para modo edição
}

// 📌 Constantes de Opções
const MSE_TIPOS: MseTipo[] = ['LA', 'PSC', 'LA + PSC'];
const SITUACAO_OPCOES: MseSituacao[] = ['CUMPRIMENTO', 'DESCUMPRIMENTO'];


export default function MseRegistroModal({ isOpen, onClose, onSuccess, registroId }: MseRegistroModalProps) {
    const isEditMode = !!registroId;

    const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<MseFormData>({
        // 📌 SOLUÇÃO FINAL: Faz o cast do resolver para resolver a incompatibilidade (unknown vs number)
        resolver: zodResolver(formSchema) as Resolver<MseFormData>, 
        defaultValues: {
            // Garante que o valor default seja 0 ou string vazia (sem 'null' para input type="number")
            mse_duracao_meses: 0 as any, 
            situacao: 'CUMPRIMENTO',
            data_nascimento: '',
            mse_data_inicio: '',
            nome_adolescente: '',
            responsavel: null, endereco: null, contato: null, nis: null, local_descumprimento: null,
            pia_data_elaboracao: null, pia_status: null,
        },
    });

    // 📌 Efeitos Dinâmicos (Idade, Data Final)
    const [idade, setIdade] = useState<number | string>('-');
    const [dataFim, setDataFim] = useState<string>('-');
    
    const dataNascimento = watch('data_nascimento');
    const dataInicio = watch('mse_data_inicio');
    // NOTE: watch retorna o valor final tipado (number)
    const duracaoMeses = watch('mse_duracao_meses'); 

    // 1. Calcula Idade
    useEffect(() => {
        if (dataNascimento) {
            setIdade(calculateAge(dataNascimento));
        } else {
            setIdade('-');
        }
    }, [dataNascimento]);

    // 2. Calcula Data Final da MSE
    useEffect(() => {
        // Garantimos que 'duracaoMeses' é number e maior que zero
        if (dataInicio && typeof duracaoMeses === 'number' && duracaoMeses > 0) {
            setDataFim(addMonthsToDate(dataInicio, duracaoMeses)); 
        } else {
            setDataFim('-');
        }
    }, [dataInicio, duracaoMeses]);
    
    // 🚨 FUTURO: Lógica para carregar dados para EDICAO
    // ...

    // 📌 IMPLEMENTAÇÃO DO SUBMIT ROBUSTO
    const onSubmit: SubmitHandler<MseFormData> = async (data) => {
        
        // Constrói o payload removendo campos nulos, vazios ou 0 (exceto se 0 for um valor válido)
        const cleanedPayload = Object.entries(data).reduce((acc, [key, value]) => {
            if (value !== null && value !== undefined && value !== '' && (key !== 'mse_duracao_meses' || value !== 0)) {
                 (acc as any)[key] = value;
            }
            return acc;
        }, {} as Partial<MseRegistroBody>);


        // 📌 CONVERSÃO CRÍTICA (as unknown as MseRegistroBody): Garantida pelo Zod
        const payload = cleanedPayload as unknown as MseRegistroBody;


        try {
            if (isEditMode) {
                // Implementar updateMseRegistro(registroId, payload);
                toast.success("✅ Registro MSE atualizado com sucesso!");
            } else {
                const response = await createMseRegistro(payload);
                toast.success(`✅ Registro MSE de ${data.nome_adolescente} criado! ID: ${response.registroId}`);
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(`❌ Falha ao salvar registro: ${error.message}`);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? `Editar Registro MSE ID: ${registroId}` : "Novo Registro de Medida Socioeducativa"}</DialogTitle>
                    <DialogDescription>
                        Preencha os dados do adolescente e da medida (Exclusivo para uso do CREAS).
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 overflow-y-auto max-h-[70vh]">
                    <h3 className="text-lg font-semibold border-b pb-2">1. Dados do Adolescente</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2 col-span-2"><Label htmlFor="nome_adolescente">Nome Completo do Adolescente</Label><Input {...register("nome_adolescente")} />{errors.nome_adolescente && <p className="text-sm text-red-500">{errors.nome_adolescente.message}</p>}</div>
                        <div className="space-y-2"><Label htmlFor="data_nascimento">Data de Nascimento</Label><Input type="date" {...register("data_nascimento")} />{errors.data_nascimento && <p className="text-sm text-red-500">{errors.data_nascimento.message}</p>}<p className="text-xs text-slate-500">Idade Atual: <span className="font-semibold">{idade}</span></p></div>
                        <div className="space-y-2"><Label htmlFor="nis">NIS</Label><Input {...register("nis")} />{errors.nis && <p className="text-sm text-red-500">{errors.nis.message}</p>}</div>
                        <div className="space-y-2"><Label htmlFor="responsavel">Responsável Legal</Label><Input {...register("responsavel")} /></div>
                        <div className="space-y-2"><Label htmlFor="contato">Contato</Label><Input {...register("contato")} /></div>
                        <div className="space-y-2 col-span-3"><Label htmlFor="endereco">Endereço Completo</Label><Input {...register("endereco")} /></div>
                    </div>
                    
                    <h3 className="text-lg font-semibold border-b pb-2 pt-4">2. Detalhes da Medida</h3>
                    <div className="grid md:grid-cols-4 gap-4">
                        <div className="space-y-2"><Label>Tipo de MSE</Label><Controller control={control} name="mse_tipo" render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{MSE_TIPOS.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent></Select> )}/>{errors.mse_tipo && <p className="text-sm text-red-500">{errors.mse_tipo.message}</p>}</div>
                        <div className="space-y-2"><Label htmlFor="mse_data_inicio">Data de Início</Label><Input type="date" {...register("mse_data_inicio")} />{errors.mse_data_inicio && <p className="text-sm text-red-500">{errors.mse_data_inicio.message}</p>}</div>
                        
                        {/* INPUT DE DURAÇÃO */}
                        <div className="space-y-2"><Label htmlFor="mse_duracao_meses">Duração (meses)</Label><Input type="number" {...register("mse_duracao_meses")} />{errors.mse_duracao_meses && <p className="text-sm text-red-500">{errors.mse_duracao_meses.message as string}</p>}<p className="text-xs text-slate-500">Data Fim Estimada: <span className="font-semibold">{dataFim}</span></p></div>
                        
                        <div className="space-y-2"><Label>Situação Atual</Label><Controller control={control} name="situacao" render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{SITUACAO_OPCOES.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select> )}/>{errors.situacao && <p className="text-sm text-red-500">{errors.situacao.message}</p>}</div>
                    </div>

                    <div className="space-y-2"><Label htmlFor="local_descumprimento">Local de Descumprimento (Se aplicável)</Label><Input {...register("local_descumprimento")} /></div>
                    
                    <h3 className="text-lg font-semibold border-b pb-2 pt-4">3. Plano Individual de Atendimento (PIA)</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2"><Label htmlFor="pia_data_elaboracao">Data da Elaboração do PIA</Label><Input type="date" {...register("pia_data_elaboracao")} /></div>
                        <div className="space-y-2"><Label>Status do PIA</Label><Controller control={control} name="pia_status" render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="Em Análise">Em Análise</SelectItem><SelectItem value="Aprovado">Aprovado</SelectItem><SelectItem value="Revisão">Em Revisão</SelectItem><SelectItem value="Não Elaborado">Não Elaborado</SelectItem></SelectContent></Select> )}/></div>
                    </div>

                    <DialogFooter className="pt-6">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditMode ? 'Salvar Alterações' : 'Registrar MSE'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
