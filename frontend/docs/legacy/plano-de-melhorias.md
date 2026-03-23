# 🛠️ PLANO DE MELHORIAS — MVP RMSUAS Frontend

> **Data de elaboração:** Fevereiro de 2026  
> **Escopo:** Melhorias de alto retorno para o estágio MVP. Focado em corrigir bugs críticos, consolidar padrões já existentes e reduzir dívida técnica imediata.  
> **Critério de priorização:** Impacto no usuário final + facilidade de implementação.

---

## RESUMO EXECUTIVO

Foram identificados **3 bugs críticos** que impedem o uso correto da aplicação, **1 problema estrutural** de permissões que causa inconsistências e confusão na manutenção, e **melhorias de usabilidade** no formulário de caso. O plano está organizado em prioridades.

---

## 🔴 PRIORIDADE 1 — BUGS CRÍTICOS (Corrigir imediatamente)

---

### 1.1 — Acesso à página `/caso/:id` não funciona

**Problema:**  
A rota `/caso/:id` exige **todas** as permissões de `entityPermissions.casos` (create, read, edit, delete, archive). Um usuário com permissão de leitura (`casos.read`) mas sem `casos.delete` é **bloqueado e redirecionado para o dashboard**, mesmo que queira apenas visualizar o prontuário.

O `ProtectedRoute` usa `requiredPermissions.every(...)`, ou seja, **todas as permissões do array devem estar presentes**. Para uma rota de visualização, isso é excessivamente restritivo.

**Causa raiz:**

```tsx
// App.tsx — linha problemática
<Route
  path="caso/:id"
  element={
    <ProtectedRoute
      element={<CasoDetalhe />}
      requiredPermissions={entityPermissions.casos}
    />
  }
/>
// entityPermissions.casos = ["casos.create", "casos.read", "casos.edit", "casos.delete", "casos.archive"]
// Qualquer usuário sem um desses itens é bloqueado
```

**Solução:**  
Usar apenas `["casos.read"]` como permissão mínima para acessar a rota de detalhe. As ações destrutivas (excluir, desligar) dentro da página já são controladas por lógica de UI (`isOperacional`).

**Arquivo:** `src/App.tsx`

```tsx
// ANTES
<Route path="caso/:id" element={
  <ProtectedRoute element={<CasoDetalhe />} requiredPermissions={entityPermissions.casos} />
} />

// DEPOIS
<Route path="caso/:id" element={
  <ProtectedRoute element={<CasoDetalhe />} requiredPermissions={["casos.read"]} />
} />
```

**Impacto:** Alto — Atualmente qualquer usuário sem o pacote completo de permissões de casos (ex: técnicos com permissão reduzida) não consegue abrir nenhum prontuário.

---

### 1.2 — Import sem uso causando erro de compilação

**Problema:**  
`App.tsx` importa `{ string }` do `zod` sem nenhuma utilização. Além de causar um warning/erro de lint, é um sinal de código descuidado.

```tsx
// App.tsx — linha ~24
import { string } from "zod"; // ❌ Nunca usado
```

**Solução:** Remover o import.

**Arquivo:** `src/App.tsx`

---

### 1.3 — Lógica `RouteProtegida` legada ainda presente em `App.tsx`

**Problema:**  
O componente `RouteProtegida` (guard legado baseado em grupos `ANALISE`, `CREAS_OP`, etc.) ainda está declarado em `App.tsx` mas **não é usado em nenhuma rota**. Isso cria:

- Código morto confuso para qualquer desenvolvedor que leia o arquivo
- Lógica de permissões duplicada e divergente do padrão atual (`ProtectedRoute`)
- ~40 linhas de código sem propósito

**Solução:** Remover completamente o componente `RouteProtegida` de `App.tsx`.

**Arquivo:** `src/App.tsx`

---

## 🟠 PRIORIDADE 2 — PROBLEMA ESTRUTURAL DE PERMISSÕES (Alta dívida técnica)

---

### 2.1 — Lógica de permissões espalhada e inconsistente

**Problema:**  
Apesar do `usePermissoesSUAS` existir como "única fonte de verdade", a verificação de permissões **ainda está espalhada** em 3 camadas diferentes com padrões diferentes:

