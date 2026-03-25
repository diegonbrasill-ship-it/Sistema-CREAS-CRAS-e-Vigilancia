import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import { type DashboardApiDataType, getDashboardData } from "@/services/api";

export interface DashboardFilters {
  mes: string;
  tecRef: string;
  bairro: string;
}

export interface DashboardFilterOptions {
  meses: string[];
  tecnicos: string[];
  bairros: string[];
}

const EMPTY_FILTERS: DashboardFilters = {
  mes: "",
  tecRef: "",
  bairro: "",
};

const EMPTY_FILTER_OPTIONS: DashboardFilterOptions = {
  meses: [],
  tecnicos: [],
  bairros: [],
};

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Erro desconhecido ao carregar o dashboard.";
}

export function useDashboardData() {
  const [dashboardData, setDashboardData] = useState<DashboardApiDataType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [filterOptions, setFilterOptions] = useState<DashboardFilterOptions>(EMPTY_FILTER_OPTIONS);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      setIsLoading(true);

      try {
        const response = await getDashboardData(filters);

        if (!isMounted) {
          return;
        }

        setDashboardData(response.dados);
        setFilterOptions(response.opcoesFiltro);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        toast.error(`Erro ao carregar dados do dashboard: ${resolveErrorMessage(error)}`);
        setDashboardData(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [filters]);

  const handleFilterChange = (filterName: keyof DashboardFilters, value: string) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [filterName]: value === "todos" ? "" : value,
    }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
  };

  return {
    dashboardData,
    isLoading,
    filters,
    filterOptions,
    handleFilterChange,
    clearFilters,
  };
}
