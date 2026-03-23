# Plano de execução (mais seguro) — Refatoração do `Cadastro.tsx` com _adapters_ (sem quebrar Painel/Consulta/Vigilância)

> Baseado em: `docs/arquitetura_front.md`, `docs/refatorar_cadastro.md` e `docs/plano-refatoracao-cadastro.md`.
>
> Premissas confirmadas:
>
> - **Objetivo deste ciclo:** refatorar **sem alterar o fluxo original** (UI e persistência) e **sem quebrar dependências** (Consulta/Painel Vigilância/Relatórios).
> - O backend **aceita `additionalProperties`** no JSON enviado (tolerante), então é possível enviar **aliases temporários** (chaves legadas + chaves canônicas), se necessário.
> - Chamadas HTTP continuam centralizadas em `src/services/api.ts` (padrão do projeto).

---

## 1) Estratégia de segurança (princípios)

### 1.1 Refatoração em camadas, mantendo compatibilidade

- **Camada de UI (Tabs)** não deve conhecer contrato de API nem normalizações.
- **Camada de formulário (RHF + Zod)** valida o _shape_ do formulário (estado local).
- **Camada de integração (Adapters)** faz a ponte entre:
  - resposta da API ⇄ valores do formulário
  - valores do formulário ⇄ payload da API

**Regra:** qualquer trecho relacionado a `snake_case` vs `camelCase`, `dados_completos` cru, aliases e compatibilidade com legado deve ficar **somente** nos _adapters_ (ou no hook).

### 1.2 “Contrato canônico” futuro, sem migrar agora

O `docs/refatorar_cadastro.md` recomenda padronizar para chaves canônicas como `tipoViolencia`. Porém isso pode quebrar dashboards e filtros que hoje leem chaves literais.

Neste ciclo:

- **Não renomear campos do formulário** nem mudar chaves persistidas como padrão.
- Introduzir _adapters_ capazes de:
  - **Ler tanto legado quanto canônico**
  - **Escrever legado e (opcionalmente) canônico como alias**, aproveitando que o backend tolera `additionalProperties`

Isso permite uma migração posterior (PR-2) com risco baixo.

### 1.3 “One source of truth” para integração

- Toda lógica de `load/edit/save` do Cadastro fica em `src/pages/Cadastro/useCadastroForm.ts`.
- Toda lógica de `payload/normalize` fica em `src/pages/Cadastro/adapters.ts` (arquivo recomendado).

---

## 2) Estrutura alvo (pasta/pages) — aderente ao seu plano

```
src/pages/Cadastro/
├── Cadastro.tsx                # Container: layout, header, tabs, botões
├── schema.ts                   # Zod schemas + tipos + helpers de validação
├── useCadastroForm.ts          # Hook: RHF + efeitos + submit + uso dos adapters
├── adapters.ts                 # (NOVO) normalização: API ⇄ Form ⇄ Payload (compat)
└── components/
    ├── TabAtendimento.tsx
    ├── TabVitima.tsx
    ├── TabFamilia.tsx
    ├── TabSaude.tsx
    └── TabEncaminhamentos.tsx
```

Compatibilidade de import/rotas (para evitar impacto no `App.tsx`):

- Manter `src/pages/Cadastro.tsx` como **arquivo “proxy”** temporário:
  - `export { default } from "./Cadastro/Cadastro";`

---

## 3) Plano de execução em PRs (sequência mais segura)

### PR-0 (opcional, mas recomendado): “inventário” para não quebrar indicadores

**Objetivo:** mapear as dependências de chaves literais.

Checklist:

1. Listar chaves usadas em:
   - `src/pages/PainelVigilancia/PainelVigilancia.tsx`
   - `src/pages/Consulta.tsx`
   - `src/pages/CasoDetalhe.tsx`
2. Conferir no `Cadastro.tsx` atual quais chaves são persistidas em `dados_completos`.
3. Criar uma tabela (pode ficar neste doc ou num comentário do PR):
   - `Form field` → `dados_completos` (legado) → `dados_completos` (canônico futuro) → “quem consome”

**Saída esperada:** lista objetiva do que não pode mudar neste ciclo.

---

## ✅ PR-0 — EXECUTADO (inventário de chaves e dependências)

> Data: 2026-03-21

### 0.1 Artefato A — Chaves literais consumidas por telas (o que NÃO pode quebrar)

#### `src/pages/PainelVigilancia/PainelVigilancia.tsx`

