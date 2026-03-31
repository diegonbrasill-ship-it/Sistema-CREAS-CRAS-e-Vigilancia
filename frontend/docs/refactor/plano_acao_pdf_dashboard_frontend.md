# Plano de Acao - Geracao de PDF no Dashboard pelo Frontend

Documento de execucao para introduzir uma estrutura basica de geracao de PDF no frontend, tomando como base o estado atual do codigo em `2026-03-25`.

Referencias usadas nesta analise:

- `docs/arquitetura_front.md`
- `src/pages/dashboard/Dashboard.tsx`
- `src/pages/dashboard/hooks/useDashboardData.ts`
- `src/pages/dashboard/hooks/useDashboardPresentation.ts`
- `src/pages/dashboard/components/DashboardHeader.tsx`
- `src/pages/dashboard/components/DashboardFilters.tsx`
- `src/pages/dashboard/components/DashboardKpiSection.tsx`
- `src/pages/dashboard/components/DashboardChartSection.tsx`
- `src/pages/dashboard/adapters/dashboardCharts.ts`
- `src/services/api.ts`
- `src/pages/Relatorios.tsx`
- `package.json`

## 1. Objetivo

Implementar uma base de geracao de PDF para o `Dashboard` que:

- reutilize os dados ja carregados na tela
- mantenha a transformacao desacoplada da interface visual principal
- siga a organizacao modular ja existente em `src/pages/dashboard`
- respeite os contratos atuais de `api.ts`
- permita evolucao futura sem reescrever a base

O PDF deve representar o estado atual do dashboard e seus filtros, sem tentar replicar a arvore visual de `Recharts` ou a estrutura JSX da pagina.

## 2. Estado atual encontrado

O modulo do dashboard ja possui um desenho que deve ser preservado:

- `Dashboard.tsx` atua como pagina orquestradora
- `useDashboardData.ts` concentra carregamento, filtros e loading
- `useDashboardPresentation.ts` isola o modo apresentacao
- `dashboardCharts.ts` ja faz adaptacao e normalizacao de series
- `DashboardHeader.tsx`, `DashboardFilters.tsx`, `DashboardKpiSection.tsx` e `DashboardChartSection.tsx` ficam focados em UI

Contratos e dados ja disponiveis na tela:

- `DashboardApiDataType` em `src/services/api.ts`
- `ApiResponse` em `src/services/api.ts`
- filtros da tela em `DashboardFilters`:
  - `mes`
  - `tecRef`
  - `bairro`
- resposta ja normalizada por `normalizeDashboardResponse()`
- series de grafico ja tratadas por `resolveChartSeries()`

Dependencias ja instaladas e reaproveitaveis:

- `jspdf`
- `jspdf-autotable`

Estado atual de PDF no projeto:

- `src/pages/Relatorios.tsx` ja implementa download de PDF vindo da API
- nao existe hoje um fluxo consolidado de PDF client-side no dashboard
- nao existe no codigo um padrao ativo com `@react-pdf/renderer`

## 3. Decisao arquitetural

Para manter aderencia com a base atual, a implementacao do PDF do dashboard deve seguir estes principios:

- ficar dentro do modulo `src/pages/dashboard`, e nao em uma estrutura global nova
- reutilizar `DashboardApiDataType` como contrato de origem
- criar uma camada de adaptacao explicita para o PDF, no mesmo espirito de `dashboardCharts.ts`
- tratar a geracao do documento como renderer proprio, sem depender de contexto, store ou fetch
- manter a pagina principal responsavel apenas pelo fluxo do usuario

Decisao pratica:

- nao introduzir nova biblioteca de PDF sem necessidade
- usar `jspdf` e `jspdf-autotable`, que ja fazem parte do projeto
- evitar um "componente React de PDF" se isso obrigar a introduzir um stack novo
- modelar o documento como um renderer puro que recebe dados tratados e devolve `jsPDF` ou dispara o download

## 4. Estrutura minima recomendada

Seguir o padrao modular que o proprio dashboard ja usa hoje:

