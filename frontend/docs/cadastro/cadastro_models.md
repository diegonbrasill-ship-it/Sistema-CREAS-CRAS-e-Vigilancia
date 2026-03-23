# Modelos de Dados do Cadastro no Frontend

## Escopo
Este documento consolida o contrato atual do frontend para o módulo de Cadastro, com base na lógica existente em `src/pages/Cadastro`.

Ele cobre:
- o JSON enviado ao backend na criação e na atualização de casos
- o significado de cada campo do formulário e como o frontend o preenche
- o formato que o frontend espera nas consultas de casos
- as diferenças entre consulta simples, detalhe por ID e drill-down

Arquivos-base usados neste mapeamento:
- `src/pages/Cadastro/Cadastro.tsx`
- `src/pages/Cadastro/useCadastroForm.ts`
- `src/pages/Cadastro/schema.ts`
- `src/pages/Cadastro/adapters.ts`
- `src/pages/Cadastro/options.ts`
- `src/pages/Cadastro/components/*`
- `src/pages/Consulta.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/PainelVigilancia/PainelVigilancia.tsx`
- `src/pages/CasoDetalhe.tsx`
- `src/components/DrillDown/ListaCasosModal.tsx`
- `src/services/api.ts`

## 1. Fluxo do Cadastro no frontend

### 1.1 Criação
Na criação, o frontend usa `baseSchema` e envia:
- `data_cad`
- `tec_ref`
- `unit_id`
- `dados_completos_payload` com os campos do formulário

As abas 2 a 7 ficam desabilitadas até existir um ID de caso. Na prática:
- o primeiro `POST /api/casos` cria o caso
- o backend devolve `id`
- o frontend redireciona para `/cadastro/:id`
- a partir daí o caso entra em modo de edição

### 1.2 Edição
Na edição, o frontend usa `editSchema` e faz `GET /api/casos/:id` para preencher o formulário.

Ao salvar:
- ele não reenvia o formulário inteiro
- monta um payload parcial com os campos alterados
- mantém `data_cad` e `tec_ref` no payload
- envia os campos alterados dentro de `dados_completos_payload` no `PUT /api/casos/:id`

Isso significa que hoje o frontend usa um envelope de escrita padronizado:
- criação: payload com `dados_completos_payload`
- atualização: payload parcial dentro de `dados_completos_payload`

## 2. Modelo enviado ao backend

### 2.1 `POST /api/casos`
Origem: `formValuesToCreatePayload()` em `src/pages/Cadastro/adapters.ts`

Shape:

```json
{
  "data_cad": "2026-03-22",
  "tec_ref": "Nome do Técnico - Cargo",
  "unit_id": 1,
  "dados_completos_payload": {
    "tipoViolencia": "FISICA",
    "tipoViolenciaDescricoes": ["ESPANCAMENTO", "CHUTES"],
    "canalDenuncia": "DISQUE_100_180",
    "protocolo": "ABC-123",
    "especificacaoOutroCanal": "",
    "nome": "Nome para teste",
    "cpf": "123.123.123-12",
    "nis": "123.12312.31-2",
    "idade": "40",
    "sexo": "MASCULINO",
    "racaCor": "BRANCA",
    "etniaIndigena": "",
    "bairro": "Jatobá",
    "macroRegiao": "Norte",
    "escolaridade": "EJA",
    "rendaFamiliar": "Sem renda",
    "recebePBF": "Não",
    "recebeBPC": "Não",
    "recebeBE": "Não",
    "membrosCadUnico": "Não",
    "membroPAI": "",
    "composicaoFamiliar": "6 ou mais membros",
    "referenciaFamiliar": "Pais",
    "membroCarcerario": "Não",
    "membroSocioeducacao": "Não",
    "vitimaPCD": "Não",
    "vitimaPCDDetalhe": "",
    "tratamentoSaude": "Não",
    "tratamentoSaudeDetalhe": "",
    "encaminhamento": "Não",
    "encaminhamentoDetalhe": "",
    "encaminhadaSCFV": "Não",
    "inseridoPAEFI": "Não",
    "confirmacaoViolencia": "Não confirmada",
    "notificacaoSINAN": "Não",
    "reincidente": "Não",
    "orientacaoSexual": null,
    "identidadeGenero": null,
    "vinculoAgressor": "PAI",
    "coabitaComAgressor": "Não",
    "especificacaoOutroVinculo": "",
    "faixaEtariaAgressor": "FAIXA_18_30",
    "bairroAgressor": "",
    "sexoAgressor": "HOMEM",
    "tipoResidencia": "CASA",
    "formaOcupacao": "PROPRIA_EM_AQUISICAO",
    "materialConstrucao": "ALVENARIA_TIJOLO",
    "valorAluguel": null
  }
}
```

