# Inventário do Cadastro Legacy

Inventário do PR-0 descrito em `docs/migrar_cadastro_execução.md`, tomando como base o estado real do frontend em `2026-03-22`.

## Escopo e critério

- Fonte analisada: `src/pages/Cadastro/*`, `src/pages/Dashboard.tsx`, `src/pages/PainelVigilancia/PainelVigilancia.tsx`, `src/pages/Consulta.tsx`, `src/pages/CasoDetalhe.tsx`, `src/components/DrillDown/ListaCasosModal.tsx`, `src/services/api.ts` e `src/pages/Cras/CrasProntuario.tsx`.
- Critério usado:
  - considerei como legado as chaves históricas do Cadastro, aliases de compatibilidade e nomes divergentes que mantêm o contrato misto atual;
  - tratei `data_cad` e `tec_ref` como nomes atuais do protocolo top-level do caso no frontend, e portanto os aliases problemáticos aqui são `dataCad` e `tecRef`;
  - conforme `docs/migrar_cadastro_execução.md`, `canalDenuncia` foi reclassificada como nome principal do protocolo; o alias a remover é `canalOrigem`.

## Tabela principal

| chave_legada | chave_canonica_equivalente | origem | consumidores_no_FE | impacto | ação |
| --- | --- | --- | --- | --- | --- |
| `tipo_violencia` | `tipoViolencia` | Cadastro, aba `1. Atendimento`, campo "Tipo de Violência (legado)" | `src/pages/Cadastro/schema.ts`, `src/pages/Cadastro/components/TabAtendimento.tsx`, `src/pages/Cadastro/adapters.ts`, `src/pages/PainelVigilancia/PainelVigilancia.tsx`, `src/pages/Dashboard.tsx`, `src/pages/CasoDetalhe.tsx` | filtros e drill-down de violência, gráfico de violações, exibição duplicada no detalhe, payload create/update com dual-write | adaptar consumidores para `tipoViolencia` e remover leitura/escrita de `tipo_violencia` |
| `local_ocorrencia` | `bairro` | Cadastro, aba `1. Atendimento`, campo "Local da Ocorrência" | `src/pages/Cadastro/schema.ts`, `src/pages/Cadastro/components/TabAtendimento.tsx`, `src/pages/Cadastro/adapters.ts`, `src/pages/CasoDetalhe.tsx`, `src/pages/Cadastro/components/TabVitima.tsx` | o campo legado deixa de existir como atributo próprio; a referência territorial passa a vir do bairro da vítima coletado na aba Vítima | remover `local_ocorrencia` de UI, schema e adapters e adaptar o consumo para usar `bairro` como substituto |
| `corEtnia` | `racaCor` | Cadastro, aba `2. Vítima`, campo "Cor/Etnia" | `src/pages/Cadastro/schema.ts`, `src/pages/Cadastro/components/TabVitima.tsx`, `src/pages/Cadastro/adapters.ts`, `src/pages/Dashboard.tsx`, `src/pages/CasoDetalhe.tsx`, `src/pages/Cras/CrasProntuario.tsx` | gráfico e drill-down de cor/etnia, edição de caso, detalhe e divergência com enum canônico | adaptar consumidores para `racaCor` e remover compat `corEtnia` |
| `canalOrigem` | `canalDenuncia` | Cadastro, aba `1. Atendimento`, bloco canônico PR-4 | `src/pages/Cadastro/schema.ts`, `src/pages/Cadastro/components/TabAtendimento.tsx`, `src/pages/Cadastro/adapters.ts` | mantém o Cadastro com dois nomes para o mesmo atributo e força alias no payload | remover `canalOrigem` da UI/schema/adapters e manter somente `canalDenuncia` |
| `canalDenuncia` | `canalDenuncia` (manter) | Cadastro, aba `5. Encaminhamentos`, campo "Canal de denúncia" | `src/pages/Cadastro/schema.ts`, `src/pages/Cadastro/components/TabEncaminhamentos.tsx`, `src/pages/Cadastro/adapters.ts`, `src/pages/PainelVigilancia/PainelVigilancia.tsx`, `src/pages/Dashboard.tsx`, `src/pages/CasoDetalhe.tsx`, `src/services/api.ts` | KPI, gráfico e filtros por canal dependem desse nome; hoje ele concorre com `canalOrigem` | manter como nome de contrato e eliminar a duplicidade com `canalOrigem` |
| `dataDenuncia` | `REMOVIDO` | Cadastro, aba `1. Atendimento`, campo "Data da denúncia" | `src/pages/Cadastro/schema.ts`, `src/pages/Cadastro/components/TabAtendimento.tsx`, `src/pages/Cadastro/adapters.ts`, `src/pages/CasoDetalhe.tsx` | campo sem consumidor relevante fora do Cadastro; aumenta payload e detalhe sem necessidade no plano atual | remover de UI, schema, adapter de leitura e adapter de escrita |
| `dependeFinanceiro` | atributo equivalente da aba `6. Agressor` | Cadastro, aba `4. Saúde`, campo "Depende financeiramente do agressor?" | `src/pages/Cadastro/schema.ts`, `src/pages/Cadastro/components/TabSaude.tsx`, `src/pages/Cadastro/adapters.ts`, `src/pages/Dashboard.tsx`, `src/pages/CasoDetalhe.tsx`, `src/pages/Cadastro/components/TabAgressor.tsx` | o campo legado sai da aba Saúde; o drill-down/KPI de dependência financeira no Dashboard precisa passar a usar o atributo equivalente coletado na aba do Agressor | remover do Cadastro na aba Saúde e adaptar o drill-down `dependencia_financeira` para ler o atributo equivalente da aba Agressor |
| `notificacaoSINAM` | `notificacaoSINAN` | Cadastro, aba `5. Encaminhamentos`, campo "Notificação no SINAM?" | `src/pages/Cadastro/schema.ts`, `src/pages/Cadastro/components/TabEncaminhamentos.tsx`, `src/pages/Cadastro/adapters.ts`, `src/pages/Dashboard.tsx`, `src/pages/CasoDetalhe.tsx` | KPI "Notificados no SINAN", filtros e detalhe usam o typo legado; adapter ainda lê fallback `notificacaoSINAN` | padronizar nome e remover o typo legado do contrato |
| `dataCad` | `data_cad` | contrato de listagem e drill-down de casos | `src/pages/PainelVigilancia/PainelVigilancia.tsx`, `src/pages/Dashboard.tsx`, `src/components/DrillDown/ListaCasosModal.tsx`, `src/pages/Cras/CrasProntuario.tsx`, `src/pages/Cadastro/adapters.ts` | modal de casos, filtro de casos novos e respostas de lista dependem de alias camelCase diferente do detalhe/consulta | padronizar consumidores para `data_cad` ou normalizar a resposta na API antes de chegar às telas |
| `tecRef` | `tec_ref` | contrato de listagem, drill-down e integrações auxiliares | `src/pages/PainelVigilancia/PainelVigilancia.tsx`, `src/pages/Dashboard.tsx`, `src/components/DrillDown/ListaCasosModal.tsx`, `src/components/demandas/DemandaFormModal.tsx`, `src/pages/Cras/CrasProntuario.tsx`, `src/pages/Cadastro/adapters.ts`, `src/services/api.ts` | listas e busca de técnico dependem do alias camelCase; `DemandaFormModal` inclusive parseia a string para autoatribuição | padronizar para `tec_ref` ou normalizar a resposta de lista antes do consumo |
| `tipoMoradia` | `tipoResidencia` + `formaOcupacao` + `materialConstrucao` + `valorAluguel` | Cadastro, aba `3. Família`, campo "Tipo de Moradia" | `src/pages/Cadastro/schema.ts`, `src/pages/Cadastro/components/TabFamilia.tsx`, `src/pages/Cadastro/adapters.ts`, `src/pages/Cadastro/components/TabMoradia.tsx`, `src/pages/CasoDetalhe.tsx` | coexistem dois modelos de moradia no mesmo formulário; isso duplica coleta e polui o detalhe | remover `tipoMoradia` e manter somente o bloco canônico de moradia |

