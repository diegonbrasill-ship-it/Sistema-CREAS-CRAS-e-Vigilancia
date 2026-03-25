import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { CasoDetalhado } from "@/services/api";
import { caseToFormValues } from "../adapters";
import { formatCadastroFieldValue, getCadastroFieldLabel } from "../display";
import { tabDefinitions } from "../schema";

function CadastroFieldItem({ label, value }: { label: string; value: string | string[] }) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      {Array.isArray(value) ? (
        <div className="flex flex-wrap gap-2">
          {value.map((item) => (
            <Badge key={item} variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm font-medium text-slate-900 break-words whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
}

export function CasoResumoCadastral({ caso }: { caso: CasoDetalhado }) {
  const sections = useMemo(() => {
    const formValues = caseToFormValues(caso);

    return tabDefinitions
      .map((tab) => {
        const items = tab.fields.flatMap((field) => {
          const formattedValue = formatCadastroFieldValue(field, formValues[field]);
          if (!formattedValue) return [];

          return [
            {
              field,
              label: getCadastroFieldLabel(field),
              value: formattedValue,
            },
          ];
        });

        return {
          key: tab.value,
          title: tab.label.replace(/^\d+\.\s*/, ""),
          items,
        };
      })
      .filter((section) => section.items.length > 0);
  }, [caso]);

  return (
    <>
      {sections.map((section) => (
        <section key={section.key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-800">{section.title}</h3>
            <p className="text-sm text-slate-500"></p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {section.items.map((item) => (
              <CadastroFieldItem key={String(item.field)} label={item.label} value={item.value} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

