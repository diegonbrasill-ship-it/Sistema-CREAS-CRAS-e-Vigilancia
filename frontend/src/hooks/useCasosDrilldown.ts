import { useState } from "react";

import { listCasosCanonicos } from "@/services/api";
import {
  buildCasosDrilldownParams,
  type CasoDrilldownListItem,
  type DrilldownSource,
  type DrilldownUiFilters,
} from "@/services/casosDrilldown";

interface OpenCasosDrilldownInput {
  source: DrilldownSource;
  action: string;
  value?: string | null;
  title: string;
  uiFilters?: DrilldownUiFilters;
}

interface UseCasosDrilldownOptions {
  defaultErrorMessage?: string;
  onError?: (message: string, error: unknown) => void;
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function useCasosDrilldown(options: UseCasosDrilldownOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [cases, setCases] = useState<CasoDrilldownListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const closeDrilldown = () => {
    setIsOpen(false);
    setErrorMessage(null);
  };

  const openDrilldown = async (input: OpenCasosDrilldownInput) => {
    setTitle(input.title);
    setIsOpen(true);
    setIsLoading(true);
    setCases([]);
    setErrorMessage(null);

    try {
      const params = buildCasosDrilldownParams({
        source: input.source,
        action: input.action,
        value: input.value,
        uiFilters: input.uiFilters,
      });
      const data = await listCasosCanonicos(params);
      setCases(data);
    } catch (error) {
      const message = options.defaultErrorMessage
        ? options.defaultErrorMessage
        : resolveErrorMessage(error, "Erro ao buscar a lista de casos.");

      setErrorMessage(message);
      options.onError?.(message, error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isOpen,
    title,
    cases,
    isLoading,
    errorMessage,
    openDrilldown,
    closeDrilldown,
  };
}
