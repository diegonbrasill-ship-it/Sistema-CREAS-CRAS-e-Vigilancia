# 📋 PLANO DE AÇÃO 1 — Bugs Críticos e Permissões

> **Gerado em:** Fevereiro de 2026  
> **Baseado em:** `docs/plano-de-melhorias.md`  
> **Escopo:** PRIORIDADE 1 (Bugs Críticos) + PRIORIDADE 2 (Problema Estrutural de Permissões)  
> **Critério de solução:** Menor mudança possível com maior impacto corretivo.

---

## Como ler este plano

Cada tarefa tem o seguinte formato:

- **Problema:** o que está errado agora e por quê causa dano
- **Causa exata:** onde no código o problema existe (arquivo + trecho)
- **Solução:** o que deve ser feito (ação mínima e direta)
- **Validação:** como confirmar que a correção funcionou

As tarefas estão numeradas em **ordem de execução**. Execute uma por vez, na sequência indicada.

---

## BLOCO 1 — PRIORIDADE 1: BUGS CRÍTICOS

---

### Tarefa 1.1 — Remover import sem uso de `zod`

**Arquivo:** `src/App.tsx`

**Problema:**  
O arquivo `App.tsx` importa `{ string }` do pacote `zod` na linha ~24. Essa importação nunca é usada em nenhuma parte do arquivo. Isso causa:

- Warning/erro de lint (variável importada não utilizada)
- Indica que o código não foi revisado antes de ir para produção

**Causa exata no código:**

```tsx
// src/App.tsx — linha ~24
import { string } from "zod"; // ← esta linha inteira deve ser removida
```

**Solução:**  
Remover apenas essa linha. Não tocar em mais nada no arquivo.

```
AÇÃO: Deletar a linha:
  import { string } from "zod";
```

**Validação:**

- O projeto compila sem warnings de "unused import"
- O comportamento da aplicação não muda (a importação não fazia nada)

---

### Tarefa 1.2 — Remover o componente `RouteProtegida` legado

**Arquivo:** `src/App.tsx`

**Problema:**  
Existe um componente chamado `RouteProtegida` declarado dentro de `App.tsx` (aproximadamente linhas 27–62). Ele é um guard de rota antigo, baseado em strings de grupo (`'ANALISE'`, `'CREAS_OP'`, `'CRAS'`, etc.).

Este componente **não é usado em nenhuma rota do arquivo**. Todas as rotas já usam `<ProtectedRoute>` (o guard novo, de `src/contexts/ProtectedRoute.tsx`). O `RouteProtegida` existe como código morto que:

- Confunde quem lê o arquivo ("qual guard devo usar?")
- Mantém uma lógica de permissões paralela e divergente
- Ocupa ~40 linhas sem propósito

**Causa exata no código:**  
O bloco a ser removido começa com:

```tsx
function RouteProtegida({ element, requiredAccess, fallbackPath = "/dashboard" }:
    { element: JSX.Element, requiredAccess: 'ANALISE' | 'CREAS_OP' | 'CRAS' | 'ADMIN' | 'VIGILANCIA', fallbackPath?: string }) {
```

...e termina com o fechamento `}` da função (antes da função `PrivateRoute`).

**Solução:**  
Deletar **todo o bloco da função `RouteProtegida`**, do início até o fechamento da função. Não remover `PrivateRoute` (que está logo abaixo e é usada).

```
AÇÃO: Remover o bloco completo da função RouteProtegida (~40 linhas).
      Manter intactos: imports, PrivateRoute, App.
```

**Validação:**

- O projeto compila sem erros
- Nenhuma rota quebra (nenhuma rota usava `RouteProtegida`)
- O arquivo fica mais limpo e legível

---

### Tarefa 1.3 — Corrigir permissão da rota `/caso/:id`

**Arquivo:** `src/App.tsx`

