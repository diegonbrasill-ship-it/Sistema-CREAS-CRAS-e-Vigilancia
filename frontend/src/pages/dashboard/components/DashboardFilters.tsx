import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { DashboardFilterOptions, DashboardFilters } from "../hooks/useDashboardData";

interface DashboardFiltersProps {
  filters: DashboardFilters;
  filterOptions: DashboardFilterOptions;
  onFilterChange: (filterName: keyof DashboardFilters, value: string) => void;
  onClearFilters: () => void;
}

export function DashboardFilters({
  filters,
  filterOptions,
  onFilterChange,
  onClearFilters,
}: DashboardFiltersProps) {
  return (
    <Card className="card-filtros">
      <CardHeader><CardTitle className="text-base">Filtros de Análise</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label className="text-sm font-medium">Período (Mês/Ano)</Label>
          <Select value={filters.mes || "todos"} onValueChange={(value) => onFilterChange("mes", value)}>
            <SelectTrigger className="w-auto min-w-[180px]"><SelectValue placeholder="Todos os Períodos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Períodos</SelectItem>
              {filterOptions.meses.map((mes) => <SelectItem key={mes} value={mes}>{mes}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-sm font-medium">Técnico de Referência</Label>
          <Select value={filters.tecRef || "todos"} onValueChange={(value) => onFilterChange("tecRef", value)}>
            <SelectTrigger className="w-auto min-w-[180px]"><SelectValue placeholder="Todos os Técnicos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Técnicos</SelectItem>
              {filterOptions.tecnicos.map((tecnico) => <SelectItem key={tecnico} value={tecnico}>{tecnico}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-sm font-medium">Bairro</Label>
          <Select value={filters.bairro || "todos"} onValueChange={(value) => onFilterChange("bairro", value)}>
            <SelectTrigger className="w-auto min-w-[180px]"><SelectValue placeholder="Todos os Bairros" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Bairros</SelectItem>
              {filterOptions.bairros.map((bairro) => <SelectItem key={bairro} value={bairro}>{bairro}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" onClick={onClearFilters}>Limpar Filtros</Button>
      </CardContent>
    </Card>
  );
}