### 2.2 `PUT /api/casos/:id`
Origem: `formValuesToUpdatePayload()` em `src/pages/Cadastro/adapters.ts`

Shape atual:

```json
{
  "data_cad": "2026-03-22",
  "tec_ref": "Nome do Técnico - Cargo",
  "dados_completos_payload": {
    "tipoViolencia": "FISICA",
    "tipoViolenciaDescricoes": ["ESPANCAMENTO", "CHUTES"],
    "bairro": "Jatobá",
    "racaCor": "BRANCA",
    "formaOcupacao": "PROPRIA_EM_AQUISICAO"
  }
}
```

Regras importantes:
- só campos alterados entram no `PUT`
- o patch do formulário vem dentro de `dados_completos_payload`
- o backend precisa tratar isso como merge parcial do cadastro

## 3. Catálogo de campos do Cadastro

### 3.1 Metadados do caso
- `data_cad`
  - tipo no frontend: `string`
  - preenchimento: campo `date` na aba Atendimento
  - default: data atual
  - envio: sempre na raiz
  - uso: data oficial do cadastro

- `tec_ref`
  - tipo no frontend: `string`
  - preenchimento: derivado do usuário logado em `useCadastroForm`
  - comportamento: visível no form; desabilitado na edição
  - envio: sempre na raiz
  - uso: técnico responsável exibido e persistido

- `unit_id`
  - tipo no frontend: `number | null`
  - preenchimento: derivado do usuário autenticado
  - envio: só no `POST`
  - uso: vínculo do caso com a unidade

### 3.2 Aba 1. Atendimento
- `tipoViolencia`
  - tipo: enum canônico
  - valores: `FISICA`, `PSICOLOGICA`, `SEXUAL`, `PATRIMONIAL`, `MORAL`
  - preenchimento: `Select`
  - regra: obrigatório em criação e edição
  - normalização: aceita alias legado `tipo_violencia`

- `tipoViolenciaDescricoes`
  - tipo: `string[]`
  - preenchimento: checkboxes dependentes de `tipoViolencia`
  - regra: ao menos 1 item
  - comportamento: trocar `tipoViolencia` limpa as descrições
  - normalização: remove duplicidade e converte aliases legados como `EMPURRAO -> EMPURROES`, `SOCOS -> ESPANCAMENTO`

- `canalDenuncia`
  - tipo: enum canônico
  - valores:
    - `DISQUE_100_180`
    - `CONSELHO_TUTELAR`
    - `PODER_JUDICIARIO_MINISTERIO_PUBLICO`
    - `DELEGACIA_DE_POLICIA`
    - `DEMANDA_ESPONTANEA`
    - `ENCAMINHAMENTO_DA_REDE`
    - `OUTROS`
  - preenchimento: `Select`
  - regra: opcional na criação inicial; exigido em edição
  - normalização: aceita alias de leitura `canalOrigem`

- `protocolo`
  - tipo: `string | null`
  - preenchimento: `Input`
  - regra: opcional
  - normalização: `trim`

