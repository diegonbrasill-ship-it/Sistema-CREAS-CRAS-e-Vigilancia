# Plano de Migracao do Drill-down de Dashboard e Vigilancia

Documento de execucao para migrar o drill-down do Dashboard e do Painel de Vigilancia para o contrato canonico `GET /api/casos`, tomando como base:

- `docs/arquitetura_front.md`
- `docs/cadastro/frontend-migracao-drilldown-vigilancia.md`
- `docs/cadastro/inventario_cadastro_legacy.md`

Data de referencia da analise: `2026-03-23`.

## 1. Objetivo

Padronizar o drill-down de Dashboard e Vigilancia para consumir apenas `GET /api/casos`, removendo:

- a dependencia da rota `GET /api/vigilancia/casos-filtrados`
- a emissao de query params legados como formato principal
- a duplicacao de logica de traducao de filtros entre telas

Ao final da migracao:

- Dashboard e Vigilancia devem usar o mesmo builder de query
- o modal de drill-down deve continuar funcionando com o shape atual de lista
- o frontend deve parar de tratar aliases legados como contrato principal

## 2. Estado atual encontrado no frontend

Os pontos principais de acoplamento hoje sao:

- `src/services/api.ts`
  - `getCasosFiltrados` ainda troca o endpoint conforme `filters.origem`
  - `FiltrosCasos` ainda modela o contrato legado com `filtro` e `valor`
  - `FiltrosBase` ainda usa `tecRef`, nao `search` e `searchBy`
- `src/pages/Dashboard.tsx`
  - drill-down ainda envia `filtro` e `valor`
  - filtros de tela usam `mes`, `tecRef` e `bairro`
  - cards e graficos ainda usam aliases como `por_bairro` e `por_violencia`
- `src/pages/PainelVigilancia/PainelVigilancia.tsx`
  - ainda depende de `getCasosFiltrados({ origem: 'vigilancia' })`
  - mantem mapa legado com `por_bairro`, `por_canal`, `por_violencia`
  - usa o caso especial `ultimos_30_dias`
- `src/components/DrillDown/ListaCasosModal.tsx`
  - ja consome `id`, `nome`, `tec_ref`, `data_cad`, `bairro`
  - nao exige mudanca estrutural para a migracao
- `src/pages/Consulta.tsx`
  - continua usando `getCasosFiltrados` com `filtro` e `valor`
  - nao faz parte direta da migracao de Dashboard e Vigilancia, mas compartilha o mesmo service e por isso precisa ser isolada para nao quebrar

## 3. Principios de implementacao

Durante a migracao, seguir estas regras:

- a query canonica de drill-down deve ser montada em uma unica camada
- Dashboard e Vigilancia nao devem concatenar query string manualmente
- o modal nao deve conhecer aliases legados nem regras de traducao
- `status=todos` deve ser explicitamente enviado sempre que o indicador precisar da base completa
- qualquer insight sem correspondencia clara no contrato de `GET /api/casos` deve virar pendencia de contrato, nao gambiarra local
- a compatibilidade com `filtro/valor` deve ficar temporariamente isolada apenas onde ainda for inevitavel

## 4. Escopo desta migracao

### Em escopo

- drill-down do Dashboard
- drill-down do Painel de Vigilancia
- camada de service/helper responsavel pela montagem da query de drill-down
- remocao do uso de `/api/vigilancia/casos-filtrados` nesses fluxos

### Fora de escopo imediato

- reescrita do modulo `Consulta`
- migracao de flows do CRAS
- refatoracao completa do modelo legado de filtros em todo o projeto
- alteracoes de backend para filtros ainda nao suportados, exceto se forem necessarias para fechar uma pendencia explicita

## 5. Resultado esperado por area

### API/service

- existir um builder canonico para query de casos
- existir uma chamada de listagem para `GET /api/casos` sem branch por origem
- a compatibilidade legada, se mantida, deve ficar separada da chamada canonica

### Dashboard

- cada clique de card ou grafico deve produzir params compativeis com `GET /api/casos`
- filtros de tela devem ser traduzidos para `search`, `searchBy`, `mes`, `status` e `filters[...]`
- nao deve existir mais envio de `filtro/valor` como formato principal

### Vigilancia

- cada clique deve resolver para `GET /api/casos`
- nao deve existir mais uso de `origem: 'vigilancia'`
- a rota `/api/vigilancia/casos-filtrados` deve sair completamente do fluxo

### Modal

- deve continuar recebendo array de casos com `id`, `nome`, `tec_ref`, `data_cad`, `bairro`, `unit_id`

## 6. Etapa 1 - Inventario real do drill-down

### Objetivo

Levantar todos os pontos de entrada reais do drill-down de Dashboard e Vigilancia e registrar a traducao explicita para o contrato canonico.

### Motivacao

O documento `frontend-migracao-drilldown-vigilancia.md` exige um inventario por origem da interacao. Sem isso, a migracao fica incompleta e corre o risco de:

- cobrir apenas casos triviais
- esquecer combinacoes de filtros
- manter comportamentos implicitos sem documentacao
- mascarar dependencias do backend legado

### Tarefas