**Problema:**  
A rota `/caso/:id` exige que o usuário tenha **todas** as 5 permissões de `entityPermissions.casos`:

```
["casos.create", "casos.read", "casos.edit", "casos.delete", "casos.archive"]
```

O `ProtectedRoute` usa `.every(...)` internamente (confirmado em `src/contexts/ProtectedRoute.tsx` linha ~20):

```tsx
const hasAccess = requiredPermissions.every((permission) =>
  currentUserPermissions?.includes(permission)
);
```

Isso significa que um técnico com apenas `casos.read` (permissão de leitura) é **bloqueado e redirecionado** ao tentar abrir um prontuário. A página é de **visualização**, não de ação destrutiva. As ações de editar/excluir dentro da página já são controladas pela lógica de UI (`isOperacional` em `CasoDetalhe.tsx`).

**Causa exata no código:**

```tsx
// src/App.tsx — rota atual
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
```

**Solução:**  
Substituir `entityPermissions.casos` por `["casos.read"]` **somente** nessa rota.

```
ANTES:
  requiredPermissions={entityPermissions.casos}

DEPOIS:
  requiredPermissions={["casos.read"]}
```

**Validação:**

- Um usuário com apenas `casos.read` consegue acessar `/caso/:id` sem ser redirecionado
- Um usuário **sem** `casos.read` ainda é bloqueado corretamente
- As ações de editar/excluir dentro da página continuam controladas pela lógica existente de `isOperacional`

---

## BLOCO 2 — PRIORIDADE 2: PROBLEMA ESTRUTURAL DE PERMISSÕES

---

### Tarefa 2.1 — Corrigir permissões mínimas de todas as rotas em `App.tsx`

**Arquivo:** `src/App.tsx`

**Problema:**  
O padrão atual passa `entityPermissions.xxx` (array com 5 permissões: create, read, edit, delete, archive) para todas as rotas. Como o `ProtectedRoute` usa `.every(...)`, qualquer usuário sem o pacote completo de permissões é bloqueado — mesmo em rotas de apenas leitura.

**Estado atual das rotas problemáticas:**

```tsx
// Todas usando array completo (5 permissões exigidas)
<Route path="cadastro"           requiredPermissions={entityPermissions.casos}    />  // exige 5
<Route path="cadastro/:id"       requiredPermissions={entityPermissions.casos}    />  // exige 5
<Route path="consulta"           requiredPermissions={entityPermissions.casos}    />  // exige 5
<Route path="caso/:id"           requiredPermissions={entityPermissions.casos}    />  // exige 5 ← já corrigido na Tarefa 1.3
<Route path="demandas"           requiredPermissions={entityPermissions.demandas} />  // exige 5
<Route path="demandas/:id"       requiredPermissions={entityPermissions.demandas} />  // exige 5
<Route path="controle-mse"       requiredPermissions={entityPermissions.mse}      />  // exige 5
<Route path="gerenciar-usuarios" requiredPermissions={entityPermissions.users}    />  // exige 5
```

**Mapeamento de permissão mínima correta por rota:**

| Rota                  | Permissão mínima necessária | Justificativa                 |
| --------------------- | --------------------------- | ----------------------------- |
| `/cadastro`           | `"casos.create"`            | Criar novo caso               |
| `/cadastro/:id`       | `"casos.edit"`              | Editar caso existente         |
| `/consulta`           | `"casos.read"`              | Listar/visualizar casos       |
| `/caso/:id`           | `"casos.read"`              | Já corrigido na Tarefa 1.3    |
| `/demandas`           | `"demandas.read"`           | Listar demandas               |
| `/demandas/:id`       | `"demandas.read"`           | Visualizar detalhe de demanda |
| `/controle-mse`       | `"mse.read"`                | Visualizar registros MSE      |
| `/gerenciar-usuarios` | `"users.read"`              | Listar usuários               |

**Solução:**  
Substituir o array completo pela permissão mínima em cada rota:

```
AÇÃO em src/App.tsx — substituir cada rota:

  path="cadastro"           → requiredPermissions={["casos.create"]}
  path="cadastro/:id"       → requiredPermissions={["casos.edit"]}
  path="consulta"           → requiredPermissions={["casos.read"]}
  path="demandas"           → requiredPermissions={["demandas.read"]}
  path="demandas/:id"       → requiredPermissions={["demandas.read"]}
  path="controle-mse"       → requiredPermissions={["mse.read"]}
  path="gerenciar-usuarios" → requiredPermissions={["users.read"]}
```

> ⚠️ **Atenção:** As ações destrutivas (excluir, editar, arquivar) dentro de cada página devem continuar protegidas pela lógica de UI interna. Esta tarefa só desbloqueará o **acesso à rota**, não as ações dentro dela.

**Validação:**

- Um técnico com `casos.read` mas sem `casos.delete` consegue acessar `/consulta` e `/caso/:id`
- Um usuário sem nenhuma permissão de casos ainda não consegue acessar essas rotas
- O redirecionamento para `/dashboard` continua funcionando para usuários sem a permissão mínima

---

### Tarefa 2.2 — Adicionar permissões granulares ao `usePermissoesSUAS`

**Arquivo:** `src/hooks/usePermissoesSUAS.ts`

**Problema:**  
O hook `usePermissoesSUAS` já existe como "única fonte de verdade" de permissões, mas não expõe campos granulares para as operações individuais de `casos`. Atualmente ele só tem:

```typescript
canManageCasos: hasAllPermissions(entityPermissions.casos); // true/false para as 5 permissões juntas
```

Isso força o `CasoDetalhe.tsx` a usar verificação manual de `role` (string) em vez do hook, gerando inconsistência.

**Causa exata no código (hook):**  
O hook retorna `canManageCasos` mas não retorna `canReadCasos`, `canEditCasos`, `canDeleteCasos`, `canCreateCasos` individualmente.

**O que precisa ser adicionado:**  
Dentro da função `usePermissoesSUAS`, antes do `return`, adicionar:

```typescript
// Permissões granulares de casos
const canReadCasos = hasPermission("casos.read");
const canEditCasos = hasPermission("casos.edit");
const canDeleteCasos = hasPermission("casos.delete");
const canCreateCasos = hasPermission("casos.create");
```

E incluir esses campos no objeto de retorno:

```typescript
return {
  // ... campos existentes mantidos intactos ...
  canReadCasos,
  canEditCasos,
  canDeleteCasos,
  canCreateCasos,
};
```

E adicionar os campos na interface `PermissoesSUAS` (no topo do arquivo):

```typescript
interface PermissoesSUAS {
  // ... campos existentes ...
  canReadCasos: boolean;
  canEditCasos: boolean;
  canDeleteCasos: boolean;
  canCreateCasos: boolean;
}
```

**Solução resumida:**

```
AÇÃO em src/hooks/usePermissoesSUAS.ts:
  1. Adicionar 4 campos na interface PermissoesSUAS
  2. Adicionar 4 variáveis usando hasPermission() antes do return
  3. Incluir os 4 campos no objeto retornado
```

**Validação:**

- O TypeScript não acusa erro de tipo ao usar `canEditCasos` em outros arquivos
- O hook continua retornando todos os campos anteriores (não remove nada)

---

### Tarefa 2.3 — Refatorar verificação de permissão em `CasoDetalhe.tsx`

**Arquivo:** `src/pages/CasoDetalhe.tsx`

**Problema:**  
`CasoDetalhe.tsx` determina se o usuário pode editar/excluir um caso comparando diretamente a string do `role`:

```tsx
// src/pages/CasoDetalhe.tsx — linhas ~65-69 (código atual)
const userRole = user?.role || "";
const isOperacional =
  userRole.includes("gestor") ||
  userRole.includes("coordenador") ||
  userRole.includes("tecnico") ||
  userRole.includes("vigilancia");
const canDelete = isOperacional;
```

