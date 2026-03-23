# Formulário de Cadastro — Registro de Atendimento PAEFI (`Cadastro`)

Gerado a partir de:

- `docs/arquitetura_front.md`
- `docs/refatorar_cadastro.md`
- `docs/refatorar_cadastro_execução.md`
- Código-fonte atual: `src/pages/Cadastro/` (container + tabs + schemas + options)

> Este documento descreve **o que é** e **como preencher** cada campo coletado no formulário, incluindo campos de **seleção** (opções) e campos **condicionais** (que só aparecem quando uma opção específica é escolhida).

---

## 1) Como o cadastro funciona (fluxo e modos)

### 1.1 Modo criação (`/cadastro`)

- Somente a aba **1. Atendimento** fica disponível.
- Ao clicar em **“Salvar e Iniciar Prontuário”**, é criado um registro inicial e o usuário é redirecionado para **modo edição** (`/cadastro/:id`).

### 1.2 Modo edição (`/cadastro/:id`)

- Todas as abas ficam disponíveis.
- O botão **“Salvar Progresso”** salva alterações.
- O botão **“Finalizar e Ver Prontuário”** salva e redireciona para o detalhe do caso.

### 1.3 Stack/padrão técnico (contexto)

- UI em abas (`Tabs`) com campos `Input` e `Select`.
- Form state com `react-hook-form`.
- Validação com `zod` (schemas em `src/pages/Cadastro/schema.ts`).
- Opções (valores/labels) centralizadas em `src/pages/Cadastro/options.ts`.
- Integração com API/compatibilidade (legado vs canônico) via adapters (conforme plano de refatoração).

---

## 2) Regras gerais de preenchimento

### 2.1 Obrigatoriedade

- No modo **criação**, os obrigatórios são os necessários para abrir o prontuário (aba Atendimento).
- No modo **edição**, o schema pode exigir mais campos (depende da regra no `editSchema`).

### 2.2 Campos condicionais

Alguns campos só aparecem quando uma opção específica é selecionada:

- **Canal de origem:** se `canalOrigem = OUTROS` → aparece `especificacaoOutroCanal`.
- **Saúde:**
  - se `vitimaPCD = Sim` → aparece `vitimaPCDDetalhe`.
  - se `tratamentoSaude = Sim` → aparece `tratamentoSaudeDetalhe`.
- **Encaminhamento:** se `encaminhamento = Sim` → aparece `encaminhamentoDetalhe`.
- **Agressor:** se `vinculoAgressor = OUTROS` → aparece `especificacaoOutroVinculo`.
- **Moradia:**
  - se `tipoResidencia = SITUACAO_DE_RUA` → campos dependentes são limpos/ocultados.
  - se `formaOcupacao = ALUGADA` → aparece `valorAluguel`.

---

# 3) Documentação campo a campo

> Para cada item abaixo:
>
> - **Chave** = nome do campo no formulário (RHF)
> - **Tipo UI** = como o usuário preenche
> - **Opções** = quando for `Select`
> - **Regra** = condicionais e observações

---

## Aba 1 — Atendimento e Violência (`TabAtendimento`)

### `data_cad` — Data do cadastro

- **O que é:** data de registro do caso no sistema.
- **Tipo UI:** `Input` do tipo `date`.
- **Como preencher:** selecionar a data.

### `tec_ref` — Técnico responsável

- **O que é:** identificação do técnico responsável pelo atendimento/registro.
- **Tipo UI:** `Input` (texto).
- **Como preencher:**
  - no modo criação: normalmente já vem preenchido pelo usuário autenticado.
  - no modo edição: fica desabilitado para evitar alteração.

### `tipo_violencia` — Tipo de violência (legado)

- **O que é:** classificação simples do tipo de violência (mantida por compatibilidade com legado).
- **Tipo UI:** `Select`.
- **Opções:** `Física`, `Psicológica`, `Sexual` (ver `TIPO_VIOLENCIA_FORM_OPTIONS`).
- **Como preencher:** escolher uma opção.

### `local_ocorrencia` — Local da ocorrência