| Local                | Padrão usado                               | Problema                                                   |
| -------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| `App.tsx` (rotas)    | `entityPermissions.casos` (array completo) | Bloqueio excessivo — requer TODOS os CRUDs                 |
| `CasoDetalhe.tsx`    | `userRole.includes('tecnico')`             | Compara string de role diretamente, ignora `permissions[]` |
| `Layout.tsx`         | `usePermissoesSUAS()`                      | ✅ Correto — usa o hook centralizado                       |
| `ProtectedRoute.tsx` | `user.permissions.every(...)`              | Correto mas mal configurado nas rotas                      |

**Em `CasoDetalhe.tsx` (linhas 65-69):**

```tsx
// ❌ Lógica manual de role — deve usar o hook
const userRole = user?.role || "";
const isOperacional =
  userRole.includes("gestor") ||
  userRole.includes("coordenador") ||
  userRole.includes("tecnico") ||
  userRole.includes("vigilancia");
const canDelete = isOperacional;
```

Esta verificação bypassará qualquer permissão granular configurada no backend. Um usuário com `role = "tecnico_superior"` mas **sem** `casos.edit` no `permissions[]` ainda consegue editar/excluir casos pela interface.

**Solução — Em duas etapas:**

**Etapa A:** Adicionar os campos de permissão granular faltantes no `usePermissoesSUAS`:

```typescript
// Adicionar ao hook usePermissoesSUAS:
canReadCasos:   hasPermission("casos.read"),
canEditCasos:   hasPermission("casos.edit"),
canDeleteCasos: hasPermission("casos.delete"),
canCreateCasos: hasPermission("casos.create"),
```

**Etapa B:** Refatorar `CasoDetalhe.tsx` para usar o hook em vez de comparação manual de role:

```tsx
// ANTES (CasoDetalhe.tsx)
const userRole = user?.role || '';
const isOperacional = userRole.includes('gestor') || ...
const canDelete = isOperacional;

// DEPOIS
const { canEditCasos, canDeleteCasos } = usePermissoesSUAS();
// Usar canEditCasos para exibir botão "Editar"
// Usar canDeleteCasos para exibir botão "Excluir"
```

**Arquivos a modificar:** `src/hooks/usePermissoesSUAS.ts`, `src/pages/CasoDetalhe.tsx`

---

### 2.2 — Permissões de rotas não refletem o acesso mínimo necessário

**Problema:**  
O padrão atual usa `entityPermissions.casos` (array com 5 permissões) para proteger rotas que precisam apenas de 1 permissão. A tabela abaixo mapeia o problema:

| Rota                  | Permissão atual (exige TODAS) | Permissão correta (mínimo) |
| --------------------- | ----------------------------- | -------------------------- |
| `/cadastro`           | `casos.*` (5 perms)           | `casos.create`             |
| `/cadastro/:id`       | `casos.*` (5 perms)           | `casos.edit`               |
| `/consulta`           | `casos.*` (5 perms)           | `casos.read`               |
| `/caso/:id`           | `casos.*` (5 perms)           | `casos.read`               |
| `/demandas`           | `demandas.*` (5 perms)        | `demandas.read`            |
| `/demandas/:id`       | `demandas.*` (5 perms)        | `demandas.read`            |
| `/controle-mse`       | `mse.*` (5 perms)             | `mse.read`                 |
| `/gerenciar-usuarios` | `users.*` (5 perms)           | `users.read`               |

**Solução proposta para `App.tsx`:**

```tsx
// Rotas de CASOS
<Route path="cadastro"     → requiredPermissions={["casos.create"]} />
<Route path="cadastro/:id" → requiredPermissions={["casos.edit"]} />
<Route path="consulta"     → requiredPermissions={["casos.read"]} />
<Route path="caso/:id"     → requiredPermissions={["casos.read"]} />

// Rotas de DEMANDAS
<Route path="demandas"     → requiredPermissions={["demandas.read"]} />
<Route path="demandas/:id" → requiredPermissions={["demandas.read"]} />

// Rota MSE
<Route path="controle-mse" → requiredPermissions={["mse.read"]} />

// Rota de usuários
<Route path="gerenciar-usuarios" → requiredPermissions={["users.read"]} />
```