```text
src/pages/dashboard/
├── Dashboard.tsx
├── adapters/
│   ├── dashboardCharts.ts
│   └── dashboardPdf.ts
├── pdf/
│   └── renderDashboardPdf.ts
├── hooks/
│   ├── useDashboardData.ts
│   └── useDashboardPresentation.ts
└── components/
    └── ...
```

Responsabilidade de cada nova unidade:

- `adapters/dashboardPdf.ts`
  - recebe `dashboardData`, filtros atuais e dados derivados necessarios
  - transforma o estado da tela em um modelo especifico para documento
  - concentra labels, blocos, tabelas e agregacoes necessarias ao PDF
- `pdf/renderDashboardPdf.ts`
  - recebe apenas o modelo adaptado
  - monta cabecalho, secoes, tabelas e metadados do documento
  - nao conhece `useState`, `toast`, `fetch`, `store` nem componentes visuais do dashboard

Estruturas a evitar:

- criar DTO paralelo para repetir `DashboardApiDataType` inteiro sem necessidade
- colocar regra de PDF dentro de `DashboardChartSection.tsx` ou `DashboardKpiSection.tsx`
- colocar geracao de `jsPDF` diretamente dentro de `api.ts`
- introduzir um modulo global de exportacao sem demanda real de reuso imediato

## 5. Inventario dos dados que o PDF pode usar

Os dados abaixo ja estao disponiveis na tela e devem ser a base do documento:

### 5.1 Filtros ativos

Origem: `useDashboardData.ts`

- `mes`
- `tecRef`
- `bairro`

Esses filtros devem entrar no PDF como contexto do relatorio, nao como dependencia para um novo fetch.

### 5.2 Indicadores

Origem: `DashboardApiDataType["indicadores"]`

- `totalAtendimentos`
- `novosNoMes`
- `inseridosPAEFI`
- `reincidentes`
- `recebemBolsaFamilia`
- `recebemBPC`
- `violenciaConfirmada`
- `notificadosSINAN`
- `contextoFamiliar`

### 5.3 Principais campos-resumo

Origem: `DashboardApiDataType["principais"]`

- `moradiaPrincipal`
- `escolaridadePrincipal`
- `violenciaPrincipal`
- `localPrincipal`

### 5.4 Series graficas

Origem: `DashboardApiDataType["graficos"]` e `dashboardCharts.ts`

- `casosPorBairro`
- `tiposViolacao` com fallback por `resolveChartSeries()`
- `encaminhamentosTop5`
- `casosPorSexo`
- `canalDenuncia`
- `casosPorCor` com fallback por `resolveChartSeries()`
- `casosPorFaixaEtaria`

Decisao recomendada para a primeira versao:

- representar esses dados no PDF como tabelas e resumos numericos
- nao tentar exportar os graficos de `Recharts` como imagem na primeira entrega

Isso reduz acoplamento, evita rasterizacao da UI e respeita a diretriz de tratar o PDF como representacao de dados.

## 6. Modelo alvo de responsabilidades

### 6.1 Tela principal

`Dashboard.tsx` deve continuar responsavel por:

- capturar o clique do usuario
- validar se ha dados carregados
- controlar estado de `isGeneratingPdf`
- chamar o adapter
- chamar o renderer do PDF
- tratar `toast`, `disabled` e erros

### 6.2 Camada de adaptacao

`adapters/dashboardPdf.ts` deve:

- receber o estado atual da pagina
- reutilizar `DashboardApiDataType`
- reaproveitar `resolveChartSeries()` quando houver aliases de grafico
- centralizar formatacao de secoes e rotulos do documento
- montar um modelo previsivel para o renderer

### 6.3 Renderer do documento

`pdf/renderDashboardPdf.ts` deve:

- receber o modelo pronto
- definir layout, ordem das secoes e tabelas
- usar `jsPDF` e `autoTable`
- retornar ou salvar o documento

## 7. Plano de implementacao

## Etapa 1 - Confirmar contratos e pontos de reuso

### Objetivo

Fechar o inventario dos contratos reais antes de criar qualquer estrutura de PDF.

