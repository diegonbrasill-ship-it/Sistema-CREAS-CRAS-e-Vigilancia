# Formulário de Cadastro — Registro de Atendimento PAEFI (`Cadastro`)

Documento gerado a partir de:

- `docs/arquitetura_front.md`
- `src/pages/Cadastro.tsx`

> Objetivo: documentar **o que é** e **como é preenchido** cada campo coletado no formulário de cadastro, incluindo campos de seleção e campos condicionais.

---

## 1. Visão geral (fluxo do formulário)

A página `Cadastro` possui dois modos:

### 1.1 Modo criação (`/cadastro`)

- O usuário preenche **apenas** a aba **1. Atendimento**.
- Ao salvar, o frontend cria um registro inicial (**POST**) e redireciona para `/cadastro/:id` (modo edição).

### 1.2 Modo edição (`/cadastro/:id`)

- Todas as abas ficam habilitadas (**Vítima**, **Família**, **Saúde**, **Encaminhamentos**).
- Ao salvar, o frontend envia apenas os campos alterados (`dirtyFields`) via **PUT**.
- Ao finalizar, salva e navega para `/caso/:id`.

---

## 2. Validação e obrigatoriedade

A tela alterna o schema de validação conforme o modo:

- **Criação**: schema base (`baseSchema`) — obrigatórios apenas:

  - `data_cad`
  - `tec_ref`
  - `tipo_violencia`
  - `local_ocorrencia`

- **Edição**: schema de edição (`editSchema`) — exige preenchimento da maioria dos campos, com mensagens específicas.

### 2.1 Campos condicionais (aparecem conforme seleção)

Estes campos só aparecem se o usuário selecionar **"Sim"** no respectivo campo principal:

- `vitimaPCDDetalhe` aparece quando `vitimaPCD = "Sim"`
- `tratamentoSaudeDetalhe` aparece quando `tratamentoSaude = "Sim"`
- `encaminhamentoDetalhe` aparece quando `encaminhamento = "Sim"`

---

## 3. Documentação campo a campo

> Convenção:
>
> - **ID (name)**: chave do campo no payload
> - **Tipo UI**: input texto/número/data ou seleção
> - **Obrigatório**: regras conforme implementação atual
> - **Opções**: somente para selects

---

# Aba 1 — Atendimento (Dados do Atendimento e Violência)

## `data_cad` — Data do cadastro

- **O que é:** data em que o caso/atendimento é registrado.
- **Tipo UI:** `date`.
- **Obrigatório:** sim (criação e edição).
- **Como preencher:** selecionar a data no seletor.
- **Padrão automático:** preenchido com a data atual.

## `tec_ref` — Técnico responsável

- **O que é:** identificação do técnico responsável pelo registro.
- **Tipo UI:** texto.
- **Obrigatório:** sim (criação e edição).
- **Como é preenchido:**
  - **Criação:** preenchido automaticamente com base no usuário logado (`nome_completo`/`username` e, se aplicável, o `cargo`).
  - **Edição:** exibido **desabilitado** (não editável).
- **Formato esperado:** `Nome Completo - Cargo` (quando aplicável).

## `tipo_violencia` — Tipo de violência

- **O que é:** classificação do tipo de violência.
- **Tipo UI:** seleção (Select).
- **Obrigatório:** sim (criação e edição).
- **Opções (valores):**
  - `Física`
  - `Psicológica`
  - `Sexual`

## `local_ocorrencia` — Local da ocorrência

- **O que é:** descrição do local onde ocorreu a situação.
- **Tipo UI:** texto.
- **Obrigatório:** sim (criação e edição).
- **Como preencher:** informar endereço/localidade/referência.

---

# Aba 2 — Vítima (Dados Pessoais da Vítima) — (habilitada somente na edição)

## `nome` — Nome completo

- **O que é:** nome completo da vítima.
- **Tipo UI:** texto.
- **Obrigatório:** sim (apenas no modo edição).

## `cpf` — CPF

- **O que é:** CPF da vítima.
- **Tipo UI:** texto com máscara (`maskCPF`).
- **Obrigatório:** sim (apenas no modo edição).
- **Validação:** CPF deve ter 11 dígitos e não pode ser sequencial repetido.
- **Como preencher:** digitar números; a interface formata como `000.000.000-00`.

## `nis` — NIS

- **O que é:** número NIS da vítima.
- **Tipo UI:** texto com máscara (`maskNIS`).
- **Obrigatório:** sim (apenas no modo edição).
- **Validação:** exige 11 dígitos numéricos.

## `idade` — Idade

- **O que é:** idade (em anos).
- **Tipo UI:** numérico.
- **Obrigatório:** sim (apenas no modo edição).

## `sexo` — Sexo

- **O que é:** sexo da vítima.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções:**
  - `Masculino`
  - `Feminino`

## `corEtnia` — Cor/Etnia

- **O que é:** autodeclaração de cor/etnia.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções:**
  - `Branca`
  - `Preta`
  - `Parda`

## `escolaridade` — Escolaridade

- **O que é:** nível de escolaridade.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções (atuais no código):**
  - `Fundamental Incompleto`
  - `Fundamental Completo`

## `bairro` — Bairro

- **O que é:** bairro relacionado ao caso (residência/ocorrência conforme uso do serviço).
- **Tipo UI:** texto.
- **Obrigatório:** sim (apenas no modo edição).

---

# Aba 3 — Família (Contexto Familiar e Social) — (habilitada somente na edição)

## `rendaFamiliar` — Renda familiar