**Por que isso é um problema:**

- Um usuário com `role = "tecnico_superior"` mas **sem** a permissão `casos.edit` no array `permissions[]` ainda consegue ver/usar os botões de editar e excluir
- A verificação por string de role ignora completamente o sistema de permissões granulares do backend
- O padrão correto da aplicação é usar `usePermissoesSUAS()`, não comparar `user.role` diretamente

**Dependência:**  
Esta tarefa depende da **Tarefa 2.2** ter sido concluída (os campos `canEditCasos` e `canDeleteCasos` precisam existir no hook antes de serem usados aqui).

**Solução:**  
Substituir a lógica manual de role pelo hook:

```
AÇÃO em src/pages/CasoDetalhe.tsx:

  1. Adicionar o import do hook (se ainda não existe):
       import { usePermissoesSUAS } from "@/hooks/usePermissoesSUAS";

  2. Dentro do componente CasoDetalhe(), adicionar a chamada ao hook:
       const { canEditCasos, canDeleteCasos } = usePermissoesSUAS();

  3. Substituir as variáveis manuais:

     REMOVER estas linhas:
       const userRole = user?.role || '';
       const isOperacional = userRole.includes('gestor') || userRole.includes('coordenador') ||
           userRole.includes('tecnico') || userRole.includes('vigilancia');
       const canDelete = isOperacional;

     ADICIONAR em substituição:
       const isOperacional = canEditCasos;
       const canDelete = canDeleteCasos;

  4. Manter a variável `user` do useAuth() apenas se for usada em outro lugar no componente.
     Se `user` só era usado para construir `userRole`, pode ser removida também.
     (Verificar antes de remover — `user` pode ser usado para exibir nome do técnico, etc.)
```

**Validação:**

- Um usuário com `role = "tecnico_superior"` mas **sem** `casos.edit` não vê o botão de editar
- Um usuário com `casos.edit` vê o botão de editar, independentemente do role
- Um usuário com `casos.delete` vê o botão de excluir
- O componente compila sem erros de TypeScript

---

## RESUMO DE EXECUÇÃO

Execute as tarefas **nesta ordem exata**:

```
1. Tarefa 1.1 → src/App.tsx          — Remover import { string } from "zod"
2. Tarefa 1.2 → src/App.tsx          — Remover função RouteProtegida legada
3. Tarefa 1.3 → src/App.tsx          — Corrigir rota /caso/:id para ["casos.read"]
4. Tarefa 2.1 → src/App.tsx          — Corrigir permissão mínima de todas as rotas
5. Tarefa 2.2 → usePermissoesSUAS.ts — Adicionar canReadCasos, canEditCasos, canDeleteCasos, canCreateCasos
6. Tarefa 2.3 → CasoDetalhe.tsx      — Substituir verificação manual de role pelo hook
```

As tarefas 1.1, 1.2, 1.3 e 2.1 são **independentes entre si** e todas estão no mesmo arquivo (`App.tsx`), então podem ser feitas em sequência no mesmo arquivo de uma só vez.

A tarefa 2.3 **depende obrigatoriamente** da 2.2 ter sido feita antes.

---

## Arquivos que serão modificados

| Arquivo                          | Tarefas            | Tipo de mudança                           |
| -------------------------------- | ------------------ | ----------------------------------------- |
| `src/App.tsx`                    | 1.1, 1.2, 1.3, 2.1 | Remoção de código morto + ajuste de props |
| `src/hooks/usePermissoesSUAS.ts` | 2.2                | Adição de campos no hook e na interface   |
| `src/pages/CasoDetalhe.tsx`      | 2.3                | Substituição de lógica de permissão       |

**Nenhum arquivo novo** precisa ser criado neste plano.  
**Nenhuma dependência** nova precisa ser instalada.
