import { Controller, useFormContext } from "react-hook-form";

import { CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { CasoForm } from "../schema";
import { SIM_NAO_OPTIONS } from "../options";

export function TabSaude({ isEditMode }: { isEditMode: boolean }) {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<CasoForm>();

  const vitimaPCDValue = watch("vitimaPCD");
  const tratamentoSaudeValue = watch("tratamentoSaude");

  return (
    <div className="space-y-6">
      <CardHeader className="-m-6 mb-0">
        <CardTitle>Saúde</CardTitle>
      </CardHeader>

      <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
        <div className="space-y-2">
          <Label>Vítima é Pessoa com Deficiência?</Label>
          <Controller
            control={control}
            name="vitimaPCD"
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
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.vitimaPCD?.message}</p>}
        </div>

        {vitimaPCDValue === "Sim" && (
          <div className="space-y-2">
            <Label htmlFor="vitimaPCDDetalhe">Qual?</Label>
            <Controller name="vitimaPCDDetalhe" control={control} render={({ field }) => <Input id="vitimaPCDDetalhe" {...field} value={field.value ?? ""} />} />
            {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.vitimaPCDDetalhe?.message}</p>}
          </div>
        )}

        <div className="space-y-2">
          <Label>Faz tratamento de saúde?</Label>
          <Controller
            control={control}
            name="tratamentoSaude"
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
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.tratamentoSaude?.message}</p>}
        </div>

        {tratamentoSaudeValue === "Sim" && (
          <div className="space-y-2">
            <Label htmlFor="tratamentoSaudeDetalhe">Onde?</Label>
            <Controller name="tratamentoSaudeDetalhe" control={control} render={({ field }) => <Input id="tratamentoSaudeDetalhe" {...field} value={field.value ?? ""} />} />
            {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.tratamentoSaudeDetalhe?.message}</p>}
          </div>
        )}

        <div className="space-y-2">
          <Label>Depende financeiramente do agressor?</Label>
          <Controller
            control={control}
            name="dependeFinanceiro"
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
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.dependeFinanceiro?.message}</p>}
        </div>
      </div>
    </div>
  );
}
