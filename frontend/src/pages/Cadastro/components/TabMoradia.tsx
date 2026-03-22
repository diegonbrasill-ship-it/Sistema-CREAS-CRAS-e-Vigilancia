import { Controller, useFormContext } from "react-hook-form";

import { CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { CasoForm } from "../schema";
import { FORMA_OCUPACAO_OPTIONS, MATERIAL_CONSTRUCAO_OPTIONS, TIPO_RESIDENCIA_OPTIONS } from "../options";

export function TabMoradia({ isEditMode }: { isEditMode: boolean }) {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CasoForm>();

  const tipoResidencia = watch("tipoResidencia");
  const formaOcupacao = watch("formaOcupacao");

  // resets
  const handleTipoResidenciaChange = (v: string) => {
    setValue("tipoResidencia", v as any, { shouldDirty: true });
    if (v === "SITUACAO_DE_RUA") {
      setValue("formaOcupacao", null as any, { shouldDirty: true });
      setValue("materialConstrucao", null as any, { shouldDirty: true });
      setValue("valorAluguel", null as any, { shouldDirty: true });
    }
  };

  const handleFormaOcupacaoChange = (v: string) => {
    setValue("formaOcupacao", v as any, { shouldDirty: true });
    if (v !== "ALUGADA") {
      setValue("valorAluguel", null as any, { shouldDirty: true });
    }
  };

  return (
    <div className="space-y-6">
      <CardHeader className="-m-6 mb-0">
        <CardTitle>Moradia</CardTitle>
      </CardHeader>

      <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
        <div className="space-y-2">
          <Label>Tipo de residência</Label>
          <Controller
            control={control}
            name="tipoResidencia"
            render={({ field }) => (
              <Select onValueChange={handleTipoResidenciaChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_RESIDENCIA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).tipoResidencia?.message}</p>}
        </div>

        {tipoResidencia && tipoResidencia !== "SITUACAO_DE_RUA" && (
          <>
            <div className="space-y-2">
              <Label>Forma de ocupação</Label>
              <Controller
                control={control}
                name="formaOcupacao"
                render={({ field }) => (
                  <Select onValueChange={handleFormaOcupacaoChange} value={field.value ?? ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMA_OCUPACAO_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).formaOcupacao?.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Material de construção</Label>
              <Controller
                control={control}
                name="materialConstrucao"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIAL_CONSTRUCAO_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).materialConstrucao?.message}</p>}
            </div>
          </>
        )}

        {tipoResidencia && formaOcupacao === "ALUGADA" && (
          <div className="space-y-2">
            <Label htmlFor="valorAluguel">Valor do aluguel (R$)</Label>
            <Controller
              control={control}
              name="valorAluguel"
              render={({ field }) => <Input id="valorAluguel" type="number" step="0.01" {...field} value={field.value ?? ""} />}
            />
            {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).valorAluguel?.message}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