**Impacto:** Alto — Desbloqueará acesso legítimo que estava sendo negado por configuração incorreta.

---

## 🟡 PRIORIDADE 3 — FORMULÁRIO DE CASOS: CAMPOS OBRIGATÓRIOS E MÁSCARAS

---

### 3.1 — Campos obrigatórios no formulário de criação (Tab 1: Atendimento)

**Problema:**  
No modo de **criação** (primeiro save), apenas `data_cad` e `tec_ref` são validados como obrigatórios pelo schema Zod. `tipo_violencia` e `local_ocorrencia` são `optional().nullable()`, permitindo cadastros incompletos.

Segundo a regra de negócio (seção 6.3 do contexto), o cadastro inicial deve conter:

> `data_cad`, `tec_ref`, `tipo_violencia`, `local_ocorrencia`

**Solução — Schema Zod:**

```typescript
// Campos obrigatórios na Tab 1
const formSchema = z.object({
  data_cad: z.string().min(1, "A data do cadastro é obrigatória."),
  tec_ref: z.string().min(3, "O nome do técnico é obrigatório."),
  tipo_violencia: z.string().min(1, "O tipo de violência é obrigatório."),
  local_ocorrencia: z.string().min(1, "O local da ocorrência é obrigatório."),
  nome: z
    .string()
    .min(2, "O nome da vítima é obrigatório.")
    .optional()
    .nullable(),
  // demais campos permanecem opcionais...
});
```

> **Nota:** `nome` deve ser obrigatório na Tab 2 (Vítima). Como o formulário usa múltiplas abas com save progressivo, a validação de `nome` pode ser aplicada apenas no submit final (modo edição). Isso requer validação condicional no schema:

```typescript
nome: z.string()
  .optional()
  .nullable()
  .refine(
    (val) => !isEditMode || (val && val.length >= 2),
    { message: "O nome da vítima é obrigatório." }
  ),
```

**Arquivo:** `src/pages/Cadastro.tsx`

---

### 3.2 — Máscara de CPF e NIS nos campos do formulário

**Problema:**  
Os campos `cpf` e `nis` em `Cadastro.tsx` são inputs de texto simples. O usuário pode digitar qualquer formato (com pontos, traços, espaços ou sem), dificultando a leitura e causando erros de validação. Não há feedback visual do formato esperado.

**Formato esperado:**

- CPF: `000.000.000-00` (14 caracteres)
- NIS: `000.0000.0000-0` ou `00000000000` (11 dígitos)

**Solução — Funções de máscara puras (sem biblioteca extra):**

Criar o arquivo `src/utils/masks.ts`:

```typescript
// src/utils/masks.ts

export function maskCPF(value: string): string {
  return value
    .replace(/\D/g, "") // Remove não-dígitos
    .slice(0, 11) // Limita a 11 dígitos
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskNIS(value: string): string {
  return value
    .replace(/\D/g, "") // Remove não-dígitos
    .slice(0, 11) // Limita a 11 dígitos
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{4})(\d)/, "$1.$2")
    .replace(/(\d{4})(\d{1,1})$/, "$1-$2");
}

export function unmask(value: string): string {
  return value.replace(/\D/g, "");
}
```

**Uso no Controller do CPF:**

```tsx
// src/pages/Cadastro.tsx
import { maskCPF, maskNIS, unmask } from "@/utils/masks";

// No Controller do CPF:
<Controller name="cpf" control={control} render={({ field }) => (
  <Input
    id="cpf"
    placeholder="000.000.000-00"
    value={field.value ? maskCPF(field.value) : ''}
    onChange={(e) => field.onChange(maskCPF(e.target.value))}
    maxLength={14}
  />
)} />

// No Controller do NIS:
<Controller name="nis" control={control} render={({ field }) => (
  <Input
    id="nis"
    placeholder="000.0000.0000-0"
    value={field.value ? maskNIS(field.value) : ''}
    onChange={(e) => field.onChange(maskNIS(e.target.value))}
    maxLength={14}
  />
)} />
```