## Dead-keys

Chaves/aliases já praticamente mortos no frontend e bons candidatos a remoção imediata quando os PRs seguintes forem executados:

- `notificacaoSINAN`: só aparece como fallback de leitura em `src/pages/Cadastro/adapters.ts`; não há campo de UI nem consumidor direto com esse nome.
- `localOcorrencia`: existe apenas como alias transitório em `src/pages/Cadastro/adapters.ts`; a UI e os consumidores reais ainda usam `local_ocorrencia`.

Chaves com remoção explícita já definida no plano, mas que ainda estão vivas no frontend atual:

- `local_ocorrencia`
- `dataDenuncia`
- `dependeFinanceiro`

## Valores legados sem enum canônico estável

Esses pontos não são chaves diferentes, mas mantêm a base em estado híbrido e precisam ser considerados na adaptação:

- `Sim` / `Não` continuam sendo o padrão persistido para `recebePBF`, `recebeBE`, `membrosCadUnico`, `membroCarcerario`, `membroSocioeducacao`, `vitimaPCD`, `tratamentoSaude`, `encaminhamento`, `inseridoPAEFI`, `reincidente`, `coabitaComAgressor` e `dependeFinanceiro`.
- `sexo` ainda usa só `Masculino` / `Feminino`, enquanto o schema canônico planejado prevê outra enumeração e opção adicional.
- `escolaridade` no fluxo atual continua reduzida a duas opções em `src/pages/Cadastro/options.ts`.
- `tipo_violencia` cobre apenas `Física`, `Psicológica` e `Sexual`, enquanto o bloco canônico adiciona `PATRIMONIAL` e `MORAL`.

