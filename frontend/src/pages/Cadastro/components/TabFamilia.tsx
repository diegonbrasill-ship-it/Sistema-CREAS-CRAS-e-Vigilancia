import { Controller, useFormContext } from "react-hook-form";

import { CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { CasoForm } from "../schema";
import { SIM_NAO_OPTIONS } from "../options";

export function TabFamilia({ isEditMode }: { isEditMode: boolean }) {
  const {
    control,
    formState: { errors },
  } = useFormContext<CasoForm>();

  return (
    <div className="space-y-6">
      <CardHeader className="-m-6 mb-0">
        <CardTitle>Contexto Familiar e Social</CardTitle>
      </CardHeader>

      <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
        <div className="space-y-2">
          <Label htmlFor="rendaFamiliar">Renda Familiar (R$)</Label>
          <Controller
            name="rendaFamiliar"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sem renda">Sem renda</SelectItem>
                  <SelectItem value="Meio salário mínimo">Meio salário mínimo</SelectItem>
                  <SelectItem value="1 salário mínimo">1 salário mínimo</SelectItem>
                  <SelectItem value="1.5 salário mínimo">1.5 salário mínimo</SelectItem>
                  <SelectItem value="2 salários mínimos">2 salários mínimos</SelectItem>
                  <SelectItem value="2.5 salários mínimos">2.5 salários mínimos</SelectItem>
                  <SelectItem value="3 salários mínimos">3 salários mínimos</SelectItem>
                  <SelectItem value="3.5 salários mínimos">3.5 salários mínimos</SelectItem>
                  <SelectItem value="4 salários mínimos">4 salários mínimos</SelectItem>
                  <SelectItem value="4.5 salários mínimos">4.5 salários mínimos</SelectItem>
                  <SelectItem value="5 salários mínimos">5 salários mínimos</SelectItem>
                  <SelectItem value="5.5 salários mínimos">5.5 salários mínimos</SelectItem>
                  <SelectItem value="6 ou mais salários mínimos">6 ou mais salários mínimos</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.rendaFamiliar?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Recebe Bolsa Família?</Label>
          <Controller
            control={control}
            name="recebePBF"
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
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.recebePBF?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Recebe BPC?</Label>
          <Controller
            control={control}
            name="recebeBPC"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Idoso">Idoso</SelectItem>
                  <SelectItem value="PCD">PCD</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.recebeBPC?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Recebe Benefício de Erradicação?</Label>
          <Controller
            control={control}
            name="recebeBE"
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
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.recebeBE?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Membros no CadÚnico?</Label>
          <Controller
            control={control}
            name="membrosCadUnico"
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
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.membrosCadUnico?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="composicaoFamiliar">Composição Familiar</Label>
          <Controller
            name="composicaoFamiliar"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 membro">1 membro</SelectItem>
                  <SelectItem value="2 membros">2 membros</SelectItem>
                  <SelectItem value="3 membros">3 membros</SelectItem>
                  <SelectItem value="4 membros">4 membros</SelectItem>
                  <SelectItem value="5 membros">5 membros</SelectItem>
                  <SelectItem value="6 ou mais membros">6 ou mais membros</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.composicaoFamiliar?.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="referenciaFamiliar">Referência Familiar</Label>
          <Controller name="referenciaFamiliar" control={control} render={({ field }) => <Input id="referenciaFamiliar" {...field} value={field.value ?? ""} />} />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.referenciaFamiliar?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Membro em Sist. Carcerário?</Label>
          <Controller
            control={control}
            name="membroCarcerario"
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
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.membroCarcerario?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Membro em Socioeducação?</Label>
          <Controller
            control={control}
            name="membroSocioeducacao"
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
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.membroSocioeducacao?.message}</p>}
        </div>
      </div>
    </div>
  );
}