### Tarefas

1. Confirmar que `DashboardApiDataType` cobre todo o conteudo necessario.
2. Confirmar se `resolveChartSeries()` ja resolve os aliases que tambem precisam ser exibidos no PDF.
3. Confirmar se ha helpers de data ou labels em `src/utils/` que devam ser reutilizados no documento.
4. Confirmar o ponto exato de acao na UI:
   - botao no `DashboardHeader.tsx`
   - handler definido em `Dashboard.tsx`

### Criterio de aceite

- nenhum tipo novo e criado sem verificar contratos ja existentes
- a fonte de verdade do PDF fica rastreada para cada bloco do documento

## Etapa 2 - Definir o modelo de adaptacao do PDF

### Objetivo

Criar um modelo intermediario minimo entre o estado bruto da tela e o renderer do documento.

### Recomendacao

Criar em `src/pages/dashboard/adapters/dashboardPdf.ts`:

- tipo de entrada baseado em:
  - `DashboardApiDataType`
  - `DashboardFilters`
- tipo de saida focado em documento, por exemplo:
  - metadados do relatorio
  - resumo de filtros aplicados
  - cards KPI
  - destaques principais
  - tabelas por secao

### Regras

- o modelo intermediario nao deve copiar o shape inteiro da API sem criterio
- ele deve refletir o que o documento precisa renderizar
- qualquer label de exibicao deve ficar nesta camada, nao espalhada no renderer

### Criterio de aceite

- existe um modelo de PDF previsivel, tipado e desacoplado do JSX da pagina

## Etapa 3 - Implementar o adapter do dashboard para PDF

### Objetivo

Transformar os dados atuais da tela em um payload pronto para renderizacao.

### Tarefas

1. Receber `dashboardData` e `filters`.
2. Reaproveitar `resolveChartSeries()` para:
   - `tiposViolacao`
   - `casosPorCor`
3. Consolidar secoes do documento:
   - cabecalho do relatorio
   - contexto dos filtros
   - indicadores gerais
   - perfil socioeconomico
   - indicadores de violencia
   - contexto familiar
   - tabelas das series graficas
4. Reutilizar utilitarios existentes de data ou formatacao quando aplicavel.

### Criterio de aceite

- o adapter produz o mesmo conteudo independentemente da UI visivel
- nao ha dependencia de componente React dentro do adapter

## Etapa 4 - Implementar o renderer do PDF

### Objetivo

Criar o modulo que monta o PDF a partir do modelo adaptado.

### Tarefas

1. Criar `src/pages/dashboard/pdf/renderDashboardPdf.ts`.
2. Implementar cabecalho com titulo, data/hora de geracao e filtros ativos.
3. Implementar secoes em ordem estavel.
4. Usar `jspdf-autotable` nas series e listas.
5. Definir nome de arquivo previsivel, por exemplo:
   - `dashboard_paefi_YYYY-MM-DD.pdf`
   - ou com filtros relevantes, se isso ja for padrao aceito na aplicacao

### Regras

- nao renderizar a arvore JSX do dashboard
- nao depender de `recharts`
- nao acessar `window` ou estado da pagina alem do necessario para salvar o arquivo

### Criterio de aceite

- o renderer recebe apenas dados tratados
- a ordem do documento e reproduzivel

## Etapa 5 - Integrar com a pagina sem quebrar o fluxo atual

### Objetivo

Adicionar a acao de exportacao ao dashboard seguindo o mesmo estilo de interacao do projeto.

### Integracao recomendada

1. Adicionar o gatilho visual em `DashboardHeader.tsx`.
2. Manter o handler em `Dashboard.tsx`.
3. Criar um estado local `isGeneratingPdf`.
4. Desabilitar o botao durante a geracao.
5. Exibir `toast.success` e `toast.error` no mesmo padrao ja usado na pagina.

### Comportamento esperado

- se `dashboardData` ainda nao existir, nao gerar PDF
- se a tela estiver carregando, o botao deve respeitar o estado de loading
- o PDF deve refletir exatamente os filtros ativos no momento do clique

### Criterio de aceite