1. Mapear no Dashboard:
   - cards clicaveis
   - graficos com `onClick`
   - filtros ativos da tela que impactam a query do drill-down
2. Mapear na Vigilancia:
   - cards KPI clicaveis
   - mapa territorial
   - graficos de fontes de acionamento
   - graficos de perfil de violacoes
3. Para cada ponto, registrar:
   - tela
   - componente
   - evento clicado
   - query atual emitida
   - endpoint atual
   - campo backend atual
   - contrato novo
   - transformacao de valor
   - necessidade de `status=todos`
   - observacoes ou pendencias

### Artefato esperado

Uma matriz de inventario no proprio doc de migracao ou em anexo, com ao menos os cenarios abaixo:

| Tela | Origem | Query atual | Endpoint atual | Contrato novo | `status=todos` | Observacoes |
| ---- | ------ | ----------- | -------------- | ------------- | --------------- | ----------- |
| Dashboard | Casos por bairro | `filtro=por_bairro&valor=Centro` | `/api/casos` | `filters[bairro]=Centro` | sim, quando o card nao for apenas ativos | sem transformacao |
| Dashboard | Busca textual por tecnico | `tecRef=Maria Silva` + query legada de drill-down | `/api/casos` | `search=Maria Silva&searchBy=tec_ref` | depende do indicador | traduzir filtro de tela |
| Dashboard | Casos por sexo | `filtro=sexo&valor=Masculino` | `/api/casos` | `filters[sexo]=MASCULINO` | sim | normalizar enum |
| Vigilancia | Fonte de acionamento | `filtro=por_canal&valor=DISQUE_100_180` | `/api/vigilancia/casos-filtrados` | `filters[canalDenuncia]=DISQUE_100_180` | sim | remove bug historico |
| Vigilancia | Reincidencia | `filtro=reincidentes&valor=Sim` | `/api/vigilancia/casos-filtrados` | `filters[reincidente]=Sim` | sim | nome canonico |

### Criterio de aceite da etapa

- todo clique real de drill-down esta inventariado
- toda query atual tem traducao explicita
- toda pendencia de contrato esta visivel antes da implementacao

### Resultado executado da Etapa 1

O inventario abaixo foi fechado contra o codigo atual em:

- `src/pages/Dashboard.tsx`
- `src/pages/PainelVigilancia/PainelVigilancia.tsx`
- `src/services/api.ts`

#### 6.1 Regras gerais observadas no codigo atual

##### Dashboard

Todos os drill-downs do Dashboard hoje passam por `handleDrillDown` e chamam:

```http
GET /api/casos
```

Formato atual da query:

```http
GET /api/casos?
  mes=<mesSelecionado>&
  tecRef=<tecnicoSelecionado>&
  bairro=<bairroSelecionado>&
  filtro=<acao-ou-campo>&
  valor=<valor-resolvido>
```

Observacoes:

- `mes`, `tecRef` e `bairro` sao sempre herdados do estado atual da tela, quando preenchidos
- para acoes como `todos` e `novos_no_mes`, o Dashboard hoje nao envia `filtro` nem `valor`
- o Dashboard hoje nao envia `status=todos`

##### Vigilancia

Todos os drill-downs da Vigilancia hoje passam por `handleDrillDown` e chamam:

```http
GET /api/vigilancia/casos-filtrados
```

Formato atual da query:

```http
GET /api/vigilancia/casos-filtrados?
  filtro=<acao-mapeada>&
  valor=<valor-resolvido>
```

Observacoes:

- a escolha do endpoint e feita em `getCasosFiltrados` via `origem: 'vigilancia'`
- a tela nao tem filtros persistentes equivalentes a `mes`, `tecRef` e `bairro`
- a Vigilancia hoje tambem nao envia `status=todos`

#### 6.2 Inventario executado - Dashboard

