# Arquitetura do Modulo de Cadastro

Documento de referencia tecnica do modulo de Cadastro de casos no frontend React/TypeScript, revisado contra o codigo em `2026-03-23`.

## 1. Escopo

Este documento consolida a arquitetura especifica do modulo de Cadastro a partir do estado real do codigo e dos docs existentes.

Ele cobre:

- organizacao do modulo no frontend
- rotas e permissoes
- fluxo de criacao e de edicao
- hook principal e ciclo do formulario
- schemas, tabs e opcoes canonicas
- contratos JSON de escrita e leitura
- shape total do modelo de dados usado pelo frontend
- pontos de divergencia entre arquitetura pretendida e comportamento atual

Fontes principais usadas nesta revisao:

- `docs/arquitetura_front.md`
- `docs/cadastro/cadastro_models.md`
- `docs/cadastro/formulario-cadastro.md`
- `docs/cadastro/inventario_cadastro_legacy.md`
- `src/App.tsx`
- `src/pages/Cadastro/*`
- `src/services/api.ts`
- `src/pages/CasoDetalhe.tsx`

## 2. Posicao do modulo na arquitetura geral

O modulo de Cadastro segue o padrao principal do frontend:

```text
rota protegida
  -> pagina container
  -> hook de orquestracao
  -> react-hook-form + zod
  -> tabs/componentes por secao
  -> adapters para traducao API <-> formulario
  -> services/api.ts para comunicacao HTTP
```

No contexto da SPA:

- a autenticacao vem de `AuthContext`
- as permissoes de casos sao aplicadas em `App.tsx`
- o layout e fornecido por `Layout`
- os toasts sao globais

## 3. Rotas e permissoes

Rotas do modulo:

- `/cadastro`
  - abre o fluxo de criacao
  - requer permissao `casos.create`
- `/cadastro/:id`
  - abre o fluxo de edicao
  - requer permissao `casos.edit`
- `/caso/:id`
  - exibe o prontuario detalhado
  - requer permissao `casos.read`

Isso cria uma separacao funcional clara:

- `Cadastro` e a tela de coleta/edicao
- `CasoDetalhe` e a tela de leitura operacional do prontuario

## 4. Estrutura de arquivos do modulo

```text
src/pages/Cadastro/
├── Cadastro.tsx
├── useCadastroForm.ts
├── schema.ts
├── adapters.ts
├── options.ts
└── components/
   ├── TabAtendimento.tsx
   ├── TabVitima.tsx
   ├── TabFamilia.tsx
   ├── TabSaude.tsx
   ├── TabEncaminhamentos.tsx
   ├── TabAgressor.tsx
   └── TabMoradia.tsx
```

Responsabilidades:

- `Cadastro.tsx`
  - compoe a tela
  - controla `Tabs`
  - renderiza botoes de acao
- `useCadastroForm.ts`
  - decide modo criacao/edicao
  - monta `useForm`
  - carrega dados para edicao
  - executa submit
  - controla aba ativa
- `schema.ts`
  - define validacao Zod
  - define `CasoForm`
  - mapeia campos por aba
- `adapters.ts`
  - converte payloads da API para valores do formulario
  - converte valores do formulario para payloads de create/update
  - aplica normalizacao e compatibilidade legado/canonico
- `options.ts`
  - centraliza valores e labels de selects
- `components/Tab*.tsx`
  - implementam a UI de cada etapa do formulario

## 5. Fluxo funcional atual

### 5.1 Fluxo de criacao

Fluxo atual real:

```text
/cadastro
  -> useCadastroForm detecta ausencia de id
  -> usa o mesmo schema de submissao da edicao
  -> preenche data_cad com hoje
  -> preenche tec_ref a partir do usuario autenticado
  -> mantem todas as abas acessiveis
  -> submit faz POST /api/casos
  -> backend retorna id
  -> frontend navega para /cadastro/:id ou /caso/:id, conforme a acao
```

Consequencias do desenho atual:

- a criacao so persiste quando o prontuario completo estiver valido
- o caso nao nasce mais como registro parcial
- as abas nao dependem mais da existencia de `id`
- a validacao de criacao e a mesma da edicao
- o feedback de erro aparece nos dois modos

