// frontend/src/pages/Cadastro.tsx

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { Loader2, Eraser } from "lucide-react";
// ⭐️ NOVAS IMPORTAÇÕES DE TIPAGEM ⭐️
import { createCase, updateCase, getCasoById, CaseDetail, CasePayload } from "../services/api";

const validateCPF = (cpf: string | undefined | null): boolean => {
  if (!cpf || cpf.trim() === "") return true;
  const cpfClean = cpf.replace(/[^\d]/g, "");
  if (cpfClean.length !== 11 || /^(\d)\1+$/.test(cpfClean)) return false;
  return true;
};

const validateNIS = (nis: string | undefined | null): boolean => {
  if (!nis || nis.trim() === "") return true;
  return /^\d{11}$/.test(nis.replace(/[^\d]/g, ""));
};

// ⭐️ ESQUEMA DE VALIDAÇÃO REFORÇADO (Alinhado com a nova BaseCase) ⭐️
const formSchema = z.object({
  dataCad: z.string().min(1, "A data do cadastro é obrigatória."),
  tecRef: z.string().min(3, "O nome do técnico é obrigatório."),
  tipoViolencia: z.string().optional().nullable(),
  localOcorrencia: z.string().optional().nullable(),
  nome: z.string().optional().nullable(),
  cpf: z.string().optional().nullable().refine(validateCPF, { message: "CPF inválido." }),
  nis: z.string().optional().nullable().refine(validateNIS, { message: "NIS deve conter 11 dígitos." }),
  idade: z.string().optional().nullable(),
  sexo: z.string().optional().nullable(),
  corEtnia: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  escolaridade: z.string().optional().nullable(),
  rendaFamiliar: z.string().optional().nullable(),
  recebePBF: z.string().optional().nullable(),
  recebeBPC: z.string().optional().nullable(),
  recebeBE: z.string().optional().nullable(),
  membrosCadUnico: z.string().optional().nullable(),
  membroPAI: z.string().optional().nullable(),
  composicaoFamiliar: z.string().optional().nullable(),
  tipoMoradia: z.string().optional().nullable(),
  referenciaFamiliar: z.string().optional().nullable(),
  membroCarcerario: z.string().optional().nullable(),
  membroSocioeducacao: z.string().optional().nullable(),
  vitimaPCD: z.string().optional().nullable(),
  vitimaPCDDetalhe: z.string().optional().nullable(),
  tratamentoSaude: z.string().optional().nullable(),
  tratamentoSaudeDetalhe: z.string().optional().nullable(),
  dependeFinanceiro: z.string().optional().nullable(),
  encaminhamento: z.string().optional().nullable(),
  encaminhamentoDetalhe: z.string().optional().nullable(),
  qtdAtendimentos: z.string().optional().nullable(),
  encaminhadaSCFV: z.string().optional().nullable(),
  inseridoPAEFI: z.string().optional().nullable(),
  confirmacaoViolencia: z.string().optional().nullable(),
  canalDenuncia: z.string().optional().nullable(),
  notificacaoSINAM: z.string().optional().nullable(),
  reincidente: z.string().optional().nullable(),
});

type CasoForm = z.infer<typeof formSchema>;