| Tela | Origem | Query atual emitida | Endpoint atual | Campo backend atual | Contrato novo alvo | Transformacao | `status=todos` | Observacoes |
| ---- | ------ | ------------------- | -------------- | ------------------- | ------------------ | ------------- | --------------- | ----------- |
| Dashboard | Card `Total de Atendimentos` | `mes?`, `tecRef?`, `bairro?` sem `filtro/valor` | `/api/casos` | listagem default de casos | `status=todos` + filtros persistentes traduzidos | `tecRef -> search + searchBy=tec_ref`; `bairro -> filters[bairro]` | sim | hoje o click nao representa explicitamente o universo completo; precisa ficar canonico |
| Dashboard | Card `Novos no Mes` | `mes?`, `tecRef?`, `bairro?` sem `filtro/valor` | `/api/casos` | listagem default de casos com recorte implcito da tela | `mes` + filtros persistentes traduzidos, com decisao explicita sobre `status` | `tecRef -> search + searchBy=tec_ref`; `bairro -> filters[bairro]` | a definir | sem `filtro/valor` hoje; a semantica depende se o KPI considera apenas ativos ou base total |
| Dashboard | Card `Inseridos no PAEFI` | `mes?&tecRef?&bairro?&filtro=inseridoPAEFI&valor=Sim` | `/api/casos` | `inseridoPAEFI` | pendencia de contrato | nenhuma | provavelmente sim | campo nao aparece na lista de filtros funcionais do doc de migracao |
| Dashboard | Card `Casos Reincidentes` | `mes?&tecRef?&bairro?&filtro=reincidente&valor=Sim` | `/api/casos` | `reincidente` | `filters[reincidente]=Sim` + filtros persistentes traduzidos | `tecRef -> search + searchBy=tec_ref`; `bairro -> filters[bairro]` | sim | ja tem correspondencia clara no contrato novo |
| Dashboard | Card `Recebem Bolsa Familia` | `mes?&tecRef?&bairro?&filtro=recebePBF&valor=Sim` | `/api/casos` | `recebePBF` | pendencia de contrato | nenhuma | provavelmente sim | campo nao aparece na lista de filtros funcionais do doc de migracao |
| Dashboard | Card `Recebem BPC` | `mes?&tecRef?&bairro?&filtro=recebeBPC&valor=Idoso` | `/api/casos` | `recebeBPC` | `filters[recebeBPC]=...` se houver alinhamento de valor, senao pendencia | possivel ajuste de valor | provavelmente sim | o doc de migracao lista `recebeBPC` como filtro suportado, mas o valor `Idoso` precisa validacao semantica |
| Dashboard | Card `Violencia Confirmada` | `mes?&tecRef?&bairro?&filtro=confirmacaoViolencia&valor=Confirmada` | `/api/casos` | `confirmacaoViolencia` | `mes? + filters[confirmacaoViolencia]=Confirmada` + filtros persistentes traduzidos | `tecRef -> search + searchBy=tec_ref`; `bairro -> filters[bairro]` | sim | caso coberto no doc de migracao |
| Dashboard | Card `Notificados no SINAN` | `mes?&tecRef?&bairro?&filtro=notificacaoSINAN&valor=Sim` | `/api/casos` | `notificacaoSINAN` | pendencia de contrato | nenhuma | provavelmente sim | o inventario legacy marca drift entre `notificacaoSINAM` e `notificacaoSINAN`; o doc de migracao nao lista esse filtro |
| Dashboard | Card `Dependencia Financeira` | `mes?&tecRef?&bairro?&filtro=dependeFinanceiro&valor=Sim` | `/api/casos` | `dependeFinanceiro` | `filters[dependeFinanceiro]=Sim` + filtros persistentes traduzidos | `tecRef -> search + searchBy=tec_ref`; `bairro -> filters[bairro]` | sim | coberto no doc de migracao, mas o inventario legacy aponta que o campo esta em transicao de dominio |
| Dashboard | Card `Vitima e PCD` | `mes?&tecRef?&bairro?&filtro=vitimaPCD&valor=Sim` | `/api/casos` | `vitimaPCD` | pendencia de contrato | nenhuma | provavelmente sim | campo nao aparece na lista de filtros funcionais do doc de migracao |
| Dashboard | Card `Membro em Sist. Carcerario` | `mes?&tecRef?&bairro?&filtro=membroCarcerario&valor=Sim` | `/api/casos` | `membroCarcerario` | pendencia de contrato | nenhuma | provavelmente sim | campo nao aparece na lista de filtros funcionais do doc de migracao |
| Dashboard | Card `Membro em Socioeducacao` | `mes?&tecRef?&bairro?&filtro=membroSocioeducacao&valor=Sim` | `/api/casos` | `membroSocioeducacao` | `filters[membroSocioeducacao]=Sim` + filtros persistentes traduzidos | `tecRef -> search + searchBy=tec_ref`; `bairro -> filters[bairro]` | sim | coberto no doc de migracao |
| Dashboard | Grafico `Casos por Bairro` | `mes?&tecRef?&bairro?&filtro=por_bairro&valor=<bairroClicado>` | `/api/casos` | alias legado `por_bairro` | `filters[bairro]=<bairroClicado>` + filtros persistentes traduzidos | `por_bairro -> filters[bairro]`; `tecRef -> search + searchBy=tec_ref` | sim | o filtro persistente `bairro` da tela pode conflitar com o bairro clicado; a regra de precedencia precisa ser explicita |
| Dashboard | Grafico `Tipos de Violacao` | `mes?&tecRef?&bairro?&filtro=por_violencia&valor=<tipo>` | `/api/casos` | alias legado `por_violencia` | `filters[tipoViolencia]=<tipoCanonico>` + filtros persistentes traduzidos | `por_violencia -> filters[tipoViolencia]` | sim | valores precisam respeitar enum canonico |
| Dashboard | Grafico `Casos por Sexo` | `mes?&tecRef?&bairro?&filtro=sexo&valor=<sexoTexto>` | `/api/casos` | `sexo` | `filters[sexo]=<enumCanonico>` + filtros persistentes traduzidos | `Masculino -> MASCULINO`; `Feminino -> FEMININO`; outros valores a validar | sim | o doc de migracao cita enum canonico; precisa normalizacao central |
| Dashboard | Grafico `Canal de Denuncia` | `mes?&tecRef?&bairro?&filtro=canalDenuncia&valor=<canal>` | `/api/casos` | `canalDenuncia` | `filters[canalDenuncia]=<canal>` + filtros persistentes traduzidos | nenhuma | sim | caso coberto no doc de migracao |
| Dashboard | Grafico `Casos por Cor/Etnia` | `mes?&tecRef?&bairro?&filtro=racaCor&valor=<racaCor>` | `/api/casos` | `racaCor` | `filters[racaCor]=<racaCor>` + filtros persistentes traduzidos | nenhuma | sim | o inventario legacy mostra que esse fluxo conviveu com `corEtnia`; o drill-down novo deve usar apenas `racaCor` |
| Dashboard | Grafico `Casos por Faixa Etaria` | `mes?&tecRef?&bairro?&filtro=por_faixa_etaria&valor=<faixa>` | `/api/casos` | alias legado `por_faixa_etaria` | `filters[faixaEtariaVitima]=<faixaCanonica>` se houver correspondencia, senao pendencia | possivel normalizacao de faixa | sim | o doc de migracao lista `faixaEtariaVitima` como filtro suportado, mas nao documenta esse alias nem os valores aceitos |