### 5.2 Fluxo de edicao

Fluxo atual real:

```text
/cadastro/:id
  -> useCadastroForm detecta id
  -> usa editSchema
  -> chama GET /api/casos/:id
  -> caseToFormValues() converte resposta em shape de formulario
  -> reset do RHF com os valores carregados
  -> submit coleta dirtyFields
  -> monta payload parcial
  -> envia PUT /api/casos/:id
  -> navega para /caso/:id
```

Observacoes:

- a edicao faz patch parcial em vez de reenvio completo
- `data_cad` e `tec_ref` continuam sendo enviados junto ao patch
- o texto do botao fala em "Salvar Progresso", mas o fluxo atual ja redireciona para o detalhe do caso

### 5.3 Relacao com o detalhe do caso

`CasoDetalhe.tsx` usa `getCasoById(id)` e:

- exibe dados de topo do caso
- achata `dados_completos` para renderizacao
- oferece retorno para `/cadastro/:id`
- agrega operacoes laterais do caso:
  - acompanhamentos
  - encaminhamentos
  - anexos
  - mudanca de status
  - exclusao

Ou seja, o modulo de Cadastro e responsavel pela coleta e manutencao do prontuario, enquanto `CasoDetalhe` e o ponto operacional de continuidade do caso.

## 6. Hook principal: `useCadastroForm`

`useCadastroForm.ts` e o centro da arquitetura do modulo.

### 6.1 Entradas do hook

Dependencias principais:

- `useParams()` para obter `id`
- `useNavigate()` para transicoes entre criacao, edicao e detalhe
- `useAuth()` para obter o usuario autenticado
- `createCase`, `getCasoById` e `updateCase` de `api.ts`

### 6.2 Decisoes de modo

O hook deriva:

- `isEditMode = !!id`
- `formSchema = submitSchema` nos dois modos

### 6.3 Inicializacao do formulario

`useForm<CasoForm>` inicia com:

- `data_cad = hoje`
- `tec_ref = ""`
- `tipoViolencia = ""`
- `canalDenuncia = ""`

Depois, o `useEffect` aplica:

- no modo edicao: carga da API e `reset(...)`
- no modo criacao: `reset(...)` com `data_cad` e `tec_ref` vindos do usuario autenticado

### 6.4 Derivacao de `tec_ref`

`tec_ref` e montado no frontend a partir do usuario autenticado:

- base: `user.nome_completo` ou `user.username`
- se `role` inclui `tecnico` e ha `cargo`, concatena `Nome - Cargo`

Isso afeta:

- o valor mostrado no formulario
- o payload de create
- o payload de update

### 6.5 Estado local de UI

O hook controla:

- `isDataLoading`
- `activeTab`
- `isSubmitting` via RHF

### 6.6 Comportamento de submit

Criacao:

- converte `CasoForm` em payload de create via `formValuesToCreatePayload`
- faz `POST /api/casos`
- espera o `id` de retorno
- navega para `/cadastro/:id`

Edicao:

- aborta se `dirtyFields` estiver vazio
- coleta apenas os campos alterados
- reanexa `data_cad` e `tec_ref`
- converte via `formValuesToUpdatePayload`
- faz `PUT /api/casos/:id`
- hoje redireciona para `/caso/:id`

### 6.7 Observacao importante de arquitetura

O hook hoje mistura:

- orquestracao do RHF
- politicas de criacao x edicao
- navegacao
- semantica de "salvar" e "finalizar"

Isso e aceitavel para o tamanho atual do modulo, mas faz dele o ponto mais sensivel a regressao.

## 7. Modelo de formulario no frontend

O tipo efetivo do formulario e `CasoForm`, inferido de `editSchema`.

### 7.1 Campos de topo do formulario

- `data_cad`
- `tec_ref`

### 7.2 Campos da aba Atendimento

- `tipoViolencia`
- `tipoViolenciaDescricoes`
- `canalDenuncia`
- `protocolo`
- `especificacaoOutroCanal`

### 7.3 Campos da aba Vitima

- `nome`
- `cpf`
- `nis`
- `idade`
- `sexo`
- `racaCor`
- `etniaIndigena`
- `bairro`
- `macroRegiao`
- `escolaridade`