- **O que é:** faixa de renda familiar.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções:**
  - `Sem renda`
  - `Meio salário mínimo`
  - `1 salário mínimo`
  - `1.5 salário mínimo`
  - `2 salários mínimos`
  - `2.5 salários mínimos`
  - `3 salários mínimos`
  - `3.5 salários mínimos`
  - `4 salários mínimos`
  - `4.5 salários mínimos`
  - `5 salários mínimos`
  - `5.5 salários mínimos`
  - `6 ou mais salários mínimos`

## `recebePBF` — Recebe Bolsa Família?

- **O que é:** indicação de recebimento do PBF.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções:** `Sim`, `Não`

## `recebeBPC` — Recebe BPC?

- **O que é:** modalidade de recebimento de BPC.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções (valores):** `Idoso`, `PCD`, `NÃO`.

## `recebeBE` — Recebe Benefício de Erradicação?

- **O que é:** indica recebimento do benefício.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções:** `Sim`, `Não`

## `membrosCadUnico` — Membros no CadÚnico?

- **O que é:** indica se há membros cadastrados no CadÚnico.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções:** `Sim`, `Não`

## `membroPAI` — Membro PAI

- **O que é:** campo previsto no schema.
- **Tipo UI:** (não exibido).
- **Obrigatório:** não.
- **Observação:** este campo está no schema, mas **não existe componente renderizando este input** em `Cadastro.tsx`.

## `composicaoFamiliar` — Composição familiar

- **O que é:** quantidade de membros na família.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções:**
  - `1 membro`
  - `2 membros`
  - `3 membros`
  - `4 membros`
  - `5 membros`
  - `6 ou mais membros`

## `tipoMoradia` — Tipo de moradia

- **O que é:** situação da moradia.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções:** `Própria`, `Alugada`, `Cedida`

## `referenciaFamiliar` — Referência familiar

- **O que é:** pessoa de referência familiar.
- **Tipo UI:** texto.
- **Obrigatório:** sim (apenas no modo edição).

## `membroCarcerario` — Membro em sistema carcerário?

- **O que é:** existência de membro no sistema carcerário.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções:** `Sim`, `Não`

## `membroSocioeducacao` — Membro em socioeducação?

- **O que é:** existência de membro em medida socioeducativa.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções:** `Sim`, `Não`

---

# Aba 4 — Saúde — (habilitada somente na edição)

## `vitimaPCD` — Vítima é PCD?

- **O que é:** indica se a vítima é pessoa com deficiência.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções:** `Sim`, `Não`

## `vitimaPCDDetalhe` — Qual?

- **O que é:** descrição do tipo/condição de deficiência.
- **Tipo UI:** texto.
- **Quando aparece:** somente se `vitimaPCD = "Sim"`.
- **Obrigatório:** não (no schema atual está opcional).

## `tratamentoSaude` — Faz tratamento de saúde?

- **O que é:** indica se realiza tratamento de saúde.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções:** `Sim`, `Não`

## `tratamentoSaudeDetalhe` — Onde?

- **O que é:** local/serviço do tratamento.
- **Tipo UI:** texto.
- **Quando aparece:** somente se `tratamentoSaude = "Sim"`.
- **Obrigatório:** não (no schema atual está opcional).

## `dependeFinanceiro` — Depende financeiramente do agressor?

- **O que é:** dependência financeira em relação ao agressor.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções:** `Sim`, `Não`

---

# Aba 5 — Encaminhamentos (Fluxos e Encaminhamentos) — (habilitada somente na edição)

## `encaminhamento` — Encaminhamento realizado?

- **O que é:** indica se houve encaminhamento.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções:** `Sim`, `Não`

## `encaminhamentoDetalhe` — Para onde?

- **O que é:** destino do encaminhamento.
- **Tipo UI:** texto.
- **Quando aparece:** somente se `encaminhamento = "Sim"`.
- **Obrigatório:** não (no schema atual está opcional).

## `encaminhadaSCFV` — Encaminhada ao SCFV/CDI?

- **O que é:** encaminhamento para SCFV/CDI.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções (valores):** `SCFV`, `CDI`, `NÃO`

## `inseridoPAEFI` — Inserida no PAEFI?

- **O que é:** se foi inserida no PAEFI.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções:** `Sim`, `Não`

## `confirmacaoViolencia` — Confirmação da violência

- **O que é:** status de confirmação do evento.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções:**
  - `Confirmada`
  - `Em análise`
  - `Não confirmada`

## `reincidente` — Caso de reincidência?

- **O que é:** indica se o caso é reincidente.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções:** `Sim`, `Não`

## `notificacaoSINAM` — Notificação no SINAM?

- **O que é:** se houve notificação no SINAM.
- **Tipo UI:** seleção.
- **Obrigatório:** sim (apenas no modo edição).
- **Opções:** `Sim`, `Não`

## `canalDenuncia` — Canal de denúncia

- **O que é:** origem/canal da denúncia.
- **Tipo UI:** texto.
- **Obrigatório:** sim (apenas no modo edição).

## `qtdAtendimentos` — Quantidade de atendimentos

- **O que é:** quantidade de atendimentos relacionados ao caso.
- **Tipo UI:** numérico.
- **Obrigatório:** sim (apenas no modo edição).

---

## 4. Observações de consistente de valores (seleções)

Alguns selects usam `Não` e outros usam `NÃO` como valor. Isso pode gerar inconsistência em filtros/relatórios no backend se houver comparação literal.

Recomendação: padronizar os valores (`Sim`/`Não`) ou mapear para enums (ex.: `YES/NO`) e apenas exibir labels em pt-BR.
