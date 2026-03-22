import { Controller, useFormContext } from "react-hook-form";

import { CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { CasoForm } from "../schema";
import {
  FAIXA_ETARIA_AGRESSOR_OPTIONS,
  SEXO_AGRESSOR_OPTIONS,
  SIM_NAO_OPTIONS,
  VINCULO_AGRESSOR_OPTIONS,
} from "../options";

export function TabAgressor({ isEditMode }: { isEditMode: boolean }) {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CasoForm>();

  const vinculoAgressor = watch("vinculoAgressor");

  const handleVinculoChange = (v: string) => {
    setValue("vinculoAgressor", v as any, { shouldDirty: true });
    if (v !== "OUTROS") {
      setValue("especificacaoOutroVinculo", null as any, { shouldDirty: true });
    }
  };

  return (
    <div className="space-y-6">
      <CardHeader className="-m-6 mb-0">
        <CardTitle>Agressor (informações mínimas)</CardTitle>
      </CardHeader>

      <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
        <div className="space-y-2">
          <Label>Vínculo com o agressor</Label>
          <Controller
            control={control}
            name="vinculoAgressor"
            render={({ field }) => (
              <Select onValueChange={handleVinculoChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {VINCULO_AGRESSOR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).vinculoAgressor?.message}</p>}
        </div>

        {vinculoAgressor === "OUTROS" && (
          <div className="space-y-2">
            <Label htmlFor="especificacaoOutroVinculo">Especificar</Label>
            <Controller
              name="especificacaoOutroVinculo"
              control={control}
              render={({ field }) => <Input id="especificacaoOutroVinculo" {...field} value={field.value ?? ""} />}
            />
            {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).especificacaoOutroVinculo?.message}</p>}
          </div>
        )}

        <div className="space-y-2">
          <Label>Coabita com o agressor?</Label>
          <Controller
            control={control}
            name="coabitaComAgressor"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="..." />
                </SelectTrigger>
                <SelectContent>
                  {SIM_NAO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).coabitaComAgressor?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Faixa etária do agressor</Label>
          <Controller
            control={control}
            name="faixaEtariaAgressor"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {FAIXA_ETARIA_AGRESSOR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>Sexo do agressor</Label>
          <Controller
            control={control}
            name="sexoAgressor"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {SEXO_AGRESSOR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bairroAgressor">Bairro do agressor</Label>
          <Controller name="bairroAgressor" control={control} render={({ field }) => <Input id="bairroAgressor" {...field} value={field.value ?? ""} />} />
        </div>
      </div>
    </div>
  );
}