### 7.4 Campos da aba Familia

- `rendaFamiliar`
- `recebePBF`
- `recebeBPC`
- `recebeBE`
- `membrosCadUnico`
- `membroPAI`
- `composicaoFamiliar`
- `referenciaFamiliar`
- `membroCarcerario`
- `membroSocioeducacao`

### 7.5 Campos da aba Saude

- `vitimaPCD`
- `vitimaPCDDetalhe`
- `tratamentoSaude`
- `tratamentoSaudeDetalhe`

### 7.6 Campos da aba Encaminhamentos

- `encaminhamento`
- `encaminhamentoDetalhe`
- `encaminhadaSCFV`
- `inseridoPAEFI`
- `confirmacaoViolencia`
- `notificacaoSINAN`
- `reincidente`

### 7.7 Campos da aba Agressor

- `vinculoAgressor`
- `especificacaoOutroVinculo`
- `coabitaComAgressor`
- `faixaEtariaAgressor`
- `sexoAgressor`
- `bairroAgressor`

### 7.8 Campos da aba Moradia

- `tipoResidencia`
- `formaOcupacao`
- `materialConstrucao`
- `valorAluguel`

### 7.9 Campos previstos no modelo, mas sem UI ativa

Estao no schema e no adapter, mas nao possuem controles atuais nas tabs:

- `orientacaoSexual`
- `identidadeGenero`
- `membroPAI` nao possui campo visual, embora exista no shape

## 8. Schemas e regras de validacao

O modulo possui dois schemas:

- `baseSchema`
  - usado na criacao
  - obrigatoriedade reduzida
- `editSchema`
  - usado na edicao
  - obrigatoriedade ampliada

### 8.1 O que ambos validam

Regras comuns importantes:

- `data_cad` obrigatoria
- `tec_ref` obrigatorio
- `tipoViolencia` usa enum fechado
- `tipoViolenciaDescricoes` deve ter pelo menos um item
- `canalDenuncia = OUTROS` exige `especificacaoOutroCanal`
- `vinculoAgressor = OUTROS` exige `especificacaoOutroVinculo`
- `racaCor = INDIGENA` exige `etniaIndigena`
- `tipoResidencia != SITUACAO_DE_RUA` exige `formaOcupacao` e `materialConstrucao`

### 8.2 Validacoes especificas

- `cpf`
  - validado por funcao propria
  - aceita vazio no fluxo atual de criacao
- `nis`
  - exige 11 digitos quando preenchido
  - aceita vazio na criacao
- `valorAluguel`
  - convertido para numero ou `null`
  - continua opcional neste ciclo

### 8.3 Diferenca estrutural entre criacao e edicao

Esse era um dos pontos centrais do modulo e foi corrigido:

- criacao e edicao agora compartilham o mesmo schema de submissao
- a diferenca entre os modos ficou restrita a:
  - carga inicial
  - metodo HTTP
  - navegacao apos salvar/finalizar

## 9. Opcoes e enums canonicos

`options.ts` centraliza os valores usados pela UI.

Enums principais:

- `SIM_NAO_OPTIONS`
- `ESCOLARIDADE_OPTIONS`
- `TIPO_VIOLENCIA_OPTIONS`
- `TIPO_VIOLENCIA_DESCRICOES_MAP`
- `CANAL_ORIGEM_OPTIONS`
- `RACA_COR_OPTIONS`
- `SEXO_OPTIONS`
- `ORIENTACAO_SEXUAL_OPTIONS`
- `IDENTIDADE_GENERO_OPTIONS`
- `VINCULO_AGRESSOR_OPTIONS`
- `FAIXA_ETARIA_AGRESSOR_OPTIONS`
- `SEXO_AGRESSOR_OPTIONS`
- `TIPO_RESIDENCIA_OPTIONS`
- `FORMA_OCUPACAO_OPTIONS`
- `MATERIAL_CONSTRUCAO_OPTIONS`

Observacoes de arquitetura:

- a UI ja esta migrada para varios enums canonicos
- ainda existem docs legados descrevendo campos antigos que nao batem com o codigo atual
- a centralizacao em `options.ts` reduz divergencia entre tabs e schema

