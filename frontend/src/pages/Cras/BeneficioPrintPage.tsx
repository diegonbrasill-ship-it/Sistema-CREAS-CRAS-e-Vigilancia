// frontend/src/pages/Cras/BeneficioPrintPage.tsx
// ⭐️ NOVO: Componente para gerar a página de impressão do Requerimento e Parecer do B.E. ⭐️

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBeneficioParaImpressao, BeneficioImpressaoData } from '../../services/api';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

// Função auxiliar de formatação (copiada do CrasCaseDetail - pode ser movida para utils)
const formatDataBrasileira = (dataString: string | null | undefined, includeTime = false) => {
    // ... (mesma função de formatação de data) ...
    if (!dataString) return '___/___/_____'; // Placeholder para impressão
    try {
        const date = new Date(dataString);
        // Adiciona tratamento para datas inválidas que podem vir do banco
        if (isNaN(date.getTime())) {
             // Tenta ajustar fuso horário se for string YYYY-MM-DD
             if (typeof dataString === 'string' && dataString.includes('-')) {
                 const parts = dataString.split('-');
                 const adjustedDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                 if (!isNaN(adjustedDate.getTime())) {
                     return adjustedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                 }
             }
             return 'Data Inválida';
        }

        const options: Intl.DateTimeFormatOptions = {
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            timeZone: 'UTC' // Importante para datas sem hora
        };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
            // Ajustar timeZone se necessário para hora local
            // options.timeZone = 'America/Sao_Paulo'; 
        }
        return date.toLocaleDateString('pt-BR', options);
    } catch (e) {
        return 'Data Inválida';
    }
}