- `especificacaoOutroCanal`
  - tipo: `string | null`
  - preenchimento: `Input` condicional
  - exibição: só aparece se `canalDenuncia === "OUTROS"`
  - regra: obrigatório nesse cenário
  - limpeza automática: ao trocar para outro canal, o frontend limpa o campo

### 3.3 Aba 2. Vítima
- `nome`
  - tipo: `string | null`
  - preenchimento: `Input`
  - regra: opcional na criação inicial; obrigatório em edição

- `cpf`
  - tipo: `string | null`
  - preenchimento: `Input` com máscara
  - regra: opcional na criação inicial; obrigatório em edição
  - validação: formato de CPF

- `nis`
  - tipo: `string | null`
  - preenchimento: `Input` com máscara
  - regra: opcional na criação inicial; obrigatório em edição
  - validação: 11 dígitos

- `idade`
  - tipo: `string | null`
  - preenchimento: `Input` numérico
  - regra: opcional na criação inicial; obrigatório em edição

- `sexo`
  - tipo: enum canônico opcional
  - valores: `MASCULINO`, `FEMININO`, `INTERSEXO`
  - preenchimento: `Select`
  - regra: opcional
  - normalização: aceita leitura de `Masculino` e `Feminino`

- `racaCor`
  - tipo: enum canônico
  - valores: `BRANCA`, `PRETA`, `PARDA`, `AMARELA`, `INDIGENA`, `NAO_DECLARADO`
  - preenchimento: `Select`
  - regra: opcional na criação inicial; obrigatório em edição
  - normalização: aceita leitura legada de `corEtnia`

- `etniaIndigena`
  - tipo: `string | null`
  - preenchimento: `Input` condicional
  - exibição: só aparece se `racaCor === "INDIGENA"`
  - regra: obrigatório nesse cenário
  - limpeza automática: no save, se `racaCor !== "INDIGENA"`, o frontend envia `""`

- `bairro`
  - tipo: `string | null`
  - preenchimento: `Input`
  - regra: opcional na criação inicial; obrigatório em edição
  - compatibilidade de leitura: aceita `local_ocorrencia` legado

- `macroRegiao`
  - tipo: `string | null`
  - preenchimento: `Input` condicional
  - exibição: aparece quando `bairro` tem valor
  - regra: opcional

- `escolaridade`
  - tipo: enum canônico
  - valores:
    - `SEM_IDADE_ESCOLAR`
    - `EJA`
    - `FUNDAMENTAL_1_INCOMPLETO`
    - `FUNDAMENTAL_1_COMPLETO`
    - `FUNDAMENTAL_2_INCOMPLETO`
    - `FUNDAMENTAL_2_COMPLETO`
    - `ENSINO_MEDIO_INCOMPLETO`
    - `ENSINO_MEDIO_COMPLETO`
    - `TECNICO_INCOMPLETO`
    - `TECNICO_COMPLETO`
    - `SUPERIOR_INCOMPLETO`
    - `SUPERIOR_COMPLETO`
  - preenchimento: `Select`
  - regra: opcional na criação inicial; obrigatório em edição
  - normalização: aceita aliases antigos como `Fundamental Incompleto`

### 3.4 Aba 3. Família
- `rendaFamiliar`
  - tipo: `string | null`
  - preenchimento: `Select` com faixas textuais
  - regra: opcional na criação inicial; obrigatório em edição

- `recebePBF`
  - tipo: `string | null`
  - preenchimento: `Select` `Sim/Não`
  - regra: opcional na criação inicial; obrigatório em edição

- `recebeBPC`
  - tipo: `string | null`
  - preenchimento: `Select`
  - valores usados na UI: `Idoso`, `PCD`, `Não`
  - regra: opcional na criação inicial; obrigatório em edição

- `recebeBE`
  - tipo: `string | null`
  - preenchimento: `Select` `Sim/Não`
  - regra: opcional na criação inicial; obrigatório em edição

- `membrosCadUnico`
  - tipo: `string | null`
  - preenchimento: `Select` `Sim/Não`
  - regra: opcional na criação inicial; obrigatório em edição

