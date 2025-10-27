// frontend/src/components/mse/MseRegistroModal.tsx

import React, { useState, useEffect } from 'react'; 
import { useForm, Controller, SubmitHandler, Resolver } from 'react-hook-form'; 
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Loader2, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// Importação dos utilitários
import { calculateAge, addMonthsToDate } from '../../utils/dateUtils'; 
// ⭐️ ADICIONADO: Assumimos que updateMseRegistro existe no api.ts ⭐️
import { createMseRegistro, getMseRegistroById, updateMseRegistro, MseRegistroBody, MseTipo, MseSituacao } from '@/services/api'; 

// ========================================================
// ESQUEMA DE VALIDAÇÃO ZOD (MANTIDO)
// ========================================================
const formSchema = z.object({
    nome_adolescente: z.string().min(3, "Nome do adolescente é obrigatório."),
    data_nascimento: z.string().min(1, "Data de nascimento é obrigatória."),
    responsavel: z.string().optional().nullable(),
    endereco: z.string().optional().nullable(),
    contato: z.string().optional().nullable(),
    nis: z.string().optional().nullable(),
    mse_tipo: z.enum(['LA', 'PSC', 'LA + PSC'], { message: "Tipo de MSE inválido." }),
    mse_data_inicio: z.string().min(1, "Data de início da MSE é obrigatória."),
    mse_duracao_meses: z.preprocess(
        (val) => (val === null || val === undefined || val === '') ? 0 : val,
        z.coerce.number().min(1, "Duração deve ser de pelo menos 1 mês.").max(99, "Duração deve ser menor que 100 meses.")
    ),
    situacao: z.enum(['CUMPRIMENTO', 'DESCUMPRIMENTO'], { message: "Situação é obrigatória." }),
    local_descumprimento: z.string().optional().nullable(),
    pia_data_elaboracao: z.string().optional().nullable(),
    pia_status: z.string().optional().nullable(), 
});

type MseFormData = z.infer<typeof formSchema>; 

// ========================================================
// Componente Modal
// ========================================================
interface MseRegistroModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    registroId?: number; // Opcional para modo edição
}

const MSE_TIPOS: MseTipo[] = ['LA', 'PSC', 'LA + PSC'];
const SITUACAO_OPCOES: MseSituacao[] = ['CUMPRIMENTO', 'DESCUMPRIMENTO'];


