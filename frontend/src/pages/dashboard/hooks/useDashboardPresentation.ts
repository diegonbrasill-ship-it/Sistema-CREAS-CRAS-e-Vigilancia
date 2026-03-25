import { useEffect, useRef, useState } from "react";

interface UseDashboardPresentationOptions {
  onFullscreenError?: (message: string) => void;
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Falha ao alternar o modo apresentação.";
}

export function useDashboardPresentation(options: UseDashboardPresentationOptions = {}) {
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsPresentationMode(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const togglePresentationMode = () => {
    const element = dashboardRef.current;

    if (!element) {
      return;
    }

    if (!document.fullscreenElement) {
      element.requestFullscreen().catch((error) => {
        options.onFullscreenError?.(resolveErrorMessage(error));
      });
      return;
    }

    void document.exitFullscreen();
  };

  return {
    dashboardRef,
    isPresentationMode,
    togglePresentationMode,
  };
}