Mapa de filtros de drill-down (`VIGILANCIA_FILTERS_MAP`) envia para a API os seguintes nomes de campo:

- `status`
- `mes`
- `reincidente`
- `bairro`
- `canalDenuncia`
- `tipoViolencia`
- `dataCad`

Implicação direta:

- O endpoint de filtragem usado pela vigilância (`getCasosFiltrados` com `origem: 'vigilancia'`) precisa continuar entendendo esses **nomes literais**.
- Em particular, já existe dependência em **camelCase**: `tipoViolencia` e `dataCad`.

#### `src/pages/Consulta.tsx`

Consulta monta filtros para o backend com a estrutura `FiltrosCasos`:

- Busca geral: `filters.filtro = 'q'`, `filters.valor = <termo>`
- Por status: `filters.status = <status>`
- Filtros específicos:
  - `filters.filtro = 'por_violencia'` + `filters.valor = <termo>`
  - `filters.filtro = 'por_bairro'` + `filters.valor = <termo>`

Campos exibidos na tabela (vindos do backend):

- `id`
- `nome`
- `tec_ref`
- `data_cad`
- `bairro`
- `unit_id`

Implicação direta:

- O cadastro não pode deixar de fornecer dados mínimos para listagem: `nome`, `tec_ref`, `data_cad`, `bairro`.

#### `src/pages/CasoDetalhe.tsx`

O detalhe do caso:

- oculta as chaves técnicas (`LABELS_OCULTOS`) e
- renderiza itens simples (string/number) do objeto retornado.

Observações:

- `dados_completos` é oculto e qualquer campo novo no top-level pode passar a aparecer automaticamente.
- O componente tenta formatar labels de `snake_case` e `camelCase`, então ambos “funcionam”, porém isso não resolve consistência de filtros/analytics.

---

### 0.2 Artefato B — Campos atuais do formulário `src/pages/Cadastro.tsx` (RHF) e risco de drift

Trecho relevante do schema/estado do formulário indica campos como (não-exaustivo, porém os principais):

- Atendimento:

  - `data_cad`
  - `tec_ref`
  - `tipo_violencia` (**snake_case**)
  - `local_ocorrencia` (**snake_case**)

- Encaminhamentos (inclui chaves usadas em análises):
  - `canalDenuncia` (**camelCase**)
  - `reincidente`
  - `bairro` (na aba Vítima)

Risco crítico identificado (já documentado em `docs/refatorar_cadastro.md`):

- O cadastro persiste `tipo_violencia`, enquanto Painel/Vigilância filtram por `tipoViolencia`.

---

### 0.3 Artefato C — Tabela inicial de mapeamento (para orientar `adapters.ts`)

| Campo no Form (RHF hoje) | Legado em `dados_completos` (persistido hoje) | Canônico futuro (proposto)            | Consumidores afetados                                                        |
| ------------------------ | --------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| `tipo_violencia`         | `tipo_violencia`                              | `tipoViolencia`                       | Painel Vigilância (filtro `tipoViolencia`), endpoints de análise, dashboards |
| `canalDenuncia`          | `canalDenuncia`                               | `canalOrigem` (futuro) / manter alias | Painel Vigilância (filtro `canalDenuncia`), Dashboard (`canalDenuncia`)      |
| `bairro`                 | `bairro`                                      | `bairro`                              | Painel Vigilância (filtro `bairro`), Consulta (listagem), MapaCalor          |
| `data_cad`               | top-level `data_cad`                          | `dataCad` (alias p/ vigilância)       | Painel Vigilância usa `dataCad` em filtros; Consulta/lista usa `data_cad`    |
| `tec_ref`                | top-level `tec_ref`                           | `tec_ref` (autoritativo)              | Consulta/lista, auditoria                                                    |
| `reincidente`            | `reincidente`                                 | `reincidente`                         | Painel Vigilância (filtro `reincidente`)                                     |

Notas:

- A tabela acima é o mínimo para garantir compatibilidade com os consumidores já detectados.
- O _adapter_ deve:
  - **ler** `tipoViolencia` ou `tipo_violencia` (coalesce)
  - **escrever** `tipo_violencia` e **também** `tipoViolencia` (alias), já que o backend aceita `additionalProperties`
  - considerar aliases também para `dataCad` ⇄ `data_cad` quando o payload/response exigir

---

### 0.4 Regras de “não regressão” derivadas do PR-0

