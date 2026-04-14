import { useCallback, useEffect, useState, type ChangeEventHandler } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  createAcompanhamento,
  createEncaminhamento,
  deleteCaso,
  downloadAnexo,
  getAcompanhamentos,
  getAnexosByCasoId,
  getCasoById,
  getEncaminhamentos,
  updateCasoStatus,
  updateEncaminhamento,
  uploadAnexoParaCaso,
  type CasoAcompanhamento,
  type Anexo,
  type CasoEncaminhamento,
  type CasoDetalhado,
} from "@/services/api";
import { useCasoFormSchema } from "@/pages/Cadastro/hooks/useCasoFormSchema";

type UseCasoDetalheParams = {
  id?: string;
  isOperacional: boolean;
  canDelete: boolean;
};

export function useCasoDetalhe({ id, isOperacional, canDelete }: UseCasoDetalheParams) {
  const casoSchema = useCasoFormSchema();
  const navigate = useNavigate();

  const [currentCaso, setCaso] = useState<CasoDetalhado | null>(null);
  const [acompanhamentos, setAcompanhamentos] = useState<CasoAcompanhamento[]>([]);
  const [novoAcompanhamento, setNovoAcompanhamento] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [encaminhamentos, setEncaminhamentos] = useState<CasoEncaminhamento[]>([]);
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

  const fetchData = useCallback(async () => {
    if (!id) return;

    try {
      const [casoData, acompanhamentosData, encaminhamentosData, anexosData] = await Promise.all([
        getCasoById(id),
        getAcompanhamentos(id),
        getEncaminhamentos(id),
        getAnexosByCasoId(id),
      ]);

      setCaso(casoData);
      setAcompanhamentos(acompanhamentosData);
      setEncaminhamentos(encaminhamentosData);
      setAnexos(anexosData);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao carregar os dados do caso.";
      toast.error(`Erro ao carregar dados: ${message}`);
      setCaso(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao salvar acompanhamento.";
      toast.error(`Erro ao salvar: ${message}`);
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao salvar encaminhamento.";
      toast.error(`Erro ao salvar encaminhamento: ${message}`);
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao atualizar status.";
      toast.error(`Erro ao atualizar status: ${message}`);
    } finally {
      setUpdatingEncId(null);
    }
  };

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    if (event.target.files?.[0]) {
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
      formData.append("anexo", selectedFile);
      formData.append("descricao", anexoDescricao);
      await uploadAnexoParaCaso(id, formData);
      toast.success("Arquivo enviado com sucesso!");
      setSelectedFile(null);
      setAnexoDescricao("");
      const fileInput = document.getElementById("anexo-file") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      await fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao enviar arquivo.";
      toast.error(`Erro ao enviar arquivo: ${message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadAnexo = async (anexoId: number) => {
    setDownloadingAnexoId(anexoId);
    try {
      const { blob, filename } = await downloadAnexo(anexoId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao baixar arquivo.";
      toast.error(`Erro ao baixar arquivo: ${message}`);
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao desligar o caso.";
      toast.error(`Erro ao desligar o caso: ${message}`);
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao reativar o caso.";
      toast.error(`Erro ao reativar o caso: ${message}`);
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao excluir o caso.";
      toast.error(`Erro ao excluir o caso: ${message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  return {
    casoSchema,
    currentCaso,
    acompanhamentos,
    novoAcompanhamento,
    setNovoAcompanhamento,
    isLoading,
    isSaving,
    encaminhamentos,
    isSavingEnc,
    novoEncaminhamentoServico,
    setNovoEncaminhamentoServico,
    novoEncaminhamentoData,
    setNovoEncaminhamentoData,
    novoEncaminhamentoObs,
    setNovoEncaminhamentoObs,
    updatingEncId,
    anexos,
    isUploading,
    downloadingAnexoId,
    selectedFile,
    anexoDescricao,
    setAnexoDescricao,
    isActionLoading,
    handleSalvarAcompanhamento,
    handleSalvarEncaminhamento,
    handleAtualizarStatus,
    handleFileChange,
    handleUploadAnexo,
    handleDownloadAnexo,
    handleDesligarCaso,
    handleReativarCaso,
    handleExcluirCaso,
  };
}