> **Atenção:** A função `validateCPF` e `validateNIS` já fazem `replace(/[^\d]/g, '')` antes de validar, então as máscaras não quebrarão a validação existente.

**Arquivo a criar:** `src/utils/masks.ts`  
**Arquivo a modificar:** `src/pages/Cadastro.tsx`

---

## 🟢 PRIORIDADE 4 — LIMPEZA DE CÓDIGO (Dívida técnica menor)

---

### 4.1 — Remover componente `Sidebar.tsx` legado

**Problema:**  
`src/components/Sidebar.tsx` existe mas não é referenciado em nenhum lugar ativo da aplicação. O shell real usa a sidebar embutida em `Layout.tsx`. O arquivo legado cria confusão sobre qual sidebar está em uso.

**Solução:** Deletar `src/components/Sidebar.tsx` ou mover para `_deprecated/Sidebar.tsx` com um comentário explicativo.

---

### 4.2 — Remover bloco de debug da Sidebar (visível em produção)

**Problema:**  
`Layout.tsx` contém um bloco de diagnóstico mostrando `ROLE`, `UNIT ID` e lista de permissões visível para o usuário final em produção. Este dado é sensível.

**Solução:** Envolver o bloco em `{import.meta.env.DEV && (...)}` ou remover completamente.

```tsx
// Layout.tsx — envolver com guarda de ambiente
{
  import.meta.env.DEV && (
    <div className="debug-badge">{/* conteúdo de debug */}</div>
  );
}
```

---

### 4.3 — Corrigir typo na permissão `screen.dashbord.access`

**Problema:**  
A permissão `"screen.dashbord.access"` (typo: falta o 'a' em 'dashboard') é usada na rota do Painel de Vigilância em vez de `"screen.vigilancia.access"`. Isso é apontado como dívida técnica no `contexto.md` (item 4).

```tsx
// App.tsx — linha do painel-vigilancia
<Route
  path="painel-vigilancia"
  element={
    <ProtectedRoute
      element={<PainelVigilancia />}
      requiredPermissions={["screen.dashbord.access"]}
    />
  }
/>
```

**Solução:** Verificar no backend qual permissão é de fato emitida para o painel de vigilância. Se for `"screen.vigilancia.access"`, atualizar o `App.tsx`. Se for o typo mesmo (legado do backend), criar uma constante nomeada para evitar o typo se espalhar:

```typescript
// src/utils/constants.ts — adicionar
export const SCREEN_PERMISSIONS = {
  dashboard: "screen.dashboard.access",
  vigilancia: "screen.dashbord.access", // typo legado mantido até sync com backend
  relatorios: "screen.relatorios.access",
  integracoes: "screen.integrations.access",
} as const;
```

---

### 4.4 — `permissionHelpers.ts` vazio deve ser populado ou removido

**Problema:**  
`src/utils/permissionHelpers.ts` existe reservado para helpers de permissão mas está vazio. Gera confusão: "por que existe? O que deveria ter aqui?".

**Solução:** Dois caminhos possíveis:

**Opção A (recomendada para MVP):** Deletar o arquivo e consolidar helpers em `usePermissoesSUAS.ts`.

**Opção B:** Mover as funções utilitárias de permissão para cá:

```typescript
// permissionHelpers.ts
export const hasPermission = (permissions: string[], perm: string): boolean =>
  permissions.includes(perm);

export const hasAllPermissions = (
  permissions: string[],
  required: string[]
): boolean => required.every((p) => permissions.includes(p));

export const hasAnyPermission = (
  permissions: string[],
  required: string[]
): boolean => required.some((p) => permissions.includes(p));
```

---

### 4.5 — `axios` instalado mas não utilizado

**Problema:**  
`axios` está no `package.json` mas a aplicação usa `fetch` nativo via `fetchWithAuth`. São ~50KB de bundle desnecessários.

**Solução:**

```powershell
npm uninstall axios
```

---

## 📋 TABELA RESUMO DO PLANO