1. Não remover nem renomear `canalDenuncia` (é consumido por Painel/Dashboard).
2. Não depender apenas de `tipo_violencia` na integração: sempre suportar `tipoViolencia` por compat.
3. Na edição, nunca fazer `reset({ ...casoData })` sem tratar `dados_completos` (precisa achatar).

---

### PR-1: “Refactor-only” (sem mudança de contrato) + Adapters

**Objetivo:** reduzir `Cadastro.tsx` monolítico e centralizar integração no hook/adapters.

## ✅ PR-1 — CONCLUÍDO (refactor-only + adapters)

> Data: 2026-03-21

### 1.1 Artefatos entregues (arquivos criados/alterados)

**Criados/Preenchidos**

- `src/pages/Cadastro/schema.ts`

  - Contém `baseSchema`, `editSchema`, `tabFields`, `CasoForm`, `validateCPF`, `validateNIS`, `toStr`.
  - Objetivo: retirar validação/tipagem de dentro do componente e manter comportamento idêntico ao legado.

- `src/pages/Cadastro/adapters.ts`

  - Funções puras de compatibilidade:
    - `caseToFormValues(apiCaso)` (flatten de `dados_completos` + coalesce de chaves)
    - `formValuesToCreatePayload(values, ctx)` (monta payload de criação e envia aliases canônicos)
    - `formValuesToUpdatePayload(values, ctx)` (monta patch de update e envia aliases quando aplicável)
  - Compat implementada (mínimo do PR-0):
    - lê `tipo_violencia` e `tipoViolencia`
    - escreve alias `tipoViolencia` junto de `tipo_violencia` (backend tolera `additionalProperties`)
    - alias auxiliares `localOcorrencia` e `dataCad` quando o campo existe no patch

- `src/pages/Cadastro/useCadastroForm.ts`

  - Centraliza RHF + resolver Zod + load/edit/save + navegação/toasts.
  - Usa **somente** `src/services/api.ts` para HTTP.
  - Na edição, usa `caseToFormValues` antes de `reset` (corrige problema de `dados_completos` cru).

- Tabs extraídas para `src/pages/Cadastro/components/`

  - `TabAtendimento.tsx`
  - `TabVitima.tsx`
  - `TabFamilia.tsx`
  - `TabSaude.tsx`
  - `TabEncaminhamentos.tsx`
  - Todas usam `FormProvider + useFormContext()`.

- `src/pages/Cadastro/Cadastro.tsx`
  - Container/orquestrador: header + tabs + botões.
  - Não contém regras de payload nem chamadas HTTP.

**Alterado (compat de rota/import):**

- `src/pages/Cadastro.tsx`
  - Virou proxy (re-export) para `src/pages/Cadastro/Cadastro.tsx`.
  - Objetivo: manter rotas/imports existentes sem mudanças em `App.tsx`.

### 1.2 Regras de compatibilidade atendidas (do PR-0)

- ✅ Não remover/renomear `canalDenuncia`.
- ✅ Suportar `tipo_violencia` e `tipoViolencia` via adapters.
- ✅ Não fazer `reset({ ...casoData })` sem tratar `dados_completos` (feito via `caseToFormValues`).

### 1.3 Observações importantes (para PR-2)

- O payload de criação **mantém** o formato existente do projeto (`dados_completos_payload`) e agora pode carregar aliases.
- `tec_ref` continua desabilitado na UI no modo edição (comportamento legado), mas a “autoria autoritativa” deve ser reforçada no backend/PR-2.

---

### ✅ PR-2 — CONCLUÍDO (Convergência de contrato)

> Data: 2026-03-22

- Leitura canônico-first + fallback para legado em `src/pages/Cadastro/adapters.ts`.
- Escrita canônico-first + dual-write/aliases para `tipoViolencia`/`tipo_violencia`, `localOcorrencia`/`local_ocorrencia` e alias `dataCad`.
- `tec_ref` autoritativo no FE via `useCadastroForm.ts` (preferindo `tecRefFromAuth`).
- Compilação validada (sem erros).

---

### ✅ PR-3 — CONCLUÍDO (Qualidade de dados)

> Data: 2026-03-22

- Fonte única de opções em `src/pages/Cadastro/options.ts`.
- `schema.ts` com enums Zod (campos já controlados via `Select`) e regras de consistência.
- Tabs migradas para options + microcopy (vitima/encaminhamentos) e normalização no adapter (`normalizeSimNao`, `normalizeText`).
- Padronização de valores inconsistentes (ex.: "Não" vs "NÃO").

