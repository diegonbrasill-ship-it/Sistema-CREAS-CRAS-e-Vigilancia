"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.anonimizarDadosSeNecessario = anonimizarDadosSeNecessario;
const constants_1 = require("../../utils/constants");
function anonimizarDadosSeNecessario(user, data) {
    const isVigilancia = user.role === 'vigilancia';
    if (!isVigilancia || !data)
        return data;
    const anonimizarCaso = (caso) => {
        const deveAnonimizar = caso.unit_id === constants_1.UNIT_ID_CREAS;
        if (!deveAnonimizar)
            return caso;
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
