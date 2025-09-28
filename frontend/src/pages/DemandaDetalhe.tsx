// frontend/src/pages/DemandaDetalhe.tsx

import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { getDemandaById, DemandaDetalhada, Anexo, updateDemandaStatus, uploadAnexoParaDemanda, downloadAnexo } from "../services/api";

// Componentes UI
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, FileText, Upload, Download } from "lucide-react";

// Componente auxiliar para exibir dados
function DataItem({ label, value, isLink = false, to = "" }: { label: string; value: any, isLink?: boolean, to?: string }) {
  if (value === null || value === undefined || value === "") return null;
  const content = isLink ? (
    <Link to={to} className="text-blue-600 hover:underline">{String(value)}</Link>
  ) : (
    String(value)
  );
  return (
    <div className="py-2">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="text-base text-slate-900 break-words">{content}</p>
    </div>
  );
}

export default function DemandaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [demanda, setDemanda] = useState<DemandaDetalhada | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [anexoDescricao, setAnexoDescricao] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const fetchDemanda = useCallback(async () => {
    if (!id) return;
    try {
      // Não precisa de setIsLoading(true) aqui, pois o loading principal já controla
      const data = await getDemandaById(id);
      setDemanda(data);
    } catch (error: any) {
      toast.error(`Erro ao carregar detalhes da demanda: ${error.message}`);
    } finally {
      setIsLoading(false); // Garante que o loading principal termine
    }
  }, [id]);

  useEffect(() => {
    fetchDemanda();
  }, [fetchDemanda]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !newStatus || newStatus === demanda?.status) return;
    setIsUpdatingStatus(true);
    try {
      await updateDemandaStatus(id, newStatus);
      toast.success("Status da demanda atualizado com sucesso!");
      setDemanda(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (error: any) {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUploadAnexo = async () => {
    if (!id || !selectedFile) {
      return toast.warn("Por favor, selecione um arquivo para enviar.");
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('anexo', selectedFile);
    formData.append('descricao', anexoDescricao);

    try {
      await uploadAnexoParaDemanda(id, formData);
      toast.success("Anexo enviado com sucesso!");
      setSelectedFile(null);
      setAnexoDescricao("");
      // Limpa o input de arquivo visualmente
      const fileInput = document.getElementById('anexo-file') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      // Recarrega os dados da demanda para mostrar o novo anexo
      await fetchDemanda(); 
    } catch (error: any) {
      toast.error(`Erro ao enviar anexo: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadAnexo = async (anexoId: number) => {
    setDownloadingId(anexoId);
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
        setDownloadingId(null);
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case 'finalizada': return 'default';
      case 'em andamento': return 'secondary';
      case 'nova': return 'destructive';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-slate-500" /></div>;
  }
  if (!demanda) {
    return <div className="text-center text-slate-500">Demanda não encontrada ou falha ao carregar.</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <Button asChild variant="outline" size="sm" className="mb-4">
            <Link to="/demandas"><ArrowLeft className="mr-2 h-4 w-4" />Voltar para a Lista</Link>
          </Button>
          <h1 className="text-2xl font-bold text-slate-800">Detalhes da Demanda #{demanda.id}</h1>
          <p className="text-slate-500">Visualização completa da solicitação e seu fluxo de atendimento.</p>
        </div>
        <Badge variant={getStatusBadgeVariant(demanda.status)} className="text-lg px-4 py-1 h-fit">{demanda.status}</Badge>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Informações do Documento</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <DataItem label="Instituição de Origem" value={demanda.instituicao_origem} />
              <DataItem label="Tipo de Documento" value={demanda.tipo_documento} />
              <DataItem label="Nº do Documento" value={demanda.numero_documento} />
              <DataItem label="Data de Recebimento" value={new Date(demanda.data_recebimento).toLocaleDateString("pt-BR", { timeZone: 'UTC' })} />
              <DataItem label="Prazo para Resposta" value={demanda.prazo_resposta ? new Date(demanda.prazo_resposta).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : 'Não definido'} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Assunto</CardTitle></CardHeader>
            <CardContent><p className="text-slate-700 whitespace-pre-wrap">{demanda.assunto || "Nenhum assunto detalhado."}</p></CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Gerenciamento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Alterar Status</Label>
                <Select value={demanda.status} onValueChange={handleStatusChange} disabled={isUpdatingStatus}>
                  <SelectTrigger>{isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue />}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nova">Nova</SelectItem>
                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                    <SelectItem value="Finalizada">Finalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DataItem label="Técnico Designado" value={demanda.tecnico_designado} />
              {demanda.caso_id && <DataItem label="Caso Vinculado" value={demanda.nome_caso || `ID: ${demanda.caso_id}`} isLink to={`/caso/${demanda.caso_id}`} />}
              <DataItem label="Registrado Por" value={demanda.registrado_por} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
          <CardHeader><CardTitle>Documentos e Respostas</CardTitle></CardHeader>
          <CardContent className="space-y-6">
              <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                  <h3 className="font-semibold text-md">Anexar Novo Documento (Resposta, Relatório, etc.)</h3>
                  <div className="space-y-2"><Label htmlFor="anexo-file">Selecionar Arquivo</Label><Input id="anexo-file" type="file" onChange={handleFileChange} /></div>
                  <div className="space-y-2"><Label htmlFor="anexo-descricao">Descrição (Opcional)</Label><Input id="anexo-descricao" placeholder="Ex: Relatório de visita, Ofício de resposta..." value={anexoDescricao} onChange={(e) => setAnexoDescricao(e.target.value)} /></div>
                  <Button onClick={handleUploadAnexo} disabled={isUploading || !selectedFile}>
                      {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      Enviar Arquivo
                  </Button>
              </div>
              <div className="space-y-2 border-t pt-4">
                  <h3 className="font-semibold text-md mb-2">Documentos Anexados</h3>
                  {demanda.anexos && demanda.anexos.length > 0 ? (
                      demanda.anexos.map((anexo) => {
                          const isDownloading = downloadingId === anexo.id;
                          return (
                              <div key={anexo.id} className="flex items-center justify-between border p-3 rounded-md bg-white hover:bg-slate-50 transition-colors">
                                  <div className="flex items-center space-x-3">
                                      <FileText className="h-5 w-5 text-slate-500 flex-shrink-0" />
                                      <div>
                                          <p className="font-semibold text-slate-800">{anexo.nomeOriginal}</p>
                                          <p className="text-xs text-slate-500">Enviado em: {new Date(anexo.dataUpload).toLocaleDateString("pt-BR")}</p>
                                      </div>
                                  </div>
                                  <Button size="sm" variant="outline" onClick={() => handleDownloadAnexo(anexo.id)} disabled={isDownloading}>
                                      {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                      Baixar
                                  </Button>
                              </div>
                          );
                      })
                  ) : (<p className="text-sm text-center text-slate-500 py-4">Nenhum documento anexado a esta demanda.</p>)}
              </div>
          </CardContent>
      </Card>
    </div>
  );
}