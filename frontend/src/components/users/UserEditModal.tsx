// frontend/src/components/users/UserEditModal.tsx

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { updateUser, User } from '@/services/api'; 

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  nome_completo: z.string().min(3, "O nome completo é obrigatório."),
  cargo: z.string().min(3, "O cargo é obrigatório."),
  username: z.string().min(3, "O nome de usuário é obrigatório."),
  role: z.string().min(1, "O perfil é obrigatório."),
});
type FormData = z.infer<typeof formSchema>;

interface UserEditModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// 📌 Mapeamento dos Perfis ATUALIZADO com níveis de escolaridade (SUAS)
const PROFILE_OPTIONS = [
    { value: "tecnico_superior", label: "Técnico de Nível Superior" },
    { value: "tecnico_medio", label: "Técnico de Nível Médio" },
    { value: "coordenador", label: "Coordenador(a) da Unidade" },
    { value: "gestor", label: "Secretário(a) / Gestor Geral" },
    { value: "vigilancia", label: "Vigilância Socioassistencial" },
    // Adicione o 'admin' se ele for usado em alguma tela, mesmo que seja um perfil de gestor
    { value: "admin", label: "Administrador do Sistema" },
];

export default function UserEditModal({ user, isOpen, onClose, onSuccess }: UserEditModalProps) {
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (user) {
        // Mapeamento inverso para garantir que o valor interno (ex: 'tecnico') seja o valor do campo.
        // Se a role antiga for "tecnico", definiremos como "tecnico_superior" para o formulário.
        const mappedRole = user.role === 'tecnico' ? 'tecnico_superior' : user.role;
        
      reset({
        nome_completo: user.nome_completo,
        cargo: user.cargo,
        username: user.username,
        role: mappedRole, // Usando o valor mapeado
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    
    // ⭐️ CORREÇÃO CRÍTICA: Incluir o unit_id original no payload ⭐️
    // O Back-end (PUT /users/:id) espera todos os campos modificáveis, 
    // incluindo unit_id, para evitar perda de dados.
    const finalPayload = {
        ...data,
        unit_id: user.unit_id, // Preserva o ID da unidade de lotação original
    };

    try {
      // Enviamos o payload COMPLETO, incluindo o unit_id.
      await updateUser(user.id, finalPayload); 
      toast.success(`Servidor atualizado com sucesso!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(`Falha ao atualizar servidor: ${error.message}`);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Servidor: {user.nome_completo}</DialogTitle> 
          <DialogDescription>Altere as informações do servidor abaixo. (Unidade Atual: {user.unit_id === null ? 'N/A' : user.unit_id})</DialogDescription> 
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-2"><Label htmlFor="nome_completo">Nome Completo</Label><Input id="nome_completo" {...register('nome_completo')} /><p className="text-sm text-red-500">{errors.nome_completo?.message}</p></div>
            <div className="space-y-2"><Label htmlFor="cargo">Cargo/Função</Label><Input id="cargo" {...register('cargo')} /><p className="text-sm text-red-500">{errors.cargo?.message}</p></div>
            <div className="space-y-2"><Label htmlFor="username">Nome de Usuário</Label><Input id="username" {...register('username')} /><p className="text-sm text-red-500">{errors.username?.message}</p></div>
            <div className="space-y-2">
                <Label>Perfil</Label>
                <Controller
                    control={control}
                    name="role"
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Selecione o novo perfil..." /></SelectTrigger>
                            <SelectContent>
                                {/* 📌 USO DO MAPEAMENTO DE NOMENCLATURA SUAS */}
                                {PROFILE_OPTIONS.map(p => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    )}
                />
                 <p className="text-sm text-red-500">{errors.role?.message}</p>
            </div>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}