| #   | Melhoria                                | Prioridade | Esforço            | Impacto           | Arquivos                                  |
| --- | --------------------------------------- | ---------- | ------------------ | ----------------- | ----------------------------------------- |
| 1.1 | Corrigir acesso à `/caso/:id`           | 🔴 Crítico | Mínimo (1 linha)   | Alto              | `App.tsx`                                 |
| 1.2 | Remover import `string` de zod          | 🔴 Crítico | Mínimo (1 linha)   | Baixo             | `App.tsx`                                 |
| 1.3 | Remover `RouteProtegida` legada         | 🔴 Crítico | Baixo (~40 linhas) | Médio             | `App.tsx`                                 |
| 2.1 | Centralizar permissões em `CasoDetalhe` | 🟠 Alta    | Médio              | Alto              | `usePermissoesSUAS.ts`, `CasoDetalhe.tsx` |
| 2.2 | Ajustar permissões mínimas por rota     | 🟠 Alta    | Baixo              | Alto              | `App.tsx`                                 |
| 3.1 | Campos obrigatórios no form de caso     | 🟡 Média   | Médio              | Médio             | `Cadastro.tsx`                            |
| 3.2 | Máscaras CPF e NIS                      | 🟡 Média   | Médio              | Alto (UX)         | `masks.ts` (novo), `Cadastro.tsx`         |
| 4.1 | Deletar `Sidebar.tsx` legado            | 🟢 Baixa   | Mínimo             | Baixo             | `Sidebar.tsx`                             |
| 4.2 | Ocultar debug em produção               | 🟢 Baixa   | Mínimo             | Médio (segurança) | `Layout.tsx`                              |
| 4.3 | Constante para permissões de tela       | 🟢 Baixa   | Baixo              | Baixo             | `constants.ts`                            |
| 4.4 | Resolver `permissionHelpers.ts` vazio   | 🟢 Baixa   | Baixo              | Baixo             | `permissionHelpers.ts`                    |
| 4.5 | Desinstalar `axios`                     | 🟢 Baixa   | Mínimo             | Baixo             | `package.json`                            |

---

## 🗂️ ORDEM DE EXECUÇÃO RECOMENDADA

```
Sprint 1 (hoje):
  ├── 1.1 Corrigir rota /caso/:id          → 5 min
  ├── 1.2 Remover import sem uso           → 1 min
  ├── 1.3 Remover RouteProtegida legada    → 10 min
  └── 2.2 Ajustar permissões de rotas      → 20 min

Sprint 2 (próximo ciclo):
  ├── 3.2 Criar masks.ts + aplicar CPF/NIS → 1h
  ├── 3.1 Obrigatórios no form de criação  → 30min
  └── 2.1 Centralizar perms CasoDetalhe    → 1h

Sprint 3 (limpeza):
  ├── 4.2 Ocultar debug em produção        → 5 min
  ├── 4.3 Constante SCREEN_PERMISSIONS     → 15 min
  ├── 4.1 Deletar Sidebar.tsx legado       → 5 min
  ├── 4.4 Resolver permissionHelpers.ts    → 10 min
  └── 4.5 npm uninstall axios              → 2 min
```

---

## 🔮 FORA DO ESCOPO DESTE MVP (Registrado para o futuro)

Os itens abaixo são melhorias relevantes identificadas na análise, mas que representam reescrita significativa e **não se enquadram no critério de alto retorno para MVP**:

- **Implementar `updateMseRegistro`** — Edição de registros MSE ainda não existe
- **Completar módulo CRAS** — `CrasConsulta` é placeholder; rotas sem `ProtectedRoute`
- **Integrar `dashboardFilterUnits`** automaticamente nos filtros enviados à API
- **Remover dados de saúde/PCD** do bloco `isOperacional` em `CasoDetalhe` — campos sensíveis visíveis para todos os operacionais
- **Substituir `window.confirm()`** por modal de confirmação estilizado (atualmente usado em excluir/desligar caso e inativar servidor)
- **Múltiplos arquivos CSS** por componente de visualização — considerar mover estilos para Tailwind inline
- **Sincronizar typo `screen.dashbord.access`** com o backend para usar `screen.vigilancia.access`