export default function Cadastro() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const { user } = useAuth();

  const {
    register, handleSubmit, control,
    formState: { errors, isSubmitting, dirtyFields },
    reset, watch, getValues, setValue,
  } = useForm<CasoForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dataCad: new Date().toISOString().split('T')[0],
      tecRef: "",
      // Inicializa todos os campos JSONB/opcionais como NULL para alinhar com Zod
      nome: null, cpf: null, nis: null, idade: null, sexo: null, corEtnia: null, bairro: null,
      escolaridade: null, rendaFamiliar: null, recebePBF: null, recebeBPC: null, recebeBE: null,
      membrosCadUnico: null, membroPAI: null, composicaoFamiliar: null, tipoMoradia: null,
      referenciaFamiliar: null, membroCarcerario: null, membroSocioeducacao: null, vitimaPCD: null,
      vitimaPCDDetalhe: null, tratamentoSaude: null, tratamentoSaudeDetalhe: null, dependeFinanceiro: null,
      encaminhamento: null, encaminhamentoDetalhe: null, qtdAtendimentos: null, encaminhadaSCFV: null,
      inseridoPAEFI: null, confirmacaoViolencia: null, canalDenuncia: null, notificacaoSINAM: null,
      reincidente: null, tipoViolencia: null, localOcorrencia: null,
    },
  });
  
  // 📌 Estado para controlar o carregamento na edição
  const [isDataLoading, setIsDataLoading] = useState(isEditMode);

  const [activeTab, setActiveTab] = useState("atendimento");

  // 📌 LÓGICA DE PRÉ-PREENCHIMENTO E MODO EDIÇÃO
  useEffect(() => {
    if (isEditMode && id) {
      const loadCasoData = async () => {
        try {
            setIsDataLoading(true);
            // ⭐️ ATUALIZADO: getCasoById retorna CaseDetail ⭐️
          const casoData: CaseDetail = await getCasoById(id);
            
            // Corrige a formatação da data para o input type="date"
            const dataCadFormatada = casoData.dataCad ? new Date(casoData.dataCad).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

            // ⭐️ CORREÇÃO CRÍTICA: Mapeamento dos dados do caso para o formulário ⭐️
            const formData: Partial<CasoForm> = {};
            
            // Itera sobre o Zod Schema para garantir que TODOS os campos são mapeados
            (Object.keys(formSchema.shape) as Array<keyof CasoForm>).forEach(key => {
                const value = (casoData as any)[key];
                
                if (key === 'dataCad') {
                    (formData as any)[key] = dataCadFormatada;
                } else {
                    // Se o valor é null, undefined, ou 0, usa "" para o input, senão usa o valor
                    (formData as any)[key] = value !== undefined && value !== null && value !== 0 ? value.toString() : "";
                }
            });
            
            // Reseta o formulário com os dados mapeados
          reset(formData as CasoForm);
        } catch (error) {
          toast.error("Não foi possível carregar os dados do caso para edição.");
          navigate("/consulta");
        } finally {
            setIsDataLoading(false);
        }
      };
      loadCasoData();
    } else if (user) {
        // Modo CRIAÇÃO: Preenche o Técnico de Referência automaticamente
        const nomeCompleto = user.nome_completo || user.username;
        const cargo = user.cargo || "";
        
        const tecRefFormatado = user.role.includes('tecnico') && cargo 
            ? `${nomeCompleto} - ${cargo}` 
            : (nomeCompleto || "");
        
        reset(prev => ({
            ...prev,
            dataCad: new Date().toISOString().split('T')[0],
            tecRef: tecRefFormatado,
        }));
        setIsDataLoading(false);
    }
  }, [id, isEditMode, reset, navigate, user, setValue]);

  const vitimaPCDValue = watch("vitimaPCD");
  const tratamentoSaudeValue = watch("tratamentoSaude");
  const encaminhamentoValue = watch("encaminhamento");

  const onSubmit = async (data: CasoForm) => {
        // 1. Mapear os dados do formulário para o formato de payload do Back-end.
        
        const payload: Partial<CasePayload> = {};
        
        // Itera sobre os dados do formulário (todos os campos são JSONB ou raiz)
        (Object.keys(data) as Array<keyof CasoForm>).forEach(key => {
            const rawValue = data[key];
            
            // 🛑 Mapeamento: Converte "" para NULL (alinhando Front-end com Back-end)
            // A lógica do Back-end (casos.ts) garante que null/"" são tratados para persistir NULL no JSONB.
            const finalValue = rawValue === "" || rawValue === undefined ? null : rawValue;

            // Todos os campos são enviados no mesmo nível.
            (payload as any)[key] = finalValue;
        });
    
    try {
      if (isEditMode) {
        // Edição (PUT)
        // Mapeia APENAS os campos modificados (dirtyFields)
        const dirtyDataPayload: Partial<CasePayload> = {};
        
        // Itera sobre todos os campos e inclui no payload de edição APENAS se estiverem 'dirty'
        (Object.keys(data) as Array<keyof CasoForm>).forEach(key => {
            // Sempre inclua dataCad e tecRef para fins de consistência do PUT, mesmo que não estejam 'dirty'
            if (dirtyFields[key] || key === 'dataCad' || key === 'tecRef') {
                (dirtyDataPayload as any)[key] = (payload as any)[key];
            }
        });

        if (Object.keys(dirtyFields).length === 0) { 
          toast.info("Nenhuma alteração para salvar.");
          return;
        }
        
        // 📌 Ação de Edição (PUT)
        await updateCase(id!, dirtyDataPayload);
        toast.success("✅ Progresso salvo com sucesso!");
        reset(data, { keepValues: true, keepDefaultValues: true }); // Reseta o dirty state
        
      } else {
        // Ação de Criação (POST)
        
        // ⭐️ CORREÇÃO 1: Inclui o unit_id do usuário logado no payload (Obrigatório para CasePayload)
        const payloadComUnidade: CasePayload = { 
            ...(payload as CasePayload), 
            unit_id: user?.unit_id || 1 // ✅ Adiciona o ID da unidade (Default para CREAS: 1)
        }; 

        // ⭐️ CORREÇÃO 2: createCase aceita CasePayload ⭐️
        const response = await createCase(payloadComUnidade);
        
        // Captura o ID do caso que o backend retorna como 'id'
        const novoCasoId = response.id; 

        if (!novoCasoId) {
            toast.error("❌ Erro de comunicação: ID do novo caso não foi retornado.");
            return;
        }

        toast.success("✅ Registro inicial criado! Continue preenchendo as abas.");
        // ✅ CORRIGIDO: Redireciona usando response.id
        navigate(`/cadastro/${novoCasoId}`, { replace: true }); // Redireciona para o modo edição
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
    // ⭐️ ROTA CORRIGIDA: Navega para a visualização do caso (CasoDetalhe.tsx) ⭐️
    navigate(`/caso/${id}`);
  };

  const handleClearForm = () => {
    // Lógica para limpar o formulário e navegar
    navigate('/cadastro', { replace: true });
    toast.info("Formulário limpo para um novo registro.");
  };

  if (isDataLoading) {
    return <div className="text-center p-10"><Loader2 className="h-8 w-8 animate-spin mx-auto" /> <span>Carregando dados do prontuário...</span></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          {isEditMode ? `Editando Prontuário ID: ${id}` : "Registro de Atendimento PAEFI"}
        </h1>
        <p className="text-slate-500">
          {isEditMode
            ? "Altere os dados e salve o progresso. Clique em 'Finalizar' quando terminar."
            : "Preencha as informações do caso. O técnico já foi preenchido."}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="atendimento">1. Atendimento</TabsTrigger>
            <TabsTrigger value="vitima" disabled={!isEditMode}>2. Vítima</TabsTrigger>
            <TabsTrigger value="familia" disabled={!isEditMode}>3. Família</TabsTrigger>
            <TabsTrigger value="saude" disabled={!isEditMode}>4. Saúde</TabsTrigger>
            <TabsTrigger value="encaminhamentos" disabled={!isEditMode}>5. Encaminhamentos</TabsTrigger>
          </TabsList>

          <Card className="mt-4">
            <CardContent className="pt-6">
              <TabsContent value="atendimento" className="space-y-6">
                <CardHeader className="-m-6 mb-0"><CardTitle>Dados do Atendimento e Violência</CardTitle></CardHeader>
                <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="dataCad">Data do Cadastro</Label>
                    <Input id="dataCad" type="date" {...register("dataCad")} />
                    <p className="text-sm text-red-500 mt-1 h-4">{errors.dataCad?.message}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tecRef">Técnico Responsável</Label>
                    <Input id="tecRef" placeholder="Nome do técnico - Cargo" {...register("tecRef")} disabled={isEditMode} />
                    <p className="text-sm text-red-500 mt-1 h-4">{errors.tecRef?.message}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Tipo de Violência</Label><Controller control={control} name="tipoViolencia" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="Física">Física</SelectItem><SelectItem value="Psicológica">Psicológica</SelectItem><SelectItem value="Sexual">Sexual</SelectItem></SelectContent></Select> )} /></div>
                  <div className="space-y-2">
                    <Label htmlFor="localOcorrencia">Local da Ocorrência</Label>
                    <Controller name="localOcorrencia" control={control} render={({ field }) => ( <Input id="localOcorrencia" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)} /> )} />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="vitima" className="space-y-6">
                <CardHeader className="-m-6 mb-0"><CardTitle>Dados Pessoais da Vítima</CardTitle></CardHeader>
                <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Controller name="nome" control={control} render={({ field }) => ( <Input id="nome" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)} /> )} />
                    <p className="text-sm text-red-500 mt-1 h-4">{errors.nome?.message}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Controller name="cpf" control={control} render={({ field }) => ( <Input id="cpf" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)} /> )} />
                    <p className="text-sm text-red-500 mt-1 h-4">{errors.cpf?.message}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nis">NIS</Label>
                    <Controller name="nis" control={control} render={({ field }) => ( <Input id="nis" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)} /> )} />
                    <p className="text-sm text-red-500 mt-1 h-4">{errors.nis?.message}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="idade">Idade</Label>
                    <Controller name="idade" control={control} render={({ field }) => ( <Input id="idade" type="number" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)} /> )} />
                  </div>
                  <div className="space-y-2"><Label>Sexo</Label><Controller control={control} name="sexo" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="Masculino">Masculino</SelectItem><SelectItem value="Feminino">Feminino</SelectItem></SelectContent></Select> )} /></div>
                  <div className="space-y-2"><Label>Cor/Etnia</Label><Controller control={control} name="corEtnia" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="Branca">Branca</SelectItem><SelectItem value="Preta">Preta</SelectItem><SelectItem value="Parda">Parda</SelectItem></SelectContent></Select> )} /></div>
                  <div className="space-y-2"><Label>Escolaridade</Label><Controller control={control} name="escolaridade" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="Fundamental Incompleto">Fundamental Incompleto</SelectItem><SelectItem value="Fundamental Completo">Fundamental Completo</SelectItem></SelectContent></Select> )} /></div>
                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Controller name="bairro" control={control} render={({ field }) => ( <Input id="bairro" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)} /> )} />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="familia" className="space-y-6">
                <CardHeader className="-m-6 mb-0"><CardTitle>Contexto Familiar e Social</CardTitle></CardHeader>
                <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="rendaFamiliar">Renda Familiar (R$)</Label>
                    <Controller name="rendaFamiliar" control={control} render={({ field }) => ( <Input id="rendaFamiliar" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)} /> )} />
                  </div>
                  <div className="space-y-2"><Label>Recebe Bolsa Família?</Label><Controller control={control} name="recebePBF" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select> )} /></div>
                  <div className="space-y-2"><Label>Recebe BPC?</Label><Controller control={control} name="recebeBPC" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Idoso">Idoso</SelectItem><SelectItem value="PCD">PCD</SelectItem><SelectItem value="NÃO">Não</SelectItem></SelectContent></Select> )} /></div>
                  <div className="space-y-2"><Label>Recebe Benefício de Erradicação?</Label><Controller control={control} name="recebeBE" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select> )} /></div>
                  <div className="space-y-2"><Label>Membros no CadÚnico?</Label><Controller control={control} name="membrosCadUnico" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select> )} /></div>
                  <div className="space-y-2">
                    <Label htmlFor="composicaoFamiliar">Composição Familiar</Label>
                    <Controller name="composicaoFamiliar" control={control} render={({ field }) => ( <Input id="composicaoFamiliar" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)} /> )} />
                  </div>
                  <div className="space-y-2"><Label>Tipo de Moradia</Label><Controller control={control} name="tipoMoradia" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Própria">Própria</SelectItem><SelectItem value="Alugada">Alugada</SelectItem><SelectItem value="Cedida">Cedida</SelectItem></SelectContent></Select> )} /></div>
                  <div className="space-y-2">
                    <Label htmlFor="referenciaFamiliar">Referência Familiar</Label>
                    <Controller name="referenciaFamiliar" control={control} render={({ field }) => ( <Input id="referenciaFamiliar" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)} /> )} />
                  </div>
                  <div className="space-y-2"><Label>Membro em Sist. Carcerário?</Label><Controller control={control} name="membroCarcerario" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select> )} /></div>
                  <div className="space-y-2"><Label>Membro em Socioeducação?</Label><Controller control={control} name="membroSocioeducacao" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select> )} /></div>
                </div>
              </TabsContent>
              <TabsContent value="saude" className="space-y-6">
                <CardHeader className="-m-6 mb-0"><CardTitle>Saúde</CardTitle></CardHeader>
                <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                  <div className="space-y-2"><Label>Vítima é Pessoa com Deficiência?</Label><Controller control={control} name="vitimaPCD" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select> )} /></div>
                  {vitimaPCDValue === "Sim" && ( <div className="space-y-2">
                    <Label htmlFor="vitimaPCDDetalhe">Qual?</Label>
                    <Controller name="vitimaPCDDetalhe" control={control} render={({ field }) => ( <Input id="vitimaPCDDetalhe" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)} /> )} />
                  </div> )}
                  <div className="space-y-2"><Label>Faz tratamento de saúde?</Label><Controller control={control} name="tratamentoSaude" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select> )} /></div>
                  {tratamentoSaudeValue === "Sim" && ( <div className="space-y-2">
                    <Label htmlFor="tratamentoSaudeDetalhe">Onde?</Label>
                    <Controller name="tratamentoSaudeDetalhe" control={control} render={({ field }) => ( <Input id="tratamentoSaudeDetalhe" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)} /> )} />
                  </div> )}
                  <div className="space-y-2"><Label>Depende financeiramente do agressor?</Label><Controller control={control} name="dependeFinanceiro" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select> )} /></div>
                </div>
              </TabsContent>
              <TabsContent value="encaminhamentos" className="space-y-6">
                <CardHeader className="-m-6 mb-0"><CardTitle>Fluxos e Encaminhamentos</CardTitle></CardHeader>
                <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                  <div className="space-y-2"><Label>Encaminhamento realizado?</Label><Controller control={control} name="encaminhamento" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select> )} /></div>
                  {encaminhamentoValue === "Sim" && ( <div className="space-y-2">
                    <Label htmlFor="encaminhamentoDetalhe">Para onde?</Label>
                    <Controller name="encaminhamentoDetalhe" control={control} render={({ field }) => ( <Input id="encaminhamentoDetalhe" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)} /> )} />
                  </div> )}
                  <div className="space-y-2"><Label>Vítima encaminhada ao SCFV/CDI?</Label><Controller control={control} name="encaminhadaSCFV" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="SCFV">SCFV</SelectItem><SelectItem value="CDI">CDI</SelectItem><SelectItem value="NÃO">Não</SelectItem></SelectContent></Select> )} /></div>
                  <div className="space-y-2"><Label>Vítima Inserida no PAEFI?</Label><Controller control={control} name="inseridoPAEFI" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select> )} /></div>
                  <div className="space-y-2"><Label>Confirmação da Violência</Label><Controller control={control} name="confirmacaoViolencia" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Confirmada">Confirmada</SelectItem><SelectItem value="Em análise">Em análise</SelectItem><SelectItem value="Não confirmada">Não confirmada</SelectItem></SelectContent></Select> )} /></div>
                  <div className="space-y-2"><Label>É um caso de reincidência?</Label><Controller control={control} name="reincidente" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select> )} /></div>
                  <div className="space-y-2"><Label>Notificação no SINAM?</Label><Controller control={control} name="notificacaoSINAM" render={({ field }) => ( <Select onValueChange={(val) => field.onChange(val === "" ? null : val)} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select> )} /></div>
                  <div className="space-y-2">
                    <Label htmlFor="canalDenuncia">Canal de denúncia</Label>
                    <Controller name="canalDenuncia" control={control} render={({ field }) => ( <Input id="canalDenuncia" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)} /> )} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qtdAtendimentos">Qtd. de Atendimentos</Label>
                    <Controller name="qtdAtendimentos" control={control} render={({ field }) => ( <Input id="qtdAtendimentos" type="number" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)} /> )} />
                  </div>
                </div>
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>

        <div className="flex justify-between items-center mt-6">
          <Button type="button" variant="outline" size="lg" onClick={handleClearForm}>
            <Eraser className="mr-2 h-4 w-4" />
            Novo Registro Limpo
          </Button>

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isSubmitting} size="lg" variant="secondary">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Salvando..." : (isEditMode ? "💾 Salvar Progresso" : "💾 Salvar e Iniciar Prontuário")}
            </Button>
            
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






