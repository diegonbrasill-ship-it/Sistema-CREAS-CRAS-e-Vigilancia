import { Controller, useFormContext } from "react-hook-form";

import { CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { CasoForm } from "../schema";

export function TabAtendimento({ isEditMode }: { isEditMode: boolean }) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<CasoForm>();

  return (
    <div className="space-y-6">
      <CardHeader className="-m-6 mb-0">
        <CardTitle>Dados do Atendimento e Violência</CardTitle>
      </CardHeader>

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
        <div className="space-y-2">
          <Label>Tipo de Violência</Label>
          <Controller
            control={control}
            name="tipo_violencia"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Física">Física</SelectItem>
                  <SelectItem value="Psicológica">Psicológica</SelectItem>
                  <SelectItem value="Sexual">Sexual</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-sm text-red-500 mt-1 h-4">{errors.tipo_violencia?.message}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="local_ocorrencia">Local da Ocorrência</Label>
          <Controller
            name="local_ocorrencia"
            control={control}
            render={({ field }) => <Input id="local_ocorrencia" {...field} value={field.value ?? ""} />}
          />
          <p className="text-sm text-red-500 mt-1 h-4">{errors.local_ocorrencia?.message}</p>
        </div>
      </div>
    </div>
  );
}
