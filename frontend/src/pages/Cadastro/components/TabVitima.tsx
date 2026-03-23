import { Controller, useFormContext } from "react-hook-form";

import { CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { maskCPF, maskNIS } from "@/utils/masks";
import type { CasoForm } from "../schema";
import { ESCOLARIDADE_OPTIONS, RACA_COR_OPTIONS, SEXO_OPTIONS } from "../options";

export function TabVitima({ isEditMode }: { isEditMode: boolean }) {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<CasoForm>();

  const bairro = watch("bairro");
  const racaCor = watch("racaCor");

  return (
    <div className="space-y-6">
      <CardHeader className="-m-6 mb-0">
        <CardTitle>Dados Pessoais da Vítima</CardTitle>
      </CardHeader>

      <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome Completo</Label>
          <Controller name="nome" control={control} render={({ field }) => <Input id="nome" {...field} value={field.value ?? ""} />} />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.nome?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cpf">CPF</Label>
          <Controller
            name="cpf"
            control={control}
            render={({ field }) => (
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                maxLength={14}
                value={field.value ? maskCPF(field.value) : ""}
                onChange={(e) => field.onChange(maskCPF(e.target.value))}
                onBlur={field.onBlur}
                ref={field.ref}
              />
            )}
          />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.cpf?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nis">NIS</Label>
          <Controller
            name="nis"
            control={control}
            render={({ field }) => (
              <Input
                id="nis"
                placeholder="000.00000.00-0"
                maxLength={14}
                value={field.value ? maskNIS(field.value) : ""}
                onChange={(e) => field.onChange(maskNIS(e.target.value))}
                onBlur={field.onBlur}
                ref={field.ref}
              />
            )}
          />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.nis?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="idade">Idade</Label>
          <Controller name="idade" control={control} render={({ field }) => <Input id="idade" type="number" {...field} value={field.value ?? ""} />} />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.idade?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Sexo</Label>
          {!isEditMode && <p className="text-xs text-muted-foreground">Opcional. Se preferir, deixe em branco.</p>}
          <Controller
            control={control}
            name="sexo"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {SEXO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.sexo?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Raça/Cor</Label>
          {!isEditMode && <p className="text-xs text-muted-foreground">Opcional. Se preferir, deixe em branco.</p>}
          <Controller
            control={control}
            name="racaCor"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {RACA_COR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).racaCor?.message}</p>}
        </div>

        {racaCor === "INDIGENA" && (
          <div className="space-y-2">
            <Label htmlFor="etniaIndigena">Etnia indígena</Label>
            <Controller
              name="etniaIndigena"
              control={control}
              render={({ field }) => <Input id="etniaIndigena" {...field} value={field.value ?? ""} />}
            />
            {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).etniaIndigena?.message}</p>}
          </div>
        )}

        <div className="space-y-2">
          <Label>Escolaridade</Label>
          <Controller
            control={control}
            name="escolaridade"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {ESCOLARIDADE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.escolaridade?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bairro">Bairro</Label>
          <Controller name="bairro" control={control} render={({ field }) => <Input id="bairro" {...field} value={field.value ?? ""} />} />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.bairro?.message}</p>}
        </div>

        {bairro?.trim() && (
          <div className="space-y-2">
            <Label htmlFor="macroRegiao">MacroRegiao</Label>
            <Controller
              name="macroRegiao"
              control={control}
              render={({ field }) => <Input id="macroRegiao" {...field} value={field.value ?? ""} />}
            />
            {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).macroRegiao?.message}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
