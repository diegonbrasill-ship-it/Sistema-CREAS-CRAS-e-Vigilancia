# Guia para o frontend - migracao do drill-down da Vigilancia e do Dashboard para `GET /api/casos`

## Objetivo

Substituir o uso de `GET /api/vigilancia/casos-filtrados` e padronizar tambem o drill-down do dashboard no endpoint canonico `GET /api/casos`, reaproveitando o mesmo contrato de listagem da entidade `casos`.

Esse ajuste reduz divergencias entre telas, elimina duplicacao de regra no backend e faz dashboard e vigilância falarem diretamente com o contrato oficial da entidade.

## Por que migrar

Hoje a rota `GET /api/vigilancia/casos-filtrados`:

- duplica a responsabilidade de listagem de casos
- aceita aliases legados fora do contrato principal
- possui bug de mapeamento em filtros como `por_canal` e `por_violencia`
- nao compartilha toda a mesma logica de `soft delete`, whitelist e filtros da entidade `casos`

Ja `GET /api/casos`:

- e a rota canonica da entidade
- ja aplica filtro de acesso por unidade
- ja ignora `deleted_at`
- ja possui parser de filtros com validacao
- ja mantem compatibilidade controlada com parte do legado

No dashboard, a migracao tambem e desejavel porque:

- a tela ainda carrega filtros legados como `filtro/valor`, `tecRef` e `dependeFinanceiro`
- o backend de `casos` ja possui contrato principal mais claro com `search`, `searchBy`, `status`, `mes` e `filters[...]`
- o drill-down do dashboard e o da vigilância podem convergir para o mesmo builder de query

## Rota alvo

Usar:

```http
GET /api/casos
```

Nao usar como fonte principal de drill-down:

```http
GET /api/vigilancia/casos-filtrados
```

## Shape de resposta esperado

O modal de drill-down pode continuar consumindo o shape atual de listagem:

```json
[
  {
    "id": 152,
    "nome": "Nome para teste",
    "tec_ref": "admin",
    "data_cad": "2026-03-22",
    "bairro": "Jatobá",
    "unit_id": 1
  }
]
```

Campos relevantes para o frontend:

- `id`
- `nome`
- `tec_ref`
- `data_cad`
- `bairro`
- `unit_id`

## Novo esquema de filtros

O contrato principal de listagem de casos passa a ser:

```http
GET /api/casos?
  search=maria&
  searchBy=q&
  status=Ativo&
  mes=2026-03&
  sortBy=data_cad&
  sortOrder=desc&
  filters[bairro]=Centro&
  filters[tipoViolencia]=FISICA
```

### Parametros principais

- `search`
  - texto de busca
- `searchBy`
  - valores aceitos: `q`, `nome`, `cpf`, `nis`, `tec_ref`
- `status`
  - `Ativo`, `Desligado`, `Arquivado`, `todos`
- `mes`
  - formato `YYYY-MM`
- `sortBy`
  - `data_cad`, `nome`, `tec_ref`
- `sortOrder`
  - `asc`, `desc`
- `filters[...]`
  - filtros funcionais da entidade

## Regra geral para Dashboard e Vigilancia

O frontend deve tratar o drill-down de dashboard e vigilância como o mesmo caso de uso:

- selecionar um insight
- converter esse insight para o contrato canonico de `GET /api/casos`
- abrir o modal com a resposta da rota de `casos`

Em outras palavras:

- dashboard nao deve montar uma query propria fora do contrato de `casos`
- vigilância nao deve usar uma rota dedicada de listagem
- ambos devem reaproveitar o mesmo builder de filtros

## Inventario obrigatorio dos filtros usados na UI

Antes de concluir a migracao, e necessario levantar todos os filtros realmente usados no drill-down do dashboard e da vigilância.

Sem esse inventario, a migracao fica incompleta e o frontend corre dois riscos:

- deixar filtros reais da interface fora do contrato novo
- mapear apenas o nome do campo e esquecer regras de valor, combinacao e default

O inventario deve ser feito por ponto de entrada da UI:

- cards
- graficos
- rankings
- tabelas
- busca textual
- filtros auxiliares do modal

Para cada acao de drill-down, registrar:

- tela de origem
- componente ou insight clicado
- query atual enviada pelo frontend
- rota atual usada
- campo real consultado hoje no backend
- campo canonico alvo em `GET /api/casos`
- transformacao de valor necessaria
- filtros adicionais necessarios
- necessidade de `status=todos`
- observacoes de compatibilidade

### Estrutura recomendada do inventario

Usar uma matriz simples como esta:

| Tela | Origem | Query atual | Campo backend atual | Contrato novo | Transformacao | Observacoes |
| ---- | ------ | ----------- | ------------------- | ------------- | ------------- | ----------- |
| Dashboard | Casos por bairro | `filtro=por_bairro&valor=Centro` | `bairro` | `filters[bairro]=Centro` | nenhuma | usar `status=todos` se a base do card nao for so ativos |
| Dashboard | Busca textual | `filtro=q&valor=maria` | busca multi-campo | `search=maria&searchBy=q` | nenhuma | nao usar mais `filtro/valor` |
| Dashboard | Casos por sexo | `filtro=sexo&valor=Masculino` | `sexo` | `filters[sexo]=MASCULINO` | `Masculino -> MASCULINO` | usar enum canonico |
| Vigilancia | Casos por canal | `filtro=por_canal&valor=DISQUE_100_180` | `canal` legado/bugado | `filters[canalDenuncia]=DISQUE_100_180` | nenhuma | elimina bug de `por_canal` |
| Vigilancia | Casos reincidentes | `filtro=reincidentes&valor=Sim` | `reincidente` | `filters[reincidente]=Sim` | `reincidentes -> reincidente` | usar nome canonico |

### O que precisa ser mapeado

Nao basta mapear apenas o nome do campo. Tambem e necessario mapear:

- aliases legados de filtro
- aliases legados de valor
- filtros derivados
- combinacoes de filtros por tela
- defaults implicitos

Exemplos:

- `por_bairro` -> `filters[bairro]`
- `por_violencia` -> `filters[tipoViolencia]`
- `por_canal` -> `filters[canalDenuncia]`
- `reincidentes` -> `filters[reincidente]`
- `filtro=q&valor=maria` -> `search=maria&searchBy=q`
- `tecRef` -> `search=<valor>&searchBy=tec_ref`
- `sexo=Masculino` -> `filters[sexo]=MASCULINO`
- `confirmacaoViolencia + mes` -> `filters[confirmacaoViolencia] + mes`
- `dataCad=ultimos_30_dias` -> decidir se vira filtro derivado canonico ou regra especifica da UI

### Resultado esperado do inventario

Ao final do levantamento:

- todo drill-down do dashboard deve ter traducao explicita para o contrato de `casos`
- todo drill-down da vigilância deve ter traducao explicita para o contrato de `casos`
- o frontend passa a ter um builder unico baseado nesse mapa
- qualquer filtro sem correspondencia clara vira pendencia de contrato e nao implementacao ad hoc

## Filtros funcionais disponiveis

Os filtros permitidos hoje para `GET /api/casos` sao:

- `filters[bairro]`
- `filters[tipoViolencia]`
- `filters[canalDenuncia]`
- `filters[sexo]`
- `filters[racaCor]`
- `filters[escolaridade]`
- `filters[confirmacaoViolencia]`
- `filters[membroSocioeducacao]`
- `filters[recebeBPC]`
- `filters[vinculoAgressor]`
- `filters[coabitaComAgressor]`
- `filters[dependeFinanceiro]`
- `filters[faixaEtariaAgressor]`
- `filters[sexoAgressor]`
- `filters[tipoResidencia]`
- `filters[formaOcupacao]`
- `filters[materialConstrucao]`
- `filters[encaminhadaSCFV]`
- `filters[reincidente]`
- `filters[faixaEtariaVitima]`

Observacao:

- `dependeFinanceiro` ainda e um nome de transicao. O frontend nao deve criar um nome alternativo novo sem alinhamento previo com o backend.

## Mapeamento de filtros antigos para o formato novo

### Drill-down da Vigilancia

Substituicoes recomendadas:

- `filtro=por_bairro&valor=Centro`
  - usar `filters[bairro]=Centro`
- `filtro=por_canal&valor=DISQUE_100_180`
  - usar `filters[canalDenuncia]=DISQUE_100_180`
- `filtro=por_violencia&valor=FISICA`
  - usar `filters[tipoViolencia]=FISICA`
- `filtro=reincidentes&valor=Sim`
  - usar `filters[reincidente]=Sim`

### Drill-down do Dashboard

Substituicoes recomendadas:

- `filtro=q&valor=maria`
  - usar `search=maria&searchBy=q`
- `filtro=sexo&valor=Masculino`
  - usar `filters[sexo]=MASCULINO`
- `filtro=canalDenuncia&valor=DISQUE_100_180`
  - usar `filters[canalDenuncia]=DISQUE_100_180`
- `filtro=por_bairro&valor=Centro`
  - usar `filters[bairro]=Centro`
- `filtro=por_violencia&valor=FISICA`
  - usar `filters[tipoViolencia]=FISICA`
- `filtro=confirmacaoViolencia&valor=Confirmada&mes=2026-03`
  - usar `mes=2026-03&filters[confirmacaoViolencia]=Confirmada`
- `filtro=dependeFinanceiro&valor=Sim`
  - usar `filters[dependeFinanceiro]=Sim`

Observacao:

- o frontend nao deve continuar emitindo `filtro/valor` como formato principal
- se houver codigo legado que ainda usa esse shape, ele deve ser encapsulado num adapter local temporario e removido depois

### Filtro por tecnico

Se hoje a tela usa `tecRef`, padronizar para:

```http
GET /api/casos?search=nome-do-tecnico&searchBy=tec_ref
```

O backend ainda possui compatibilidade com `tecRef`, mas isso deve ser tratado como legado.

### Filtro por periodo recente

Se hoje a tela usa:

```http
GET /api/vigilancia/casos-filtrados?filtro=dataCad&valor=ultimos_30_dias
```

