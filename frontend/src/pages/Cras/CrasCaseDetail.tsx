// frontend/src/pages/Cras/CrasCaseDetail.tsx 
// ⭐️ ATUALIZAÇÃO: onClick no histórico de B.E. agora navega para a página de impressão.

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    getCasoById, 
    updateCasoStatus, 
    deleteCaso, 
    getAcompanhamentos,
    createAcompanhamento,
    // ⭐️ NOVOS (B.E.) ⭐️
    getBeneficiosEventuais,
    createBeneficioEventual,
    BeneficioEventualPayload,
    BeneficioListado,
    // ---
    CaseDetail, 
    DemandaResumida 
} from '../../services/api'; 
import { 
    Loader2, ArrowLeft, Edit, Trash2, XCircle, Users, Check, 
    Power, PowerOff,
    Inbox, // Icone para Acompanhamento
    FileText // ⭐️ NOVO (Icone para Benefício) ⭐️
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext'; 
import { usePermissoesSUAS } from '../../hooks/usePermissoesSUAS'; 

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
// ⭐️ NOVOS (B.E.) - Componentes de Formulário ⭐️
import { Input } from "@/components/ui/input";
// 🛑 REMOVIDO: import { Checkbox } from "@/components/ui/checkbox"; (Causou erro)
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


// Função auxiliar de formatação de data (Essencial)
const formatDataBrasileira = (dataString: string | null | undefined, includeTime = false) => {
    if (!dataString) return 'N/A';
    try {
        const date = new Date(dataString);
         // Adiciona tratamento para datas inválidas que podem vir do banco
         if (isNaN(date.getTime())) {
             // Tenta ajustar fuso horário se for string YYYY-MM-DD
             if (typeof dataString === 'string' && dataString.includes('-')) {
                 const parts = dataString.split('-');
                 // Usa UTC para evitar problemas de fuso horário ao criar a data
                 const adjustedDate = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
                 if (!isNaN(adjustedDate.getTime())) {
                     return adjustedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
                 }
             }
             return 'Data Inválida';
        }

        const options: Intl.DateTimeFormatOptions = {
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            timeZone: 'UTC' // Importante para datas sem hora
        };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
            // Ajustar timeZone se necessário para hora local correta
            options.timeZone = 'America/Sao_Paulo'; // Exemplo para SP/Patos
        }
        return date.toLocaleDateString('pt-BR', options);
    } catch (e) {
        return 'Data Inválida';
    }
}

// Estado inicial para o formulário de B.E.
const initialBeneficioState: BeneficioEventualPayload = {
  caso_id: 0, // Será preenchido
  processo_numero: "",
  data_solicitacao: new Date().toISOString().split('T')[0], // Hoje
  beneficio_solicitado: "",
  beneficio_subtipo: "",
  breve_relato: "",
  parecer_social: "",
  status_parecer: 'Deferido',
  valor_concedido: 0,
  dados_bancarios: "",
  observacao: "",
  nome_requerente: "",
  dn_requerente: "",
  rg_requerente: "",
  cpf_requerente: "",
  nis_requerente: "",
  endereco_requerente: "",
  bairro_requerente: "",
  ponto_referencia_requerente: "",
  cidade_requerente: "Patos",
  telefone_requerente: "",
  possui_cadastro_cras: true,
};


