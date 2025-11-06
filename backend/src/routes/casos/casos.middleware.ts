
import { UNIT_ID_CREAS } from "../../utils/constants";

export function anonimizarDadosSeNecessario(
    user: { id: number; role: string; unit_id: number | null },
    data: any
): any {
    const isVigilancia = user.role === 'vigilancia';
    if (!isVigilancia || !data) return data;

    const anonimizarCaso = (caso: any) => {
        const deveAnonimizar = caso.unit_id === UNIT_ID_CREAS;
        if (!deveAnonimizar) return caso;

        const casoAnonimizado = { ...caso };
        const casoId = casoAnonimizado.id || 'XXX';
        casoAnonimizado.nome = `[DADO SIGILOSO - ID: ${casoId}]`;
        delete casoAnonimizado.cpf;
        delete casoAnonimizado.nis;

        if (casoAnonimizado.dados_completos) {
            casoAnonimizado.dados_completos.nome = `[DADO SIGILOSO - ID: ${casoId}]`;
            delete casoAnonimizado.dados_completos.cpf;
            delete casoAnonimizado.dados_completos.nis;
        }

        return casoAnonimizado;
    };

    return Array.isArray(data) ? data.map(anonimizarCaso) : anonimizarCaso(data);
}