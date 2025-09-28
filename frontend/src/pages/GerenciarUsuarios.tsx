// frontend/src/pages/GerenciarUsuarios.tsx

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getUsers, createUser, updateUserStatus, reassignUserCases, User } from '../services/api';

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

export default function GerenciarUsuarios() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: '', nome_completo: '', cargo: '' });
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      const usersData = await getUsers();
      setUsers(usersData);
    } catch (error: any) {
      toast.error(`Erro ao carregar usuários: ${error.message}`);
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
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setNewUser(prev => ({ ...prev, role: value }));
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.role || !newUser.nome_completo || !newUser.cargo) {
      toast.warn('Todos os campos são obrigatórios.');
      return;
    }
    setIsSaving(true);
    try {
      await createUser(newUser);
      toast.success(`Usuário "${newUser.username}" criado com sucesso!`);
      setNewUser({ username: '', password: '', role: '', nome_completo: '', cargo: '' });
      fetchUsers();
    } catch (error: any) {
      toast.error(`Erro ao criar usuário: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleToggleUserStatus = async (user: User) => {
    const action = user.is_active ? 'desativar' : 'reativar';
    if (!window.confirm(`Você tem certeza que deseja ${action} o usuário ${user.username}?`)) {
      return;
    }
    try {
        await updateUserStatus(user.id, !user.is_active);
        toast.success(`Usuário ${action} com sucesso!`);
        fetchUsers();
    } catch (error: any) {
        toast.error(`Falha ao ${action} usuário: ${error.message}`);
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
    return <div className="text-center p-10"><Loader2 className="mx-auto h-8 w-8 animate-spin" /> Carregando usuários...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
      <p className="text-slate-500">Crie, edite e gerencie as contas de acesso para a equipe do RMSUAS.</p>

      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Usuário</CardTitle>
          <CardDescription>Preencha os dados para criar uma nova credencial de acesso.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2"><Label htmlFor="nome_completo">Nome Completo</Label><Input name="nome_completo" placeholder="Ex: João Paulo da Silva" value={newUser.nome_completo} onChange={handleInputChange} /></div>
            <div className="space-y-2"><Label htmlFor="cargo">Cargo/Função</Label><Input name="cargo" placeholder="Ex: Psicólogo, Assistente Social" value={newUser.cargo} onChange={handleInputChange} /></div>
            <div className="space-y-2"><Label htmlFor="username">Nome de Usuário</Label><Input name="username" placeholder="ex: joao.silva" value={newUser.username} onChange={handleInputChange} /></div>
            <div className="space-y-2"><Label htmlFor="password">Senha Provisória</Label><Input name="password" type="password" placeholder="••••••••" value={newUser.password} onChange={handleInputChange} /></div>
            <div className="space-y-2"><Label htmlFor="role">Perfil de Acesso</Label><Select value={newUser.role} onValueChange={handleRoleChange}><SelectTrigger id="role"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="tecnico">Técnico</SelectItem><SelectItem value="coordenador">Coordenador</SelectItem><SelectItem value="gestor">Gestor</SelectItem><SelectItem value="vigilancia">Vigilância</SelectItem></SelectContent></Select></div>
          </div>
          <Button onClick={handleCreateUser} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Criar Usuário
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Usuários Cadastrados</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome Completo</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Perfil</TableHead>
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
                  <TableCell className="capitalize">{user.role}</TableCell>
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