##### Filtros persistentes que impactam todos os drill-downs do Dashboard

| Filtro de UI | Shape atual | Contrato novo alvo | Observacoes |
| ------------ | ----------- | ------------------ | ----------- |
| Mes | `mes=YYYY-MM` | `mes=YYYY-MM` | ja compativel com o contrato novo |
| Tecnico de Referencia | `tecRef=<nome>` | `search=<nome>&searchBy=tec_ref` | o nome `tecRef` nao deve vazar como contrato de API |
| Bairro | `bairro=<nome>` | `filters[bairro]=<nome>` | precisa regra de precedencia quando o proprio insight clicado tambem for bairro |

#### 6.3 Inventario executado - Vigilancia

| Tela | Origem | Query atual emitida | Endpoint atual | Campo backend atual | Contrato novo alvo | Transformacao | `status=todos` | Observacoes |
| ---- | ------ | ------------------- | -------------- | ------------------- | ------------------ | ------------- | --------------- | ----------- |
| Vigilancia | KPI `Total de Casos Ativos` | `filtro=status&valor=Ativo` | `/api/vigilancia/casos-filtrados` | `status` | `status=Ativo` | nenhuma | nao | e o unico caso em que a base explicitamente parece ser apenas ativos |
| Vigilancia | KPI `Casos Novos no Ultimo Mes` | `filtro=data_cad&valor=ultimos_30_dias` | `/api/vigilancia/casos-filtrados` | alias legado de periodo | pendencia de contrato | precisa decisao de produto/backend | a definir | o doc de migracao marca esse caso como aberto; `mes` nao equivale exatamente a ultimos 30 dias |
| Vigilancia | KPI `Casos Reincidentes` | `filtro=reincidente&valor=Sim` | `/api/vigilancia/casos-filtrados` | `reincidente` | `status=todos&filters[reincidente]=Sim` | `reincidente -> filters[reincidente]` | sim | o doc de migracao recomenda `reincidentes -> filters[reincidente]`; no codigo atual o mapa ja usa `reincidente` como campo |
| Vigilancia | Mapa `Incidencia Territorial` | `filtro=por_bairro&valor=<bairro>` | `/api/vigilancia/casos-filtrados` | alias legado `por_bairro` | `status=todos&filters[bairro]=<bairro>` | `por_bairro -> filters[bairro]` | sim | caso coberto no doc de migracao |
| Vigilancia | Grafico `Fontes de Acionamento` | `filtro=por_canal&valor=<canal>` | `/api/vigilancia/casos-filtrados` | alias legado `por_canal` | `status=todos&filters[canalDenuncia]=<canal>` | `por_canal -> filters[canalDenuncia]` | sim | remove a dependencia do alias legado citado no doc |
| Vigilancia | Grafico `Perfil das Violacoes` | `filtro=por_violencia&valor=<tipo>` | `/api/vigilancia/casos-filtrados` | alias legado `por_violencia` | `status=todos&filters[tipoViolencia]=<tipoCanonico>` | `por_violencia -> filters[tipoViolencia]` | sim | valores precisam respeitar enum canonico |

#### 6.4 Pendencias abertas pela Etapa 1

Pendencias de contrato confirmadas no Dashboard:

- `inseridoPAEFI`
- `recebePBF`
- `notificacaoSINAN`
- `vitimaPCD`
- `membroCarcerario`
- `por_faixa_etaria` -> `faixaEtariaVitima` precisa mapa de valores

Pendencias de semantica/valor:

- `recebeBPC` hoje usa `valor=Idoso`; precisa confirmar se esse e o valor canonico esperado pelo backend
- `sexo` precisa normalizacao de enum
- `tipoViolencia` precisa normalizacao de enum
- `bairro` como filtro persistente da tela precisa regra clara quando o click tambem for em um bairro especifico

Decisao de traducao fechada para a Vigilancia:

- `data_cad=ultimos_30_dias` passa a ser tratado no frontend como `mes=<mesAtual>`

#### 6.5 Conclusao da Etapa 1

