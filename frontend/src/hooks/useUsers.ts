import { useCallback, useEffect, useState } from "react";
import { getUsers, updateUserStatus, User } from "@/services/api";
import { normalizeListResponse } from "@/utils/apiNormalizer";
import { toast } from "react-toastify";

export function useUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        try {
            const response = await getUsers();
            const usersData = normalizeListResponse<User>(response);
            setUsers(usersData);
        } catch (error: any) {
            toast.error(`Erro ao carregar servidores: ${error.message}`);
        } finally {
            setLoading(false)
        }

    }, []);

    const toggleUserStatus = async (user: User) => {
        const action = user.is_active ? 'desativar' : 'reativar';

        if (!window.confirm(`Deseja ${action} o servidor ${user.nome_completo}?`)) {
            return;
        }
        try {
            await updateUserStatus(user.id, !user.is_active);
            toast.success(`Servidor ${action} com sucesso`);
            fetchUsers();
        } catch (err: any) {
            toast.error(err?.message ?? 'Erro ao alterar status');
        }

    };

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    return {
        users,
        loading,
        fetchUsers,
        toggleUserStatus,
    };
}