- `membroPAI`
  - tipo: `string | null`
  - preenchimento: não existe campo visual hoje
  - status: está no schema e no adapter, mas não está implementado em componente

- `composicaoFamiliar`
  - tipo: `string | null`
  - preenchimento: `Select`
  - valores usados: `1 membro` até `6 ou mais membros`
  - regra: opcional na criação inicial; obrigatório em edição

- `referenciaFamiliar`
  - tipo: `string | null`
  - preenchimento: `Input`
  - regra: opcional na criação inicial; obrigatório em edição

- `membroCarcerario`
  - tipo: `string | null`
  - preenchimento: `Select` `Sim/Não`
  - regra: opcional na criação inicial; obrigatório em edição

- `membroSocioeducacao`
  - tipo: `string | null`
  - preenchimento: `Select` `Sim/Não`
  - regra: opcional na criação inicial; obrigatório em edição

### 3.5 Aba 4. Saúde
- `vitimaPCD`
  - tipo: `string | null`
  - preenchimento: `Select` `Sim/Não`
  - regra: opcional na criação inicial; obrigatório em edição

- `vitimaPCDDetalhe`
  - tipo: `string | null`
  - preenchimento: `Input` condicional
  - exibição: só aparece se `vitimaPCD === "Sim"`

- `tratamentoSaude`
  - tipo: `string | null`
  - preenchimento: `Select` `Sim/Não`
  - regra: opcional na criação inicial; obrigatório em edição

- `tratamentoSaudeDetalhe`
  - tipo: `string | null`
  - preenchimento: `Input` condicional
  - exibição: só aparece se `tratamentoSaude === "Sim"`

### 3.6 Aba 5. Encaminhamentos
- `encaminhamento`
  - tipo: `string | null`
  - preenchimento: `Select` `Sim/Não`
  - regra: opcional na criação inicial; obrigatório em edição

- `encaminhamentoDetalhe`
  - tipo: `string | null`
  - preenchimento: `Input` condicional
  - exibição: só aparece se `encaminhamento === "Sim"`

- `encaminhadaSCFV`
  - tipo: enum textual
  - valores: `SCFV`, `CDI`, `Não`
  - preenchimento: `Select`
  - regra: opcional na criação inicial; obrigatório em edição

- `inseridoPAEFI`
  - tipo: `string | null`
  - preenchimento: `Select` `Sim/Não`
  - regra: opcional na criação inicial; obrigatório em edição

- `confirmacaoViolencia`
  - tipo: enum textual
  - valores: `Confirmada`, `Em análise`, `Não confirmada`
  - preenchimento: `Select`
  - regra: opcional na criação inicial; obrigatório em edição

- `notificacaoSINAN`
  - tipo: `string | null`
  - preenchimento: `Select` `Sim/Não`
  - regra: opcional na criação inicial; obrigatório em edição
  - normalização: aceita alias legado `notificacaoSINAM`

- `reincidente`
  - tipo: `string | null`
  - preenchimento: `Select` `Sim/Não`
  - regra: opcional na criação inicial; obrigatório em edição

### 3.7 Aba 6. Agressor
- `vinculoAgressor`
  - tipo: enum canônico
  - valores: `CONJUGE`, `COMPANHEIRO`, `EX_COMPANHEIRO`, `PAI`, `MAE`, `FILHO`, `IRMAO`, `OUTROS`
  - preenchimento: `Select`
  - regra: opcional na criação inicial; obrigatório em edição

- `especificacaoOutroVinculo`
  - tipo: `string | null`
  - preenchimento: `Input` condicional
  - exibição: só aparece se `vinculoAgressor === "OUTROS"`
  - regra: obrigatório nesse cenário

- `coabitaComAgressor`
  - tipo: `string | null`
  - preenchimento: `Select` `Sim/Não`
  - regra: opcional na criação inicial; obrigatório em edição

