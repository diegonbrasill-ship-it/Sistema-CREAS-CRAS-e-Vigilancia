# Plano de Refatoracao de Graficos, Dashboard, Vigilancia e Drilldown

## Objetivo

Refatorar `Dashboard` e `PainelVigilancia` com a seguinte prioridade:

1. manter tudo funcionando de forma simples com o contrato real do backend e do frontend
2. remover duplicacao e acoplamento obvio
3. so depois reorganizar pastas, hooks e componentes

Este plano substitui a versao anterior porque o frontend ja avancou em um ponto importante: o drilldown deixou de depender do endpoint legado de vigilancia e hoje ja passa por um builder compartilhado que traduz a interacao da UI para `GET /api/casos`.

## Contexto usado

Documentos-base:

- `docs/arquitetura_front.md`
- `docs/refactor/dashboard-drilldown-contrato-atual.md`

Codigo validado nesta revisao:

- `src/pages/Dashboard.tsx`
- `src/pages/PainelVigilancia/PainelVigilancia.tsx`
- `src/services/api.ts`
- `src/services/casosDrilldown.ts`

## Estado Atual Verificado

### O que ja esta funcionando hoje

- `Dashboard.tsx` busca agregados por `getDashboardData()` em `GET /api/dashboard`
- `PainelVigilancia.tsx` busca os blocos da tela por 6 endpoints de `/api/vigilancia/*`
- as duas paginas abrem o mesmo modal `ListaCasosModal`
- as duas paginas usam `buildCasosDrilldownParams()`
- as duas paginas buscam a lista detalhada por `listCasosCanonicos()` em `GET /api/casos`

### O que isso significa na pratica

O frontend ja tem uma convergencia funcional minima:

- agregados continuam separados por pagina
- drilldown ja esta centralizado em um unico ponto de traducao

Por isso, a refatoracao nao deve comecar por mover arquivos entre pastas. O primeiro ganho vem de estabilizar e limpar o fluxo atual.

## Contratos Que Precisam Ser Preservados

### 1. Dashboard

Contrato atual de carga:

```http
GET /api/dashboard?mes=YYYY-MM&tecRef=<texto>&bairro=<texto>
```

O backend documentado le de forma confiavel apenas:

- `mes`
- `tec_ref`
- `bairro`

No frontend atual existe uma divergencia de nome em `tecRef` vs `tec_ref`. Esse ponto precisa ser tratado com cuidado na implementacao, sem assumir que renomear tudo de uma vez sera seguro.

### 2. Vigilancia

Contratos atuais:

```http
GET /api/vigilancia/fluxo-demanda
GET /api/vigilancia/sobrecarga-equipe
GET /api/vigilancia/incidencia-bairros
GET /api/vigilancia/fontes-acionamento
GET /api/vigilancia/taxa-reincidencia
GET /api/vigilancia/perfil-violacoes
```

Esses endpoints continuam sendo especificos da pagina. Nao faz sentido tentar forcar uma camada generica para KPIs e graficos antes de estabilizar a tela.

### 3. Drilldown

Contrato canonico que o frontend ja usa hoje:

```http
GET /api/casos?status=todos&mes=YYYY-MM&search=<texto>&searchBy=<campo>&filters[chave]=valor
```

O builder atual em `src/services/casosDrilldown.ts` ja cobre:

- acoes de KPI
- aliases legados de acao
- filtros dinamicos de grafico
- normalizacao de enums como sexo, raca/cor e tipo de violencia

Esse builder e o principal ativo a preservar na primeira fase.

## Diretriz Principal

Primeiro consolidar o que ja funciona no layout atual. Depois quebrar em modulos menores. Reorganizacao de pasta entra por ultimo.

Em outras palavras:

- primeiro comportamento
- depois fronteiras de responsabilidade
- por fim estrutura de diretorios

## O Que Nao Fazer na Primeira Rodada

Nao comecar por:

- mover `Dashboard.tsx` para outra pasta
- mover `PainelVigilancia.tsx` para outra pasta
- criar arvore nova de `services/drilldown/*` sem necessidade imediata
- quebrar todos os componentes de grafico antes de fechar o contrato minimo
- trocar o modal compartilhado de lugar sem ajustar antes seu contrato

Essas mudancas aumentam risco de regressao e quase nao melhoram o funcionamento por si so.

## Fase 1. Consolidar o Fluxo Minimo Funcional

Objetivo: deixar o conjunto atual simples, previsivel e testavel sem grande reorganizacao.

### Escopo

1. manter `Dashboard.tsx` e `PainelVigilancia.tsx` nos caminhos atuais
2. manter `src/services/casosDrilldown.ts` como unico builder de drilldown
3. padronizar o tipo da lista retornada pelo modal
4. fechar lacunas de UX e erro no modal
5. validar todos os pontos de clique com o contrato real

### Ajustes esperados

- extrair um tipo compartilhado simples de item do drilldown, em vez de repetir `CasoParaLista` nas paginas
- garantir que `ListaCasosModal` mostre erro quando houver restricao ou falha
- revisar se todas as acoes clicaveis de dashboard e vigilancia estao mapeadas em `ACTION_RULES`
- revisar nomes canonicos vs legados mais criticos:
  - `tipoViolencia`
  - `canalDenuncia`
  - `racaCor`
  - `bairro`
  - `sexo`
