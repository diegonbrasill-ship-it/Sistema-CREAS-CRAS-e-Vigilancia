import type { ChangeEventHandler } from "react";
import { Download, FileText, Loader2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { Anexo } from "@/services/api";

type Props = {
  anexos: Anexo[];
  selectedFile: File | null;
  anexoDescricao: string;
  isUploading: boolean;
  downloadingAnexoId: number | null;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  onAnexoDescricaoChange: (value: string) => void;
  onUpload: () => void;
  onDownload: (anexoId: number) => void;
};

export function CasoAnexosCard({
  anexos,
  selectedFile,
  anexoDescricao,
  isUploading,
  downloadingAnexoId,
  onFileChange,
  onAnexoDescricaoChange,
  onUpload,
  onDownload,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestão de Documentos (Anexos)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 rounded-lg border bg-slate-50 p-4">
          <h3 className="text-md font-semibold">Adicionar Novo Documento</h3>
          <div className="space-y-2">
            <Label htmlFor="anexo-file">Selecionar Arquivo</Label>
            <Input id="anexo-file" type="file" onChange={onFileChange} />
            <p className="text-xs text-slate-500">Tipos permitidos: PDF, DOC, DOCX, JPG, PNG. Tamanho máximo: 5MB.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="anexo-descricao">Descrição (Opcional)</Label>
            <Input
              id="anexo-descricao"
              placeholder="Ex: Relatório psicológico, Ofício nº 123, Cópia RG..."
              value={anexoDescricao}
              onChange={(event) => onAnexoDescricaoChange(event.target.value)}
            />
          </div>
          <Button onClick={onUpload} disabled={isUploading || !selectedFile}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Enviar Arquivo
          </Button>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h3 className="mb-2 text-md font-semibold">Documentos Anexados</h3>
          {anexos.length > 0 ? (
            anexos.map((anexo) => {
              const isDownloading = downloadingAnexoId === anexo.id;

              return (
                <div key={anexo.id} className="flex items-center justify-between rounded-md border bg-white p-3 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-6 w-6 text-slate-500" />
                    <div>
                      <p className="font-semibold text-slate-800">{anexo.nomeOriginal}</p>
                      <p className="text-xs text-slate-500">
                        Enviado por: {anexo.uploadedBy} em {new Date(anexo.dataUpload).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onDownload(anexo.id)} disabled={isDownloading}>
                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Baixar
                  </Button>
                </div>
              );
            })
          ) : (
            <p className="py-4 text-center text-sm text-slate-500">Nenhum documento anexado a este caso.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