- `faixaEtariaAgressor`
  - tipo: enum canônico opcional
  - valores: `MENOR_18`, `FAIXA_18_30`, `FAIXA_31_40`, `FAIXA_41_50`, `FAIXA_51_60`, `FAIXA_61_MAIS`
  - preenchimento: `Select`

- `bairroAgressor`
  - tipo: `string | null`
  - preenchimento: `Input`
  - regra: opcional

- `sexoAgressor`
  - tipo: enum canônico opcional
  - valores: `HOMEM`, `MULHER`, `OUTRO`
  - preenchimento: `Select`

### 3.8 Aba 7. Moradia
- `tipoResidencia`
  - tipo: enum canônico
  - valores: `CASA`, `APARTAMENTO`, `COMODO_QUITINETE`, `BARRACO_OCUPACAO`, `UNIDADE_INSTITUCIONAL`, `SITUACAO_DE_RUA`
  - preenchimento: `Select`
  - regra: opcional na criação inicial; obrigatório em edição

- `formaOcupacao`
  - tipo: enum canônico opcional
  - valores: `PROPRIA_PAGA`, `PROPRIA_EM_AQUISICAO`, `ALUGADA`, `CEDIDA_FAMILIAR_AMIGO`, `CEDIDA_EMPREGADOR`, `OCUPADA_IRREGULAR`
  - preenchimento: `Select`
  - exibição: só aparece se `tipoResidencia` foi escolhido e não é `SITUACAO_DE_RUA`
  - regra: obrigatório em edição quando `tipoResidencia !== "SITUACAO_DE_RUA"`

- `materialConstrucao`
  - tipo: enum canônico opcional
  - valores: `ALVENARIA_TIJOLO`, `MADEIRA_APARELHADA`, `MATERIAL_REAPROVEITADO`, `SEM_CONSTRUCAO_PERMANENTE`
  - preenchimento: `Select`
  - exibição: mesma lógica de `formaOcupacao`
  - regra: obrigatório em edição quando `tipoResidencia !== "SITUACAO_DE_RUA"`

- `valorAluguel`
  - tipo: `number | null`
  - preenchimento: `Input` numérico
  - exibição: só aparece se `formaOcupacao === "ALUGADA"`
  - regra: opcional
  - limpeza automática:
    - se `tipoResidencia === "SITUACAO_DE_RUA"`, vira `null`
    - se `formaOcupacao !== "ALUGADA"`, vira `null`

### 3.9 Campos previstos no schema, mas sem UI atual
- `orientacaoSexual`
- `identidadeGenero`
- `membroPAI`

Esses campos:
- existem em `schema.ts`
- são aceitos no adapter
- podem ser enviados e lidos
- mas hoje não possuem controles visuais nas abas

## 4. Normalizações aplicadas pelo frontend

### 4.1 Na escrita
`sanitizeCasePayload()` faz:
- normalização de `Sim/Não`
- `trim` em campos de texto
- normalização de `tipoViolencia`
- normalização de `canalDenuncia`
- normalização de `sexo`
- normalização de `racaCor`
- normalização de `escolaridade`
- deduplicação de `tipoViolenciaDescricoes`
- limpeza de campos condicionais não aplicáveis

### 4.2 Na leitura
`caseToFormValues()` aceita compatibilidade com payloads antigos:
- `tipo_violencia -> tipoViolencia`
- `local_ocorrencia -> bairro`
- `canalOrigem -> canalDenuncia`
- `corEtnia -> racaCor`
- `notificacaoSINAM -> notificacaoSINAN`
- `Masculino/Feminino -> MASCULINO/FEMININO`
- descrições antigas de violência para os códigos novos

Observação importante:
- a leitura por fallback está mais forte nas abas 1 e 2
- para preenchimento confiável de todas as abas, o backend deve preferir devolver `dados_completos` completo e canônico

## 5. Como o frontend espera os dados nas consultas

