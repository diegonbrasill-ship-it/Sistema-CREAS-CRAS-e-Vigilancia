// src/hooks/useCreateUser.ts
import { useReducer } from 'react';
import { createUser } from '@/services/api';
import { toast } from 'react-toastify';
import { UserRole, PROFILE_OPTIONS } from '@/utils/roles';

export interface NewUserState {
    username: string;
    password: string;
    role: UserRole;
    nome_completo: string;
    cargo: string;
    unit_id: number | null;
}

type Action =
    | { type: 'SET_FIELD'; field: keyof NewUserState; value: any }
    | { type: 'RESET'; payload: NewUserState };

const initialState: NewUserState = {
    username: '',
    password: '',
    role: PROFILE_OPTIONS[0].value,
    nome_completo: '',
    cargo: '',
    unit_id: null,
};

function reducer(state: NewUserState, action: Action): NewUserState {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value };
        case 'RESET':
            return action.payload;
        default:
            return state;
    }
}

export function useCreateUser(onSuccess: () => void) {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [saving, setSaving] = useReducer(() => true, false);

    const submit = async () => {
        if (
            !state.username ||
            !state.password ||
            !state.nome_completo ||
            !state.cargo ||
            !state.unit_id
        ) {
            toast.warn('Todos os campos são obrigatórios');
            return;
        }

        setSaving();
        try {
            await createUser(state);
            toast.success('Servidor criado com sucesso');
            dispatch({ type: 'RESET', payload: initialState });
            onSuccess();
        } catch (err: any) {
            toast.error(err?.message ?? 'Erro ao criar servidor');
        } finally {
            setSaving();
        }
    };

    return {
        state,
        dispatch,
        submit,
        saving,
    };
}
