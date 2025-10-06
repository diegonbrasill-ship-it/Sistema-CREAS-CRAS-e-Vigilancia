// frontend/src/pages/GerenciarUsuarios.tsx

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getUsers, createUser, updateUserStatus, reassignUserCases, User } from '../services/api'; 
import { useAuth } from '../contexts/AuthContext'; 

// Importações de UI e ícones
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Edit, Power, PowerOff, Users as UsersIcon } from 'lucide-react';
import UserEditModal from '@/components/users/UserEditModal';
import ReassignCasesModal from '@/components/users/ReassignCasesModal';

// ========================================================
// 📌 Módulos de Mapeamento de Nomenclatura
// ========================================================

const UNIDADES_DISPONIVEIS = [
    { id: 1, nome: 'CREAS' },
    { id: 2, nome: 'Vigilancia SocioAssistencial' }, 
    { id: 3, nome: 'CRAS Geralda Medeiros' },
    { id: 4, nome: 'CRAS Mariana Alves' },
    { id: 5, nome: 'CRAS Matheus leitao' },
    { id: 6, nome: 'CRAS Severina Celestino' },
    { id: 7, nome: 'Centro POP' },
    { id: 8, nome: 'Conselho Tutelar Norte' },
];

const PROFILE_OPTIONS = [
    { value: "tecnico_superior", label: "Técnico de Nível Superior" },
    { value: "tecnico_medio", label: "Técnico de Nível Médio" },
    { value: "coordenador", label: "Coordenador(a) da Unidade" },
    { value: "gestor", label: "Secretário(a) / Gestor Geral" },
    { value: "vigilancia", label: "Vigilância Socioassistencial" },
];

const getProfileLabel = (roleValue: string) => {
    return PROFILE_OPTIONS.find(p => p.value === roleValue)?.label || roleValue;
};

interface NewUserState {
    username: string; password: string; role: string; nome_completo: string; cargo: string;
    unit_id: number | null; 
}


