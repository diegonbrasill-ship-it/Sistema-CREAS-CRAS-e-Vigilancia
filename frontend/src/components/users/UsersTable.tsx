// src/components/users/UsersTable.tsx
import { User } from '@/services/api';
import { PROFILE_LABELS } from '@/utils/roles';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Power, PowerOff, Users } from 'lucide-react';

interface Props {
    users: User[];
    getUnitName: (id?: number | null) => string;
    onEdit(user: User): void;
    onToggleStatus(user: User): void;
    onReassign(user: User): void;
}

export function UsersTable({
    users,
    getUnitName,
    onEdit,
    onToggleStatus,
    onReassign,
}: Props) {
    const getProfileLabel = (role: string) =>
        PROFILE_LABELS[role as keyof typeof PROFILE_LABELS] || role || 'Não identificado';

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.map(user => (
                    <TableRow key={user.id}>
                        <TableCell>{user.nome_completo}</TableCell>
                        <TableCell>{user.cargo}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{getProfileLabel(user.role)}</TableCell>
                        <TableCell>{getUnitName(user.unit_id)}</TableCell>
                        <TableCell>
                            <Badge variant={user.is_active ? 'default' : 'destructive'}>
                                {user.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" onClick={() => onEdit(user)}>
                                <Edit className="h-4 w-4 mr-1" /> Editar
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onToggleStatus(user)}
                            >
                                {user.is_active ? (
                                    <PowerOff className="h-4 w-4 mr-1 text-red-500" />
                                ) : (
                                    <Power className="h-4 w-4 mr-1 text-green-500" />
                                )}
                                {user.is_active ? 'Desativar' : 'Reativar'}
                            </Button>
                            {!user.is_active && (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => onReassign(user)}
                                >
                                    <Users className="h-4 w-4 mr-1" />
                                    Reatribuir
                                </Button>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
