import { Controller, useFormContext } from "react-hook-form";

import { CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { CasoForm } from "../schema";
import {
  CANAL_ORIGEM_OPTIONS,
  TIPO_VIOLENCIA_DESCRICOES_MAP,
  TIPO_VIOLENCIA_OPTIONS,
} from "../options";

export function TabAtendimento() {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CasoForm>();

  const canalDenunciaValue = watch("canalDenuncia");
  const tipoViolenciaValue = watch("tipoViolencia");
  const tipoViolenciaDescricoes = watch("tipoViolenciaDescricoes") ?? [];

  const descricoesOptions = tipoViolenciaValue ? TIPO_VIOLENCIA_DESCRICOES_MAP[String(tipoViolenciaValue)] ?? [] : [];

  const handleTipoViolenciaChange = (v: string) => {
    setValue("tipoViolencia", v as any, { shouldDirty: true });
    setValue("tipoViolenciaDescricoes", [] as any, { shouldDirty: true });
  };

  const toggleDescricao = (value: string) => {
    const current = Array.isArray(tipoViolenciaDescricoes) ? tipoViolenciaDescricoes : [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setValue("tipoViolenciaDescricoes", next as any, { shouldDirty: true });
  };

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
          <Input id="tec_ref" placeholder="Nome do técnico - Cargo" {...register("tec_ref")} readOnly />
          <p className="text-sm text-red-500 mt-1 h-4">{errors.tec_ref?.message}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
        <div className="space-y-2">
          <Label>Tipo de Violência</Label>
          <Controller
            control={control}
            name="tipoViolencia"
            render={({ field }) => (
              <Select onValueChange={handleTipoViolenciaChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_VIOLENCIA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).tipoViolencia?.message}</p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Descrições (se aplicável)</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 rounded-md border p-3">
            {descricoesOptions.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Selecione um tipo de violência para habilitar as descrições.</p>}
            {descricoesOptions.map((opt) => {
              const isChecked = Array.isArray(tipoViolenciaDescricoes) && tipoViolenciaDescricoes.includes(opt.value);
              return (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isChecked} onChange={() => toggleDescricao(opt.value)} />
                  {opt.label}
                </label>
              );
            })}
          </div>
          <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).tipoViolenciaDescricoes?.message as any}</p>
        </div>

        <div className="space-y-2">
          <Label>Canal de denúncia</Label>
          <Controller
            control={control}
            name="canalDenuncia"
            render={({ field }) => (
              <Select
                onValueChange={(v) => {
                  setValue("canalDenuncia", v as any, { shouldDirty: true });
                  if (v !== "OUTROS") setValue("especificacaoOutroCanal", null as any, { shouldDirty: true });
                }}
                value={field.value ?? ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CANAL_ORIGEM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).canalDenuncia?.message}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="protocolo">Protocolo (opcional)</Label>
          <Controller name="protocolo" control={control} render={({ field }) => <Input id="protocolo" {...field} value={field.value ?? ""} />} />
          <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).protocolo?.message}</p>
        </div>

        {canalDenunciaValue === "OUTROS" && (
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="especificacaoOutroCanal">Especificar outro canal</Label>
            <Controller
              name="especificacaoOutroCanal"
              control={control}
              render={({ field }) => <Input id="especificacaoOutroCanal" {...field} value={field.value ?? ""} />}
            />
            <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).especificacaoOutroCanal?.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
