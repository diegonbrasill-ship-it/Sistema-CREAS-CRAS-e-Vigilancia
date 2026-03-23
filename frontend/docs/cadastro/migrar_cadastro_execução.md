# Plano de execução — Migração do Cadastro para **canônico-only** (abandono de legado)

> Baseado em: `docs/arquitetura_front.md`, `docs/refatorar_cadastro.md` e `docs/plano-refatoracao-cadastro.md`.
>
> Estratégia (2026-03-22): **abandono explícito de dados legados**.
>
> - O objetivo agora é migrar para **somente canônico** no front-end (UI + schema + integração), **sem dual-write**.
> - Campos/aliases legados **deixarão de funcionar** após a migração, **até que** consumidores (telas/relatórios) e/ou backend sejam adaptados.
> - **Nota importante (canal/origem):** `canalOrigem` e `canalDenuncia` eram para ser o _mesmo_ atributo. Para evitar churn, manteremos **`canalDenuncia` como nome principal do protocolo/contrato**.

---

## 1) Estratégia (princípios) — abandono de legado

### 1.1 O que muda em relação ao plano anterior

- Antes: _adapters_ para compatibilidade (ler legado e canônico + dual-write).
- Agora: **canônico-only**.
  - O Cadastro **só** lê/escreve campos canônicos.
  - Qualquer coisa que dependa de chaves legadas vai **quebrar** até ser adaptada.

### 1.2 Regras por camada

- **UI (Tabs):** só conhece campos canônicos (nomes, enums, microcopy).
- **Form (RHF + Zod):** modela e valida somente o shape canônico.
- **Integração (adapters/hook):**
  - Adapter de leitura: transforma `apiCaso` → `FormValues` **canônicos**.
    - Pode manter _fallback temporário_ no **carregamento** (se necessário para editar casos antigos), mas não deve regravar legado.
  - Adapter de escrita: `FormValues` → payload **somente canônico**.

### 1.3 “Quebras controladas” (resultado esperado)

- Painel/Consulta/Vigilância/Dashboard podem **parar de filtrar/exibir corretamente** até serem migrados para ler campos canônicos.
- Isso é intencional nesta estratégia: a migração passa a ser dirigida por **inventário + adaptação**.

---

## 2) Fase inicial obrigatória — inventário de legado no front-end

### PR-0 — Inventário de atributos legados e pontos de uso (obrigatório)

**Objetivo:** listar tudo que é **legado** no Cadastro e **onde** isso é consumido no front-end para orientar a adaptação pós-migração.

#### 0.1 O que considerar “legado”

- Chaves antigas em `dados_completos` (ex.: `tipo_violencia`, `local_ocorrencia`, `canalDenuncia`, etc.)
- Qualquer `snake_case` persistido por histórico do Cadastro
- Valores “soltos” sem enum canônico (ex.: variações de SIM/NÃO)

#### 0.2 Entregáveis deste PR

1. Uma tabela neste documento com colunas:

   - `chave_legada`
   - `chave_canonica_equivalente` (ou “REMOVIDO”)
   - `origem` (Cadastro: qual aba/campo)
   - `consumidores_no_FE` (arquivos/componentes)
   - `impacto` (ex.: filtro, KPI, listagem)
   - `ação` (adaptar consumidor / remover / substituir)

2. Uma lista de “dead-keys” (legado sem uso / sem equivalente) para remoção.

#### 0.3 Busca sugerida (strings)

- `dados_completos`
- `tipo_violencia`, `local_ocorrencia`
- `canalDenuncia`, `dataCad`, `data_cad`
- `corEtnia`, `racaCor`
- `tipoViolencia` (verificar se é canônico ou remanescente de alias)

**Aceite:** tabela preenchida + lista de arquivos afetados.

---

## 3) Migração para canônico-only (sem dual-write)

### PR-1 — Atualizar contrato do Cadastro (UI + schema) para canônico-only

**Objetivo:** o estado do formulário (RHF) e o `schema.ts` passam a ter **somente campos canônicos**.

Checklist:

- [ ] Revisar `src/pages/Cadastro/schema.ts` para remover/evitar qualquer dependência em chaves legadas.
- [ ] Ajustar `tabFields` para listar campos canônicos reais (usados pela UI atual).
- [ ] Revisar todas as Tabs para que `name=` de RHF aponte apenas para chaves canônicas.

#### Mudanças obrigatórias de campos (solicitadas)

- [ ] **Remover campo `local_ocorrencia`** (legado) do schema e da UI.
  - Se existir campo canônico equivalente, registrar na tabela do PR-0; caso contrário, remover de vez.
- [ ] **Remover campo de “data de denúncia” do bloco/campo de canal de denúncia**.
  - (Ex.: não coletar nem persistir data atrelada ao canal; manter apenas a data de cadastro/top-level se existir.)
- [ ] **Remover campo “vítima depende financeiramente do agressor” da aba Saúde**.
  - Remover do schema e também de `TabSaude.tsx`.

**Aceite:** build passa; formulário cria/edita sem campos removidos.

---

### PR-2 — Atualizar adapters/hook para payload canônico-only

