import ListaCasosModal from "@/components/DrillDown/ListaCasosModal";
import type { CasoDrilldownListItem } from "@/services/casosDrilldown";

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  cases: CasoDrilldownListItem[];
  isLoading: boolean;
  errorMessage: string | null;
}

export function DashboardModal({
  isOpen,
  onClose,
  title,
  cases,
  isLoading,
  errorMessage,
}: DashboardModalProps) {
  return (
    <ListaCasosModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      cases={cases}
      isLoading={isLoading}
      errorMessage={errorMessage}
    />
  );
}
