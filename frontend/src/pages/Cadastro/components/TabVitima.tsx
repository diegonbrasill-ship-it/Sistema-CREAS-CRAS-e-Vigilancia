import { Controller, useFormContext } from "react-hook-form";

import { CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { maskCPF, maskNIS } from "@/utils/masks";
import type { CasoForm } from "../schema";

export function TabVitima({ isEditMode }: { isEditMode: boolean }) {
  const {
    control,
    formState: { errors },
  } = useFormContext<CasoForm>();

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
          <Controller
            control={control}
            name="sexo"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Feminino">Feminino</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.sexo?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Cor/Etnia</Label>
          <Controller
            control={control}
            name="corEtnia"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Branca">Branca</SelectItem>
                  <SelectItem value="Preta">Preta</SelectItem>
                  <SelectItem value="Parda">Parda</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{errors.corEtnia?.message}</p>}
        </div>

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
                  <SelectItem value="Fundamental Incompleto">Fundamental Incompleto</SelectItem>
                  <SelectItem value="Fundamental Completo">Fundamental Completo</SelectItem>
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
      </div>
    </div>
  );
}