export default function CrasCaseDetail() {
    const { id, unitName } = useParams<{ id: string, unitName: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isGestorGeral, isLotadoNoCRAS } = usePermissoesSUAS();

    const [caso, setCaso] = useState<CaseDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false); 
    
    const casoId = id ? parseInt(id, 10) : undefined;
    
    const canOperate = isGestorGeral || isLotadoNoCRAS;
    const canDelete = isGestorGeral; 

    // Estados de Acompanhamento (Simplificado)
    const [acompanhamentos, setAcompanhamentos] = useState<any[]>([]);
    const [isLoadingAcomp, setIsLoadingAcomp] = useState(false);
    const [novoAcompanhamentoTexto, setNovoAcompanhamentoTexto] = useState("");
    
    // ⭐️ NOVOS (B.E.) Estados de Benefício Eventual ⭐️
    const [beneficios, setBeneficios] = useState<BeneficioListado[]>([]);
    const [isLoadingBeneficio, setIsLoadingBeneficio] = useState(false);
    const [novoBeneficio, setNovoBeneficio] = useState<BeneficioEventualPayload>({
      ...initialBeneficioState,
      caso_id: casoId || 0
    });


    const loadCasoData = useCallback(async () => {
        if (!id || !casoId) return;
        
        setLoading(true); 
        setIsLoadingAcomp(true); 
        setIsLoadingBeneficio(true); // ⭐️ NOVO (B.E.)
        
        try {
            // Busca dados em paralelo (Caso, Acompanhamentos, Benefícios)
            const [dataCaso, dataAcomp, dataBeneficios] = await Promise.all([
                getCasoById(id),
                getAcompanhamentos(id),
                getBeneficiosEventuais({ casoId: casoId }) // ⭐️ NOVO (B.E.)
            ]);
            
            setCaso(dataCaso);
            setAcompanhamentos(dataAcomp);
            setBeneficios(dataBeneficios); // ⭐️ NOVO (B.E.)
            
            // ⭐️ NOVO (B.E.) Seta o ID do caso no formulário
            setNovoBeneficio(prev => ({ ...prev, caso_id: dataCaso.id }));

        } catch (error: any) {
            console.error("Falha ao carregar prontuário:", error);
            toast.error(`Falha ao carregar prontuário: ${error.message}`);
            navigate(`/cras/${unitName}/consulta`, { replace: true });
        } finally {
            setLoading(false);
            setIsLoadingAcomp(false);
            setIsLoadingBeneficio(false); // ⭐️ NOVO (B.E.)
        }
    }, [id, casoId, navigate, unitName]);


    useEffect(() => {
        loadCasoData();
    }, [loadCasoData]);
    
    // Função de Salvar Acompanhamento (Inalterada)
    const handleSalvarAcompanhamento = async () => {
        if (!id || !novoAcompanhamentoTexto.trim()) {
            toast.warn("O texto do acompanhamento não pode estar vazio.");
            return;
        }
        setIsLoadingAcomp(true);
        try {
            await createAcompanhamento(id, novoAcompanhamentoTexto); 
            toast.success("Acompanhamento salvo com sucesso!");
            setNovoAcompanhamentoTexto("");
            const dataAcomp = await getAcompanhamentos(id);
            setAcompanhamentos(dataAcomp);
        } catch (error: any) {
            toast.error(`Erro ao salvar: ${error.message}`);
        } finally {
            setIsLoadingAcomp(false);
        }
    };

    // ⭐️ NOVAS (B.E.) Funções de Benefício Eventual ⭐️
    const handleBeneficioChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        // 🛑 REMOVIDO: Lógica do 'type=checkbox'
        
        if (type === 'number') {
            setNovoBeneficio(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
        } else {
            setNovoBeneficio(prev => ({ ...prev, [name]: value }));
        }
    };

    // ⭐️ CORREÇÃO: Handler atualizado para converter 'possui_cadastro_cras' para boolean
    const handleBeneficioSelectChange = (name: string, value: string) => {
        // Converte "true"/"false" de volta para boolean ANTES de salvar no estado
        if (name === 'possui_cadastro_cras') {
            setNovoBeneficio(prev => ({ ...prev, [name]: value === 'true' }));
        } else {
            setNovoBeneficio(prev => ({ ...prev, [name]: value }));
        }
    };

    const handlePreencherComDadosCaso = () => {
        if (!caso) return;
        
        setNovoBeneficio(prev => ({
            ...prev,
            nome_requerente: caso.nome || "",
            // @ts-ignore (Assumindo que dataNasc/rg podem não estar na interface BaseCase ainda)
            dn_requerente: caso.dataNasc || "", 
            // @ts-ignore
            rg_requerente: caso.rg || "", 
            cpf_requerente: caso.cpf || "",
            nis_requerente: caso.nis || "",
            endereco_requerente: caso.rua || "",
            bairro_requerente: caso.bairro || "",
            ponto_referencia_requerente: caso.pontoReferencia || "",
            telefone_requerente: caso.contato || "",
            possui_cadastro_cras: true, // Se está no sistema, já possui
        }));
        toast.info("Dados do caso copiados para o requerimento.");
    };

    const handleSalvarBeneficio = async () => {
        if (!casoId) {
            toast.error("ID do caso não encontrado.");
            return;
        }
        
        // Validação
        if (!novoBeneficio.data_solicitacao || !novoBeneficio.beneficio_solicitado || !novoBeneficio.parecer_social || !novoBeneficio.status_parecer) {
            toast.warn("Campos obrigatórios (Data, Benefício, Parecer, Status) devem ser preenchidos.");
            return;
       }
        
        setIsLoadingBeneficio(true);
        try {
            const payload: BeneficioEventualPayload = {
                ...novoBeneficio,
                caso_id: casoId,
            };
            
            await createBeneficioEventual(payload);
            toast.success("Requerimento de Benefício Eventual salvo com sucesso!");
            
            // Limpa o formulário e recarrega a lista
            setNovoBeneficio({ ...initialBeneficioState, caso_id: casoId });
            const dataBeneficios = await getBeneficiosEventuais({ casoId: casoId });
            setBeneficios(dataBeneficios);
        
        } catch (error: any) {
            toast.error(`Erro ao salvar benefício: ${error.message}`);
        } finally {
            setIsLoadingBeneficio(false);
        }
    };
    

    // Funções de Ação (Status/Exclusão)
    const handleEdit = () => { navigate(`/cras/${unitName}/cadastro/${id}`); };

    const handleUpdateStatus = async (newStatus: 'Ativo' | 'Desligado' | 'Arquivado') => {
        // ... (lógica inalterada) ...
        if (!id || !window.confirm(`Tem certeza que deseja ${newStatus === 'Ativo' ? 'REATIVAR' : 'DESLIGAR'} este caso?`)) return;
        if (!canOperate) {
            toast.error("Você não tem permissão para alterar o status do caso.");
            return;
        }
        setIsActionLoading(true);
        try {
            await updateCasoStatus(id, newStatus);
            toast.success(`Caso ${newStatus.toLowerCase()} com sucesso!`);
            setCaso(prev => prev ? { ...prev, status: newStatus } : null); 
        } catch (error: any) {
            toast.error(`Erro ao mudar status: ${error.message}`);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleExcluirCaso = async () => {
        // ... (lógica inalterada) ...
        if (!id || !window.confirm("!!! ATENÇÃO !!!\nVocê tem certeza que deseja EXCLUIR PERMANENTEMENTE este caso? Esta ação não pode ser desfeita.")) return;
        if (!canDelete) {
            toast.error("Você não tem permissão para excluir este caso.");
            return;
        }
        setIsActionLoading(true);
      try {
            await deleteCaso(id);
            toast.success("Caso excluído permanentemente.");
            navigate(`/cras/${unitName}/consulta`);
        } catch (error: any) {
            toast.error(`Erro ao excluir o caso: ${error.message}`);
        } finally {
            setIsActionLoading(false);
        }
    };

    // Componente auxiliar (lógica inalterada)
    function DataItem({ label, value }: { label: string; value: any }) {
        const ignoredKeys = ['status', 'demandasVinculadas', 'unit_id', 'dados_completos', 'id', 'dataCad', 'tecRef'];

        if (value === null || value === undefined || value === "" || ignoredKeys.includes(label)) return null; 
        
        const formattedLabel = label.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase());
        let formattedValue = String(value);
        
        if (label.toLowerCase().includes('data')) {
            try {
                // Tenta formatar como data brasileira, se falhar, mantém o valor original
                const formattedDate = formatDataBrasileira(value);
                if (formattedDate !== 'Data Inválida') {
                    formattedValue = formattedDate;
                }
            } catch {}
        }

        return (
            <div className="py-2">
                <p className="text-sm font-medium text-slate-500">{formattedLabel}</p>
                <p className="text-base text-slate-900 break-words">{formattedValue || 'N/A'}</p>
            </div>
        );
    }
    
    if (loading) { return <div className="text-center p-10"><Loader2 className="h-8 w-8 animate-spin mx-auto" /> <span>Carregando prontuário...</span></div>; }
    if (!caso) { return <div className="text-center p-10"><XCircle className="h-8 w-8 text-red-500 mx-auto" /> Prontuário não encontrado ou inacessível.</div>; }

    const casoData = caso; 
    const isAtivo = casoData.status === 'Ativo';

   return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Visualização de Prontuário - {casoData.nome} (ID: {casoData.id})</h1>
            
            {/* Botões de Ação (lógica inalterada) */}
            <div className="flex justify-between items-center border-b pb-4">
               <Button variant="outline" onClick={() => navigate(`/cras/${unitName}/consulta`)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a Consulta</Button>
                
                {canOperate && (
                <div className="space-x-2">
                    <Button variant="secondary" onClick={handleEdit} disabled={isActionLoading}><Edit className="mr-2 h-4 w-4" /> Editar Dados</Button>
                    {isAtivo ? (
                       <Button variant="outline" onClick={() => handleUpdateStatus('Desligado')} disabled={isActionLoading}><PowerOff className="mr-2 h-4 w-4"/>Desligar Caso</Button>
                    ) : (
                        <Button variant="outline" onClick={() => handleUpdateStatus('Ativo')} disabled={isActionLoading}><Power className="mr-2 h-4 w-4"/>Reativar Caso</Button>
                    )}
                    {canDelete && (
                        <Button variant="destructive" onClick={handleExcluirCaso} disabled={isActionLoading}><Trash2 className="mr-2 h-4 w-4"/>Excluir</Button>
                    )}
                </div>
                )}
            </div>

            {/* 1. INFORMAÇÕES BÁSICAS (lógica inalterada) */}
            <Card>
                <CardHeader><CardTitle className="text-xl flex items-center gap-2"><Users className='h-5 w-5'/> Informações Básicas</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div><span className="font-bold">Status:</span> {casoData.status}</div>
                   <div><span className="font-bold">Unidade de Lotação:</span> {casoData.unit_id}</div>
                    <div><span className="font-bold">Técnico de Referência:</span> {casoData.tecRef}</div>
                    <div><span className="font-bold">Data Cad.:</span> {formatDataBrasileira(casoData.dataCad)}</div>
                    
                    {Object.entries(casoData).map(([key, value]) => (
                        <DataItem key={key} label={key} value={value} />
                    ))}
                </CardContent>
            </Card>

            {/* (O restante dos Cards de Informação e Demandas são omitidos para brevidade) */}
            {/* ... */}

            {/* ⭐️ 4. MÓDULO ACOMPANHAMENTOS (SIMPLIFICADO) ⭐️ */}
            <Card>
                <CardHeader><CardTitle className="text-xl flex items-center gap-2"><Inbox className='h-5 w-5'/> Histórico de Acompanhamentos</CardTitle></CardHeader>
               <CardContent className="space-y-6">
                    <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                        <h3 className="font-semibold text-md">Registrar Nova Evolução / Atendimento</h3>
                        
                        {/* Texto do Acompanhamento */}
                       <div className="space-y-2">
                            <Label htmlFor="novo-acompanhamento">Descrição da Evolução / Atendimento</Label>
                            <Textarea 
                                id="novo-acompanhamento" 
                               placeholder="Descreva aqui o atendimento, visita domiciliar, encaminhamento ou evolução do caso..." 
                                value={novoAcompanhamentoTexto} 
                                onChange={(e) => setNovoAcompanhamentoTexto(e.target.value)} 
                                rows={4} 
                            />
                        </div>
                        <Button onClick={handleSalvarAcompanhamento} disabled={isLoadingAcomp}>
                           {isLoadingAcomp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                            Salvar Acompanhamento
                        </Button>
                    </div>

                    <div className="space-y-4 border-t pt-4">
                       <h3 className="font-semibold text-md mb-2">Histórico Registrado</h3>
                        {isLoadingAcomp ? (
                            <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                        ) : acompanhamentos.length > 0 ? (
                            acompanhamentos.map((acomp) => (
                               <div key={acomp.id} className="border p-4 rounded-md bg-slate-50 shadow-sm">
                                    <div className="flex justify-between items-center mb-2 text-xs text-slate-500">
                                        <p>Registrado por: <span className="font-semibold">{acomp.tecRef}</span></p>
                                       <p>{formatDataBrasileira(acomp.data, true)}</p>
                                    </div>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{acomp.texto}</p>
                                   
                                    {/* 🛑 REMOVIDO: Renderização do Badge 'tipo' 🛑 */}
                                    
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-center text-slate-500 py-4">Nenhum acompanhamento registrado para este caso.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ⭐️ 5. NOVO MÓDULO - BENEFÍCIOS EVENTUAIS ⭐️ */}
            <Card>
              <CardHeader><CardTitle className="text-xl flex items-center gap-2"><FileText className='h-5 w-5'/> Requerimentos de Benefícios Eventuais</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                    
                    {/* Formulário de Novo Benefício */}
                    <div className="space-y-6 p-4 border rounded-lg bg-slate-50">
                      <h3 className="font-semibold text-md">Registrar Novo Requerimento</h3>
                      
                       [cite_start]{/* Seção 1: Dados do Requerente (Baseado no REQUERIMENTO DE BE.docx [cite: 20-41]) */}
                      <div className="border-b pb-4 space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-medium text-slate-700">1. Dados do Requerente</h4>
                           <Button variant="outline" size="sm" onClick={handlePreencherComDadosCaso}>Copiar dados do Caso</Button>
                        </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="nome_requerente">Nome do Requerente</Label>
                              <Input id="nome_requerente" name="nome_requerente" value={novoBeneficio.nome_requerente || ''} onChange={handleBeneficioChange} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="dn_requerente">Data Nasc. Requerente</Label>
                              <Input id="dn_requerente" name="dn_requerente" type="date" value={novoBeneficio.dn_requerente || ''} onChange={handleBeneficioChange} />
                         </div>
                            <div className="space-y-2">
                              <Label htmlFor="telefone_requerente">Telefone</Label>
                              <Input id="telefone_requerente" name="telefone_requerente" value={novoBeneficio.telefone_requerente || ''} onChange={handleBeneficioChange} />
                            </div>
                           <div className="space-y-2">
                              <Label htmlFor="cpf_requerente">CPF</Label>
                              <Input id="cpf_requerente" name="cpf_requerente" value={novoBeneficio.cpf_requerente || ''} onChange={handleBeneficioChange} />
                            </div>
                            <div className="space-y-2">
                             <Label htmlFor="rg_requerente">RG</Label>
                                <Input id="rg_requerente" name="rg_requerente" value={novoBeneficio.rg_requerente || ''} onChange={handleBeneficioChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nis_requerente">NIS</Label>
                                <Input id="nis_requerente" name="nis_requerente" value={novoBeneficio.nis_requerente || ''} onChange={handleBeneficioChange} />
                            </div>
                           <div className="space-y-2">
                             <Label htmlFor="endereco_requerente">Endereço (Rua, Nº)</Label>
                             <Input id="endereco_requerente" name="endereco_requerente" value={novoBeneficio.endereco_requerente || ''} onChange={handleBeneficioChange} />
                           </div>
                            <div className="space-y-2">
                             <Label htmlFor="bairro_requerente">Bairro</Label>
                             <Input id="bairro_requerente" name="bairro_requerente" value={novoBeneficio.bairro_requerente || ''} onChange={handleBeneficioChange} />
                            </div>
                            <div className="space-y-2">
                             <Label htmlFor="ponto_referencia_requerente">Ponto de Referência</Label>
                             <Input id="ponto_referencia_requerente" name="ponto_referencia_requerente" value={novoBeneficio.ponto_referencia_requerente || ''} onChange={handleBeneficioChange} />
                            </div>
                            <div className="space-y-2">
                             <Label htmlFor="cidade_requerente">Cidade</Label>
                             <Input id="cidade_requerente" name="cidade_requerente" value={novoBeneficio.cidade_requerente || 'Patos'} onChange={handleBeneficioChange} />
                            </div>
                            {/* ⭐️ CORREÇÃO: Trocado Checkbox por Select ⭐️ */}
                           <div className="space-y-2">
                             <Label htmlFor="possui_cadastro_cras">Família possui cadastro no CRAS?</Label>
                             <Select 
                               name="possui_cadastro_cras" 
                               value={String(novoBeneficio.possui_cadastro_cras)} 
                               onValueChange={(v) => handleBeneficioSelectChange('possui_cadastro_cras', v)}
                                >
                             <SelectTrigger><SelectValue /></SelectTrigger>
                             <SelectContent>
                               <SelectItem value="true">Sim</SelectItem>
                               <SelectItem value="false">Não</SelectItem>
                             </SelectContent>
                             </Select>
                           </div>
                        </div>
                    </div>

                      [cite_start]{/* Seção 2: Dados da Solicitação (Baseado no REQUERIMENTO [cite: 20-41] [cite_start]e PARECER [cite: 1-19]) */}
                     <div className="border-b pb-4 space-y-4">
                            <h4 className="font-medium text-slate-700">2. Dados da Solicitação e Parecer</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                             <Label htmlFor="processo_numero">Nº Processo (Opcional)</Label>
                             <Input id="processo_numero" name="processo_numero" value={novoBeneficio.processo_numero || ''} onChange={handleBeneficioChange} />
                            </div>
                            <div className="space-y-2">
                             <Label htmlFor="data_solicitacao">Data Solicitação*</Label>
                             <Input id="data_solicitacao" name="data_solicitacao" type="date" value={novoBeneficio.data_solicitacao} onChange={handleBeneficioChange} required />
                         </div>
                            <div className="space-y-2">
                             <Label htmlFor="beneficio_solicitado">Benefício Solicitado (Tipo)*</Label>
                             <Select name="beneficio_solicitado" value={novoBeneficio.beneficio_solicitado} onValueChange={(v) => handleBeneficioSelectChange('beneficio_solicitado', v)}>
                             <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                             <SelectContent>
                               <SelectItem value="Auxílio Natalidade">Auxílio Natalidade</SelectItem>
                               <SelectItem value="Vulnerabilidade Temporária">Vulnerabilidade Temporária</SelectItem>
                               <SelectItem value="Calamidade Pública">Calamidade Pública</SelectItem>
                               <SelectItem value="Auxílio Funeral">Auxílio Funeral (CREAS)</SelectItem>
                             </SelectContent>
                             </Select>
                           </div>
                            <div className="space-y-2">
                             <Label htmlFor="beneficio_subtipo">Subtipo (Ex: Ajuda de Custo)</Label>
                             <Input id="beneficio_subtipo" name="beneficio_subtipo" value={novoBeneficio.beneficio_subtipo || ''} onChange={handleBeneficioChange} placeholder="Ex: Ajuda de Custo, Kit Enxoval..." />
                           </div>
                            <div className="space-y-2">
                             <Label htmlFor="status_parecer">Parecer Técnico*</Label>
                             <Select name="status_parecer" value={novoBeneficio.status_parecer} onValueChange={(v) => handleBeneficioSelectChange('status_parecer', v)}>
                             <SelectTrigger><SelectValue /></SelectTrigger>
                             <SelectContent>
                               <SelectItem value="Deferido">Deferido</SelectItem>
                               <SelectItem value="Indeferido">Indeferido</SelectItem>
                             </SelectContent>
                             </Select>
                           </div>
                            <div className="space-y-2">
                             <Label htmlFor="valor_concedido">Valor Concedido (R$)</Label>
                             <Input id="valor_concedido" name="valor_concedido" type="number" value={novoBeneficio.valor_concedido || 0} onChange={handleBeneficioChange} />
                            </div>
                        </div>
                            <div className="space-y-2">
                             <Label htmlFor="dados_bancarios">Dados Bancários (Se Deferido e Pecúnia)</Label>
                             <Input id="dados_bancarios" name="dados_bancarios" value={novoBeneficio.dados_bancarios || ''} onChange={handleBeneficioChange} placeholder="Agência XXXX Conta YYYYY-Y" />
                          </div>
                          <div className="space-y-2">
                           [cite_start]<Label htmlFor="breve_relato">Breve Relato do Caso (PARECER [cite: 1-19])</Label>
                           <Textarea id="breve_relato" name="breve_relato" value={novoBeneficio.breve_relato || ''} onChange={handleBeneficioChange} rows={3} placeholder="Breve histórico e situação familiar..." />
                          </div>
                          <div className="space-y-2">
                             <Label htmlFor="parecer_social">Parecer Social Técnico*</Label>
                           <Textarea id="parecer_social" name="parecer_social" value={novoBeneficio.parecer_social} onChange={handleBeneficioChange} rows={4} placeholder="Opina-se no sentido de..." required />
                          </div>
                          <div className="space-y-2">
                           [cite_start]<Label htmlFor="observacao">Observação (REQUERIMENTO [cite: 20-41])</Label>
                           <Textarea id="observacao" name="observacao" value={novoBeneficio.observacao || ''} onChange={handleBeneficioChange} rows={2} placeholder="Observações adicionais do requerimento..." />
                          </div>
                    </div>
                      
                      <Button onClick={handleSalvarBeneficio} disabled={isLoadingBeneficio}>
                          {isLoadingBeneficio && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         Salvar Requerimento
                      </Button>
                   </div>

                    {/* Histórico de Benefícios */}
                   <div className="space-y-4 border-t pt-4">
                      <h3 className="font-semibold text-md mb-2">Histórico de Requerimentos</h3>
                      {isLoadingBeneficio ? (
                          <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                      ) : beneficios.length > 0 ? (
                         beneficios.map((be) => (
                           // ⭐️ ATUALIZAÇÃO: onClick agora navega para a página de impressão ⭐️
                           <div 
                             key={be.id} 
                             className="border p-4 rounded-md bg-slate-50 shadow-sm cursor-pointer hover:bg-slate-100" 
                             onClick={() => navigate(`/cras/${unitName}/beneficio/${be.id}/print`)}
                           >
                             <div className="flex justify-between items-center mb-2 text-xs text-slate-500">
                               <p>Requerente: <span className="font-semibold text-slate-700">{be.nome_requerente || be.nome_caso}</span></p>
                               <p>Solicitado em: {formatDataBrasileira(be.data_solicitacao)}</p>
                             </div>
                             <div className="flex justify-between items-center">
                               <p className="text-sm font-medium">{be.beneficio_solicitado}</p>
                               <span className={`px-2 py-1 rounded-full text-xs font-semibold ${be.status_parecer === 'Deferido' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                 {be.status_parecer}
                               </span>
                             </div>
                             <p className="text-xs text-slate-500 mt-1">Técnico: {be.tecnico_nome}</p>
                           </div>
                         ))
                      ) : (
                         <p className="text-sm text-center text-slate-500 py-4">Nenhum benefício eventual registrado para este caso.</p>
                      )}
                    </div>

                  </CardContent>
                </Card>

        </div>
    );
}