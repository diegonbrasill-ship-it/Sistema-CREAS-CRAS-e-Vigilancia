import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, FieldErrors, DefaultValues, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";

import { useAuth } from "@/contexts/AuthContext";
import { createCase, getCasoById, updateCase } from "@/services/api";
import { formatDateForInput } from "@/utils/dateUtils";

import { submitSchema, tabDefinitions, type CasoForm } from "./schema";
import { caseToFormValues, formValuesToCreatePayload, formValuesToUpdatePayload } from "./adapters";

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

  const createDefaultValues = useMemo<DefaultValues<CasoForm>>(
    () => ({
      data_cad: formatDateForInput(new Date()),
      tec_ref: tecRefFromAuth ?? "",
    }),
    [tecRefFromAuth],
  );

  const resolver = zodResolver(submitSchema) as Resolver<CasoForm>;

  const form = useForm<CasoForm>({
    resolver,
    defaultValues: createDefaultValues,
  });

  const {
    reset,
    watch,
    getValues,
    formState: { dirtyFields, isSubmitting },
  } = form;

  const [isDataLoading, setIsDataLoading] = useState(isEditMode);
  const [activeTab, setActiveTab] = useState<(typeof tabDefinitions)[number]["value"]>("atendimento");

  const normalizeFieldValue = <K extends keyof CasoForm>(value: CasoForm[K] | null | undefined): CasoForm[K] => (value ?? "") as CasoForm[K];
  const createResetValues = useCallback(
    (values: Partial<CasoForm> = {}): DefaultValues<CasoForm> => ({
      ...createDefaultValues,
      ...values,
      tec_ref: values.tec_ref ?? tecRefFromAuth ?? "",
    }),
    [createDefaultValues, tecRefFromAuth],
  );

  useEffect(() => {
    if (isEditMode && id) {
      const loadCasoToForms = async () => {
        try {
          setIsDataLoading(true);
          const casoData = await getCasoById(id);
          const values = caseToFormValues(casoData);
          reset(createResetValues(values));
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
      reset(createDefaultValues);
      setIsDataLoading(false);
    }
  }, [createDefaultValues, id, isEditMode, navigate, reset, user, createResetValues]);

  const onInvalid = (fieldErrors: FieldErrors<CasoForm>) => {
    const errorKeys = Object.keys(fieldErrors) as (keyof CasoForm)[];
    const tabsComErro = tabDefinitions.filter((tab) => tab.fields.some((field) => errorKeys.includes(field)));

    if (tabsComErro.length > 0) {
      setActiveTab(tabsComErro[0].value);
      toast.warn(`⚠️ Preencha todos os campos obrigatórios nas abas: ${tabsComErro.map((tab) => tab.label).join(", ")}`, { autoClose: 6000 });
    }
  };

  const onSubmit = async (data: CasoForm) => {
    try {
      if (isEditMode && id) {
        if (Object.keys(dirtyFields).length === 0) {
          toast.info("Nenhuma alteração para salvar. Redirecionando para o prontuário.");
          navigate(`/caso/${id}`);
          return;
        }

        const dirtyData = Object.fromEntries(
          (Object.keys(dirtyFields) as Array<keyof CasoForm>).map((key) => [key, normalizeFieldValue(getValues(key))]),
        ) as Partial<CasoForm>;

        // manter compat com backend atual
        dirtyData.data_cad = data.data_cad;
        // Preserva o técnico responsável já registrado; só preenche com o usuário atual
        // quando o caso antigo não possui `tec_ref`.
        dirtyData.tec_ref = data.tec_ref ?? tecRefFromAuth ?? "";

        const payload = formValuesToUpdatePayload(dirtyData, { tecRefFromAuth, unitIdFromAuth: user?.unit_id });
        await updateCase(id, payload);

        toast.success("✅ Cadastro salvo com sucesso!");
        reset(createResetValues(data));
        toast.success("Prontuário finalizado!");
        navigate(`/caso/${id}`);
        return;
      }

      // criação
      const payloadComUnidade = formValuesToCreatePayload(data, { tecRefFromAuth, unitIdFromAuth: user?.unit_id });
      const response = (await createCase(payloadComUnidade)) as { id?: string | number };
      const novoCasoId = response.id;

      if (!novoCasoId) {
        toast.error("❌ Erro de comunicação: ID do novo caso não foi retornado.");
        return;
      }

      toast.success("✅ Prontuário criado com sucesso!");
      navigate(`/caso/${novoCasoId}`);
    } catch (error: unknown) {
      toast.error(`❌ Falha ao salvar: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleCancel = () => {
    navigate("/consulta");
  };

  const handleClearForm = () => {
    if (isEditMode) {
      toast.warn("Não é possível limpar um prontuário em edição.");
      return;
    }
    reset(createDefaultValues);
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
    handleCancel,
    handleClearForm,
  };
}