## Observações relevantes encontradas no código

- Há um defeito real no create payload em `src/pages/Cadastro/adapters.ts`: `local_ocorrencia` está sendo preenchido com o valor de `tipo_violencia`, não com o valor de `local_ocorrencia`.
- `src/pages/Cadastro/components/TabEncaminhamentos.tsx` usa `SIM_NAO_OPTIONS` para `canalDenuncia`; na prática, o campo hoje só oferece `Sim` e `Não`, o que degrada o dado e contamina qualquer KPI/gráfico por canal.
- `src/pages/CasoDetalhe.tsx` achata `dados_completos` e exibe tudo genericamente; qualquer convivência entre legado e canônico aparece duplicada para o usuário final.

## Lista de arquivos afetados

Arquivos diretamente afetados pela migração do Cadastro:

- `src/pages/Cadastro/schema.ts`
- `src/pages/Cadastro/adapters.ts`
- `src/pages/Cadastro/useCadastroForm.ts`
- `src/pages/Cadastro/components/TabAtendimento.tsx`
- `src/pages/Cadastro/components/TabVitima.tsx`
- `src/pages/Cadastro/components/TabFamilia.tsx`
- `src/pages/Cadastro/components/TabSaude.tsx`
- `src/pages/Cadastro/components/TabEncaminhamentos.tsx`
- `src/pages/Cadastro/components/TabMoradia.tsx`

Consumidores no frontend que precisam ser revistos após o corte do legado:

- `src/pages/Dashboard.tsx`
- `src/pages/PainelVigilancia/PainelVigilancia.tsx`
- `src/pages/Consulta.tsx`
- `src/pages/CasoDetalhe.tsx`
- `src/components/DrillDown/ListaCasosModal.tsx`
- `src/services/api.ts`
- `src/components/demandas/DemandaFormModal.tsx`

Área paralela com drift semelhante, fora do fluxo principal de Cadastro CREAS, mas afetada pelos mesmos nomes:

- `src/pages/Cras/CrasProntuario.tsx`