## 10. Arquitetura das tabs

As tabs seguem um padrao uniforme:

- `useFormContext<CasoForm>()`
- `Controller` para `Select` e campos controlados
- `watch(...)` para condicionais
- `setValue(...)` para resets dependentes
- erros lidos de `formState.errors`

### 10.1 TabAtendimento

Comportamentos importantes:

- `tipoViolencia` reseta `tipoViolenciaDescricoes`
- `canalDenuncia` diferente de `OUTROS` limpa `especificacaoOutroCanal`
- `data_cad` e `tec_ref` ficam desabilitados quando `isEditMode = true`

### 10.2 TabVitima

Comportamentos importantes:

- CPF e NIS usam mascara
- `racaCor = INDIGENA` mostra `etniaIndigena`
- `bairro` preenchido mostra `macroRegiao`
- varias mensagens inline de erro so aparecem em edicao

### 10.3 TabFamilia

Comportamentos importantes:

- concentra selects textuais e campos binarios sociais
- `membroPAI` existe no shape, mas nao e renderizado na UI

### 10.4 TabSaude

Comportamentos importantes:

- `vitimaPCD = Sim` mostra `vitimaPCDDetalhe`
- `tratamentoSaude = Sim` mostra `tratamentoSaudeDetalhe`

### 10.5 TabEncaminhamentos

Comportamentos importantes:

- `encaminhamento = Sim` mostra `encaminhamentoDetalhe`
- concentra campos de fluxo institucional do caso

### 10.6 TabAgressor

Comportamentos importantes:

- `vinculoAgressor = OUTROS` mostra `especificacaoOutroVinculo`
- valor diferente de `OUTROS` limpa o campo condicional

### 10.7 TabMoradia

Comportamentos importantes:

- `tipoResidencia = SITUACAO_DE_RUA`
  - limpa `formaOcupacao`
  - limpa `materialConstrucao`
  - limpa `valorAluguel`
- `formaOcupacao != ALUGADA`
  - limpa `valorAluguel`

## 11. Camada de adapters

`adapters.ts` e a fronteira entre o modelo do formulario e o modelo da API.

Ele executa tres funcoes:

- leitura da API para o formulario
- escrita do formulario para create
- escrita parcial do formulario para update

### 11.1 `caseToFormValues()`

Converte `CasoDetalhado` em `Partial<CasoForm>`.

Leitura principal:

- prefere `dados_completos` quando existe
- usa fallbacks no topo do objeto quando necessario

Compatibilidades aceitas:

- `tipo_violencia -> tipoViolencia`
- `local_ocorrencia -> bairro`
- `canalOrigem -> canalDenuncia`
- `corEtnia -> racaCor`
- `notificacaoSINAM -> notificacaoSINAN`
- `tecRef -> tec_ref`
- `dataCad -> data_cad`

### 11.2 `sanitizeCasePayload()`

Normaliza o objeto antes de enviar:

- padroniza valores `Sim/Nao`
- faz `trim` de textos
- converte enums legados para canonicos
- normaliza descricoes de violencia
- limpa campos condicionais que nao se aplicam

### 11.3 `formValuesToCreatePayload()`

Gera o envelope de criacao:

```json
{
  "data_cad": "YYYY-MM-DD",
  "tec_ref": "Nome - Cargo",
  "unit_id": 1,
  "dados_completos_payload": {}
}
```

### 11.4 `formValuesToUpdatePayload()`

Gera o envelope de atualizacao:

```json
{
  "data_cad": "YYYY-MM-DD",
  "tec_ref": "Nome - Cargo",
  "dados_completos_payload": {}
}
```

Diferenca operacional:

- no update, `dados_completos_payload` tende a conter apenas o patch dos campos alterados

## 12. Contratos JSON usados pelo modulo

### 12.1 Contrato de escrita: criacao

Contrato atual enviado para `POST /api/casos`:

```json
{
  "data_cad": "2026-03-23",
  "tec_ref": "Nome do Tecnico - Cargo",
  "unit_id": 1,
  "dados_completos_payload": {
    "tipoViolencia": "FISICA",
    "tipoViolenciaDescricoes": ["ESPANCAMENTO"],
    "canalDenuncia": "DISQUE_100_180",
    "protocolo": "",
    "especificacaoOutroCanal": "",
    "nome": "",
    "cpf": "",
    "nis": "",
    "idade": "",
    "sexo": null,
    "racaCor": null,
    "etniaIndigena": "",
    "bairro": "",
    "macroRegiao": "",
    "escolaridade": null,
    "rendaFamiliar": "",
    "recebePBF": "",
    "recebeBPC": "",
    "recebeBE": "",
    "membrosCadUnico": "",
    "membroPAI": "",
    "composicaoFamiliar": "",
    "referenciaFamiliar": "",
    "membroCarcerario": "",
    "membroSocioeducacao": "",
    "vitimaPCD": "",
    "vitimaPCDDetalhe": "",
    "tratamentoSaude": "",
    "tratamentoSaudeDetalhe": "",
    "encaminhamento": "",
    "encaminhamentoDetalhe": "",
    "encaminhadaSCFV": null,
    "inseridoPAEFI": null,
    "confirmacaoViolencia": null,
    "notificacaoSINAN": null,
    "reincidente": null,
    "orientacaoSexual": null,
    "identidadeGenero": null,
    "vinculoAgressor": null,
    "coabitaComAgressor": null,
    "especificacaoOutroVinculo": "",
    "faixaEtariaAgressor": null,
    "bairroAgressor": "",
    "sexoAgressor": null,
    "tipoResidencia": null,
    "formaOcupacao": null,
    "materialConstrucao": null,
    "valorAluguel": null
  }
}
```

Observacao:

- o shape acima representa o envelope total aceito pelo frontend
- na criacao real, varios campos podem sair vazios por causa do `baseSchema`

### 12.2 Contrato de escrita: atualizacao

Contrato atual enviado para `PUT /api/casos/:id`:

```json
{
  "data_cad": "2026-03-23",
  "tec_ref": "Nome do Tecnico - Cargo",
  "dados_completos_payload": {
    "bairro": "Centro",
    "racaCor": "PARDA",
    "tipoResidencia": "CASA"
  }
}
```

Caracteristicas:

- payload parcial
- merge esperado no backend
- envelope identico ao de criacao, mas com conteudo reduzido

### 12.3 Contrato de leitura: detalhe do caso

Shape recomendado e mais estavel para `GET /api/casos/:id`:

```json
{
  "id": 152,
  "status": "Ativo",
  "unit_id": 1,
  "tec_ref": "Nome do Tecnico",
  "data_cad": "2026-03-23T03:00:00.000Z",
  "dados_completos": {
    "...": "..."
  },
  "demandas_vinculadas": []
}
```

O frontend hoje tolera:

- campos no topo
- `dados_completos`
- alias camelCase
- chaves legadas

Mas a arquitetura pretendida e:

- metadados no topo
- formulario inteiro em `dados_completos`

### 12.4 Contrato de leitura: listagens

Para consulta, dashboard e drilldown, o frontend trabalha melhor com:

```json
{
  "id": 152,
  "nome": "Nome da pessoa",
  "bairro": "Centro",
  "tec_ref": "Nome do Tecnico",
  "data_cad": "2026-03-23",
  "unit_id": 1
}
```

## 13. Shape total do modelo de dados do cadastro

Do ponto de vista do frontend, o modelo total do caso fica dividido em duas camadas:

### 13.1 Metadados do caso

- `id`
- `status`
- `unit_id`
- `tec_ref`
- `data_cad`
- `demandas_vinculadas`

### 13.2 Conteudo do prontuario em `dados_completos`

```text
Atendimento:
  tipoViolencia
  tipoViolenciaDescricoes
  canalDenuncia
  protocolo
  especificacaoOutroCanal

Vitima:
  nome
  cpf
  nis
  idade
  sexo
  racaCor
  etniaIndigena
  bairro
  macroRegiao
  escolaridade

Familia:
  rendaFamiliar
  recebePBF
  recebeBPC
  recebeBE
  membrosCadUnico
  membroPAI
  composicaoFamiliar
  referenciaFamiliar
  membroCarcerario
  membroSocioeducacao

Saude:
  vitimaPCD
  vitimaPCDDetalhe
  tratamentoSaude
  tratamentoSaudeDetalhe

Encaminhamentos:
  encaminhamento
  encaminhamentoDetalhe
  encaminhadaSCFV
  inseridoPAEFI
  confirmacaoViolencia
  notificacaoSINAN
  reincidente

Agressor:
  vinculoAgressor
  especificacaoOutroVinculo
  coabitaComAgressor
  faixaEtariaAgressor
  sexoAgressor
  bairroAgressor

Moradia:
  tipoResidencia
  formaOcupacao
  materialConstrucao
  valorAluguel

Campos previstos sem UI:
  orientacaoSexual
  identidadeGenero
```

