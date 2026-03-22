import { Controller, useFormContext } from "react-hook-form";

import { CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { CasoForm } from "../schema";
import {
  CONFIRMACAO_VIOLENCIA_OPTIONS,
  ENCAMINHADA_SCFV_OPTIONS,
  SIM_NAO_OPTIONS,
} from "../options";

export function TabEncaminhamentos({ isEditMode }: { isEditMode: boolean }) {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<CasoForm>();

  const encaminhamentoValue = watch("encaminhamento");

  return (
    <div className="space-y-6">
      <CardHeader className="-m-6 mb-0">
        <CardTitle>Fluxos e Encaminhamentos</CardTitle>
      </CardHeader>

      <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
        <div className="space-y-2">
          <Label>Encaminhamento realizado?</Label>
          <Controller
            control={control}
            name="encaminhamento"
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
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.encaminhamento?.message}</p>}
        </div>

        {encaminhamentoValue === "Sim" && (
          <div className="space-y-2">
            <Label htmlFor="encaminhamentoDetalhe">Para onde?</Label>
            <Controller name="encaminhamentoDetalhe" control={control} render={({ field }) => <Input id="encaminhamentoDetalhe" {...field} value={field.value ?? ""} />} />
            {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.encaminhamentoDetalhe?.message}</p>}
          </div>
        )}

        <div className="space-y-2">
          <Label>Vítima encaminhada ao SCFV/CDI?</Label>
          <Controller
            control={control}
            name="encaminhadaSCFV"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="..." />
                </SelectTrigger>
                <SelectContent>
                  {ENCAMINHADA_SCFV_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.encaminhadaSCFV?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Vítima Inserida no PAEFI?</Label>
          <Controller
            control={control}
            name="inseridoPAEFI"
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
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.inseridoPAEFI?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Confirmação da Violência</Label>
          <Controller
            control={control}
            name="confirmacaoViolencia"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="..." />
                </SelectTrigger>
                <SelectContent>
                  {CONFIRMACAO_VIOLENCIA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.confirmacaoViolencia?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>É um caso de reincidência?</Label>
          <Controller
            control={control}
            name="reincidente"
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
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.reincidente?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Notificação no SINAM?</Label>
          <Controller
            control={control}
            name="notificacaoSINAM"
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
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.notificacaoSINAM?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="canalDenuncia">Canal de denúncia</Label>
          <Controller
            name="canalDenuncia"
            control={control}
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
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.canalDenuncia?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="qtdAtendimentos">Qtd. de Atendimentos</Label>
          <Controller name="qtdAtendimentos" control={control} render={({ field }) => <Input id="qtdAtendimentos" type="number" {...field} value={field.value ?? ""} />} />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.qtdAtendimentos?.message}</p>}
        </div>
      </div>
    </div>
  );
}
