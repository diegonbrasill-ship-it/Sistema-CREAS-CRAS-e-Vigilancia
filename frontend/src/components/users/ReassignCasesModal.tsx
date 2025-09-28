// frontend/src/components/users/ReassignCasesModal.tsx

import { useState } from 'react';
import { toast } from 'react-toastify';
import { reassignUserCases, User } from '@/services/api';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

interface ReassignCasesModalProps {
  fromUser: User | null;
  allUsers: User[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReassignCasesModal({ fromUser, allUsers, isOpen, onClose, onSuccess }: ReassignCasesModalProps) {
  const [toUserId, setToUserId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!fromUser || !toUserId) {
        toast.warn("Por favor, selecione um técnico de destino.");
        return;
    }
    setIsSaving(true);
    try {
        const response = await reassignUserCases(fromUser.id, parseInt(toUserId, 10));
        toast.success(response.message || "Casos reatribuídos com sucesso!");
        onSuccess();
        onClose();
    } catch (error: any) {
        toast.error(`Falha ao reatribuir casos: ${error.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  if (!fromUser) return null;
  
  const targetTechnicians = allUsers.filter(u => u.is_active && (u.role === 'tecnico' || u.role ==='coordenador') && u.id !== fromUser.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reatribuir Casos</DialogTitle>
          <DialogDescription>
            Selecione um novo técnico para assumir todos os casos atualmente sob a responsabilidade de <strong>{fromUser.nome_completo}</strong>. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
            <Label htmlFor="target-user">Reatribuir para:</Label>
            <Select onValueChange={setToUserId}>
                <SelectTrigger id="target-user">
                    <SelectValue placeholder="Selecione o novo técnico responsável..." />
                </SelectTrigger>
                <SelectContent>
                    {targetTechnicians.map(user => (
                        <SelectItem key={user.id} value={String(user.id)}>
                            {user.nome_completo} ({user.cargo})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Reatribuição
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}