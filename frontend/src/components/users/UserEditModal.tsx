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

export default function UserEditModal({ user, isOpen, onClose, onSuccess }: UserEditModalProps) {
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (user) {
      reset({
        nome_completo: user.nome_completo,
        cargo: user.cargo,
        username: user.username,
        role: user.role,
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    try {
      await updateUser(user.id, data);
      toast.success("Usuário atualizado com sucesso!");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(`Falha ao atualizar usuário: ${error.message}`);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Usuário: {user.nome_completo}</DialogTitle>
          <DialogDescription>Altere as informações do usuário abaixo.</DialogDescription>
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
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="tecnico">Técnico</SelectItem>
                                <SelectItem value="coordenador">Coordenador</SelectItem>
                                <SelectItem value="gestor">Gestor</SelectItem>
                                <SelectItem value="vigilancia">Vigilância</SelectItem>
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