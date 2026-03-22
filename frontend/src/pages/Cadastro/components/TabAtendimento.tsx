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
  TIPO_VIOLENCIA_FORM_OPTIONS,
} from "../options";

export function TabAtendimento({ isEditMode }: { isEditMode: boolean }) {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CasoForm>();

  const canalOrigemValue = watch("canalOrigem");
  const tipoViolenciaValue = watch("tipoViolencia");
  const tipoViolenciaDescricoes = watch("tipoViolenciaDescricoes") ?? [];

  const descricoesOptions = tipoViolenciaValue ? TIPO_VIOLENCIA_DESCRICOES_MAP[String(tipoViolenciaValue)] ?? [] : [];

  const handleTipoViolenciaChange = (v: string) => {
    setValue("tipoViolencia", v as any, { shouldDirty: true });
    setValue("tipoViolenciaDescricoes", [] as any, { shouldDirty: true });

    // compat: manter campo legado também preenchido com label amigável (sem mudar UX atual)
    const legacyMatch = TIPO_VIOLENCIA_FORM_OPTIONS.find((o) => {
      if (v === "FISICA") return o.value === "Física";
      if (v === "PSICOLOGICA") return o.value === "Psicológica";
      if (v === "SEXUAL") return o.value === "Sexual";
      if (v === "PATRIMONIAL") return false;
      if (v === "MORAL") return false;
      return false;
    });
    if (legacyMatch) setValue("tipo_violencia", legacyMatch.value as any, { shouldDirty: true });
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
          <Input id="tec_ref" placeholder="Nome do técnico - Cargo" {...register("tec_ref")} disabled={isEditMode} />
          <p className="text-sm text-red-500 mt-1 h-4">{errors.tec_ref?.message}</p>
        </div>
      </div>

      {/* Legado (mantido) */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Violência (legado)</Label>
          <Controller
            control={control}
            name="tipo_violencia"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_VIOLENCIA_FORM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-sm text-red-500 mt-1 h-4">{errors.tipo_violencia?.message}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="local_ocorrencia">Local da Ocorrência</Label>
          <Controller name="local_ocorrencia" control={control} render={({ field }) => <Input id="local_ocorrencia" {...field} value={field.value ?? ""} />} />
          <p className="text-sm text-red-500 mt-1 h-4">{errors.local_ocorrencia?.message}</p>
        </div>
      </div>

      {/* PR-4: canônico */}
      <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
        <div className="space-y-2">
          <Label>Tipo de Violência (canônico)</Label>
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
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).tipoViolencia?.message}</p>}
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
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).tipoViolenciaDescricoes?.message as any}</p>}
        </div>

        <div className="space-y-2">
          <Label>Canal de origem (canônico)</Label>
          <Controller
            control={control}
            name="canalOrigem"
            render={({ field }) => (
              <Select
                onValueChange={(v) => {
                  setValue("canalOrigem", v as any, { shouldDirty: true });
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
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).canalOrigem?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dataDenuncia">Data da denúncia</Label>
          <Controller name="dataDenuncia" control={control} render={({ field }) => <Input id="dataDenuncia" type="date" {...field} value={field.value ?? ""} />} />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).dataDenuncia?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="protocolo">Protocolo (opcional)</Label>
          <Controller name="protocolo" control={control} render={({ field }) => <Input id="protocolo" {...field} value={field.value ?? ""} />} />
          {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).protocolo?.message}</p>}
        </div>

        {canalOrigemValue === "OUTROS" && (
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="especificacaoOutroCanal">Especificar outro canal</Label>
            <Controller
              name="especificacaoOutroCanal"
              control={control}
              render={({ field }) => <Input id="especificacaoOutroCanal" {...field} value={field.value ?? ""} />}
            />
            {isEditMode && <p className="text-sm text-red-500 mt-1 h-4">{(errors as any).especificacaoOutroCanal?.message}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