**Objetivo:** parar de enviar qualquer alias/dual-write e produzir payload canônico estável.

Checklist:

- [ ] `src/pages/Cadastro/adapters.ts`:

  - [ ] `formValuesToCreatePayload` e `formValuesToUpdatePayload` devem enviar **somente** chaves canônicas.
  - [ ] Remover escrita de qualquer chave legada (`snake_case` e antigos aliases).
  - [ ] Em especial, **não introduzir** `canalOrigem` (o nome principal permanece `canalDenuncia`).
  - [ ] Se existir fallback de leitura para editar casos antigos, garantir que:
    - converte legado → canônico no load
    - **nunca** escreve legado adicional de volta no save

- [ ] `src/pages/Cadastro/useCadastroForm.ts`:
  - [ ] manter o adapter como única ponte UI ⇄ API
  - [ ] garantir que `defaultValues/reset` já estejam em shape canônico.

**Aceite:** payload enviado para `createCase` e `updateCase` não contém chaves legadas/aliases.

---

### PR-3 — Limpeza: remover enums/funções/compatibilidade legada não usada

**Objetivo:** reduzir custo cognitivo e risco de regressão removendo código de compat.

Checklist:

- [ ] Remover enums/opções legadas que não tenham mais uso em UI/schema.
- [ ] Remover mapeamentos canon⇄legado e normalizações criadas exclusivamente para compat.
- [ ] Remover caminhos de código mortos e exports não usados.

**Aceite:** sem warnings/erros de TS; build passa; opções e enums ficam estritamente canônicas.

---

### PR-4 — Adaptação dos consumidores no front-end (Painel/Consulta/Vigilância/Dashboard)

**Objetivo:** fazer as telas e filtros lerem/enviaram somente chaves canônicas.

Checklist mínimo:

- [ ] `src/pages/PainelVigilancia/PainelVigilancia.tsx`: migrar `VIGILANCIA_FILTERS_MAP` para campos canônicos.
- [ ] `src/pages/Consulta.tsx`: revisar filtros e mapeamentos com base na tabela do PR-0.
- [ ] `src/pages/Dashboard.tsx` e componentes Recharts: garantir contagens por chaves canônicas.
- [ ] `src/pages/CasoDetalhe.tsx`: revisar labels/ocultação para novo contrato; evitar exibir lixo.

**Aceite:** principais fluxos de leitura e filtros voltam a funcionar com canônicos.

---

## 4) Regressão manual (obrigatória)

### 4.1 Roteiro curto

1. Criar caso novo no Cadastro (preencher campos obrigatórios)
2. Editar caso existente (especialmente um caso antigo com `dados_completos` legados) e salvar
3. Verificar:
   - Consulta lista o caso (e campos essenciais)
   - Painel Vigilância filtra sem erro
   - Dashboard exibe KPIs principais

### 4.2 Evidências

- Registrar prints (ou IDs de casos) e anotar:
  - payload de create e update (chaves principais)
  - quais telas ficaram quebradas antes da adaptação (esperado)

---

## 5) Registro final — mudança de payload (contrato) + instruções para o backend

### 5.1 O que mudou no payload do Cadastro (resumo)

**Antes (compat/legado):**

- Cadastro podia enviar chaves legadas e aliases simultaneamente (dual-write), ex.:
  - `tipo_violencia` **e** `tipoViolencia`
  - `local_ocorrencia` **e** `localOcorrencia`
  - `canalDenuncia` **e** `canalOrigem`

**Depois (canônico-only):**

- Cadastro envia **somente** chaves canônicas dentro de `dados_completos_payload`.
- Campo de canal permanece com **nome de protocolo** `canalDenuncia`.
- Campos removidos não são mais enviados:
  - `local_ocorrencia` (removido)
  - `dataDenuncia`/data associada ao canal (removida)
  - `vitimaDependeFinanceiramenteDoAgressor` (removida da aba Saúde)

> Importante: o formato do envelope do request (ex.: `dados_completos_payload`) permanece o mesmo, mas o conteúdo muda para canônico-only.

### 5.2 Como o backend deve se adaptar (instrução básica)

1. **Create** (`POST /api/casos`)

   - Passar a **persistir** `dados_completos_payload` como canônico (JSON) sem esperar chaves legadas.

2. **Update** (`PUT /api/casos/:id`)

   - Aplicar merge/patch considerando somente chaves canônicas.
   - Se o backend tiver validações/mapeamentos, atualizar para refletir:
     - remoção de `local_ocorrencia`
     - remoção da data do canal
     - remoção do campo de dependência financeira na saúde

3. **Endpoints de filtro/analytics** (Vigilância/Dashboard)

   - Migrar consultas/agregações:
     - parar de ler `tipo_violencia` e ler `tipoViolencia` (canônico)
     - continuar usando `canalDenuncia` como chave principal (não `canalOrigem`)
     - revisar qualquer filtro que use `dataCad`/`data_cad` e padronizar

4. (Opcional, para transição com dados antigos)
   - Se existirem registros antigos legados, considerar um backfill/migração no banco:
     - mapear legado → canônico uma vez
     - ou manter o backend capaz de coalesce na leitura, enquanto o FE já é canônico-only.