A Etapa 1 pode ser considerada concluida para o frontend porque:

- todos os pontos reais de clique de drill-down em Dashboard e Vigilancia foram identificados
- a query atual foi explicitada por tela
- o endpoint atual foi identificado por fluxo
- a traducao alvo para `GET /api/casos` foi registrada
- as pendencias de contrato que bloqueiam a migracao completa ficaram enumeradas

O principal resultado desta etapa e que a migracao nao pode ser tratada como uma troca mecanica de endpoint. Ela depende de:

- um builder central para traduzir filtros persistentes e insights clicados
- decisao explicita para filtros ainda fora do contrato
- definicao do caso especial `ultimos_30_dias`
  - resolvida nesta execucao como `mes` do mes corrente

## 7. Etapa 2 - Criar camada canonica de query

### Objetivo

Introduzir uma camada unica para montar a query de `GET /api/casos`, desacoplando as telas da sintaxe de params.

### Motivacao

Hoje a traducao esta espalhada em:

- `src/pages/Dashboard.tsx`
- `src/pages/PainelVigilancia/PainelVigilancia.tsx`
- `src/services/api.ts`

Esse espalhamento aumenta o risco de divergencia e dificulta remover o legado.

### Proposta de desenho

Criar uma unidade dedicada, por exemplo:

- `src/services/casosDrilldown.ts`
- ou `src/utils/casosDrilldown.ts`

Responsabilidades dessa camada:

- receber o insight clicado e o contexto da tela
- aplicar a traducao para `search`, `searchBy`, `status`, `mes` e `filters[...]`
- normalizar enums e valores legados
- devolver `URLSearchParams` ou um objeto canonico pronto para serializacao

### Responsabilidades que nao devem ficar nessa camada

- fetch HTTP bruto
- regras visuais do modal
- logica de loading da tela
- fallback silencioso para filtros sem contrato

### Tarefas

1. Definir tipo de entrada do builder
   - tela de origem
   - insight clicado
   - valor clicado
   - filtros ativos da tela
2. Definir tipo de saida
   - `search`
   - `searchBy`
   - `status`
   - `mes`
   - `sortBy`
   - `sortOrder`
   - `filters`
3. Implementar mapa central de traducao
4. Implementar serializacao para query string
5. Cobrir casos especiais com contrato explicito
6. Manter compatibilidade legada separada do caminho canonico

### Dependencias

- conclusao do inventario da Etapa 1
- alinhamento minimo sobre filtros sem contrato fechado

### Criterio de aceite da etapa

- existe um unico ponto para traduzir drill-down
- Dashboard e Vigilancia conseguem depender dessa camada
- o contrato canonico fica expressivo e tipado

### Resultado executado da Etapa 2

Foi criada a camada canonica em:

- `src/services/casosDrilldown.ts`

Essa camada passou a concentrar:

- os tipos do contrato canonico de listagem de casos
- a traducao de acoes de drill-down para params canonicos
- a normalizacao de aliases legados de filtro
- a serializacao para `URLSearchParams`

#### O que o builder implementa

O modulo expoe:

- `buildCasosDrilldownParams(input)`
  - devolve um objeto canonico com `search`, `searchBy`, `status`, `mes` e `filters`
- `buildCasosDrilldownSearchParams(input)`
  - devolve `URLSearchParams`
- `toCasosSearchParams(params)`
  - serializa params canonicos em query string

#### Decisoes incorporadas nesta etapa

1. `ultimos_30_dias` passa a virar `mes` do mes atual
   - aplicado no mapeamento da acao `casos_novos_30d`
   - o builder usa o mes corrente da data de referencia
2. `local_ocorrencia` passa a virar `bairro`
   - aplicado tanto como alias de acao quanto como filtro persistente de UI
   - o builder absorve `local_ocorrencia` e `localOcorrencia` como equivalentes de `bairro`

#### Regras legadas centralizadas

O builder agora centraliza, entre outras, as seguintes traducoes:

- `por_bairro -> filters[bairro]`
- `por_canal -> filters[canalDenuncia]`
- `por_violencia -> filters[tipoViolencia]`
- `por_faixa_etaria -> filters[faixaEtariaVitima]`
- `reincidentes -> filters[reincidente]=Sim`
- `violencia_confirmada -> filters[confirmacaoViolencia]=Confirmada`
- `dependencia_financeira -> filters[dependeFinanceiro]=Sim`
- `tecRef -> search + searchBy=tec_ref`
- `q -> search + searchBy=q`
- `local_ocorrencia -> filters[bairro]`

#### Normalizacoes de valor ja implementadas

- `sexo`
  - `Masculino -> MASCULINO`
  - `Feminino -> FEMININO`
  - `Intersexo -> INTERSEXO`
- `tipoViolencia`
  - remove acentos e normaliza para enum em caixa alta
- filtros booleanos legados
  - normalizacao basica de `Sim` e `Não`

#### Limites desta etapa

Esta execucao nao trocou ainda o consumo em:

- `src/pages/Dashboard.tsx`
- `src/pages/PainelVigilancia/PainelVigilancia.tsx`
- `src/services/api.ts`

