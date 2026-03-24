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
import { TabAgressor } from "./components/TabAgressor";
import { TabMoradia } from "./components/TabMoradia";

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
    handleSaveProgress,
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
            ? "Altere os dados, salve o progresso e finalize quando concluir o prontuário."
            : "Preencha todas as abas e salve o cadastro completo na primeira gravação."}
        </p>
      </div>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="atendimento">1. Atendimento</TabsTrigger>
              <TabsTrigger value="vitima">2. Vítima</TabsTrigger>
              <TabsTrigger value="familia">3. Família</TabsTrigger>
              <TabsTrigger value="saude">4. Saúde</TabsTrigger>
              <TabsTrigger value="encaminhamentos">5. Encaminhamentos</TabsTrigger>
              <TabsTrigger value="agressor">6. Agressor</TabsTrigger>
              <TabsTrigger value="moradia">7. Moradia</TabsTrigger>
            </TabsList>

            <Card className="mt-4">
              <CardContent className="pt-6">
                <TabsContent value="atendimento" className="space-y-6">
                  <TabAtendimento />
                </TabsContent>

                <TabsContent value="vitima" className="space-y-6">
                  <TabVitima />
                </TabsContent>

                <TabsContent value="familia" className="space-y-6">
                  <TabFamilia />
                </TabsContent>

                <TabsContent value="saude" className="space-y-6">
                  <TabSaude />
                </TabsContent>

                <TabsContent value="encaminhamentos" className="space-y-6">
                  <TabEncaminhamentos />
                </TabsContent>

                <TabsContent value="agressor" className="space-y-6">
                  <TabAgressor />
                </TabsContent>

                <TabsContent value="moradia" className="space-y-6">
                  <TabMoradia />
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
              <Button type="submit" disabled={isSubmitting} size="lg" variant="secondary" onClick={handleSaveProgress}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Salvando..." : isEditMode ? "Salvar Progresso" : "Criar e Salvar Progresso"}
              </Button>

              <Button type="button" onClick={handleFinalize} disabled={isSubmitting} size="lg">
                {isEditMode ? "Finalizar e Ver Prontuário" : "Criar e Ver Prontuário"}
              </Button>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
