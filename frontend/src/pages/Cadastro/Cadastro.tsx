import { FormProvider } from "react-hook-form";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eraser } from "lucide-react";

import { useCadastroForm } from "./useCadastroForm";
import { tabDefinitions } from "./schema";
import { TabAtendimento } from "./components/TabAtendimento";
import { TabVitima } from "./components/TabVitima";
import { TabFamilia } from "./components/TabFamilia";
import { TabSaude } from "./components/TabSaude";
import { TabEncaminhamentos } from "./components/TabEncaminhamentos";
import { TabAgressor } from "./components/TabAgressor";
import { TabMoradia } from "./components/TabMoradia";

const tabContentMap: Record<string, JSX.Element> = {
  atendimento: <TabAtendimento />,
  vitima: <TabVitima />,
  familia: <TabFamilia />,
  saude: <TabSaude />,
  encaminhamentos: <TabEncaminhamentos />,
  agressor: <TabAgressor />,
  moradia: <TabMoradia />,
};

export default function Cadastro() {
  const {
    casoSchema,
    form,
    isEditMode,
    isSubmitting,
    isDataLoading,
    activeTab,
    setActiveTab,
    runtimeTabDefinitions,
    onSubmit,
    onInvalid,
    handleCancel,
    handleClearForm,
  } = useCadastroForm();

  const isCadastroTab = (value: string) => runtimeTabDefinitions.some((tab) => tab.value === value);

  if (isDataLoading || (casoSchema.isLoading && runtimeTabDefinitions.length === 0)) {
    return (
      <div className="text-center p-10">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <span>Carregando dados do prontuário...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{isEditMode ? "Editando Prontuário" : "Registro de Atendimento PAEFI"}</h1>
        <p className="text-slate-500">
          {isEditMode
            ? "Altere os dados e finalize quando concluir o prontuário."
            : "Preencha todas as abas, finalize o cadastro completo ou cancele para voltar à consulta."}
        </p>
      </div>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              if (isCadastroTab(value)) {
                setActiveTab(value);
              }
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-7">
              {runtimeTabDefinitions.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <Card className="mt-4">
              <CardContent className="pt-6">
                {runtimeTabDefinitions.map((tab) => {
                  const content = tabContentMap[tab.value];
                  if (!content) {
                    return null;
                  }

                  return (
                    <TabsContent key={tab.value} value={tab.value} className="space-y-6">
                      {content}
                    </TabsContent>
                  );
                })}
              </CardContent>
            </Card>
          </Tabs>

          <div className="flex justify-between items-center mt-6">
            <Button type="button" variant="outline" size="lg" onClick={handleClearForm}>
              <Eraser className="mr-2 h-4 w-4" />
              Novo Registro Limpo
            </Button>

            <div className="flex items-center gap-4">
              <Button type="button" disabled={isSubmitting} size="lg" variant="destructive" onClick={handleCancel}>
                Cancelar
              </Button>

              <Button type="submit" disabled={isSubmitting} size="lg">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Salvando..." : isEditMode ? "Finalizar e Ver Prontuário" : "Criar e Ver Prontuário"}
              </Button>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