- a pagina continua sendo o ponto de orquestracao do fluxo do usuario
- a geracao de PDF nao invade componentes de visualizacao

## Etapa 6 - Validacao funcional e regressao

### Objetivo

Garantir que o PDF use os dados certos e nao duplique regras de negocio.

### Checklist minimo

- o PDF usa `dashboardData` ja carregado
- os filtros exibidos no PDF batem com os filtros ativos da tela
- `tiposViolacao` e `casosPorCor` usam a mesma normalizacao do dashboard visual
- nenhum total e recalculado com logica paralela desnecessaria
- o documento e gerado sem nova chamada HTTP
- o botao respeita loading e disabled

### Validacao tecnica

- revisar o PDF em cenarios com e sem filtros
- validar comportamento com dados vazios
- validar comportamento com labels longas em tabelas
- rodar `npm run build` ao final da implementacao

## 8. Sugestao de escopo para a primeira entrega

Para reduzir risco, a primeira versao deve incluir:

- cabecalho do relatorio
- resumo dos filtros aplicados
- KPIs principais
- principais destaques textuais
- series graficas convertidas em tabelas

Fora de escopo da primeira entrega:

- imagens dos graficos
- fidelidade visual ao layout do dashboard
- exportacao multi-pagina com diagramacao avancada
- compartilhamento automatico do mesmo documento com outras telas

## 9. Riscos e cuidados

### Risco 1 - Duplicar contratos

Se o PDF criar um shape proprio paralelo ao contrato da API, a manutencao vai divergir rapido.

Mitigacao:

- partir de `DashboardApiDataType`
- criar apenas um modelo intermediario minimo

### Risco 2 - Duplicar regras de negocio

Se o PDF recalcular indicadores ou reimplementar normalizacoes, pode divergir do dashboard.

Mitigacao:

- reutilizar dados ja normalizados
- reaproveitar `resolveChartSeries()`
- centralizar labels e transformacoes no adapter

### Risco 3 - Acoplamento com a UI

Capturar grafico por screenshot ou reaproveitar JSX da pagina aumenta fragilidade.

Mitigacao:

- renderizar tabelas e secoes a partir do estado de dados

### Risco 4 - Crescimento desnecessario da arquitetura

Criar hooks, services ou estrutura global nova antes da hora aumenta custo sem beneficio.

Mitigacao:

- comecar com apenas dois novos arquivos no modulo `dashboard`
- extrair um hook dedicado so se a orquestracao crescer de fato

## 10. Definicao de pronto

Esta implementacao so deve ser considerada concluida quando:

- o dashboard exportar PDF usando apenas dados ja carregados
- a pagina continuar organizada por responsabilidades
- o adapter do PDF estiver separado do renderer
- o renderer nao depender da interface visual principal
- o fluxo respeitar loading, erro e feedback visual ja usados no projeto
- o build do frontend passar sem regressao

## 11. Ordem recomendada de execucao

1. Fechar inventario de contratos e helpers reaproveitaveis.
2. Criar `adapters/dashboardPdf.ts`.
3. Criar `pdf/renderDashboardPdf.ts`.
4. Integrar acao no `DashboardHeader.tsx` e handler em `Dashboard.tsx`.
5. Validar com cenarios sem filtro, com filtro e com dados vazios.
6. Executar build e revisar o PDF gerado.

## 12. Resumo executivo

O caminho mais aderente ao projeto atual e implementar o PDF como uma extensao do modulo `dashboard`, reaproveitando:

- `DashboardApiDataType` como contrato de origem
- `useDashboardData` como fonte do estado atual da tela
- `dashboardCharts.ts` como referencia de adaptacao
- `jspdf` e `jspdf-autotable` como stack de geracao

Com isso, a solucao fica pequena, previsivel e alinhada com a arquitetura existente:

- `Dashboard.tsx` orquestra
- `adapters/dashboardPdf.ts` adapta
- `pdf/renderDashboardPdf.ts` renderiza

Esse desenho atende a necessidade atual sem impor uma arquitetura paralela ao restante do sistema.
