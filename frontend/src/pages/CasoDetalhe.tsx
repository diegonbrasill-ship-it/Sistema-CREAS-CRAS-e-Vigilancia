// frontend/src/pages/CasoDetalhe.tsx
// ⭐️ Componente de Visualização de Prontuário CREAS/Geral ⭐️

import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "@/contexts/AuthContext";

// Importações dos serviços da API, agora com os tipos corrigidos
import {
  getCasoById,
  // ⭐️ ATUALIZADO: Usando as novas interfaces padronizadas ⭐️
  CaseDetail,
  DemandaResumida,
  getAcompanhamentos,
  createAcompanhamento,
  getEncaminhamentos,
  createEncaminhamento,
  updateEncaminhamento,
  getAnexosByCasoId,
  uploadAnexoParaCaso,
  downloadAnexo,
  updateCasoStatus,
  deleteCaso,
  Anexo // Importado o tipo Anexo
} from "../services/api";

// Importações de componentes UI
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Importações de ícones
import { ArrowLeft, Loader2, CheckCircle, Upload, Download, FileText, Power, PowerOff, Trash2, Pencil, Inbox } from "lucide-react";

// Tipagens locais
interface Encaminhamento { id: number; servicoDestino: string; dataEncaminhamento: string; status: string; observacoes: string; tecRef: string; }
// A interface Anexo já está importada do api.ts


// Componente auxiliar REFATORADO para maior clareza e controle de N/A
function DataItem({ label, value }: { label: string; value: any }) {
    // Lista de chaves que NÃO devem ser renderizadas no loop
    const ignoredKeys = ['status', 'demandasVinculadas', 'unit_id', 'dados_completos', 'id'];

    if (value === null || value === undefined || value === "" || ignoredKeys.includes(label)) return null; 
    
    // Formata a label: 'primeiraInfSuas' -> 'Primeira Inf Suas'
    const formattedLabel = label.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase());

    // Se for data, formata (melhoria de UX)
    let formattedValue = String(value);
    if (label.toLowerCase().includes('data')) {
        try {
            formattedValue = new Date(value).toLocaleDateString('pt-BR');
        } catch {}
    }

    return (
      <div className="py-2">
        <p className="text-sm font-medium text-slate-500">{formattedLabel}</p>
        <p className="text-base text-slate-900 break-words">{formattedValue || 'N/A'}</p>
      </div>
    );
}

const listaDeServicos = [ "CRAS", "CREAS", "Conselho Tutelar", "Ministério Público", "Defensoria Pública", "Poder Judiciário", "Delegacia Especializada de Atendimento à Mulher (DEAM)", "Delegacia de Proteção à Criança e ao Adolescente (DPCA)", "Centro de Referência da Mulher", "CAPS I (Infantil)", "CAPS AD (Álcool e Drogas)", "CAPS III (Transtorno Mental)", "Unidade de Saúde (UBS/PSF)", "Maternidade / Hospital", "Secretaria de Educação", "Secretaria de Habitação", "INSS", "Programa Criança Feliz", "Serviço de Convivência e Fortalecimento de Vínculos (SCFV)", "Consultório na Rua", "Abordagem Social", "Centro POP", "Acolhimento Institucional (Abrigo)", "Outros" ];