### 5.1 `GET /api/casos` para Consulta de Casos
Consumidor: `src/pages/Consulta.tsx`

Uso:
- listagem principal de casos
- filtros de busca

Query params usados pelo frontend:
- `filtro=q&valor=texto`
- `status=Ativo|Desligado|Arquivado`
- `filtro=por_violencia&valor=...`
- `filtro=por_bairro&valor=...`

Shape mínimo esperado por item:

```json
{
  "id": 152,
  "nome": "Nome para teste",
  "tec_ref": "admin",
  "data_cad": "2026-03-22T03:00:00.000Z",
  "bairro": "Jatobá",
  "unit_id": 1
}
```

Campos realmente consumidos pela tela:
- `id`
- `nome`
- `tec_ref`
- `data_cad`
- `bairro`
- `unit_id`

Observações:
- o frontend converte `id` para string
- o frontend formata `data_cad` para `pt-BR`
- nomes anonimizados também são aceitos

### 5.2 `GET /api/casos/:id` para edição e detalhe
Consumidores:
- `src/pages/Cadastro/useCadastroForm.ts`
- `src/pages/CasoDetalhe.tsx`

#### Shape confiável recomendado
Para a edição funcionar sem fallback, o backend deveria devolver:

```json
{
  "id": 152,
  "status": "Ativo",
  "unit_id": 1,
  "tec_ref": "admin",
  "data_cad": "2026-03-22T03:00:00.000Z",
  "dados_completos": {
    "nome": "Nome para teste",
    "cpf": "123.123.123-12",
    "nis": "123.12312.31-2",
    "idade": "40",
    "sexo": "MASCULINO",
    "bairro": "Jatobá",
    "macroRegiao": null,
    "racaCor": "BRANCA",
    "escolaridade": "EJA",
    "tipoViolencia": "FISICA",
    "tipoViolenciaDescricoes": ["EMPURROES", "ESPANCAMENTO", "CHUTES"],
    "canalDenuncia": "DISQUE_100_180",
    "protocolo": "",
    "especificacaoOutroCanal": "",
    "rendaFamiliar": "Sem renda",
    "recebePBF": "Não",
    "recebeBPC": "Não",
    "recebeBE": "Não",
    "membrosCadUnico": "Não",
    "membroPAI": "",
    "composicaoFamiliar": "6 ou mais membros",
    "referenciaFamiliar": "Pais",
    "membroCarcerario": "Não",
    "membroSocioeducacao": "Não",
    "vitimaPCD": "Não",
    "vitimaPCDDetalhe": "",
    "tratamentoSaude": "Não",
    "tratamentoSaudeDetalhe": "",
    "encaminhamento": "Não",
    "encaminhamentoDetalhe": "",
    "encaminhadaSCFV": "Não",
    "inseridoPAEFI": "Não",
    "confirmacaoViolencia": "Não confirmada",
    "notificacaoSINAN": "Não",
    "reincidente": "Não",
    "orientacaoSexual": null,
    "identidadeGenero": null,
    "etniaIndigena": "",
    "vinculoAgressor": "PAI",
    "coabitaComAgressor": "Não",
    "especificacaoOutroVinculo": "",
    "faixaEtariaAgressor": "FAIXA_18_30",
    "bairroAgressor": "",
    "sexoAgressor": "HOMEM",
    "tipoResidencia": "CASA",
    "formaOcupacao": "PROPRIA_EM_AQUISICAO",
    "materialConstrucao": "ALVENARIA_TIJOLO",
    "valorAluguel": null
  },
  "demandas_vinculadas": []
}
```

#### Compatibilidade hoje aceita pelo frontend
O adapter também aceita parte dos dados no topo do objeto, mas isso não é homogêneo para todos os campos.

Para o caso de edição, o shape recomendado continua sendo:
- metadados no topo
- formulário inteiro dentro de `dados_completos`

#### CasoDetalhe
`CasoDetalhe.tsx` é mais permissivo:
- ele mostra os campos de topo
- se `dados_completos` existir, faz merge com o topo para exibição

