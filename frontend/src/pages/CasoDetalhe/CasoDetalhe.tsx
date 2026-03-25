import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { usePermissoesSUAS } from "@/hooks/usePermissoesSUAS";
import { useCasoDetalhe } from "./hooks/useCasoDetalhe";
import { CasoResumoCadastral } from "@/pages/Cadastro/components/CasoResumoCadastral";
import { CasoDemandasVinculadasCard } from "./components/CasoDemandasVinculadasCard";
import { CasoEncaminhamentosCard } from "./components/CasoEncaminhamentosCard";
import { CasoAnexosCard } from "./components/CasoAnexosCard";
import { CasoAcompanhamentosCard } from "./components/CasoAcompanhamentosCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CasoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { canEditCasos, canDeleteCasos } = usePermissoesSUAS();
  const isOperacional = canEditCasos;

  const {
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
  } = useCasoDetalhe({ id, isOperacional, canDelete: canDeleteCasos });

  if (isLoading) {
    return <div className="p-10 text-center">Carregando caso...</div>;
  }

  if (!currentCaso) {
    return <div className="p-10 text-center">Não foi possível carregar os dados do caso. Tente novamente mais tarde.</div>;
  }

  const dataCadRaw = currentCaso.data_cad;
  const dataCadastroFormatada = dataCadRaw ? new Date(dataCadRaw).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Data não informada";
  const tecnicoRef = currentCaso.tec_ref;
  const demandasVinculadas = currentCaso.demandasVinculadas ?? currentCaso.demandas_vinculadas ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Button asChild variant="outline">
          <Link to="/consulta">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a Lista de Casos
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {isOperacional && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/cadastro/${id}`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar Dados
                </Link>
              </Button>

              {currentCaso.status === "Ativo" ? (
                <Button variant="outline" size="sm" onClick={handleDesligarCaso} disabled={isActionLoading}>
                  <PowerOff className="mr-2 h-4 w-4" />
                  Desligar Caso
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleReativarCaso} disabled={isActionLoading}>
                  <Power className="mr-2 h-4 w-4" />
                  Reativar Caso
                </Button>
              )}

              <Button variant="destructive" size="sm" onClick={handleExcluirCaso} disabled={isActionLoading}>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{currentCaso.nome || "[Caso sem nome]"}</CardTitle>
            {currentCaso.status !== "Ativo" && <Badge variant="destructive" className="text-sm">{`Status: ${currentCaso.status}`}</Badge>}
          </div>
          <CardDescription>Prontuário de Atendimento | Cadastrado em: {dataCadastroFormatada} por {tecnicoRef}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <CasoResumoCadastral caso={currentCaso} />
        </CardContent>
      </Card>

      {isOperacional && (
        <div className="space-y-6">
          <CasoDemandasVinculadasCard demandas={demandasVinculadas} />

          <CasoEncaminhamentosCard
            encaminhamentos={encaminhamentos}
            isSavingEnc={isSavingEnc}
            updatingEncId={updatingEncId}
            novoEncaminhamentoServico={novoEncaminhamentoServico}
            novoEncaminhamentoData={novoEncaminhamentoData}
            novoEncaminhamentoObs={novoEncaminhamentoObs}
            onNovoEncaminhamentoServicoChange={setNovoEncaminhamentoServico}
            onNovoEncaminhamentoDataChange={setNovoEncaminhamentoData}
            onNovoEncaminhamentoObsChange={setNovoEncaminhamentoObs}
            onSalvar={handleSalvarEncaminhamento}
            onAtualizarStatus={handleAtualizarStatus}
          />

          <CasoAnexosCard
            anexos={anexos}
            selectedFile={selectedFile}
            anexoDescricao={anexoDescricao}
            isUploading={isUploading}
            downloadingAnexoId={downloadingAnexoId}
            onFileChange={handleFileChange}
            onAnexoDescricaoChange={setAnexoDescricao}
            onUpload={handleUploadAnexo}
            onDownload={handleDownloadAnexo}
          />

          <CasoAcompanhamentosCard
            acompanhamentos={acompanhamentos}
            novoAcompanhamento={novoAcompanhamento}
            isSaving={isSaving}
            onNovoAcompanhamentoChange={setNovoAcompanhamento}
            onSalvar={handleSalvarAcompanhamento}
          />
        </div>
      )}
    </div>
  );
}