export default function BeneficioPrintPage() {
    const { id, unitName } = useParams<{ id: string, unitName: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<BeneficioImpressaoData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setError("ID do benefício não encontrado na URL.");
            setLoading(false);
            return;
        }

        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await getBeneficioParaImpressao(id);
                setData(result);
                 // Pequeno delay para garantir que o DOM atualizou antes de imprimir
                setTimeout(() => {
                    window.print(); 
                }, 500); 
            } catch (err: any) {
                console.error("Erro ao buscar dados para impressão:", err);
                setError(`Erro ao buscar dados: ${err.message}`);
                toast.error(`Erro ao carregar dados para impressão: ${err.message}`);
                // Opcional: Redirecionar de volta ou mostrar botão para voltar
                // setTimeout(() => navigate(`/cras/${unitName}/consulta/${data?.caso_id}`), 3000);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id, navigate, unitName]); // Dependência em 'navigate' e 'unitName' para o redirecionamento (se usado)

    if (loading) {
        return <div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /> Carregando dados para impressão...</div>;
    }

    if (error) {
        return <div className="p-10 text-center text-red-600">Erro: {error}</div>;
    }

    if (!data) {
        return <div className="p-10 text-center text-red-600">Nenhum dado encontrado para este benefício.</div>;
    }

    // --- Estrutura HTML para Impressão ---
    // Use classes CSS simples ou inline styles para formatar como os DOCX.
    // Evite componentes complexos de UI que não imprimem bem.
    // @media print { ... } no seu CSS global pode ajudar a esconder elementos indesejados.
    return (
        <div className="p-4 print:p-0 bg-white font-serif text-sm"> {/* Ajuste a fonte e tamanho base */}
            
            {/* ========================================= */}
            {/* === 1. REQUERIMENTO DE BENEFÍCIO EVENTUAL  === */}
            {/* ========================================= */}
            <div className="mb-8 page-break-after"> {/* Força quebra de página depois, se necessário */}
                {/* Cabeçalho Simples */}
                <h2 className="text-center font-bold text-base mb-1">CRAS GERALDA MEDEIROS</h2>
                <div className="flex justify-between mb-4">
                    <span>Nº do Processo: {data.processo_numero || `BE-${data.beneficio_id}/${new Date(data.data_solicitacao).getFullYear()}`}</span> 
                    {/* Se não houver nº processo, cria um */}
                </div>
                <h1 className="text-center font-bold text-lg mb-4">REQUERIMENTO DE BENEFÍCIO EVENTUAL</h1>

                {/* Dados do Requerente  */}
                <div className="mb-4">
                    <h3 className="font-bold mb-2">DADOS DO REQUERENTE:</h3>
                    <p>Nome: {data.nome_requerente || data.nome || '______________________________________'}</p>
                    <div className="grid grid-cols-3 gap-x-4">
                        <p>DN: {formatDataBrasileira(data.dn_requerente)}</p>
                        <p>RG: {data.rg_requerente || '___________'}</p>
                        <p>CPF: {data.cpf_requerente || '______________'}</p>
                        <p>NIS: {data.nis_requerente || '______________'}</p>
                    </div>
                    <p>Endereço: {data.endereco_requerente || '______________________________'} Bairro: {data.bairro_requerente || '______________'}</p>
                    <p>Ponto referência: {data.ponto_referencia_requerente || '___________________________'}</p>
                    <p>Cidade: {data.cidade_requerente || '___________'}, PB.</p>
                    <p>Telefone: {data.telefone_requerente || '______________'}</p>
                    <p>Família possui cadastro no CRAS: ({data.possui_cadastro_cras ? ' X ' : '   '}) Sim ({data.possui_cadastro_cras ? '   ' : ' X '}) Não</p>
                </div>

                {/* Benefício Solicitado  */}
                <div className="mb-4">
                    <h3 className="font-bold mb-2">Benefício Solicitado:</h3>
                    <p>I - Auxílio Natalidade: ({data.beneficio_solicitado === 'Auxílio Natalidade' ? ' X ' : '   '}) 
                       {data.beneficio_subtipo === 'Kit Enxoval' ? '(X) Kit Enxoval' : '( ) Kit Enxoval'} ou 
                       {data.beneficio_subtipo === 'Pecúnia Enxoval' ? '(X) Pecúnia' : '( ) Pecúnia'} (Art. 4º, §1º Resolução 015/2019-CMAS).
                    </p>
                     <p>II – Auxílio para situação de Vulnerabilidade Temporária: ({data.beneficio_solicitado === 'Vulnerabilidade Temporária' ? ' X ' : '   '}) 
                        ({data.beneficio_subtipo === 'Ajuda de Custo' ? 'X' : ' '}) Ajuda de Custo, 
                        ({data.beneficio_subtipo === 'Itens Básicos' ? 'X' : ' '}) Itens de necessidades básicas, 
                        ({data.beneficio_subtipo === 'Aluguel Social' ? 'X' : ' '}) Aluguel Social, 
                        ({data.beneficio_subtipo === 'Documentação' ? 'X' : ' '}) Documentação civil, 
                        ({data.beneficio_subtipo === 'Uso Cotidiano' ? 'X' : ' '}) Itens de uso cotidiano (Art. 14, Res. 015/2019-CMAS).
                     </p>
                    <p>III – Auxílio para situação de Calamidade Pública: ({data.beneficio_solicitado === 'Calamidade Pública' ? ' X ' : '   '}) Benefícios Materiais e/ou de consumo.</p>
                    {/* Nota: Auxílio Funeral não está no exemplo, mas pode ser adicionado se necessário */}
                </div>

                 <p className="text-xs mb-4">
                     Benefícios Eventuais regulamentados pela Lei Municipal nº 4.909/2017, tendo seus critérios e prazos atualizados pela Resolução 015/2019 do Conselho Municipal de Assistência Social-CMAS.
                 </p>

                <p>Data da Solicitação: {formatDataBrasileira(data.data_solicitacao)}.</p>

                <div className="my-4">
                    <p className="mb-1">OBSERVAÇÃO:</p>
                    <div className="border border-black h-20 p-1 break-words overflow-hidden">
                         {data.observacao || ''}
                    </div>
                </div>

                <p>Parecer: ({data.status_parecer === 'Deferido' ? ' X ' : '   '}) Deferido ({data.status_parecer === 'Indeferido' ? ' X ' : '   '}) Indeferido</p>
                <p>Data do atendimento: {formatDataBrasileira(data.created_at || data.data_solicitado)}.</p> {/* Usa data de criação ou solicitação */}

                {/* Assinaturas */}
                <div className="mt-16 flex justify-around">
                    <div className="text-center">
                        ______________________________________<br/>
                        Assinatura do Requerente
                    </div>
                    <div className="text-center">
                        _______________________________<br/>
                        Assinatura/carimbo do Técnico
                    </div>
                </div>
            </div>

            {/* ============================== */}
            {/* === 2. PARECER SOCIAL - BE  === */}
            {/* ============================== */}
            <div>
                 {/* Cabeçalho Simples */}
                 <div className="text-center mb-4">
                     {/* Pode adicionar a imagem aqui se conseguir configurar a impressão */}
                     <p className="font-bold">PREFEITURA MUNICIPAL DE PATOS – PB</p>
                     <p>SECRETARIA MUNICIPAL DE DESENVOLVIMENTO SOCIAL</p>
                     <p>CENTRO DE REFERÊNCIA DA ASSISTÊNCIA SOCIAL</p>
                     <p className="font-bold">CRAS GERALDA MEDEIROS</p>
                 </div>
                 <h1 className="text-center font-bold text-lg mb-4">SOLICITAÇÃO/CONCESSÃO DE BENEFÍCIO EVENTUAL</h1>

                 {/* Identificação  */}
                 <table className="border border-collapse border-black w-full mb-4 text-left">
                     <tbody>
                         <tr>
                             <td className="border border-black p-1 font-bold">NOME:</td>
                             <td className="border border-black p-1" colSpan={3}>{data.nome || '______________________________'}</td> 
                         </tr>
                         <tr>
                             <td className="border border-black p-1 font-bold">ENDEREÇO:</td>
                             <td className="border border-black p-1" colSpan={3}>{`${data.rua || ''}, ${data.bairro || ''}`}</td>
                         </tr>
                         <tr>
                            <td className="border border-black p-1 font-bold">NIS: {data.nis || '____________'}</td>
                             <td className="border border-black p-1 font-bold">RG: {data.rg || '____________'}</td>
                             <td className="border border-black p-1 font-bold" colSpan={2}>CPF: {data.cpf || '______________'}</td>
                         </tr>
                     </tbody>
                 </table>

                 {/* Breve Relato  */}
                 <div className="mb-4">
                     <h3 className="font-bold text-center mb-2">BREVE RELATO DO CASO</h3>
                     {/* Usar whitespace-pre-wrap para manter quebras de linha do textarea */}
                     <p className="whitespace-pre-wrap">{data.breve_relato || '________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________'}</p> 
                 </div>

                 {/* Parecer Social  */}
                 <div className="mb-4">
                     <h3 className="font-bold text-center mb-2">PARECER SOCIAL</h3>
                     <p className="whitespace-pre-wrap">{data.parecer_social || '________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________'}</p>
                 </div>

                 {/* Dados do Técnico  */}
                 <div className="mt-8 text-center">
                    <p>{data.tecnico_nome || '______________________________'}</p>
                    <p>{data.tecnico_cargo || 'Assistente Social'}</p> {/* Default se não houver cargo */}
                    <p>CRESS {data.tecnico_cress || '___________'}</p>
                 </div>
            </div>
        </div>
    );
}