- **O que é:** descrição do local onde ocorreu a situação (endereço, referência, localidade etc.).
- **Tipo UI:** `Input` (texto).
- **Como preencher:** descrever o local.

### `tipoViolencia` — Tipo de violência (canônico)

- **O que é:** classificação canônica (para estatística/integrações futuras), coexistindo com o legado.
- **Tipo UI:** `Select`.
- **Opções (valor → label):**
  - `FISICA` → Física
  - `PSICOLOGICA` → Psicológica
  - `SEXUAL` → Sexual
  - `PATRIMONIAL` → Patrimonial
  - `MORAL` → Moral
- **Regra:** ao selecionar este campo, o sistema limpa `tipoViolenciaDescricoes`.

### `tipoViolenciaDescricoes` — Descrições da violência

- **O que é:** detalhamento (lista) do tipo de violência selecionado.
- **Tipo UI:** checkboxes.
- **Como preencher:** marcar uma ou mais descrições.
- **Regra:** as opções dependem de `tipoViolencia` (ver `TIPO_VIOLENCIA_DESCRICOES_MAP`).

### `canalOrigem` — Canal de origem (canônico)

- **O que é:** origem estruturada do caso/denúncia.
- **Tipo UI:** `Select`.
- **Opções (valor → label):**
  - `DISQUE_100_180` → Disque 100/180
  - `CONSELHO_TUTELAR` → Conselho Tutelar
  - `PODER_JUDICIARIO_MINISTERIO_PUBLICO` → Poder Judiciário / Ministério Público
  - `DELEGACIA_DE_POLICIA` → Delegacia de Polícia
  - `DEMANDA_ESPONTANEA` → Demanda espontânea
  - `ENCAMINHAMENTO_DA_REDE` → Encaminhamento da rede
  - `OUTROS` → Outros
- **Regra:** se escolher `OUTROS`, deve informar `especificacaoOutroCanal`.

### `dataDenuncia` — Data da denúncia

- **O que é:** data em que a denúncia chegou/foi registrada na rede.
- **Tipo UI:** `Input` do tipo `date`.

### `protocolo` — Protocolo (opcional)

- **O que é:** identificador/protocolo (quando houver).
- **Tipo UI:** `Input` (texto).

### `especificacaoOutroCanal` — Especificar outro canal

- **O que é:** descrição do canal quando `canalOrigem = OUTROS`.
- **Tipo UI:** `Input` (texto).
- **Regra:** aparece apenas quando `canalOrigem = OUTROS`.

---

## Aba 2 — Vítima (`TabVitima`)

### `nome` — Nome completo

- **O que é:** nome completo da vítima.
- **Tipo UI:** `Input` (texto).

### `cpf` — CPF

- **O que é:** CPF da vítima.
- **Tipo UI:** `Input` com máscara (`maskCPF`).
- **Como preencher:** digitar números; o campo formata automaticamente.

### `nis` — NIS

- **O que é:** Número de Identificação Social.
- **Tipo UI:** `Input` com máscara (`maskNIS`).
- **Como preencher:** digitar números; o campo formata automaticamente.

### `idade` — Idade

- **O que é:** idade em anos.
- **Tipo UI:** `Input` numérico.

### `sexo` — Sexo

- **O que é:** sexo (modelo legado usado na UI principal).
- **Tipo UI:** `Select`.
- **Opções:** `Masculino`, `Feminino`.

### `corEtnia` — Cor/Etnia (legado)

- **O que é:** autodeclaração usada como legado.
- **Tipo UI:** `Select`.
- **Opções:** `Branca`, `Preta`, `Parda`.

### `escolaridade` — Escolaridade

- **O que é:** nível de escolaridade.
- **Tipo UI:** `Select`.
- **Opções atuais:** `Fundamental Incompleto`, `Fundamental Completo`.

### `bairro` — Bairro

- **O que é:** bairro (território) relacionado ao caso.
- **Tipo UI:** `Input` (texto).

---

## Aba 3 — Família (`TabFamilia`)

### `rendaFamiliar` — Renda familiar (faixa)

- **O que é:** faixa de renda familiar.
- **Tipo UI:** `Select`.
- **Opções:** de `Sem renda` até `6 ou mais salários mínimos` (conforme lista na aba).

