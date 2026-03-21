import { FormProvider } from "react-hook-form";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eraser } from "lucide-react";

import { useCadastroForm } from "./useCadastroForm";
import { TabAtendimento } from "./components/TabAtendimento";
import { TabVitima } from "./components/TabVitima";
import { TabFamilia } from "./components/TabFamilia";
import { TabSaude } from "./components/TabSaude";
import { TabEncaminhamentos } from "./components/TabEncaminhamentos";

export default function Cadastro() {
  const {
    form,
    isEditMode,
    isSubmitting,
    isDataLoading,
    activeTab,
    setActiveTab,
    onSubmit,
    onInvalid,
    handleFinalize,
    handleClearForm,
  } = useCadastroForm();

  if (isDataLoading) {
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
            ? "Altere os dados e salve o progresso. Clique em 'Finalizar' quando terminar."
            : "Preencha as informações do caso. O técnico já foi preenchido."}
        </p>
      </div>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="atendimento">1. Atendimento</TabsTrigger>
              <TabsTrigger value="vitima" disabled={!isEditMode}>
                2. Vítima
              </TabsTrigger>
              <TabsTrigger value="familia" disabled={!isEditMode}>
                3. Família
              </TabsTrigger>
              <TabsTrigger value="saude" disabled={!isEditMode}>
                4. Saúde
              </TabsTrigger>
              <TabsTrigger value="encaminhamentos" disabled={!isEditMode}>
                5. Encaminhamentos
              </TabsTrigger>
            </TabsList>

            <Card className="mt-4">
              <CardContent className="pt-6">
                <TabsContent value="atendimento" className="space-y-6">
                  <TabAtendimento isEditMode={isEditMode} />
                </TabsContent>

                <TabsContent value="vitima" className="space-y-6">
                  <TabVitima isEditMode={isEditMode} />
                </TabsContent>

                <TabsContent value="familia" className="space-y-6">
                  <TabFamilia isEditMode={isEditMode} />
                </TabsContent>

                <TabsContent value="saude" className="space-y-6">
                  <TabSaude isEditMode={isEditMode} />
                </TabsContent>

                <TabsContent value="encaminhamentos" className="space-y-6">
                  <TabEncaminhamentos isEditMode={isEditMode} />
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>

          <div className="flex justify-between items-center mt-6">
            <Button type="button" variant="outline" size="lg" onClick={handleClearForm}>
              <Eraser className="mr-2 h-4 w-4" />
              Novo Registro Limpo
            </Button>

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={isSubmitting} size="lg" variant="secondary">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Salvando..." : isEditMode ? "💾 Salvar Progresso" : "💾 Salvar e Iniciar Prontuário"}
              </Button>

              {isEditMode && (
                <Button type="button" onClick={handleFinalize} disabled={isSubmitting} size="lg">
                  Finalizar e Ver Prontuário
                </Button>
              )}
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