---

### ✅ PR-4 — CONCLUÍDO (Ampliação de modelagem — dedicado)

> Data: 2026-03-22

- Novos enums/blocos (origem estruturada, violência detalhada, raça/cor/etnia, agressor, moradia, campos sensíveis) adicionados em `schema.ts` e `options.ts`.
- Novas abas implementadas e integradas no container: `TabAgressor.tsx` e `TabMoradia.tsx`.
- `adapters.ts` atualizado para leitura/escrita canônico-first com compat:
  - `canalOrigem` ⇄ `canalDenuncia`
  - `racaCor` ⇄ `corEtnia` (mapeamento seguro)
  - normalização de textos/arrays/sim-não
- Build validado.

---

## 4) Checklist de validação (regressão zero)

### 4.1 Fluxos principais

1. **Criar caso** (`/cadastro`)
   - navegar por todas as abas
   - preencher campos mínimos
   - salvar e verificar sucesso
2. **Editar caso** (`/cadastro/:id`)
   - validar que o formulário popula corretamente
   - alterar campos em múltiplas abas
   - salvar e verificar persistência

### 4.2 Pontos frágeis (do `docs/refatorar_cadastro.md`)

- **Reset de edição**: garantir que `dados_completos` seja “achatado” no `reset`.
- **`tipo_violencia` vs `tipoViolencia`**:
  - leitura deve aceitar ambos
  - escrita pode enviar ambos (alias) sem quebrar
- **`tec_ref`**:
  - no mínimo, preencher por padrão com o user logado
  - ideal (se não quebrar UX existente): tornar readOnly/disabled na UI

### 4.3 Validações

- CPF/NIS inválidos devem acusar erro como antes.
- Campos obrigatórios do Zod devem bloquear submit.

### 4.4 Áreas dependentes

- Conferir `Consulta` e `PainelVigilancia`:
  - casos novos continuam aparecendo
  - filtros que dependem de chaves literais não quebram

---

## 5) Plano de migração futura (sem executar agora)

### PR-2: Convergência de contrato (gradual e segura)

> ✅ **Executado neste ciclo** (ver seção "PR-2 — CONCLUÍDO" acima). Mantido aqui como referência histórica do plano.

**Objetivo:** convergir para um contrato canônico em `dados_completos` (ex.: `tipoViolencia`) sem quebrar Painel/Consulta/Vigilância e sem perder compatibilidade com dados legados.

---

### PR-3: Qualidade de dados

> ✅ **Executado neste ciclo** (ver seção "PR-3 — CONCLUÍDO" acima). Mantido aqui como referência histórica do plano.

**Objetivo:** reduzir dispersão de valores (melhorando filtros/relatórios) e melhorar UX de campos sensíveis, sem reintroduzir acoplamento no container.

---

### PR-4: Ampliação de modelagem (enums + novos blocos) — **dedicado**

> ✅ **Executado neste ciclo** (ver seção "PR-4 — CONCLUÍDO" acima). Mantido aqui como referência histórica do plano.

**Objetivo:** implementar a “ampliação grande” de modelagem proposta em `docs/refatorar_cadastro.md` (enums fechados e novos campos/blocos: violência detalhada, origem estruturada, raça/cor/etnia, moradia, agressor, sexo/orientação/identidade etc.), **sem degradar edição/criação**, e com transição compatível (aliases + backfill opcional).

---

## 6) Definições objetivas (para você validar antes de implementar)

1. **Manteremos os nomes dos campos do RHF iguais aos atuais** neste ciclo.
2. O arquivo `adapters.ts` será o **único** local com:
   - aliases de chaves
   - flatten/unflatten de `dados_completos`
   - normalização de `snake_case/camelCase`
3. Como o backend aceita `additionalProperties`, o payload poderá ter:
   - chaves legadas + chaves canônicas (quando fizer sentido)
   - sem impactar o armazenamento (JSONB) e sem quebrar o endpoint

---

## 7) “Pronto/Done” (critérios)

- `src/pages/Cadastro.tsx` deixa de ser monolítico e vira proxy/container.
- `schema.ts`, `useCadastroForm.ts` e `adapters.ts` existem e estão coesos.
- Abas estão em `src/pages/Cadastro/components/`.
- Criação/edição funcionam igual.
- Consulta/Painel Vigilância continuam funcionando (sem regressões).
