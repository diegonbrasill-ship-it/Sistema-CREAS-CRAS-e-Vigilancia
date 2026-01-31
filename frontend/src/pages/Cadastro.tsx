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
import { createCase, updateCase, getCasoById } from "../services/api";

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

const formSchema = z.object({
        data_cad: z.string().min(1, "A data do cadastro é obrigatória."),
        tec_ref: z.string().min(3, "O nome do técnico é obrigatório."),
        tipo_violencia: z.string().optional().nullable(),
        local_ocorrencia: z.string().optional().nullable(),
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
                        data_cad: new Date().toISOString().split('T')[0],
                        tec_ref: "",
                },
        });


        // 📌 Estado para controlar o carregamento na edição
        const [isDataLoading, setIsDataLoading] = useState(isEditMode);
        const [activeTab, setActiveTab] = useState("atendimento");


        useEffect(() => { //  lógica do modo edição e modo de criação

                if (isEditMode && id) { //modo de edição
                        const loadCasoToForms = async () => {
                                try {

                                        setIsDataLoading(true);
                                        const casoData = await getCasoById(id); // requisião api dados do caso recém criado
                                        // corrige a formatação da data para input type="date"
                                        const data_cadFormatada = casoData.data_cad ?
                                                new Date(casoData.data_cad).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                                        reset({ ...casoData, data_cad: data_cadFormatada }); // usa spread para preencher todo o form 

                                } catch (error) {

                                        toast.error("Não foi possível carregar os dados do caso para edição.");
                                        navigate("/consulta");

                                } finally {

                                        setIsDataLoading(false);
                                }
                        };
                        loadCasoToForms();

                } else if (user) { //modo de criação

                        const nomeCompleto = user.nome_completo || user.username;
                        const cargo = user.cargo || "";
                        const tec_refFormatado = user.role.includes('tecnico') && cargo  //verificaçao se cargo contém "técnico"
                                ? `${nomeCompleto} - ${cargo}`
                                : (nomeCompleto || "");
                        reset({  //preenche campos de data e técnico
                                data_cad: new Date().toISOString().split('T')[0],
                                tec_ref: tec_refFormatado,
                        });
                        setIsDataLoading(false);

                }

        }, [id, isEditMode, reset, navigate, user, setValue]);

        const vitimaPCDValue = watch("vitimaPCD");
        const tratamentoSaudeValue = watch("tratamentoSaude");
        const encaminhamentoValue = watch("encaminhamento");

        const onSubmit = async (data: CasoForm) => { //separar submit edit-mode and normal

                // Limpa campos vazios ou nulos que não devem ser enviados
                const payload = Object.fromEntries(
                        Object.entries(data).filter(([_, v]) => v !== null && v !== undefined && v !== '')
                ) as CasoForm;

                try {
                        if (isEditMode) {
                                console.log("esta caindo no EditModeSubmit")
                                const dirtyData: Partial<CasoForm> = {};
                                // mapeamento dos campos modificados (dirtyFields)
                                (Object.keys(dirtyFields) as Array<keyof CasoForm>).forEach(key => {
                                        const value = getValues(key);
                                        //campos vazios de texto são enviados como string vazia ou nula (Back-end lida)
                                        (dirtyData as any)[key] = (value === null || value === undefined) ? '' : value;
                                });


                                // Insere data_cad e tec_ref update(PUT) para evitar a quebra do Back-end.
                                (dirtyData as any).data_cad = data.data_cad;
                                (dirtyData as any).tec_ref = data.tec_ref;

                                // Garante que pelo menos um campo modificado + o ID seja enviado
                                if (Object.keys(dirtyFields).length === 0) { // Agora checa apenas se HOUVE modificação de aba
                                        toast.info("Nenhuma alteração para salvar.");
                                        return;
                                }

                                // 📌 Ação de Edição (PUT)
                                console.log("dados do modo de edição")
                                console.log(dirtyData)

                                await updateCase(id, dirtyData);
                                toast.success("✅ Progresso salvo com sucesso!");

                                reset(data, { keepValues: true, keepDefaultValues: true }); // Reseta o dirty state
                                toast.success("Prontuário finalizado!");
                                navigate(`/caso/${id}`);
                        } else {
                                console.log("esta caindo no modo criation")
                                // 📌 Ação de Criação (POST)
                                // ⭐️ CORREÇÃO 1: Inclui o unit_id do usuário logado no payload

                                const { data_cad, tec_ref, tipo_violencia, local_ocorrencia } = payload;
                                const dados_completos_payload = {

                                        tipo_violencia: tipo_violencia,
                                        local_ocorrencia: local_ocorrencia
                                }
                                const payloadComUnidade = {
                                        data_cad: data_cad,
                                        tec_ref: tec_ref,
                                        dados_completos_payload: dados_completos_payload,
                                        unit_id: user?.unit_id // ✅ Adiciona o ID da unidade
                                };

                                console.log('Dados enviados primários')
                                console.log(payloadComUnidade)

                                const response = await createCase(payloadComUnidade);

                                console.log(response);
                                // ⭐️ CORREÇÃO 2: Captura o ID do caso que o backend retorna como 'id'
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

        };

        const handleClearForm = () => {
                // Limpa o formulário apenas no modo CRIAÇÃO
                if (isEditMode) {
                        toast.warn("Não é possível limpar um prontuário em edição.");
                        return;
                }
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
                                                                                <Label htmlFor="data_cad">Data do Cadastro</Label>
                                                                                <Input id="data_cad" type="date" {...register("data_cad")} />
                                                                                <p className="text-sm text-red-500 mt-1 h-4">{errors.data_cad?.message}</p>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                                <Label htmlFor="tec_ref">Técnico Responsável</Label>
                                                                                <Input id="tec_ref" placeholder="Nome do técnico - Cargo" {...register("tec_ref")} disabled={isEditMode} />
                                                                                <p className="text-sm text-red-500 mt-1 h-4">{errors.tec_ref?.message}</p>
                                                                        </div>
                                                                </div>
                                                                <div className="grid md:grid-cols-3 gap-4">
                                                                        <div className="space-y-2"><Label>Tipo de Violência</Label><Controller control={control} name="tipo_violencia" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="Física">Física</SelectItem><SelectItem value="Psicológica">Psicológica</SelectItem><SelectItem value="Sexual">Sexual</SelectItem></SelectContent></Select>)} /></div>
                                                                        <div className="space-y-2">
                                                                                <Label htmlFor="local_ocorrencia">Local da Ocorrência</Label>
                                                                                <Controller name="local_ocorrencia" control={control} render={({ field }) => (<Input id="local_ocorrencia" {...field} value={field.value ?? ''} />)} />
                                                                        </div>
                                                                </div>
                                                        </TabsContent>

                                                        <TabsContent value="vitima" className="space-y-6">
                                                                <CardHeader className="-m-6 mb-0"><CardTitle>Dados Pessoais da Vítima</CardTitle></CardHeader>
                                                                <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                                                                        <div className="space-y-2">
                                                                                <Label htmlFor="nome">Nome Completo</Label>
                                                                                <Controller name="nome" control={control} render={({ field }) => (<Input id="nome" {...field} value={field.value ?? ''} />)} />
                                                                                <p className="text-sm text-red-500 mt-1 h-4">{errors.nome?.message}</p>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                                <Label htmlFor="cpf">CPF</Label>
                                                                                <Controller name="cpf" control={control} render={({ field }) => (<Input id="cpf" {...field} value={field.value ?? ''} />)} />
                                                                                <p className="text-sm text-red-500 mt-1 h-4">{errors.cpf?.message}</p>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                                <Label htmlFor="nis">NIS</Label>
                                                                                <Controller name="nis" control={control} render={({ field }) => (<Input id="nis" {...field} value={field.value ?? ''} />)} />
                                                                                <p className="text-sm text-red-500 mt-1 h-4">{errors.nis?.message}</p>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                                <Label htmlFor="idade">Idade</Label>
                                                                                <Controller name="idade" control={control} render={({ field }) => (<Input id="idade" type="number" {...field} value={field.value ?? ''} />)} />
                                                                        </div>
                                                                        <div className="space-y-2"><Label>Sexo</Label><Controller control={control} name="sexo" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="Masculino">Masculino</SelectItem><SelectItem value="Feminino">Feminino</SelectItem></SelectContent></Select>)} /></div>
                                                                        <div className="space-y-2"><Label>Cor/Etnia</Label><Controller control={control} name="corEtnia" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="Branca">Branca</SelectItem><SelectItem value="Preta">Preta</SelectItem><SelectItem value="Parda">Parda</SelectItem></SelectContent></Select>)} /></div>
                                                                        <div className="space-y-2"><Label>Escolaridade</Label><Controller control={control} name="escolaridade" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="Fundamental Incompleto">Fundamental Incompleto</SelectItem><SelectItem value="Fundamental Completo">Fundamental Completo</SelectItem></SelectContent></Select>)} /></div>
                                                                        <div className="space-y-2">
                                                                                <Label htmlFor="bairro">Bairro</Label>
                                                                                <Controller name="bairro" control={control} render={({ field }) => (<Input id="bairro" {...field} value={field.value ?? ''} />)} />
                                                                        </div>
                                                                </div>
                                                        </TabsContent>

                                                        <TabsContent value="familia" className="space-y-6">
                                                                <CardHeader className="-m-6 mb-0"><CardTitle>Contexto Familiar e Social</CardTitle></CardHeader>
                                                                <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                                                                        <div className="space-y-2">
                                                                                <Label htmlFor="rendaFamiliar">Renda Familiar (R$)</Label>
                                                                                <Controller name="rendaFamiliar" control={control} render={({ field }) => (<Input id="rendaFamiliar" {...field} value={field.value ?? ''} />)} />
                                                                        </div>
                                                                        <div className="space-y-2"><Label>Recebe Bolsa Família?</Label><Controller control={control} name="recebePBF" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                                                        <div className="space-y-2"><Label>Recebe BPC?</Label><Controller control={control} name="recebeBPC" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Idoso">Idoso</SelectItem><SelectItem value="PCD">PCD</SelectItem><SelectItem value="NÃO">Não</SelectItem></SelectContent></Select>)} /></div>
                                                                        <div className="space-y-2"><Label>Recebe Benefício de Erradicação?</Label><Controller control={control} name="recebeBE" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                                                        <div className="space-y-2"><Label>Membros no CadÚnico?</Label><Controller control={control} name="membrosCadUnico" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                                                        <div className="space-y-2">
                                                                                <Label htmlFor="composicaoFamiliar">Composição Familiar</Label>
                                                                                <Controller name="composicaoFamiliar" control={control} render={({ field }) => (<Input id="composicaoFamiliar" {...field} value={field.value ?? ''} />)} />
                                                                        </div>
                                                                        <div className="space-y-2"><Label>Tipo de Moradia</Label><Controller control={control} name="tipoMoradia" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Própria">Própria</SelectItem><SelectItem value="Alugada">Alugada</SelectItem><SelectItem value="Cedida">Cedida</SelectItem></SelectContent></Select>)} /></div>
                                                                        <div className="space-y-2">
                                                                                <Label htmlFor="referenciaFamiliar">Referência Familiar</Label>
                                                                                <Controller name="referenciaFamiliar" control={control} render={({ field }) => (<Input id="referenciaFamiliar" {...field} value={field.value ?? ''} />)} />
                                                                        </div>
                                                                        <div className="space-y-2"><Label>Membro em Sist. Carcerário?</Label><Controller control={control} name="membroCarcerario" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                                                        <div className="space-y-2"><Label>Membro em Socioeducação?</Label><Controller control={control} name="membroSocioeducacao" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                                                </div>
                                                        </TabsContent>

                                                        <TabsContent value="saude" className="space-y-6">
                                                                <CardHeader className="-m-6 mb-0"><CardTitle>Saúde</CardTitle></CardHeader>
                                                                <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                                                                        <div className="space-y-2"><Label>Vítima é Pessoa com Deficiência?</Label><Controller control={control} name="vitimaPCD" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                                                        {vitimaPCDValue === "Sim" && (<div className="space-y-2">
                                                                                <Label htmlFor="vitimaPCDDetalhe">Qual?</Label>
                                                                                <Controller name="vitimaPCDDetalhe" control={control} render={({ field }) => (<Input id="vitimaPCDDetalhe" {...field} value={field.value ?? ''} />)} />
                                                                        </div>)}
                                                                        <div className="space-y-2"><Label>Faz tratamento de saúde?</Label><Controller control={control} name="tratamentoSaude" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                                                        {tratamentoSaudeValue === "Sim" && (<div className="space-y-2">
                                                                                <Label htmlFor="tratamentoSaudeDetalhe">Onde?</Label>
                                                                                <Controller name="tratamentoSaudeDetalhe" control={control} render={({ field }) => (<Input id="tratamentoSaudeDetalhe" {...field} value={field.value ?? ''} />)} />
                                                                        </div>)}
                                                                        <div className="space-y-2"><Label>Depende financeiramente do agressor?</Label><Controller control={control} name="dependeFinanceiro" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                                                </div>
                                                        </TabsContent>

                                                        <TabsContent value="encaminhamentos" className="space-y-6">
                                                                <CardHeader className="-m-6 mb-0"><CardTitle>Fluxos e Encaminhamentos</CardTitle></CardHeader>
                                                                <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                                                                        <div className="space-y-2"><Label>Encaminhamento realizado?</Label><Controller control={control} name="encaminhamento" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                                                        {encaminhamentoValue === "Sim" && (<div className="space-y-2">
                                                                                <Label htmlFor="encaminhamentoDetalhe">Para onde?</Label>
                                                                                <Controller name="encaminhamentoDetalhe" control={control} render={({ field }) => (<Input id="encaminhamentoDetalhe" {...field} value={field.value ?? ''} />)} />
                                                                        </div>)}
                                                                        <div className="space-y-2"><Label>Vítima encaminhada ao SCFV/CDI?</Label><Controller control={control} name="encaminhadaSCFV" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="SCFV">SCFV</SelectItem><SelectItem value="CDI">CDI</SelectItem><SelectItem value="NÃO">Não</SelectItem></SelectContent></Select>)} /></div>
                                                                        <div className="space-y-2"><Label>Vítima Inserida no PAEFI?</Label><Controller control={control} name="inseridoPAEFI" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                                                        <div className="space-y-2"><Label>Confirmação da Violência</Label><Controller control={control} name="confirmacaoViolencia" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Confirmada">Confirmada</SelectItem><SelectItem value="Em análise">Em análise</SelectItem><SelectItem value="Não confirmada">Não confirmada</SelectItem></SelectContent></Select>)} /></div>
                                                                        <div className="space-y-2"><Label>É um caso de reincidência?</Label><Controller control={control} name="reincidente" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                                                        <div className="space-y-2"><Label>Notificação no SINAM?</Label><Controller control={control} name="notificacaoSINAM" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>)} /></div>
                                                                        <div className="space-y-2">
                                                                                <Label htmlFor="canalDenuncia">Canal de denúncia</Label>
                                                                                <Controller name="canalDenuncia" control={control} render={({ field }) => (<Input id="canalDenuncia" {...field} value={field.value ?? ''} />)} />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                                <Label htmlFor="qtdAtendimentos">Qtd. de Atendimentos</Label>
                                                                                <Controller name="qtdAtendimentos" control={control} render={({ field }) => (<Input id="qtdAtendimentos" type="number" {...field} value={field.value ?? ''} />)} />
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