export default function CasoDetalhe() {
  // ✅ EXTRAÇÃO SIMPLES: Confia no React Router para passar a string ID
  const { id } = useParams<{ id: string }>();
  
  const navigate = useNavigate();
  const { user } = useAuth();

  // REGRA DE PERMISSÃO: Permissão operacional geral
  const userRole = user?.role || ''; 
  const isOperacional = userRole.includes('gestor') || userRole.includes('coordenador') || 
                        userRole.includes('tecnico') || userRole.includes('vigilancia'); 
  const canDelete = isOperacional;  

  // ⭐️ ATUALIZADO: Usando a interface CaseDetail ⭐️
  const [caso, setCaso] = useState<CaseDetail | null>(null);
  const [acompanhamentos, setAcompanhamentos] = useState<any[]>([]);
  const [novoAcompanhamento, setNovoAcompanhamento] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [encaminhamentos, setEncaminhamentos] = useState<Encaminhamento[]>([]);
  const [isSavingEnc, setIsSavingEnc] = useState(false);
  const [novoEncaminhamentoServico, setNovoEncaminhamentoServico] = useState("");
  const [novoEncaminhamentoData, setNovoEncaminhamentoData] = useState("");
  const [novoEncaminhamentoObs, setNovoEncaminhamentoObs] = useState("");
  const [updatingEncId, setUpdatingEncId] = useState<number | null>(null);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingAnexoId, setDownloadingAnexoId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [anexoDescricao, setAnexoDescricao] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  // O useCallback garante que a função de busca não mude, o que é importante para o useEffect.
  const fetchData = useCallback(async () => {
    // Usa o ID extraído
    if (!id) return;
    try {
      // ⭐️ getCasoById agora retorna CaseDetail ⭐️
      const [casoData, acompanhamentosData, encaminhamentosData, anexosData] =
        await Promise.all([
          getCasoById(id),
          getAcompanhamentos(id),
          getEncaminhamentos(id),
          getAnexosByCasoId(id),
        ]);
      setCaso(casoData);
      setAcompanhamentos(acompanhamentosData);
      setEncaminhamentos(encaminhamentosData);
      setAnexos(anexosData);
    } catch (error: any) {
      toast.error(`Erro ao carregar dados: ${error.message}`);
      setCaso(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ... (handleSalvarAcompanhamento e outras funções operacionais mantidas) ...

  const handleSalvarAcompanhamento = async () => {
    if (!id || !novoAcompanhamento.trim()) {
      toast.warn("O texto do acompanhamento não pode estar vazio.");
      return;
    }
    if (!isOperacional) {
        toast.error("Você não tem permissão para registrar acompanhamentos.");
        return;
    }
    setIsSaving(true);
    try {
      await createAcompanhamento(id, novoAcompanhamento);
      toast.success("Acompanhamento salvo com sucesso!");
      setNovoAcompanhamento("");
      await fetchData();
    } catch (error: any) {
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSalvarEncaminhamento = async () => {
    if (!id || !novoEncaminhamentoServico || !novoEncaminhamentoData) {
      toast.warn("Serviço de Destino e Data são obrigatórios.");
      return;
    }
    if (!isOperacional) {
        toast.error("Você não tem permissão para registrar encaminhamentos.");
        return;
    }
    setIsSavingEnc(true);
    try {
      await createEncaminhamento({
        casoId: id,
        servicoDestino: novoEncaminhamentoServico,
        dataEncaminhamento: novoEncaminhamentoData,
        observacoes: novoEncaminhamentoObs,
      });
      toast.success("Encaminhamento salvo com sucesso!");
      setNovoEncaminhamentoServico("");
      setNovoEncaminhamentoData("");
      setNovoEncaminhamentoObs("");
      await fetchData();
    } catch (error: any) {
      toast.error(`Erro ao salvar encaminhamento: ${error.message}`);
    } finally {
      setIsSavingEnc(false);
    }
  };
  
  const handleAtualizarStatus = async (encaminhamentoId: number, novoStatus: string) => {
    if (!isOperacional) {
        toast.error("Você não tem permissão para atualizar status.");
        return;
    }
    setUpdatingEncId(encaminhamentoId);
    try {
      await updateEncaminhamento(encaminhamentoId, { status: novoStatus });
      toast.success("Status atualizado com sucesso!");
      await fetchData();
    } catch (error: any) {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    } finally {
      setUpdatingEncId(null);
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };
  
  const handleUploadAnexo = async () => {
    if (!id || !selectedFile) {
      toast.warn("Por favor, selecione um arquivo para enviar.");
      return;
    }
    if (!isOperacional) {
        toast.error("Você não tem permissão para anexar documentos.");
        return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('anexo', selectedFile);
      formData.append('descricao', anexoDescricao);
      await uploadAnexoParaCaso(id, formData);
      toast.success("Arquivo enviado com sucesso!");
      setSelectedFile(null);
      setAnexoDescricao("");
      const fileInput = document.getElementById('anexo-file') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      await fetchData();
    } catch (error: any) {
      toast.error(`Erro ao enviar arquivo: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleDownloadAnexo = async (anexoId: number) => {
    // Downloads são permitidos para todos que podem ver o caso (Back-end checa)
    setDownloadingAnexoId(anexoId);
    try {
      const { blob, filename } = await downloadAnexo(anexoId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(`Erro ao baixar arquivo: ${error.message}`);
    } finally {
      setDownloadingAnexoId(null);
    }
  };
  
  const handleDesligarCaso = async () => {
    if (!id || !window.confirm("Você tem certeza que deseja DESLIGAR este caso?")) return;
    if (!isOperacional) {
        toast.error("Você não tem permissão para mudar o status do caso.");
        return;
    }
    setIsActionLoading(true);
    try {
      await updateCasoStatus(id, "Desligado");
      toast.success("Caso desligado com sucesso.");
      await fetchData();
    } catch (error: any) {
      toast.error(`Erro ao desligar o caso: ${error.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReativarCaso = async () => {
    if (!id || !window.confirm("Você tem certeza que deseja REATIVAR este caso?")) return;
    if (!isOperacional) {
        toast.error("Você não tem permissão para mudar o status do caso.");
        return;
    }
    setIsActionLoading(true);
    try {
      await updateCasoStatus(id, "Ativo");
      toast.success("Caso reativado com sucesso.");
      await fetchData();
    } catch (error: any) {
      toast.error(`Erro ao reativar o caso: ${error.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleExcluirCaso = async () => {
    if (!id || !window.confirm("!!! ATENÇÃO !!!\nVocê tem certeza que deseja EXCLUIR PERMANENTEMENTE este caso? Esta ação não pode ser desfeita.")) return;
    if (!canDelete) {
        toast.error("Você não tem permissão para excluir este caso.");
        return;
    }
    setIsActionLoading(true);
    try {
      await deleteCaso(id);
      toast.success("Caso excluído permanentemente.");
      navigate("/consulta");
    } catch (error: any) {
      toast.error(`Erro ao excluir o caso: ${error.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };


  // ... (Fim das funções operacionais) ...


  if (isLoading) { return <div className="text-center p-10"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>; }
  if (!caso) { return <div className="text-center p-10">Não foi possível carregar os dados do caso. Tente novamente mais tarde.</div>; }
  
  const dataCadastroFormatada = new Date(caso.dataCad).toLocaleDateString( "pt-BR", { timeZone: "UTC" });
  // O caso.tecRef deve ser nome de usuário no Back-end, mas no Front-end é o nome completo
  // Usaremos o nome completo do usuário logado se o tecRef estiver ausente no caso
  const tecRefDisplay = caso.tecRef || user?.nome_completo || 'N/A';

  return (
  <div className="space-y-6">
    <div className="flex justify-between items-start flex-wrap gap-4">
      {/* ⭐️ ROTA CORRIGIDA: Voltar para a Consulta CREAS/Geral ⭐️ */}
      <Button asChild variant="outline">
        <Link to="/consulta"><ArrowLeft className="mr-2 h-4 w-4" />Voltar para a Lista de Casos</Link>
      </Button>
      
      <div className="flex items-center gap-2 flex-wrap">
        {/* 📌 BOTÕES OPERACIONAIS (Visível para TODOS os Operacionais) */}
        {isOperacional && (
          <>
            {/* ⭐️ ROTA CORRIGIDA: Edita o caso na rota CREAS/Geral ⭐️ */}
            <Button variant="outline" size="sm" onClick={() => navigate(`/cadastro/${id}`)}><Pencil className="mr-2 h-4 w-4"/>Editar Dados</Button>
            
            {caso.status === 'Ativo' ? (
              <Button variant="outline" size="sm" onClick={handleDesligarCaso} disabled={isActionLoading}><PowerOff className="mr-2 h-4 w-4"/>Desligar Caso</Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleReativarCaso} disabled={isActionLoading}><Power className="mr-2 h-4 w-4"/>Reativar Caso</Button>
            )}
            
            {/* EXCLUSÃO PERMANENTE (Visível para TODOS os Operacionais) */}
            <Button variant="destructive" size="sm" onClick={handleExcluirCaso} disabled={isActionLoading}><Trash2 className="mr-2 h-4 w-4"/>Excluir</Button>
          </>
        )}
      </div>
    </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">{caso.nome || "[Caso sem nome]"}</CardTitle>
            {caso.status !== 'Ativo' && (<Badge variant="destructive" className="text-sm">{`Status: ${caso.status}`}</Badge>)}
          </div>
          <CardDescription>Prontuário de Atendimento | Cadastrado em: {dataCadastroFormatada} por {tecRefDisplay}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Informações Cadastrais</h3>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-x-6">
              {/* ⭐️ RENDERIZAÇÃO MELHORADA: Usa CaseDetail e DataItem refatorado ⭐️ */}
              {Object.entries(caso).map(([key, value]) => (<DataItem key={key} label={key} value={value} />))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Módulos Operacionais visíveis para todos */}
      {isOperacional && (
        <div className="space-y-6">
        
        {caso.demandasVinculadas && caso.demandasVinculadas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Inbox className="mr-2 h-5 w-5 text-slate-600" />Demandas Externas Vinculadas</CardTitle>
              <CardDescription>Histórico de ofícios e solicitações formais associadas a este caso.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {caso.demandasVinculadas.map((demanda: DemandaResumida) => (
                <div key={demanda.id} className="flex items-center justify-between border p-3 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div>
                    <p className="font-semibold text-slate-800">{demanda.tipo_documento} - {demanda.instituicao_origem}</p>
                    <p className="text-xs text-slate-500">Recebido em: {new Date(demanda.data_recebimento).toLocaleDateString("pt-BR", { timeZone: 'UTC' })} | Status: {demanda.status}</p>
                  </div>
                  <Button asChild variant="secondary" size="sm">
                    <Link to={`/demandas/${demanda.id}`}><FileText className="mr-2 h-4 w-4" />Ver Detalhes</Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Gestão de Encaminhamentos</CardTitle></CardHeader>
          <CardContent className="space-y-6">
              <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                  <h3 className="font-semibold text-md">Registrar Novo Encaminhamento</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label htmlFor="servico-destino">Serviço de Destino</Label><Select value={novoEncaminhamentoServico} onValueChange={setNovoEncaminhamentoServico}><SelectTrigger id="servico-destino"><SelectValue placeholder="Selecione o serviço..." /></SelectTrigger><SelectContent>{listaDeServicos.map((servico) => (<SelectItem key={servico} value={servico}>{servico}</SelectItem>))}</SelectContent></Select></div>
                      <div className="space-y-2"><Label htmlFor="data-encaminhamento">Data do Encaminhamento</Label><Input id="data-encaminhamento" type="date" value={novoEncaminhamentoData} onChange={(e) => setNovoEncaminhamentoData(e.target.value)} /></div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="obs-encaminhamento">Observações</Label><Textarea id="obs-encaminhamento" placeholder="Detalhes do encaminhamento, contatos, etc..." value={novoEncaminhamentoObs} onChange={(e) => setNovoEncaminhamentoObs(e.target.value)} rows={3} /></div>
                  <Button onClick={handleSalvarEncaminhamento} disabled={isSavingEnc}>{isSavingEnc && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Encaminhamento</Button>
              </div>
              <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-md mb-2">Histórico de Encaminhamentos</h3>
                  {encaminhamentos.length > 0 ? (encaminhamentos.map((enc) => { const isUpdating = updatingEncId === enc.id; return ( <div key={enc.id} className="border p-4 rounded-md bg-white shadow-sm"><div className="flex justify-between items-start mb-2"><div><p className="font-bold text-slate-800">{enc.servicoDestino}</p><p className="text-xs text-slate-500">Encaminhado por: <span className="font-semibold">{enc.tecRef}</span> em {new Date(enc.dataEncaminhamento).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p></div><span className={`text-xs font-bold py-1 px-2 rounded-full ${ enc.status === "Pendente" ? "bg-yellow-200 text-yellow-800" : "bg-green-200 text-green-800" }`}>{enc.status}</span></div>{enc.observacoes && (<p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{enc.observacoes}</p>)}{enc.status === "Pendente" && (<div className="flex justify-end mt-3"><Button size="sm" variant="outline" onClick={() => handleAtualizarStatus(enc.id, "Realizado")} disabled={isUpdating}>{isUpdating ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <CheckCircle className="mr-2 h-4 w-4" /> )} Marcar como Realizado</Button></div>)}</div> ); })) : (<p className="text-sm text-center text-slate-500 py-4">Nenhum encaminhamento registrado para este caso.</p>)}
              </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Gestão de Documentos (Anexos)</CardTitle></CardHeader>
          <CardContent className="space-y-6">
              <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                  <h3 className="font-semibold text-md">Adicionar Novo Documento</h3>
                  <div className="space-y-2"><Label htmlFor="anexo-file">Selecionar Arquivo</Label><Input id="anexo-file" type="file" onChange={handleFileChange} /><p className="text-xs text-slate-500">Tipos permitidos: PDF, DOC, DOCX, JPG, PNG. Tamanho máximo: 5MB.</p></div>
                  <div className="space-y-2"><Label htmlFor="anexo-descricao">Descrição (Opcional)</Label><Input id="anexo-descricao" placeholder="Ex: Relatório psicológico, Ofício nº 123, Cópia RG..." value={anexoDescricao} onChange={(e) => setAnexoDescricao(e.target.value)} /></div>
                  <Button onClick={handleUploadAnexo} disabled={isUploading || !selectedFile}>{isUploading ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Upload className="mr-2 h-4 w-4" />)} Enviar Arquivo</Button>
              </div>
              <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-md mb-2">Documentos Anexados</h3>
                  {anexos.length > 0 ? (anexos.map((anexo) => { const isDownloading = downloadingAnexoId === anexo.id; return ( <div key={anexo.id} className="flex items-center justify-between border p-3 rounded-md bg-white shadow-sm"><div className="flex items-center space-x-3"><FileText className="h-6 w-6 text-slate-500" /><div><p className="font-semibold text-slate-800">{anexo.nomeOriginal}</p><p className="text-xs text-slate-500">Enviado por: {anexo.uploadedBy} em {new Date(anexo.dataUpload).toLocaleDateString("pt-BR")}</p></div></div><Button size="sm" variant="outline" onClick={() => handleDownloadAnexo(anexo.id)} disabled={isDownloading}>{isDownloading ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Download className="mr-2 h-4 w-4" />)} Baixar</Button></div> ); })) : (<p className="text-sm text-center text-slate-500 py-4">Nenhum documento anexado a este caso.</p>)}
              </div>
          </CardContent>
        </Card>
      
        <Card>
          <CardHeader><CardTitle>Histórico de Acompanhamentos</CardTitle></CardHeader>
          <CardContent className="space-y-6">
              <div className="space-y-2">
                  <Label htmlFor="novo-acompanhamento" className="text-base">Registrar Nova Evolução / Atendimento</Label>
                  <Textarea id="novo-acompanhamento" placeholder="Descreva aqui o atendimento, encaminhamento, visita domiciliar ou evolução do caso..." value={novoAcompanhamento} onChange={(e) => setNovoAcompanhamento(e.target.value)} rows={4} />
                  <Button onClick={handleSalvarAcompanhamento} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Acompanhamento</Button>
              </div>
              <div className="space-y-4 border-t pt-4">
                  {acompanhamentos.length > 0 ? (acompanhamentos.map((acomp) => ( <div key={acomp.id} className="border p-4 rounded-md bg-slate-50 shadow-sm"><div className="flex justify-between items-center mb-2 text-xs text-slate-500"><p>Registrado por: <span className="font-semibold">{acomp.tecRef}</span></p><p>{new Date(acomp.data).toLocaleString("pt-BR")}</p></div><p className="text-sm text-slate-700 whitespace-pre-wrap">{acomp.texto}</p></div> ))) : (<p className="text-sm text-center text-slate-500 py-4">Nenhum acompanhamento registrado para este caso.</p>)}
              </div>
          </CardContent>
        </Card>
        
          </div>   
    )}
  </div>       
);
}