export default function MseRegistroModal({ isOpen, onClose, onSuccess, registroId }: MseRegistroModalProps) {
    const isEditMode = !!registroId;
    const [isLoadEditing, setIsLoadEditing] = useState(false); 

    const { register, handleSubmit, control, watch, formState: { errors, isSubmitting }, reset } = useForm<MseFormData>({
        resolver: zodResolver(formSchema) as Resolver<MseFormData>, 
        defaultValues: {
            mse_duracao_meses: 6,
            situacao: 'CUMPRIMENTO',
            data_nascimento: '', mse_data_inicio: '', nome_adolescente: '',
            responsavel: null, endereco: null, contato: null, nis: null, local_descumprimento: null,
            pia_data_elaboracao: null, pia_status: 'Em Análise', 
        },
    });

    // 📌 Efeitos Dinâmicos (Idade, Data Final)
    const [idade, setIdade] = useState<number | string>('-');
    const [dataFim, setDataFim] = useState<string>('-');
    const dataNascimento = watch('data_nascimento');
    const dataInicio = watch('mse_data_inicio');
    const duracaoMesesValue = watch('mse_duracao_meses');
    const duracaoMeses = Number(duracaoMesesValue) || 0; 

    useEffect(() => { if (dataNascimento) setIdade(calculateAge(dataNascimento)); else setIdade('-'); }, [dataNascimento]);
    useEffect(() => { if (dataInicio && duracaoMeses > 0) setDataFim(addMonthsToDate(dataInicio, duracaoMeses)); else setDataFim('-'); }, [dataInicio, duracaoMeses]);
    
    
    // 📌 FIX CRÍTICO: Lógica de Carregamento de Dados
    useEffect(() => {
        // 1. Condição: Só carrega se estiver em modo edição E o modal estiver aberto
        if (isEditMode && registroId && isOpen) {
            const loadData = async () => {
                setIsLoadEditing(true);
                try {
                    // Chama a API para buscar os dados do registro
                    const data = await getMseRegistroById(registroId);
                    
                    // Converte strings de data do DB para formato de input HTML
                    const formattedData = {
                        ...data,
                        data_nascimento: data.data_nascimento ? new Date(data.data_nascimento).toISOString().split('T')[0] : '',
                        mse_data_inicio: data.mse_data_inicio ? new Date(data.mse_data_inicio).toISOString().split('T')[0] : '',
                        pia_data_elaboracao: data.pia_data_elaboracao ? new Date(data.pia_data_elaboracao).toISOString().split('T')[0] : null,
                        // Garante que campos nulos/undefined sejam tratados como '' para inputs de texto
                        nis: data.nis || '',
                        contato: data.contato || '',
                    };
                    
                    // Preenche o formulário com os dados existentes
                    reset(formattedData); 
                } catch (err: any) {
                    toast.error(`Falha ao carregar registro MSE: ${err.message}. Verifique o ID ${registroId}.`);
                } finally {
                    setIsLoadEditing(false);
                }
            };
            loadData();
        } else if (!isEditMode && !isOpen) {
            // 2. Limpa o formulário ao fechar (se for modo CRIAÇÃO e o modal fechar)
            reset(); 
        }
    }, [registroId, isEditMode, isOpen, reset]); 

    // 📌 IMPLEMENTAÇÃO DO SUBMIT ROBUSTO
    const onSubmit: SubmitHandler<MseFormData> = async (data) => {
        
        // Remove campos nulos/vazios e undefined
        const cleanedPayload = Object.entries(data).reduce((acc, [key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                 (acc as any)[key] = value;
            } else if (key === 'local_descumprimento' || key === 'pia_data_elaboracao' || key === 'pia_status') {
                // Preserva a chave com valor null no payload para campos opcionais (Backend lida)
                (acc as any)[key] = null;
            }
            return acc;
        }, {} as Partial<MseRegistroBody>);

        // Limpeza de Máscara (apenas dígitos) e conversão de duração para number
        const finalPayload: MseRegistroBody = {
            ...data, // Usa a data original para garantir que todos os campos estão presentes (sejam null ou não)
            ...cleanedPayload,
            nis: (data.nis || '').replace(/[^\d]/g, '') || null,
            contato: (data.contato || '').replace(/[^\d]/g, '') || null,
            mse_duracao_meses: Number(data.mse_duracao_meses), 
        } as MseRegistroBody;

        try {
            if (isEditMode) {
                // ⭐️ CHAMADA CORRETA: updateMseRegistro agora existe ⭐️
                await updateMseRegistro(registroId!, finalPayload); 
                toast.success("✅ Registro MSE atualizado com sucesso!");
            } else {
                const response = await createMseRegistro(finalPayload);
                toast.success(`✅ Registro MSE de ${data.nome_adolescente} criado! ID: ${response.registroId}`);
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(`❌ Falha ao salvar registro: ${error?.message ?? error.toString()}`);
        }
    };

    // 📌 FIX CRÍTICO 3: Exibir o Loader durante o carregamento de dados
    if (isLoadEditing) {
        return (
            <Dialog open={isOpen}>
                <DialogContent>
                    <div className="text-center p-10">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                        <p className="mt-2 text-slate-600">Carregando dados do registro...</p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? `Editando Registro MSE ID: ${registroId}` : "Novo Registro de Medida Socioeducativa"}</DialogTitle>
                    <DialogDescription>
                        Preencha os dados do adolescente e da medida (Exclusivo para uso do CREAS).
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 overflow-y-auto max-h-[70vh]">
                    <h3 className="text-lg font-semibold border-b pb-2">1. Dados do Adolescente</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2 col-span-2"><Label htmlFor="nome_adolescente">Nome Completo do Adolescente</Label><Input {...register("nome_adolescente")} />{errors.nome_adolescente && <p className="text-sm text-red-500">{errors.nome_adolescente.message}</p>}</div>
                        <div className="space-y-2"><Label htmlFor="data_nascimento">Data de Nascimento</Label><Input type="date" {...register("data_nascimento")} />{errors.data_nascimento && <p className="text-sm text-red-500">{errors.data_nascimento.message}</p>}<p className="text-xs text-slate-500">Idade Atual: <span className="font-semibold">{idade}</span></p></div>
                        
                        {/* INPUT COM MÁSCARA: NIS */}
                        <div className="space-y-2">
                            <Label htmlFor="nis">NIS</Label>
                            <Controller
                                name="nis"
                                control={control}
                                render={({ field }) => (
                                    <Input 
                                        id="nis"
                                        type="text" 
                                        placeholder="000.00000.00-0"
                                        {...field}
                                        value={field.value ?? ''}
                                    />
                                )}
                            />
                            {errors.nis && <p className="text-sm text-red-500">{errors.nis.message}</p>}
                        </div>
                        
                        <div className="space-y-2"><Label htmlFor="responsavel">Responsável Legal</Label><Input {...register("responsavel")} /></div>
                        
                        {/* INPUT COM MÁSCARA: CONTATO */}
                        <div className="space-y-2">
                            <Label htmlFor="contato">Contato</Label>
                            <Controller
                                name="contato"
                                control={control}
                                render={({ field }) => (
                                    <Input 
                                        id="contato" 
                                        type="text" 
                                        placeholder="(00) 00000-0000"
                                        {...field}
                                        value={field.value ?? ''}
                                    />
                                )}
                            />
                        </div>

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