Além do cadastro em si, ele espera:
- `demandas_vinculadas` como parte do payload base
- `demandasVinculadas` em camelCase para a seção de demandas vinculadas funcionar sem ajuste de frontend

### 5.3 `GET /api/casos` para drill-down do Dashboard
Consumidores:
- `src/pages/Dashboard.tsx`
- `src/components/DrillDown/ListaCasosModal.tsx`

Query params usados:
- `filtro`
- `valor`
- `mes`
- `tecRef`
- `bairro`

Exemplos disparados pelo frontend:
- `GET /api/casos?filtro=sexo&valor=Masculino`
- `GET /api/casos?filtro=canalDenuncia&valor=DISQUE_100_180`
- `GET /api/casos?filtro=por_bairro&valor=Centro`
- `GET /api/casos?filtro=confirmacaoViolencia&valor=Confirmada&mes=2026-03`

Filtros legados ainda disparados pelo Dashboard atual:
- `dependeFinanceiro`

Shape esperado pelo modal de drill-down:

```json
[
  {
    "id": 152,
    "nome": "Nome para teste",
    "tec_ref": "admin",
    "data_cad": "2026-03-22",
    "bairro": "Jatobá"
  }
]
```

Campos realmente consumidos:
- `id`
- `nome`
- `tec_ref`
- `data_cad`
- `bairro`

### 5.4 `GET /api/vigilancia/casos-filtrados` para drill-down da Vigilância
Consumidores:
- `src/pages/PainelVigilancia/PainelVigilancia.tsx`
- `src/components/DrillDown/ListaCasosModal.tsx`

Shape esperado:
- o mesmo shape do drill-down do Dashboard

```json
[
  {
    "id": 152,
    "nome": "Nome para teste",
    "tec_ref": "admin",
    "data_cad": "2026-03-22",
    "bairro": "Jatobá"
  }
]
```

## 6. Inconsistências atuais que o backend precisa conhecer

### 6.1 Drill-down e consulta agora convergem em `snake_case`
Após o ajuste do frontend, os consumidores de listagem passam a esperar o mesmo padrão:
- `tec_ref`
- `data_cad`

O shape de listagem recomendado fica:

```json
{
  "id": 152,
  "nome": "Nome para teste",
  "bairro": "Jatobá",
  "tec_ref": "admin",
  "data_cad": "2026-03-22",
  "unit_id": 1
}
```

### 6.2 `GET /api/casos/:id` precisa preferir `dados_completos`
Para o formulário de edição funcionar de forma previsível:
- o backend não deve devolver o cadastro só achatado no topo
- o backend deve preencher `dados_completos` com todos os campos do form

### 6.3 Criação e atualização têm shapes diferentes
Hoje o frontend escreve assim:
- `POST`: `dados_completos_payload`
- `PUT`: `dados_completos_payload` parcial

Se o backend ainda aceitar o formato antigo achatado, isso pode ser mantido apenas como compatibilidade temporária.

## 7. Recomendação de contrato backend mais estável

### 7.1 Escrita
- aceitar `POST /api/casos` com `dados_completos_payload`
- aceitar `PUT /api/casos/:id` com payload parcial em `dados_completos_payload`
- normalizar tudo antes de persistir em `dados_completos`

### 7.2 Leitura por ID
- devolver sempre:
  - metadados no topo
  - `dados_completos` completo e canônico

### 7.3 Leitura por lista
Para manter o frontend alinhado ao modelo canônico do cadastro, devolver:
- `tec_ref`
- `data_cad`

### 7.4 Campos que já deveriam sair normalizados do backend
- `sexo` como `MASCULINO`, `FEMININO`, `INTERSEXO`
- `racaCor` no enum canônico
- `escolaridade` no enum canônico
- `tipoViolencia` no enum canônico
- `tipoViolenciaDescricoes` nas chaves novas
- `notificacaoSINAN` no nome correto
