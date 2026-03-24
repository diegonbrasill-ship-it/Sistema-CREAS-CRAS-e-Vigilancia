import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";

import { useAuth } from "@/contexts/AuthContext";
import { createCase, getCasoById, updateCase } from "@/services/api";

import { submitSchema, tabDefinitions, type CasoForm } from "./schema";
import { caseToFormValues, formValuesToCreatePayload, formValuesToUpdatePayload } from "./adapters";

type SubmitIntent = "save" | "finalize";

export function useCadastroForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const { user } = useAuth();

  const tecRefFromAuth = useMemo(() => {
    if (!user) return undefined;
    const nomeCompleto = user.nome_completo || user.username;
    const cargo = user.cargo || "";
    return user.role.includes("tecnico") && cargo ? `${nomeCompleto} - ${cargo}` : nomeCompleto;
  }, [user]);

  const formSchema = useMemo(() => submitSchema, []);
  const submitIntentRef = useRef<SubmitIntent>("save");
  const createDefaultValues = useMemo(
    () =>
      ({
        data_cad: new Date().toISOString().split("T")[0],
        tec_ref: tecRefFromAuth ?? "",
        tipoViolencia: "" as any,
        canalDenuncia: "" as any,
      }) satisfies Partial<CasoForm>,
    [tecRefFromAuth],
  );

  const form = useForm<CasoForm>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: createDefaultValues as any,
  });

  const {
    handleSubmit,
    reset,
    watch,
    getValues,
    formState: { dirtyFields, isSubmitting },
  } = form;

  const [isDataLoading, setIsDataLoading] = useState(isEditMode);
  const [activeTab, setActiveTab] = useState("atendimento");

  useEffect(() => {
    if (isEditMode && id) {
      const loadCasoToForms = async () => {
        try {
          setIsDataLoading(true);
          const casoData = await getCasoById(id);
          const values = caseToFormValues(casoData);
          // PR-2: `tec_ref` deve refletir o usuário logado, se disponível
          reset({ ...values, tec_ref: tecRefFromAuth ?? (values as any)?.tec_ref } as any);
        } catch {
          toast.error("Não foi possível carregar os dados do caso para edição.");
          navigate("/consulta");
        } finally {
          setIsDataLoading(false);
        }
      };
      loadCasoToForms();
      return;
    }

    // modo criação
    if (user) {
      reset(createDefaultValues as any);
      setIsDataLoading(false);
    }
  }, [createDefaultValues, id, isEditMode, navigate, reset, user, tecRefFromAuth]);

  const onInvalid = (fieldErrors: FieldErrors<CasoForm>) => {
    const errorKeys = Object.keys(fieldErrors) as (keyof CasoForm)[];
    const tabsComErro = tabDefinitions.filter((tab) => tab.fields.some((field) => errorKeys.includes(field)));

    if (tabsComErro.length > 0) {
      setActiveTab(tabsComErro[0].value);
      toast.warn(`⚠️ Preencha todos os campos obrigatórios nas abas: ${tabsComErro.map((tab) => tab.label).join(", ")}`, { autoClose: 6000 });
    }
  };

  const handleSubmitSuccessNavigation = (targetId: string | number, intent: SubmitIntent) => {
    if (intent === "finalize") {
      navigate(`/caso/${targetId}`);
      return;
    }
    navigate(`/cadastro/${targetId}`, { replace: true });
  };

  const onSubmit = async (data: CasoForm) => {
    const submitIntent = submitIntentRef.current;

    try {
      if (isEditMode && id) {
        if (Object.keys(dirtyFields).length === 0) {
          if (submitIntent === "finalize") {
            navigate(`/caso/${id}`);
            return;
          }
          toast.info("Nenhuma alteração para salvar.");
          return;
        }

        const dirtyData: Partial<CasoForm> = {};
        (Object.keys(dirtyFields) as Array<keyof CasoForm>).forEach((key) => {
          const value = getValues(key);
          (dirtyData as any)[key] = value === null || value === undefined ? "" : value;
        });

        // manter compat com backend atual
        (dirtyData as any).data_cad = data.data_cad;
        // PR-2: `tec_ref` autoritativo no FE (e recomendado também no BE)
        (dirtyData as any).tec_ref = tecRefFromAuth ?? data.tec_ref;

        const payload = formValuesToUpdatePayload(dirtyData, { tecRefFromAuth, unitIdFromAuth: user?.unit_id });
        await updateCase(id, payload);

        toast.success(submitIntent === "finalize" ? "✅ Cadastro salvo com sucesso!" : "✅ Progresso salvo com sucesso!");
        // mantém o formulário consistente com o que foi submetido (inclui tec_ref autoritativo)
        reset({ ...data, tec_ref: tecRefFromAuth ?? data.tec_ref } as any);
        if (submitIntent === "finalize") {
          toast.success("Prontuário finalizado!");
          navigate(`/caso/${id}`);
        }
        return;
      }

      // criação
      const payloadComUnidade = formValuesToCreatePayload(data, { tecRefFromAuth, unitIdFromAuth: user?.unit_id });
      const response = await createCase(payloadComUnidade);
      const novoCasoId = (response as any)?.id;

      if (!novoCasoId) {
        toast.error("❌ Erro de comunicação: ID do novo caso não foi retornado.");
        return;
      }

      toast.success(submitIntent === "finalize" ? "✅ Prontuário criado com sucesso!" : "✅ Cadastro criado e salvo com sucesso!");
      handleSubmitSuccessNavigation(novoCasoId, submitIntent);
    } catch (error: any) {
      toast.error(`❌ Falha ao salvar: ${error?.message ?? String(error)}`);
    }
  };

  const handleFinalize = async () => {
    submitIntentRef.current = "finalize";
    await handleSubmit(onSubmit, onInvalid)();
  };

  const handleSaveProgress = () => {
    submitIntentRef.current = "save";
  };

  const handleClearForm = () => {
    if (isEditMode) {
      toast.warn("Não é possível limpar um prontuário em edição.");
      return;
    }
    reset(createDefaultValues as any);
    setActiveTab("atendimento");
    toast.info("Formulário limpo para um novo registro.");
  };

  return {
    form,
    isEditMode,
    isSubmitting,
    isDataLoading,
    activeTab,
    setActiveTab,

    watch,

    onInvalid,
    onSubmit,
    handleFinalize,
    handleSaveProgress,
    handleClearForm,
  };
}