### `recebePBF` — Recebe Bolsa Família?

- **Tipo UI:** `Select`.
- **Opções:** `Sim`, `Não`.

### `recebeBPC` — Recebe BPC?

- **Tipo UI:** `Select`.
- **Opções:** `Idoso`, `PCD`, `Não`.

### `recebeBE` — Recebe Benefício de Erradicação?

- **Tipo UI:** `Select`.
- **Opções:** `Sim`, `Não`.

### `membrosCadUnico` — Membros no CadÚnico?

- **Tipo UI:** `Select`.
- **Opções:** `Sim`, `Não`.

### `composicaoFamiliar` — Composição familiar

- **O que é:** número de membros.
- **Tipo UI:** `Select`.
- **Opções:** `1 membro` … `6 ou mais membros`.

### `tipoMoradia` — Tipo de moradia (legado)

- **Tipo UI:** `Select`.
- **Opções:** `Própria`, `Alugada`, `Cedida`.

### `referenciaFamiliar` — Referência familiar

- **O que é:** pessoa referência.
- **Tipo UI:** `Input` (texto).

### `membroCarcerario` — Membro em sistema carcerário?

- **Tipo UI:** `Select`.
- **Opções:** `Sim`, `Não`.

### `membroSocioeducacao` — Membro em socioeducação?

- **Tipo UI:** `Select`.
- **Opções:** `Sim`, `Não`.

> Observação: o schema contém `membroPAI`, mas a aba atual não renderiza este campo.

---

## Aba 4 — Saúde (`TabSaude`)

### `vitimaPCD` — Vítima é PCD?

- **Tipo UI:** `Select`.
- **Opções:** `Sim`, `Não`.

### `vitimaPCDDetalhe` — Qual?

- **O que é:** descrição da deficiência.
- **Tipo UI:** `Input` (texto).
- **Regra:** aparece apenas se `vitimaPCD = Sim`.

### `tratamentoSaude` — Faz tratamento de saúde?

- **Tipo UI:** `Select`.
- **Opções:** `Sim`, `Não`.

### `tratamentoSaudeDetalhe` — Onde?

- **O que é:** local de tratamento.
- **Tipo UI:** `Input` (texto).
- **Regra:** aparece apenas se `tratamentoSaude = Sim`.

### `dependeFinanceiro` — Depende financeiramente do agressor?

- **Tipo UI:** `Select`.
- **Opções:** `Sim`, `Não`.

---

## Aba 5 — Encaminhamentos (`TabEncaminhamentos`)

### `encaminhamento` — Encaminhamento realizado?

- **Tipo UI:** `Select`.
- **Opções:** `Sim`, `Não`.

### `encaminhamentoDetalhe` — Para onde?

- **Tipo UI:** `Input` (texto).
- **Regra:** aparece apenas quando `encaminhamento = Sim`.

### `encaminhadaSCFV` — Encaminhada ao SCFV/CDI?

- **Tipo UI:** `Select`.
- **Opções:** `SCFV`, `CDI`, `Não`.

### `inseridoPAEFI` — Inserida no PAEFI?

- **Tipo UI:** `Select`.
- **Opções:** `Sim`, `Não`.

### `confirmacaoViolencia` — Confirmação da violência

- **Tipo UI:** `Select`.
- **Opções:** `Confirmada`, `Em análise`, `Não confirmada`.

### `reincidente` — Caso de reincidência?

- **Tipo UI:** `Select`.
- **Opções:** `Sim`, `Não`.

### `notificacaoSINAM` — Notificação no SINAM?

- **Tipo UI:** `Select`.
- **Opções:** `Sim`, `Não`.

### `canalDenuncia` — Canal de denúncia (legado)

- **O que é:** campo legado usado por filtros/relatórios.
- **Tipo UI:** `Select`.
- **Opções:** na implementação atual, está reutilizando `Sim/Não`.
- **Observação:** sem lista de canais, este campo perde semântica; o plano de refatoração recomenda convergir para `canalOrigem` (mantendo alias/compatibilidade).

### `qtdAtendimentos` — Quantidade de atendimentos