## 14. Integracao com `api.ts`

O modulo depende de `src/services/api.ts` para:

- `createCase`
- `updateCase`
- `getCasoById`

Pontos importantes da camada de servico:

- `fetchWithAuth` injeta JWT
- respostas JSON sao retornadas como `response.json()`
- `CasoDetalhado` continua frouxo e usa `[key: string]: any`
- os metodos de caso ainda recebem `any` como payload

Implicacao arquitetural:

- a tipagem forte do dominio esta mais no modulo de Cadastro do que na camada de servicos
- o contrato formal do backend ainda nao esta fechado em DTOs fortes

## 15. Divergencias e debitos atuais do modulo

### 15.1 Persistencia e leitura ainda dependem de um contrato tolerante

Mesmo com o fluxo unificado no frontend, o modulo ainda depende de:

- payload de escrita com `dados_completos_payload`
- leitura tolerante a alias e legado em `caseToFormValues()`
- `CasoDetalhado` frouxo em `api.ts`

### 15.2 O adapter ainda e uma camada de compatibilidade pesada

Ele precisa sustentar:

- alias camelCase e snake_case
- chaves legadas e canonicas
- variacoes textuais de enums

### 15.3 "Salvar progresso" e "Finalizar" exigem contrato claro de navegacao

No comportamento atual apos a unificacao:

- `Salvar Progresso` persiste e permanece no cadastro
- `Finalizar` persiste e navega para o detalhe
- na criacao, as duas acoes so acontecem depois da validacao completa

Isso mostra que o contrato de leitura do backend ainda nao esta estavel.

### 15.5 Campos previstos ainda nao chegaram na UI

Existem no shape, mas nao na experiencia:

- `orientacaoSexual`
- `identidadeGenero`
- `membroPAI`

### 15.6 `CasoDetalhe` ainda e muito permissivo

Ele achata qualquer chave de `dados_completos` e exibe genericamente.

Isso ajuda na compatibilidade, mas:

- reduz controle de apresentacao
- pode exibir duplicidades
- torna a tela dependente de contratos informais

## 16. Direcao arquitetural recomendada

Com base no estado atual, a direcao mais consistente para o modulo e:

1. manter criacao e edicao como o mesmo formulario
2. manter um schema canonico principal para submissao completa
3. deixar `isEditMode` decidir apenas:
   - carga inicial
   - verbo HTTP
   - comportamento de navegacao
4. manter `adapters.ts` como unica fronteira de compatibilidade
5. reduzir a permissividade do contrato de leitura do backend
6. tipar melhor `CasoDetalhado` e os payloads de create/update em `api.ts`

## 17. Resumo executivo

O modulo de Cadastro hoje ja esta bem modularizado em termos de arquivos: container, hook, schema, adapters, options e tabs especializadas. A arquitetura dominante e coerente com o resto do frontend: React Hook Form, Zod, servicos centralizados e adaptacao entre payload e formulario.

O principal problema nao esta na organizacao dos arquivos, e sim no ciclo de vida do caso. A criacao ainda nasce como registro inicial incompleto, com abas bloqueadas e validacao reduzida, enquanto a edicao opera sobre um prontuario mais completo e validado. Isso obriga o modulo a sustentar dois fluxos distintos e amplia a dependencia de compatibilidade em `adapters.ts`.

Como referencia tecnica, o shape total usado pelo frontend hoje e: metadados do caso no topo, prontuario em `dados_completos` ou `dados_completos_payload`, normalizacao feita no frontend e leitura ainda tolerante a legado. Qualquer evolucao segura do modulo deve partir dessa fotografia.