export default function GerenciarUsuarios() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newUser, setNewUser] = useState<NewUserState>({ 
    username: '', 
    password: '', 
    role: PROFILE_OPTIONS[0].value, 
    nome_completo: '', 
    cargo: '', 
    unit_id: UNIDADES_DISPONIVEIS[0]?.id ?? 1 
});
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      const response = await getUsers();
      // 📌 FIX CRÍTICO: Tenta extrair o array de dados de forma segura (como sugerido)
      const usersData = Array.isArray(response) ? response : response?.rows || response?.data || response?.results || [];
      setUsers(usersData);
    } catch (error: any) {
      toast.error(`Erro ao carregar servidores: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchUsers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value } as NewUserState));
  };

  const handleRoleChange = (value: string) => {
    setNewUser(prev => ({ ...prev, role: value }));
  };
  
  const handleUnitChange = (value: string) => {
    const selectedUnitId = value && value !== 'null' ? parseInt(value, 10) : null;
    setNewUser(prev => ({ ...prev, unit_id: selectedUnitId }));
  };

  const handleCreateUser = async () => {
    // Validação
    if (!newUser.username || !newUser.password || !newUser.role || !newUser.nome_completo || !newUser.cargo || newUser.unit_id === null) {
      toast.warn('Todos os campos (incluindo Unidade) são obrigatórios.');
      return;
    }
    
    setIsSaving(true);
    try {
      await createUser(newUser); 
      toast.success(`Servidor "${newUser.nome_completo}" criado com sucesso!`);
      
      // 📌 FIX FINAL: Recarrega a lista DEPOIS do sucesso
      await fetchUsers(); 
      
      // Limpa e reseta o default APÓS a recarga
      setNewUser({ username: '', password: '', role: PROFILE_OPTIONS[0].value, nome_completo: '', cargo: '', unit_id: UNIDADES_DISPONIVEIS[0]?.id ?? 1 });
    } catch (error: any) {
      toast.error(`Erro ao criar servidor: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleToggleUserStatus = async (user: User) => {
    const action = user.is_active ? 'desativar' : 'reativar';
    if (!window.confirm(`Você tem certeza que deseja ${action} o servidor ${user.nome_completo}?`)) {
      return;
    }
    try {
        await updateUserStatus(user.id, !user.is_active);
        toast.success(`Servidor ${action} com sucesso!`);
        fetchUsers();
    } catch (error: any) {
        toast.error(`Falha ao ${action} servidor: ${error.message}`);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };
  
  const openReassignModal = (user: User) => {
    setSelectedUser(user);
    setIsReassignModalOpen(true);
  };

  if (isLoading) {
    return <div className="text-center p-10"><Loader2 className="mx-auto h-8 w-8 animate-spin" /> Carregando servidores...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gestão de Servidores</h1>
      <p className="text-slate-500">Gerencie contas de acesso da equipe do SUAS-Patos/PB. (Sua Unidade: {UNIDADES_DISPONIVEIS.find(u => u.id === user?.unit_id)?.nome || "Não Atribuída"})</p>

      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Servidor</CardTitle>
          <CardDescription>Preencha os dados para criar uma nova credencial e atribua a unidade de trabalho.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2 col-span-2"><Label htmlFor="nome_completo">Nome Completo</Label><Input name="nome_completo" placeholder="Ex: João Paulo da Silva" value={newUser.nome_completo} onChange={handleInputChange} /></div>
            <div className="space-y-2"><Label htmlFor="cargo">Cargo/Função</Label><Input name="cargo" placeholder="Ex: Psicólogo, Assistente Social" value={newUser.cargo} onChange={handleInputChange} /></div>
              
            <div className="space-y-2"><Label htmlFor="unit_id">Unidade</Label><Select value={String(newUser.unit_id ?? '')} onValueChange={handleUnitChange}>
                <SelectTrigger id="unit_id"><SelectValue placeholder="Selecione a Unidade..." /></SelectTrigger>
                <SelectContent>
                    {UNIDADES_DISPONIVEIS.map(u => (<SelectItem key={u.id} value={String(u.id)}>{u.nome}</SelectItem>))}
                </SelectContent>
            </Select><p className="text-xs text-red-500">O gestor pode criar contas em qualquer unidade.</p></div>

            <div className="space-y-2"><Label htmlFor="username">Nome de Usuário</Label><Input name="username" placeholder="ex: joao.silva" value={newUser.username} onChange={handleInputChange} /></div>
            <div className="space-y-2"><Label htmlFor="password">Senha Provisória</Label><Input name="password" type="password" placeholder="••••••••" value={newUser.password} onChange={handleInputChange} /></div>
            <div className="space-y-2"><Label htmlFor="role">Perfil de Acesso</Label><Select value={newUser.role} onValueChange={handleRoleChange}><SelectTrigger id="role"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>
                {PROFILE_OPTIONS.map(p => (<SelectItem key={p.value} value={p.label}>{p.label}</SelectItem>))}
            </SelectContent></Select></div>
          </div>
          <Button onClick={handleCreateUser} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Criar Servidor
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Servidores Cadastrados</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome Completo</TableHead>
                <TableHead>Cargo/Função</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Unidade</TableHead> 
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.nome_completo}</TableCell>
                  <TableCell>{user.cargo}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{getProfileLabel(user.role)}</TableCell> 
                    <TableCell>{UNIDADES_DISPONIVEIS.find(u => u.id === user.unit_id)?.nome}</TableCell> 
                  <TableCell><Badge variant={user.is_active ? 'default' : 'destructive'}>{user.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEditModal(user)}>
                        <Edit className="mr-2 h-4 w-4" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleToggleUserStatus(user)}>
                        {user.is_active ? <PowerOff className="mr-2 h-4 w-4 text-red-500" /> : <Power className="mr-2 h-4 w-4 text-green-500" />}
                        {user.is_active ? 'Desativar' : 'Reativar'}
                    </Button>
                    {!user.is_active && (
                         <Button variant="secondary" size="sm" onClick={() => openReassignModal(user)}>
                            <UsersIcon className="mr-2 h-4 w-4" /> Reatribuir Casos
                        </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <UserEditModal
        user={selectedUser}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
            setIsEditModalOpen(false);
            fetchUsers();
        }}
      />
      <ReassignCasesModal
        fromUser={selectedUser}
        allUsers={users}
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        onSuccess={() => {
            setIsReassignModalOpen(false);
            fetchUsers();
        }}
      />
    </div>
  );
}