o frontend deve passar a tratar isso como um caso de UI e nao como nome de filtro cru.

Recomendacoes:

- opcao 1
  - continuar usando KPI especifico da vigilância para os ultimos 30 dias, sem abrir drill-down por esse atalho
- opcao 2
  - ao abrir drill-down, converter o periodo selecionado para filtros do contrato de `casos`
- opcao 3
  - se o backend expuser filtro derivado canonico para ultimos 30 dias, consumir esse novo nome e aposentar `dataCad`

No estado atual, `mes=YYYY-MM` e o filtro temporal canonico suportado por `GET /api/casos`.

## Exemplos praticos

### Casos por bairro

```http
GET /api/casos?status=todos&filters[bairro]=Centro
```

### Casos por canal de denuncia

```http
GET /api/casos?status=todos&filters[canalDenuncia]=DISQUE_100_180
```

### Casos por tipo de violencia

```http
GET /api/casos?status=todos&filters[tipoViolencia]=FISICA
```

### Casos reincidentes

```http
GET /api/casos?status=todos&filters[reincidente]=Sim
```

### Casos confirmados no mes

```http
GET /api/casos?status=todos&mes=2026-03&filters[confirmacaoViolencia]=Confirmada
```

### Busca textual do dashboard

```http
GET /api/casos?status=todos&search=maria&searchBy=q
```

### Casos por sexo

```http
GET /api/casos?status=todos&filters[sexo]=MASCULINO
```

### Casos com dependencia financeira

```http
GET /api/casos?status=todos&filters[dependeFinanceiro]=Sim
```

### Casos filtrados por tecnico

```http
GET /api/casos?status=todos&search=Maria%20Silva&searchBy=tec_ref
```

## Regra importante sobre `status`

`GET /api/casos` usa `status=Ativo` por default.

Portanto, sempre que o drill-down da vigilância precisar representar o universo completo do indicador, o frontend deve enviar explicitamente:

```http
status=todos
```

Sem isso, a listagem ficara restrita aos casos ativos.

## Recomendacoes de implementacao no frontend

### 1. Criar um builder unico de query de drill-down

Criar uma funcao central para montar a query de `GET /api/casos`.

Essa funcao deve:

- receber o tipo de insight clicado no grafico ou card
- traduzir para o contrato canonico
- montar `filters[...]`
- incluir `status=todos` quando o drill-down exigir base completa

Esse builder deve ser unico para:

- dashboard
- vigilância

### 2. Parar de enviar nomes legados de filtro

Evitar enviar do frontend:

- `por_bairro`
- `por_canal`
- `por_violencia`
- `reincidentes`
- `dataCad`
- `tecRef`
- `q` como `filtro=q&valor=...`
- `sexo` no formato textual legado `Masculino` ou `Feminino`

Usar sempre:

- `filters[bairro]`
- `filters[canalDenuncia]`
- `filters[tipoViolencia]`
- `filters[reincidente]`
- `searchBy=tec_ref`
- `search=<texto>&searchBy=q`
- `filters[sexo]=MASCULINO|FEMININO|INTERSEXO`

### 3. Centralizar o contrato numa camada de service

Recomendacao:

- a pagina da vigilância nao deve concatenar query string manualmente
- a montagem da query deve ficar em um helper ou service unico

## Estrategia de migracao

### Etapa 1

- adaptar dashboard e vigilância para consumir `GET /api/casos`
- manter o modal de drill-down sem mudar o shape de leitura

### Etapa 2

- substituir todas as chamadas de `/api/vigilancia/casos-filtrados`
- substituir as montagens legadas de query do dashboard
- validar os cenarios de bairro, canal, violencia, reincidencia, tecnico, sexo, busca textual e confirmacao de violencia por mes

### Etapa 3

- apos validacao, remover o uso da rota antiga da vigilância
- remover adapters locais de `filtro/valor` no dashboard, se ainda existirem

## Checklist de validacao

- clicar em bairro abre modal com `filters[bairro]`
- clicar em canal abre modal com `filters[canalDenuncia]`
- clicar em violencia abre modal com `filters[tipoViolencia]`
- clicar em reincidencia abre modal com `filters[reincidente]=Sim`
- clicar em filtro por tecnico usa `search` + `searchBy=tec_ref`
- drill-down do dashboard por sexo usa `filters[sexo]` com enum canonico
- drill-down do dashboard por busca textual usa `search` + `searchBy=q`
- drill-down do dashboard por confirmacao no mes usa `mes` + `filters[confirmacaoViolencia]`
- drill-down que precisa olhar todo o universo envia `status=todos`
- nenhum ponto novo do frontend usa `por_*`, `dataCad`, `tecRef` ou `filtro/valor` como formato principal

## Resultado esperado

Ao final da migracao:

- a vigilância deixa de depender de uma rota propria para listar casos
- o dashboard deixa de depender de query params legados como formato principal
- o frontend passa a usar o contrato oficial da entidade `casos`
- drill-down de dashboard e vigilância convergem para o mesmo esquema de filtros
- o backend pode reduzir a compatibilidade legada para uma camada temporaria pequena