Ou seja:

- a camada nova esta pronta e tipada
- a substituicao das telas continua pertencendo as etapas seguintes

## 8. Etapa 3 - Ajustar a camada de service de casos

### Objetivo

Separar claramente:

- a chamada canonica de listagem em `/api/casos`
- a compatibilidade temporaria com fluxos legados

### Problema atual

Em `src/services/api.ts`, `getCasosFiltrados` tem duas responsabilidades:

- decide o endpoint
- transporta filtros legados

Isso mistura estrategia de migracao com o contrato definitivo.

### Tarefas

1. Criar ou adaptar uma funcao canonica para listar casos via `GET /api/casos`
2. Fazer essa funcao aceitar o formato novo de params
3. Parar de usar `origem` para roteamento de endpoint no caminho novo
4. Preservar `getCasosFiltrados` apenas se necessario para `Consulta` ou outro fluxo ainda legado
5. Nomear explicitamente as funcoes para evitar ambiguidade

### Recomendacao pratica

Manter dois caminhos durante a transicao:

- `listCasosCanonicos(paramsCanonicos)`
- `getCasosFiltrados(filtersLegados)` temporario

Assim a migracao de Dashboard e Vigilancia nao fica travada pela refatoracao completa de `Consulta`.

### Criterio de aceite da etapa

- existe uma funcao de listagem canonica sem branch por origem
- `Dashboard` e `Vigilancia` deixam de depender da API legada
- qualquer compatibilidade restante fica isolada e identificada como transitoria

### Resultado executado da Etapa 3

Foram aplicadas as seguintes mudancas em `src/services/api.ts`:

- criada a funcao `listCasosCanonicos(params)`
  - consome exclusivamente `GET /api/casos`
  - recebe params canonicos e serializa via `toCasosSearchParams`
- `getCasosFiltrados(filters)`
  - foi mantida apenas como camada de compatibilidade
  - deixou de escolher endpoint por `origem`
  - agora sempre aponta para `/api/casos`

Resultado pratico:

- o frontend deixou de ter qualquer branch de endpoint para `/api/vigilancia/casos-filtrados`
- a compatibilidade com `filtro/valor` ficou limitada aos fluxos que ainda chamam `getCasosFiltrados`, hoje basicamente `Consulta`

## 9. Etapa 4 - Migrar o Painel de Vigilancia

### Objetivo

Fazer o drill-down da Vigilancia consumir somente `GET /api/casos`.

### Motivo para migrar primeiro

A Vigilancia hoje e o ponto mais claramente acoplado ao endpoint legado, porque `PainelVigilancia.tsx` passa `origem: 'vigilancia'` para disparar `/api/vigilancia/casos-filtrados`.

Isso a torna o alvo mais direto para cortar o legado com risco controlado.

### Mapeamentos esperados

- `por_bairro` -> `filters[bairro]`
- `por_canal` -> `filters[canalDenuncia]`
- `por_violencia` -> `filters[tipoViolencia]`
- `reincidentes` -> `filters[reincidente]=Sim`
- universo total do indicador -> `status=todos`

### Caso especial: ultimos 30 dias

O fluxo atual usa algo equivalente a:

```http
filtro=data_cad&valor=ultimos_30_dias
```

Esse caso nao esta coberto de forma canonica pelo contrato atual, que so garante `mes=YYYY-MM`.

Antes de implementar, escolher uma das alternativas:

1. desabilitar o drill-down desse KPI por enquanto
2. converter o KPI para o mes corrente, se isso for aceitavel do ponto de vista funcional
3. alinhar com backend um filtro derivado canonico para ultimos 30 dias

Sem essa decisao, o KPI continua sendo uma pendencia de contrato.

### Tarefas

1. Substituir o mapa legado por uma traducao via builder central
2. Remover `origem: 'vigilancia'` do fluxo de drill-down
3. Passar a chamar apenas a listagem canonica
4. Validar:
   - bairro
   - canal
   - violencia
   - reincidencia
   - total de ativos ou universo completo, conforme semantica do insight
5. Decidir o destino do KPI de ultimos 30 dias

### Criterio de aceite da etapa

- nenhum clique da Vigilancia chama `/api/vigilancia/casos-filtrados`
- os cenarios suportados abrem o modal com dados corretos
- o comportamento de `status` fica explicito

### Resultado executado da Etapa 4

`src/pages/PainelVigilancia/PainelVigilancia.tsx` foi migrado para:

- montar params com `buildCasosDrilldownParams`
- chamar `listCasosCanonicos`

Remocoes efetivas:

- saiu o mapa local `VIGILANCIA_FILTERS_MAP`
- saiu o uso de `getCasosFiltrados({ origem: 'vigilancia' })`

Estado novo:

- `total_ativos` resolve para `status=Ativo`
- `casos_novos_30d` resolve para `status=todos` + `mes=<mesAtual>`
- `reincidentes` resolve para `status=todos&filters[reincidente]=Sim`
- `por_bairro`, `por_canal` e `por_violencia` resolvem para `filters[...]` canonicos

## 10. Etapa 5 - Migrar o Dashboard

### Objetivo