- revisar o caso de filtros de mes e tecnico aplicados junto do drilldown

### Criterio de saida da Fase 1

- dashboard carrega
- vigilancia carrega
- modal abre nas duas telas
- modal lista casos de forma consistente
- erros aparecem no modal ou em toast de forma clara
- nenhuma tela monta query de `/api/casos` manualmente fora do builder

## Fase 2. Separar Responsabilidades Sem Reorganizar Pasta Ainda

Objetivo: tirar logica repetida das paginas, mas com diffs pequenos.

### Passos

1. criar um hook compartilhado, por exemplo `useCasosDrilldown`, sem mover arquivos de pagina ainda
2. fazer `Dashboard.tsx` e `PainelVigilancia.tsx` usarem esse hook
3. manter `ListaCasosModal` como componente burro de apresentacao

### Responsabilidade do hook compartilhado

- `isOpen`
- `title`
- `cases`
- `isLoading`
- `errorMessage`
- `openDrilldown`
- `closeDrilldown`

### Motivo desta ordem

Hoje a principal duplicacao nao e visual. Ela esta no fluxo:

- abrir modal
- limpar estado
- montar params
- chamar `listCasosCanonicos`
- tratar erro

Esse e o melhor ponto de extracao inicial porque reduz codigo repetido sem forcar mudanca estrutural grande.

## Fase 3. Modularizar Dashboard

Objetivo: reduzir o tamanho de `src/pages/Dashboard.tsx` depois que o comportamento ja estiver estabilizado.

### Extracoes sugeridas

- `useDashboardData`
  - fetch de `getDashboardData`
  - filtros
  - opcoes de filtro
  - loading

- `useDashboardPresentation`
  - fullscreen
  - `dashboardRef`
  - listener de fullscreen

- componentes locais
  - filtros
  - KPIs
  - charts

### Regra

So fazer essa etapa depois da Fase 2 pronta. Antes disso, separar arquivo demais so espalha o problema.

## Fase 4. Modularizar Vigilancia

Objetivo: fazer com `PainelVigilancia` o mesmo tratamento dado ao dashboard, mas respeitando que a tela continua dependente de varios endpoints especificos.

### Extracoes sugeridas

- `useVigilanciaData`
  - `Promise.all`
  - shape agregado local da tela
  - loading
  - erro

- adapters locais da pagina
  - `fonte -> { name, value }`
  - `tipo -> { name, value }`

- componentes locais
  - KPIs
  - territorio
  - graficos

### Regra

Os adapters de vigilancia devem ficar perto da pagina. Eles nao fazem parte do dominio compartilhado de drilldown.

## Fase 5. Reorganizacao de Pastas

Objetivo: so depois que as fases anteriores estiverem funcionando, reorganizar a estrutura fisica.

Estrutura alvo recomendada:

```text
src/
  pages/
    dashboard/
    vigilancia/
  components/
    drilldown/
  services/
    drilldown/
```

### O que entra em `services/drilldown/`

- tipos do caso de uso
- regras de traducao de acao para query
- normalizadores
- builder de params
- hook compartilhado do modal/listagem

### O que nao entra em `services/drilldown/`

- fetch do dashboard
- fetch da vigilancia
- componentes visuais do dashboard
- mapa e componentes visuais da vigilancia

## Ordem Recomendada de Execucao

1. fechar contrato funcional atual
2. padronizar tipo e contrato do modal
3. extrair `useCasosDrilldown`
4. simplificar `Dashboard.tsx`
5. simplificar `PainelVigilancia.tsx`
6. reorganizar pastas e imports

## Checklist de Validacao

### Dashboard

- filtros continuam aplicando carga de `GET /api/dashboard`
- KPIs continuam abrindo modal
- graficos continuam abrindo modal
- `tiposViolacao` continua aceitando variacoes de shape do backend
- `casosPorCor` continua aceitando aliases de serie

### Vigilancia

- os 6 endpoints continuam carregando em paralelo
- KPI de sobrecarga continua abrindo casos ativos
- KPI de fluxo continua abrindo casos do periodo esperado
- KPI de reincidencia continua abrindo casos reincidentes
- clique no mapa continua filtrando por bairro
- clique nos graficos continua filtrando por canal e violencia

### Drilldown

- toda traducao para `/api/casos` continua concentrada em um unico builder
- nenhuma acao clicavel relevante fica sem mapeamento
- modal renderiza loading, erro e lista
- navegacao para `/caso/:id` continua intacta

## Resultado Esperado

Ao final da refatoracao:

- o frontend continua usando o contrato real que existe hoje
- o drilldown continua unificado
- dashboard e vigilancia ficam menores e mais legiveis
- a reorganizacao estrutural deixa de ser o primeiro risco e vira apenas a ultima etapa

Esse plano assume uma postura mais pragmatica que a versao anterior: primeiro garantir o funcionamento simples sobre o contrato atual; depois organizar o codigo em torno disso.
