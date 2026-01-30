// src/hooks/useUnidades.ts
import { useEffect, useState } from 'react';
import { getUnidades, Unidades } from '@/services/api';
import { normalizeListResponse } from '@/utils/apiNormalizer';
import { toast } from 'react-toastify';

export function useUnidades() {
    const [unidades, setUnidades] = useState<Unidades[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const response = await getUnidades();
                setUnidades(normalizeListResponse<Unidades>(response));
            } catch (err: any) {
                toast.error(err?.message ?? 'Erro ao carregar unidades');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const getUnitName = (unitId?: number | null) =>
        unidades.find(u => u.id === unitId)?.name ?? 'Não atribuída';

    return {
        unidades,
        loading,
        getUnitName,
    };
}