Fazer o Dashboard usar o mesmo builder canonico e parar de emitir `filtro/valor` como formato principal.

### Situacao atual

`src/pages/Dashboard.tsx` ainda:

- mantem `CARD_FILTERS_MAP` acoplado a nomes legados
- usa `handleDrillDown` que converte tudo para `filtro` e `valor`
- preserva filtros de tela em `mes`, `tecRef` e `bairro`

### Regra de traducao dos filtros de tela

Os filtros persistentes do Dashboard devem ser convertidos assim:

- `mes` -> `mes`
- `bairro` -> `filters[bairro]`
- `tecRef` -> `search=<valor>&searchBy=tec_ref`

Observacao:

- `tecRef` pode continuar existindo apenas como nome interno temporario de estado da UI, mas nao deve mais vazar como contrato de API

### Mapeamentos prioritarios de drill-down

- casos por bairro -> `filters[bairro]`
- tipos de violencia -> `filters[tipoViolencia]`
- canal de denuncia -> `filters[canalDenuncia]`
- sexo -> `filters[sexo]` com enum canonico
- cor/etnia -> `filters[racaCor]`
- reincidentes -> `filters[reincidente]=Sim`
- confirmacao de violencia no mes -> `mes + filters[confirmacaoViolencia]`
- dependencia financeira -> `filters[dependeFinanceiro]=Sim`
- tecnico -> `search + searchBy=tec_ref`
- busca textual -> `search + searchBy=q`

### Pendencias funcionais do Dashboard

Os itens abaixo aparecem no codigo atual, mas nao estao cobertos com clareza pela lista de filtros funcionais do documento:

- `notificacaoSINAN`
- `inseridoPAEFI`
- `recebePBF`
- `recebeBPC` com semantica atual do card
- `vitimaPCD`
- `membroCarcerario`

Para esses pontos, a etapa deve produzir uma decisao explicita:

- manter o drill-down porque o backend suporta e o documento precisa ser atualizado
- remover ou desabilitar o drill-down ate existir contrato
- abrir pendencia de backend

Nao deve haver implementacao ad hoc para "fazer funcionar" sem contrato.

### Tarefas

1. Trocar `handleDrillDown` para consumir o builder central
2. Traduzir filtros ativos da tela antes de abrir o modal
3. Migrar os graficos ja cobertos pelo contrato
4. Tratar enums textuais como `Masculino` -> `MASCULINO`
5. Marcar ou retirar temporariamente cards sem contrato estabilizado
6. Garantir `status=todos` onde o indicador representa universo completo

### Criterio de aceite da etapa

- Dashboard nao usa mais `filtro/valor` como caminho principal
- os drill-downs cobertos pelo contrato funcionam com `GET /api/casos`
- pendencias restantes ficam pequenas, explicitas e rastreaveis

### Resultado executado da Etapa 5

`src/pages/Dashboard.tsx` foi migrado para:

- montar params com `buildCasosDrilldownParams`
- chamar `listCasosCanonicos`

Remocoes efetivas:

- saiu o mapa local `CARD_FILTERS_MAP`
- saiu a montagem manual de `filtro` e `valor` na pagina

Estado novo:

- os filtros persistentes da UI continuam existindo como estado local
- na hora do drill-down, `tecRef` passa a ser traduzido para `search + searchBy=tec_ref`
- `bairro` passa a ser traduzido para `filters[bairro]`
- o insight clicado tem precedencia sobre o filtro persistente de mesmo campo

Observacao importante:

- alguns cards continuam migrados de forma conservadora para o contrato canonico, mas ainda dependem de confirmacao funcional de backend, como `notificacaoSINAN`, `inseridoPAEFI`, `recebePBF`, `vitimaPCD` e `membroCarcerario`
- a migracao de frontend foi executada; a validacao funcional desses filtros ainda deve ser feita em ambiente integrado

## 11. Etapa 6 - Preservar o modal e normalizar o consumo

### Objetivo

Manter o modal de drill-down estavel durante a migracao.

### Situacao atual

`src/components/DrillDown/ListaCasosModal.tsx` ja trabalha com:

- `id`
- `nome`
- `tec_ref`
- `data_cad`
- `bairro`

Isso e compativel com o shape descrito no documento de migracao.

### Tarefas

1. Confirmar que a nova listagem retorna esse shape em todos os cenarios
2. Se necessario, normalizar a resposta antes de chegar ao modal
3. Nao mover regra de traducao de filtro para dentro do modal
4. Nao acoplar o modal a endpoint ou origem da tela

### Criterio de aceite da etapa

- nenhuma mudanca visual ou estrutural relevante no modal
- o modal continua funcionando para Dashboard e Vigilancia

## 12. Etapa 7 - Validacao funcional e regressao

### Objetivo

Garantir que a migracao mudou o contrato sem quebrar o comportamento esperado.

### Checklist minimo de validacao