- **Tipo UI:** `Input` numérico.

---

## Aba 6 — Agressor (`TabAgressor`)

### `vinculoAgressor` — Vínculo com o agressor

- **Tipo UI:** `Select`.
- **Opções (valor → label):**
  - `CONJUGE` → Cônjuge
  - `COMPANHEIRO` → Companheiro(a)
  - `EX_COMPANHEIRO` → Ex-companheiro(a)
  - `PAI` → Pai
  - `MAE` → Mãe
  - `FILHO` → Filho(a)
  - `IRMAO` → Irmão(ã)
  - `OUTROS` → Outros
- **Regra:** se `OUTROS`, preencher `especificacaoOutroVinculo`.

### `especificacaoOutroVinculo` — Especificar vínculo

- **Tipo UI:** `Input` (texto).
- **Regra:** aparece apenas quando `vinculoAgressor = OUTROS`.

### `coabitaComAgressor` — Coabita com o agressor?

- **Tipo UI:** `Select`.
- **Opções:** `Sim`, `Não`.

### `faixaEtariaAgressor` — Faixa etária do agressor

- **Tipo UI:** `Select`.
- **Opções:**
  - `MENOR_18` (Menor de 18)
  - `FAIXA_18_30` (18 a 30)
  - `FAIXA_31_40` (31 a 40)
  - `FAIXA_41_50` (41 a 50)
  - `FAIXA_51_60` (51 a 60)
  - `FAIXA_61_MAIS` (61+)

### `sexoAgressor` — Sexo do agressor

- **Tipo UI:** `Select`.
- **Opções:** `HOMEM`, `MULHER`, `OUTRO`.

### `bairroAgressor` — Bairro do agressor

- **Tipo UI:** `Input` (texto).

---

## Aba 7 — Moradia (`TabMoradia`)

### `tipoResidencia` — Tipo de residência

- **Tipo UI:** `Select`.
- **Opções:**
  - `CASA`
  - `APARTAMENTO`
  - `COMODO_QUITINETE`
  - `BARRACO_OCUPACAO`
  - `UNIDADE_INSTITUCIONAL`
  - `SITUACAO_DE_RUA`
- **Regra:** se `SITUACAO_DE_RUA`, o sistema limpa `formaOcupacao`, `materialConstrucao` e `valorAluguel`.

### `formaOcupacao` — Forma de ocupação

- **Tipo UI:** `Select`.
- **Quando aparece:** quando `tipoResidencia` está preenchido e **não** é `SITUACAO_DE_RUA`.
- **Opções:**
  - `PROPRIA_PAGA`
  - `PROPRIA_EM_AQUISICAO`
  - `ALUGADA`
  - `CEDIDA_FAMILIAR_AMIGO`
  - `CEDIDA_EMPREGADOR`
  - `OCUPADA_IRREGULAR`
- **Regra:** se não for `ALUGADA`, o sistema limpa `valorAluguel`.

### `materialConstrucao` — Material de construção

- **Tipo UI:** `Select`.
- **Quando aparece:** quando `tipoResidencia` não é `SITUACAO_DE_RUA`.
- **Opções:**
  - `ALVENARIA_TIJOLO`
  - `MADEIRA_APARELHADA`
  - `MATERIAL_REAPROVEITADO`
  - `SEM_CONSTRUCAO_PERMANENTE`

### `valorAluguel` — Valor do aluguel (R$)

- **Tipo UI:** `Input` numérico (`step=0.01`).
- **Quando aparece:** somente quando `formaOcupacao = ALUGADA`.

---

## 4) Observações de consistência e compatibilidade (legado x canônico)

- O formulário mantém campos **legados** (ex.: `tipo_violencia`, `canalDenuncia`, `corEtnia`) por compatibilidade com telas e filtros existentes.
- Campos **canônicos** foram introduzidos para evoluir a qualidade de dados sem quebra (ex.: `tipoViolencia`, `tipoViolenciaDescricoes`, `canalOrigem`).
- Recomenda-se padronizar/definir lista para `canalDenuncia` (ou substituí-lo por `canalOrigem` com alias), para que o campo tenha semântica correta.
