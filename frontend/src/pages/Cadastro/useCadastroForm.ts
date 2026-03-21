import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";

import { useAuth } from "@/contexts/AuthContext";
import { createCase, getCasoById, updateCase } from "@/services/api";

import { baseSchema, editSchema, tabFields, type CasoForm } from "./schema";
import { caseToFormValues, formValuesToCreatePayload, formValuesToUpdatePayload } from "./adapters";

export function useCadastroForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const { user } = useAuth();

  const formSchema = useMemo(() => (isEditMode ? editSchema : baseSchema), [isEditMode]);

  const form = useForm<CasoForm>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      data_cad: new Date().toISOString().split("T")[0],
      tec_ref: "",
      tipo_violencia: "",
      local_ocorrencia: "",
    },
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

  const tecRefFromAuth = useMemo(() => {
    if (!user) return undefined;
    const nomeCompleto = user.nome_completo || user.username;
    const cargo = user.cargo || "";
    return user.role.includes("tecnico") && cargo ? `${nomeCompleto} - ${cargo}` : nomeCompleto;
  }, [user]);

  useEffect(() => {
    if (isEditMode && id) {
      const loadCasoToForms = async () => {
        try {
          setIsDataLoading(true);
          const casoData = await getCasoById(id);
          const values = caseToFormValues(casoData);
          reset(values as any);
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
      reset({
        data_cad: new Date().toISOString().split("T")[0],
        tec_ref: tecRefFromAuth ?? "",
      } as any);
      setIsDataLoading(false);
    }
  }, [id, isEditMode, navigate, reset, user, tecRefFromAuth]);

  const onInvalid = (fieldErrors: FieldErrors<CasoForm>) => {
    if (!isEditMode) return;
    const errorKeys = Object.keys(fieldErrors) as (keyof CasoForm)[];
    const tabsComErro = Object.entries(tabFields)
      .filter(([_, fields]) => fields.some((f) => errorKeys.includes(f)))
      .map(([tabName]) => tabName);

    if (tabsComErro.length > 0) {
      toast.warn(`⚠️ Preencha todos os campos obrigatórios nas abas: ${tabsComErro.join(", ")}`, { autoClose: 6000 });
    }
  };

  const onSubmit = async (data: CasoForm) => {
    try {
      if (isEditMode && id) {
        if (Object.keys(dirtyFields).length === 0) {
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
        (dirtyData as any).tec_ref = data.tec_ref;

        const payload = formValuesToUpdatePayload(dirtyData, { tecRefFromAuth, unitIdFromAuth: user?.unit_id });
        await updateCase(id, payload);

        toast.success("✅ Progresso salvo com sucesso!");
        reset(data, { keepValues: true, keepDefaultValues: true });
        toast.success("Prontuário finalizado!");
        navigate(`/caso/${id}`);
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

      toast.success("✅ Registro inicial criado! Continue preenchendo as abas.");
      navigate(`/cadastro/${novoCasoId}`, { replace: true });
    } catch (error: any) {
      toast.error(`❌ Falha ao salvar: ${error?.message ?? String(error)}`);
    }
  };

  const handleFinalize = async () => {
    if (!id) return;
    await handleSubmit(onSubmit, onInvalid)();
  };

  const handleClearForm = () => {
    if (isEditMode) {
      toast.warn("Não é possível limpar um prontuário em edição.");
      return;
    }
    navigate("/cadastro", { replace: true });
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
    handleClearForm,
  };
}