- clicar em bairro no Dashboard abre modal com query contendo `filters[bairro]`
- clicar em violencia no Dashboard abre modal com `filters[tipoViolencia]`
- clicar em sexo no Dashboard abre modal com `filters[sexo]` no enum canonico
- clicar em canal no Dashboard abre modal com `filters[canalDenuncia]`
- clicar em confirmacao por mes abre modal com `mes` e `filters[confirmacaoViolencia]`
- clicar em tecnico usa `search` com `searchBy=tec_ref`
- clicar em bairro na Vigilancia abre modal com `filters[bairro]`
- clicar em canal na Vigilancia abre modal com `filters[canalDenuncia]`
- clicar em violencia na Vigilancia abre modal com `filters[tipoViolencia]`
- clicar em reincidencia na Vigilancia abre modal com `filters[reincidente]=Sim`
- os cenarios que precisam do universo completo enviam `status=todos`
- nenhum clique de Dashboard ou Vigilancia usa `/api/vigilancia/casos-filtrados`

### Validacao tecnica adicional

- inspecionar requests na aba Network
- verificar query string final de cada click
- confirmar que nenhum componente monta params manualmente fora da camada central
- confirmar que `Consulta` continua funcionando, se ainda depender do caminho legado temporario

## 13. Etapa 8 - Corte do legado

### Objetivo

Encerrar a migracao removendo os pontos de compatibilidade que deixaram de ser necessarios.

### Tarefas

1. Remover o branch de endpoint por `origem` em `src/services/api.ts`
2. Remover o uso de `/api/vigilancia/casos-filtrados` no frontend
3. Remover adapters locais de `filtro/valor` em Dashboard e Vigilancia
4. Limpar mapas legados como:
   - `por_bairro`
   - `por_canal`
   - `por_violencia`
   - `reincidentes`
   - `dataCad`
   - `tecRef` como contrato de API
5. Manter comentario ou documentacao curta apenas onde ainda houver compatibilidade transitiva

### Criterio de aceite da etapa

- o frontend nao depende mais da rota legada para drill-down
- o contrato principal do frontend para casos e o canonico
- o debito restante fica limitado a fluxos fora do escopo desta migracao

### Resultado executado da Etapa 8 no frontend

No frontend, o corte do legado foi parcialmente concluido:

- nao existe mais uso de `/api/vigilancia/casos-filtrados` em `src/`
- nao existe mais branch por `origem` em `src/services/api.ts`
- Dashboard e Vigilancia nao montam mais `filtro/valor` localmente

Legado ainda mantido de forma controlada:

- `src/pages/Consulta.tsx` ainda usa `getCasosFiltrados`
- `getCasosFiltrados` ainda aceita o shape legado, mas agora sempre contra `/api/casos`

Isso deixa o debito remanescente pequeno e isolado fora do fluxo principal desta migracao.

## 14. Ordem recomendada de PRs

### PR-1

Inventario dos cenarios reais e introducao do builder canonico sem trocar as telas ainda.

### PR-2

Refatoracao de `api.ts` para expor a listagem canonica separada do caminho legado.

### PR-3

Migracao do `PainelVigilancia` para o builder novo e corte do endpoint legado nesse fluxo.

### PR-4

Migracao do `Dashboard` para o builder novo, incluindo filtros persistentes da tela.

### PR-5

Limpeza do legado restante, validacao final e remocao do branch por `origem`.

## 15. Riscos e pontos de atencao

### Risco 1 - Quebrar `Consulta`

Como `Consulta` tambem usa `getCasosFiltrados`, uma refatoracao direta dessa funcao pode causar regressao fora do escopo.

Mitigacao:

- separar a funcao canonica da funcao legacy
- migrar Dashboard e Vigilancia primeiro

### Risco 2 - Filtros sem contrato oficial

Alguns cards atuais do Dashboard dependem de campos que nao estao claramente listados como filtros funcionais suportados.

Mitigacao:

- marcar como pendencia de contrato
- nao improvisar traducoes locais

### Risco 3 - KPI de ultimos 30 dias

O caso `ultimos_30_dias` nao esta padronizado no contrato atual.

Mitigacao:

- decidir antes da implementacao se o KPI sera adaptado, desabilitado ou alinhado com backend

### Risco 4 - Divergencia de enums

Valores como `Masculino`, `Feminino`, `Física` e equivalentes podem estar chegando em formato textual legado.

Mitigacao:

- normalizar no builder central
- documentar explicitamente as conversoes de valor

## 16. Definicoes de pronto por etapa

Uma etapa so deve ser considerada concluida quando:

- o comportamento esperado estiver documentado
- a implementacao estiver isolada no arquivo correto
- a Network comprovar a query canonica
- a UI continuar abrindo o modal corretamente
- regressao basica das telas afetadas tiver sido verificada

## 17. Resumo executivo

Esta migracao nao deve ser tratada como uma simples troca de endpoint. O trabalho correto exige:

- inventario completo dos cliques reais
- criacao de um builder unico de query
- separacao clara entre caminho canonico e compatibilidade legacy
- migracao incremental da Vigilancia e depois do Dashboard
- limpeza final do legado com validacao de contrato

Se essa ordem for seguida, o frontend passa a ter um fluxo unico e rastreavel de drill-down para casos, reduzindo divergencia entre telas e abrindo caminho para remover a compatibilidade legado de forma controlada.
