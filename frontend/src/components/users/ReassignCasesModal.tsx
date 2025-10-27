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
        toast.warn("Por favor, selecione um servidor de destino.");
        return;
    }
    setIsSaving(true);
    try {
        // O Back-end já checa a unit_id, mas a chamada é feita com os IDs.
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
  
  // 📌 FILTRO CRÍTICO: Garantindo que o destino seja ATIVO, OPERACIONAL e na MESMA UNIDADE
  const validOperationalRoles = ['tecnico', 'vigilancia'];
  const targetTechnicians = allUsers.filter(u => 
    u.is_active && // Deve estar ativo
    u.unit_id === fromUser.unit_id && // Deve ser da mesma unidade do servidor de origem
    validOperationalRoles.includes(u.role) && // Deve ser um perfil operacional
    u.id !== fromUser.id // Não pode ser ele mesmo
);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reatribuir Casos</DialogTitle>
          <DialogDescription>
            Selecione um novo servidor de referência (técnico ou vigilância) para assumir todos os casos atualmente sob a responsabilidade de <strong>{fromUser.nome_completo}</strong> (Unidade {fromUser.unit_id}).
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
            <Label htmlFor="target-user">Reatribuir para:</Label>
            <Select onValueChange={setToUserId}>
                <SelectTrigger id="target-user">
                    <SelectValue placeholder="Selecione o novo servidor responsável..." />
                </SelectTrigger>
                <SelectContent>
                    {targetTechnicians.map(user => (
                        <SelectItem key={user.id} value={String(user.id)}>
                            {user.nome_completo} ({user.cargo} - Unit ID: {user.unit_id})
                        </SelectItem>
                    ))}
                    {targetTechnicians.length === 0 && (
                        <div className="p-2 text-sm text-center text-red-500">
                            Nenhum servidor operacional ativo encontrado nesta unidade.
                        </div>
                    )}
                </SelectContent>
            </Select>
        </div>
        <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving || targetTechnicians.length === 0 || !toUserId}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Reatribuição
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}