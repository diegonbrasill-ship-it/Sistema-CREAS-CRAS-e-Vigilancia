# 🏗️ ARQUITETURA FRONTEND — Sistema SUAS Patos/PB

> Documento de referência técnica sobre a arquitetura, padrões, decisões de design e fluxo de dados do frontend React/TypeScript.

---

## 1. VISÃO GERAL DA ARQUITETURA

```
┌─────────────────────────────────────────────────────────────────┐
│                        NAVEGADOR (SPA)                          │
│                                                                 │
│  ┌─────────────┐    ┌──────────────────────────────────────┐   │
│  │  AuthContext │◄──►│           React Router v6            │   │
│  │  (JWT +      │    │  BrowserRouter > Routes > Route      │   │
│  │  localStorage│    │  PrivateRoute > Layout > Page        │   │
│  └──────┬──────┘    └──────────────────┬─────────────────-─┘   │
│         │                              │                        │
│         ▼                              ▼                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    LAYOUT (Shell)                        │   │
│  │  ┌─────────────────┐  ┌──────────────────────────────┐  │   │
│  │  │    Sidebar       │  │         <Outlet />            │  │   │
│  │  │  (menu dinâmico) │  │   (páginas renderizadas aqui) │  │   │
│  │  │  usePermissoes   │  └──────────────────────────────┘  │   │
│  │  │  SUAS()          │                                     │   │
│  │  └─────────────────┘                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   CAMADA DE SERVIÇOS                     │   │
│  │              src/services/api.ts                         │   │
│  │         fetchWithAuth() → Bearer Token                   │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                              │                                   │
└──────────────────────────────│──────────────────────────────────┘
                               │ HTTPS/REST
                               ▼
                    ┌──────────────────┐
                    │   BACKEND API    │
                    │  (Node.js/Express│
                    │  ou similar)     │
                    │  VITE_API_BASE   │
                    │  _URL env var    │
                    └──────────────────┘
```

---

## 2. STACK TECNOLÓGICO DETALHADO

### 2.1 Core

| Biblioteca         | Versão  | Papel                   |
| ------------------ | ------- | ----------------------- |
| `react`            | ^18.3.1 | UI Library              |
| `react-dom`        | ^18.3.1 | Renderização DOM        |
| `typescript`       | ^5.2.2  | Tipagem estática        |
| `vite`             | ^5.1.4  | Build tool + dev server |
| `react-router-dom` | ^6.22.3 | Roteamento SPA          |

### 2.2 Formulários e Validação

| Biblioteca            | Versão  | Papel                        |
| --------------------- | ------- | ---------------------------- |
| `react-hook-form`     | ^7.62.0 | Gerenciamento de formulários |
| `zod`                 | ^4.1.12 | Schema de validação          |
| `@hookform/resolvers` | ^5.2.2  | Adapter Zod ↔ RHF            |

### 2.3 UI e Estilização

| Biblioteca                 | Versão          | Papel                           |
| -------------------------- | --------------- | ------------------------------- |
| `tailwindcss`              | ^3.4.1          | CSS utilitário                  |
| `@radix-ui/*`              | vários          | Componentes headless acessíveis |
| `class-variance-authority` | ^0.7.1          | Variantes de componentes        |
| `clsx` + `tailwind-merge`  | ^2.1.1 / ^3.3.1 | Merge de classes CSS            |
| `lucide-react`             | ^0.544.0        | Ícones SVG                      |
| `tailwindcss-animate`      | ^1.0.7          | Animações Tailwind              |

### 2.4 Dados e Visualização

| Biblioteca                  | Versão          | Papel                                             |
| --------------------------- | --------------- | ------------------------------------------------- |
| `recharts`                  | ^3.2.0          | Gráficos (Bar, Pie)                               |
| `leaflet` + `react-leaflet` | ^1.9.4 / ^4.2.1 | Mapas interativos                                 |
| `react-toastify`            | ^11.0.5         | Notificações toast                                |
| `axios`                     | ^1.12.2         | (Instalado, mas não usado — fetch nativo é usado) |
| `jspdf` + `jspdf-autotable` | ^3.0.2 / ^5.0.2 | Geração de PDF client-side                        |

---

## 3. ESTRUTURA DE PASTAS (DETALHADA)

```
frontend/
├── index.html                    # Entry point HTML
├── vite.config.ts                # Configuração Vite + alias @
├── tsconfig.json                 # TypeScript config
├── tailwind.config.cjs           # Tailwind config
├── postcss.config.cjs            # PostCSS
├── components.json               # shadcn/ui config
├── package.json
│
├── public/                       # Assets estáticos
│
├── docs/                         # Documentação (este arquivo)
│   ├── contexto.md
│   └── arquitetura_front.md
│
└── src/
    ├── main.tsx                  # Bootstrap React + BrowserRouter
    ├── App.tsx                   # Definição de rotas
    ├── App.css / index.css / styles.css  # Estilos globais
    │
    ├── assets/logos/             # Logotipos institucionais
    │   ├── rmsuas-logo.png/svg
    │   ├── prefeitura.png
    │   ├── secretaria.png
    │   ├── creas.png / paefi.png
    │   └── suas.png / programa.png
    │
    ├── contexts/
    │   ├── AuthContext.tsx        # Contexto de autenticação
    │   └── ProtectedRoute.tsx    # Guard de rota por permissão
    │
    ├── hooks/
    │   ├── usePermissoesSUAS.ts  # Hook central de permissões (CRÍTICO)
    │   ├── useUsers.ts           # CRUD de usuários
    │   ├── useCreateUser.ts      # Criação de usuário com useReducer
    │   └── useUnidades.ts        # Listagem de unidades
    │
    ├── services/
    │   └── api.ts                # Camada de acesso à API (ÚNICO arquivo de chamadas HTTP)
    │
    ├── utils/
    │   ├── constants.ts          # Units, Roles, entityPermissions (dados estáticos)
    │   ├── roles.ts              # UserRole type + labels de perfil
    │   ├── apiNormalizer.ts      # Normalização de respostas de lista
    │   ├── dateUtils.ts          # calculateAge, addMonthsToDate, formatDateForInput
    │   └── permissionHelpers.ts  # (reservado/vazio)
    │
    ├── lib/
    │   └── utils.ts              # cn() — merge de classes Tailwind
    │
    ├── pages/
    │   ├── Login.tsx
    │   ├── Dashboard.tsx + Dashboard.css
    │   ├── Cadastro.tsx
    │   ├── CasoDetalhe.tsx
    │   ├── Consulta.tsx
    │   ├── ControleMSE.tsx
    │   ├── Demandas.tsx
    │   ├── DemandaDetalhe.tsx
    │   ├── Relatorios.tsx
    │   ├── Integracoes.tsx
    │   ├── GerenciarUsuarios.tsx
    │   ├── PainelVigilancia/
    │   │   ├── PainelVigilancia.tsx
    │   │   └── PainelVigilancia.css
    │   └── Cras/
    │       ├── CrasProntuario.tsx
    │       └── CrasConsulta.tsx  (placeholder)
    │
    └── components/
        ├── Layout.tsx             # Shell principal (Sidebar + Outlet)
        ├── Header.tsx
        ├── Sidebar.tsx
        ├── DrillDown/
        │   └── ListaCasosModal.tsx
        ├── demandas/
        │   └── DemandaFormModal.tsx
        ├── mse/
        │   └── MseRegistroModal.tsx
        ├── users/
        │   ├── UserEditModal.tsx
        │   ├── ReassignCasesModal.tsx
        │   └── UsersTable.tsx
        ├── vigilancia/
        │   ├── CardKPI.tsx + CardKPI.css
        │   ├── GraficoBarras.tsx + GraficoBarras.css
        │   ├── GraficoPizza.tsx + GraficoPizza.css
        │   └── MapaCalor.tsx + MapaCalor.css
        └── ui/                    # shadcn/ui (Radix-based)
            ├── badge.tsx
            ├── button.tsx
            ├── card.tsx
            ├── dialog.tsx
            ├── dropdown-menu.tsx
            ├── input.tsx
            ├── label.tsx
            ├── select.tsx
            ├── table.tsx
            ├── tabs.tsx
            └── textarea.tsx
```

---

## 4. SISTEMA DE ROTEAMENTO

### 4.1 Hierarquia de Rotas

```
/login                          → <Login />  (pública)
/                               → <PrivateRoute>  →  <Layout />
  /                             → redirect → /dashboard

  /dashboard                    → <ProtectedRoute permissions=["screen.dashboard.access"]>
  /painel-vigilancia            → <ProtectedRoute permissions=["screen.dashbord.access"]>
  /relatorios                   → <ProtectedRoute permissions=["screen.relatorios.access"]>
  /integracoes                  → <ProtectedRoute permissions=["screen.integrations.access"]>

  /cadastro                     → <ProtectedRoute permissions=[entityPermissions.casos]>
  /cadastro/:id                 → <ProtectedRoute permissions=[entityPermissions.casos]>
  /consulta                     → <ProtectedRoute permissions=[entityPermissions.casos]>
  /caso/:id                     → <ProtectedRoute permissions=[entityPermissions.casos]>

  /demandas                     → <ProtectedRoute permissions=[entityPermissions.demandas]>
  /demandas/:id                 → <ProtectedRoute permissions=[entityPermissions.demandas]>

  /controle-mse                 → <ProtectedRoute permissions=[entityPermissions.mse]>

  /cras/cadastro                → <CrasProntuario />  (sem ProtectedRoute — em dev)
  /cras/cadastro/:id            → <CrasProntuario />  (sem ProtectedRoute — em dev)
  /cras/consulta                → <CrasConsulta />   (sem ProtectedRoute — em dev)

  /gerenciar-usuarios           → <ProtectedRoute permissions=[entityPermissions.users]>

/*                              → redirect → /login
```

### 4.2 Guards de Rota

**`PrivateRoute`** — Verifica apenas `isAuthenticated`. Se não autenticado, redireciona para `/login`.

**`ProtectedRoute`** — Verifica `isAuthenticated` E se o usuário possui **todas** as permissões listadas. Se não autorizado, redireciona para `/dashboard` (fallback configurável).

**`RouteProtegida`** (legado no App.tsx) — Guard mais simples baseado em grupos de acesso (ANALISE, CREAS_OP, ADMIN, VIGILANCIA). **Ainda presente no código mas substituído por `ProtectedRoute`.**

---

## 5. FLUXO DE AUTENTICAÇÃO

```
┌────────────────────────────────────────────────────────────────┐
│                         LOGIN FLOW                             │
│                                                                │
│  Login.tsx                                                     │
│    │ handleLogin()                                             │
│    ▼                                                           │
│  AuthContext.login(username, password)                         │
│    │                                                           │
│    ▼                                                           │
│  api.ts → POST /api/login/                                     │
│    │                                                           │
│    ▼ resposta: { token, user }                                 │
│    │                                                           │
│    ├─► localStorage.setItem('token', token)                    │
│    ├─► localStorage.setItem('user', JSON.stringify(user))      │
│    └─► setUser(safeUser)  → isAuthenticated = true            │
│                                                                │
│  navigate('/dashboard')                                        │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                      PERSISTÊNCIA DE SESSÃO                    │
│                                                                │
│  AuthProvider useEffect (na montagem)                          │
│    │                                                           │
│    ├─ localStorage.getItem('token')                            │
│    ├─ localStorage.getItem('user')  → JSON.parse()            │
│    │   safe unit_id: string → number ou null                   │
│    └─ setUser(safeUser)                                        │
│                                                                │
│  Se falhar → localStorage.clear() → setUser(null)             │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                      CADA REQUISIÇÃO HTTP                      │
│                                                                │
│  fetchWithAuth(endpoint, options)                              │
│    │                                                           │
│    ├─ token = localStorage.getItem('token')                    │
│    ├─ headers.Authorization = 'Bearer ' + token               │
│    └─ fetch(API_BASE_URL + endpoint, {...options, headers})    │
└────────────────────────────────────────────────────────────────┘
```

---

## 6. CAMADA DE SERVIÇOS (`src/services/api.ts`)

### 6.1 Arquitetura

```
api.ts
├── INTERFACES DE TIPOS (export)
│   ├── FiltrosBase, FiltrosCasos
│   ├── LoginResponse, User
│   ├── CasoDetalhado, DemandaResumida, Demanda, DemandaDetalhada
│   ├── MseRegistroBody, MseRegistroResumido, MseKpis, MseApiResponse
│   ├── DashboardApiDataType, ApiResponse
│   └── Anexo
│
├── FUNÇÃO BASE
│   └── fetchWithAuth(endpoint, options) → JSON | Response (blob)
│
├── HELPER
│   └── appendFiltros(filters?: FiltrosBase) → string (query params)
│
└── FUNÇÕES EXPORTADAS (por domínio)
    ├── auth:           login()
    ├── casos:          createCase, updateCase, updateCasoStatus, deleteCaso,
    │                   getCasoById, getCasosFiltrados, searchCasosByTerm
    ├── acompanhamentos:getAcompanhamentos, createAcompanhamento
    ├── encaminhamentos:getEncaminhamentos, createEncaminhamento, updateEncaminhamento
    ├── anexos:         getAnexosByCasoId, uploadAnexoParaCaso, uploadAnexoParaDemanda,
    │                   downloadAnexo
    ├── users:          getUsers, createUser, updateUser, updateUserStatus,
    │                   reassignUserCases
    ├── demandas:       getDemandas, createDemanda, getDemandaById, updateDemandaStatus
    ├── mse:            getMseRegistros, createMseRegistro, getMseRegistroById
    ├── dashboard:      getDashboardData
    ├── vigilancia:     getVigilanciaFluxoDemanda, getVigilanciaSobrecargaEquipe,
    │                   getVigilanciaIncidenciaBairros, getVigilanciaFontesAcionamento,
    │                   getVigilanciaTaxaReincidencia, getVigilanciaPerfilViolacoes
    └── relatorios:     generateReport
```

### 6.2 Roteamento Inteligente de Casos

A função `getCasosFiltrados` roteia para endpoints diferentes baseado em `filters.origem`:

```typescript
let endpoint = "/api/casos"; // padrão
if (filters?.origem === "vigilancia") {
  endpoint = "/api/vigilancia/casos-filtrados"; // painel vigilância
}
```

### 6.3 Tratamento de Respostas Binárias

`fetchWithAuth` detecta o `content-type` da resposta. Se for `application/pdf` ou `application/octet-stream`, retorna o objeto `Response` completo (para extração de blob). Para todas as outras, retorna `response.json()`.

---

## 7. SISTEMA DE PERMISSÕES (ARQUITETURA)

```
              ┌──────────────────────┐
              │     AuthContext      │
              │  user.permissions[]  │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  usePermissoesSUAS() │◄── HOOK CENTRAL
              │                      │
              │  Lê: user.role       │
              │  Lê: user.unit_id    │
              │  Lê: user.permissions│
              │                      │
              │  Deriva:             │
              │  · isGestorGeral     │
              │  · isVigilancia      │
              │  · isLotadoNoCreas   │
              │  · canManage*        │
              │  · canAccess*Screen  │
              │  · dashboardFilter   │
              └──────┬───────────────┘
                     │
         ┌───────────┼───────────────────┐
         ▼           ▼                   ▼
  ┌──────────┐ ┌──────────┐     ┌──────────────┐
  │ Layout   │ │Protected │     │  Pages       │
  │ (menu    │ │ Route    │     │  (lógica     │
  │  visib.) │ │ (acesso) │     │   interna)   │
  └──────────┘ └──────────┘     └──────────────┘
```

### Decisão de Design: Por que um hook centralizado?

Antes, a lógica de permissões estava espalhada por múltiplos componentes, com comparações diretas de `user.role`. Isso causava inconsistências. O hook `usePermissoesSUAS` resolve isso sendo **a única fonte de verdade** para:

- Verificação de perfil
- Verificação de permissões de entidade
- Filtros de unidade para dashboards
- Visibilidade de itens de menu

---

## 8. PADRÃO DE FORMULÁRIOS

### 8.1 Stack

```
React Hook Form (controle)
    +
Zod (validação de schema)
    +
zodResolver (adapter)
    +
Controller (para componentes Radix/Select)
```

### 8.2 Padrão de Schema Zod

```typescript
const formSchema = z.object({
  // Campo obrigatório
  data_cad: z.string().min(1, "Mensagem de erro"),

  // Campo opcional (pode ser null do DB)
  nome: z.string().optional().nullable(),

  // Validação customizada
  cpf: z
    .string()
    .optional()
    .nullable()
    .refine(validateCPF, { message: "CPF inválido." }),

  // Número com coerção
  mse_duracao_meses: z.preprocess(
    (val) => (val === "" ? 0 : val),
    z.coerce.number().min(1).max(99)
  ),
});
type FormType = z.infer<typeof formSchema>;
```

### 8.3 Fluxo de Submit (Modo Criação vs. Edição)

```
CRIAÇÃO:
  handleSubmit → onSubmit(data) → createCase(payload) → navigate(`/cadastro/${id}`)

EDIÇÃO:
  handleSubmit → onSubmit(data)
    ├── Coleta apenas dirtyFields (campos modificados)
    ├── Garante campos SQL obrigatórios (data_cad, tec_ref)
    └── updateCase(id, dirtyData) → reset(data, keepValues) → navigate(`/caso/${id}`)
```

### 8.4 Formulário Multi-Abas (Cadastro CREAS)

```
Tab 1: Atendimento    ← desbloqueada sempre (criação e edição)
Tab 2: Vítima         ← bloqueada até ter um id (só edição)
Tab 3: Família        ← bloqueada até ter um id
Tab 4: Saúde          ← bloqueada até ter um id
Tab 5: Encaminhamentos← bloqueada até ter um id
```

---

## 9. PADRÃO DE COMPONENTES DE MODAL

Todos os modais seguem a mesma interface:

```typescript
interface ModalProps {
  isOpen: boolean; // Controla visibilidade
  onClose: () => void; // Fecha o modal
  onSuccess: () => void; // Callback após sucesso (aciona refetch da lista pai)
  // Props específicas...
}
```

**Componentes de modal existentes:**

- `MseRegistroModal` — Criação/edição de MSE
- `DemandaFormModal` — Criação de demanda com busca inteligente de caso
- `UserEditModal` — Edição de servidor
- `ReassignCasesModal` — Reatribuição de casos entre técnicos
- `ListaCasosModal` — Drill-down genérico (lista de casos filtrados)

---

## 10. PADRÃO DE DRILL-DOWN (ANÁLISE INTERATIVA)

Usado no Dashboard PAEFI e no Painel de Vigilância.

```
Usuário clica em card/gráfico
         │
         ▼
handleDrillDown(action, valor, title)
         │
         ├── Consulta o mapa de filtros (CARD_FILTERS_MAP / VIGILANCIA_FILTERS_MAP)
         │     ├── Se encontrado: usa campo e valor do mapa
         │     └── Se não encontrado: usa action como campo, valor como valor
         │
         ├── Abre ListaCasosModal (estado isModalOpen = true)
         ├── Seta isModalLoading = true
         │
         ▼
getCasosFiltrados({ filtro, valor, ...filtrosAtivos, [origem?] })
         │
         ▼
Modal exibe tabela com casos resultantes
(link "Ver Prontuário" → /caso/:id)
```

---

## 11. LAYOUT E NAVEGAÇÃO

### 11.1 Shell da Aplicação

```
┌─────────────────────────────────────────────────────────────────┐
│                          Layout.tsx                              │
│                                                                 │
│  ┌────────────────┐  ┌──────────────────────────────────────┐  │
│  │   SIDEBAR      │  │            CONTENT AREA              │  │
│  │  (w-64)        │  │  (flex-1, overflow-y-auto)           │  │
│  │                │  │                                      │  │
│  │  Logo RMSUAS   │  │  <Outlet /> ← página renderizada     │  │
│  │  Debug Badge   │  │                                      │  │
│  │                │  └──────────────────────────────────────┘  │
│  │  [MENU GROUPS] │                                            │
│  │  · CRAS        │  ← isVisible: false (em dev)              │
│  │  · CREAS Op.   │  ← isVisible: canViewCreasOperacional      │
│  │  · Análise     │  ← isVisible: canAccessAnaliseGroup        │
│  │  · Administração│  ← isVisible: canManageUsers              │
│  │                │                                            │
│  │  [USER MENU]   │                                            │
│  │  DropdownMenu  │                                            │
│  │  (logout, etc) │                                            │
│  └────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

### 11.2 Lógica de Redirecionamento Inicial

Ao entrar na rota `/`, o `Layout` redireciona baseado em permissões:

```typescript
if (canAccessDashboardScreen)    → navigate('/dashboard')
if (canAccessVigilanciaScreen)   → navigate('/painel-vigilancia')
if (canViewCreasOperacional)     → navigate('/cadastro')
```

### 11.3 Menu Dinâmico

O menu usa uma estrutura de dados (`menuItems`) com `isVisible` por grupo e por item. Grupos invisíveis não são renderizados. A cor dos links de menu muda por grupo (azul para CREAS, roxo para Análise).

---

## 12. COMPONENTES DE VISUALIZAÇÃO

### 12.1 Dashboard Charts (Recharts)

```
BarChart (horizontal) → Casos por Bairro
BarChart (vertical)   → Encaminhamentos, Faixa Etária
PieChart (donut)      → Violações, Sexo
PieChart (flat)       → Canal de Denúncia, Cor/Etnia
```

Todos os gráficos têm `cursor="pointer"` e handler `onClick` para drill-down.

### 12.2 MapaCalor (Leaflet)

```typescript
// Coordenadas hardcoded para bairros de Patos/PB
const coordenadasBairros = {
  'Centro':          [-7.0285, -37.2799],
  'Belo Horizonte':  [-7.0224, -37.2885],
  'Liberdade':       [-7.0363, -37.2825],
  'Jatobá':          [-7.0451, -37.2910],
  'São Sebastião':   [-7.0315, -37.2701],
};

// Escala de cores por quantidade de casos
casos > 50  → '#d53e4f' (vermelho escuro)
casos > 30  → '#f46d43' (laranja)
casos > 15  → '#fdae61' (amarelo-laranja)
casos > 5   → '#fee08b' (amarelo)
casos ≤ 5   → '#abdda4' (verde)
```

O `z-index: 2000` no `ListaCasosModal` garante que apareça acima do mapa Leaflet.

---

## 13. PADRÕES DE STATE MANAGEMENT

### 13.1 Estratégia Geral

O projeto não usa Redux ou Zustand. O estado é gerenciado com:

| Tipo          | Onde usar                                         |
| ------------- | ------------------------------------------------- |
| `useState`    | Estado local de páginas e componentes             |
| `useReducer`  | Formulários complexos (ex: `useCreateUser`)       |
| `useContext`  | Estado global (Auth)                              |
| `useCallback` | Funções de fetch para evitar loops                |
| Custom Hooks  | Lógica reutilizável (useUsers, usePermissoesSUAS) |

### 13.2 Padrão de Fetch em Páginas

```typescript
// 1. Estado
const [data, setData] = useState<Type | null>(null);
const [isLoading, setIsLoading] = useState(true);

// 2. Função de fetch (com useCallback se usada em useEffect com dependências)
const fetchData = useCallback(async () => {
  setIsLoading(true);
  try {
    const result = await apiFunction();
    setData(result);
  } catch (error: any) {
    toast.error(`Erro: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
}, [dependencies]);

// 3. Trigger inicial
useEffect(() => {
  fetchData();
}, [fetchData]);
```

### 13.3 Debounce em Buscas

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    fetchCasos(); // ou fetchMseRegistros()
  }, 300); // 300ms para Consulta, 500ms para DemandaFormModal
  return () => clearTimeout(timer); // cleanup
}, [searchTerm, selectedFilterKey]);
```

---

## 14. NORMALIZAÇÃO DE RESPOSTAS DA API

O backend pode retornar listas em diferentes formatos. A função `normalizeListResponse` padroniza:

```typescript
// src/utils/apiNormalizer.ts
export function normalizeListResponse<T>(response: any): T[] {
  if (Array.isArray(response)) return response; // [item, ...]
  return (
    response?.rows ?? // { rows: [...] }  (Sequelize/Knex)
    response?.data ?? // { data: [...] }
    response?.results ?? // { results: [...] }
    [] // fallback vazio
  );
}
```

---

## 15. CONFIGURAÇÕES DE BUILD E DEV

### 15.1 Vite Config (`vite.config.ts`)

```typescript
// Alias @ → src/
// Plugin: @vitejs/plugin-react
```

### 15.2 TypeScript Path Aliases

O `@` mapeia para `src/`, permitindo imports como:

```typescript
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
```

### 15.3 Scripts

```json
"dev":     "vite"          // servidor de desenvolvimento
"build":   "vite build"    // build de produção
"preview": "vite preview"  // preview do build
```

---

## 16. PADRÕES DE UX E FEEDBACK

### 16.1 Notificações Toast

```typescript
toast.success("✅ Mensagem de sucesso"); // verde
toast.error("❌ Mensagem de erro"); // vermelho
toast.warn("⚠️ Aviso"); // amarelo
toast.info("ℹ️ Informação"); // azul
```

Usando `react-toastify` com posição `top-right`.

### 16.2 Loading States

- Páginas: `<Loader2 className="animate-spin" />` centralizado
- Botões: `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inline
- Tabelas: linha única com Loader2 centralizado

### 16.3 Estados Vazios

- Tabelas sem dados: `<TableCell colSpan={N}>Nenhum item encontrado</TableCell>`
- Modais sem casos: "Nenhum caso encontrado para este filtro."

### 16.4 Confirmações Destrutivas

```typescript
if (!window.confirm("Mensagem de confirmação")) return;
```

Usado em: excluir caso, desligar caso, inativar servidor.

---

## 17. DECISÕES DE ARQUITETURA E TRADE-OFFS

### 17.1 Por que `fetch` nativo em vez de `axios`?

`axios` está instalado mas não é usado. A função `fetchWithAuth` resolve:

- Injeção automática do Bearer token
- Tratamento de erros HTTP
- Suporte a blobs (downloads de arquivo)
- Menos dependências na bundle

### 17.2 Por que shadcn/ui em vez de MUI ou Ant Design?

- Componentes headless (Radix) com acesso total ao DOM
- Integração natural com Tailwind CSS
- Bundle menor (tree-shaking total)
- Acessibilidade built-in (ARIA)

### 17.3 Por que não Redux/Zustand?

O projeto é focado em dados de formulário e listagens. O estado é efêmero por página. `React Context` é suficiente para o estado global (Auth). Custom hooks substituem stores para lógica de negócio.

### 17.4 Por que JSONB no banco de dados?

O prontuário PAEFI tem dezenas de campos opcionais que variam por caso. Armazenar como JSONB (`dados_completos`) evita dezenas de colunas NULL na tabela principal, facilita a adição de novos campos sem migrations e permite queries flexíveis.

### 17.5 Separação CREAS/CRAS

O módulo CRAS foi planejado como **paralelo** ao CREAS, usando a mesma infraestrutura de casos (`/api/casos`) mas com `unit_id` diferente. A separação de rotas (`/cras/*`) e componentes (`Cras/`) mantém o código isolado para futuras divergências de regra de negócio.

---

## 18. FLUXOS COMPLETOS DE DADOS

### 18.1 Fluxo: Registrar Novo Prontuário PAEFI

```
/cadastro (modo criação)
  1. useEffect → preenche tec_ref com user.nome_completo + cargo
  2. Tab 1 desbloqueada: data_cad + tec_ref + tipo_violencia + local_ocorrencia
  3. handleSubmit → POST /api/casos → { id: N }
  4. toast.success + navigate('/cadastro/N')
  5. Agora em modo edição, todas as tabs desbloqueadas
  6. Usuário preenche tabs 2-5, clicando "Salvar Progresso" em cada
     → PUT /api/casos/N  (apenas dirtyFields)
  7. "Finalizar" → PUT + navigate('/caso/N')
```

### 18.2 Fluxo: Dashboard com Drill-Down

```
/dashboard
  1. useEffect → getDashboardData(filters) → { dados, opcoesFiltro }
  2. Renderiza KPIs e gráficos com dados
  3. Usuário clica no card "Casos Reincidentes"
  4. handleDrillDown('reincidentes', null, 'Casos Reincidentes')
  5. Consulta CARD_FILTERS_MAP → { campo: 'reincidente', valor: 'Sim' }
  6. getCasosFiltrados({ filtro: 'reincidente', valor: 'Sim', ...filtrosAtivos })
     → GET /api/casos?filtro=reincidente&valor=Sim&mes=...&tecRef=...
  7. ListaCasosModal abre com lista de casos reincidentes
  8. Usuário clica "Ver Prontuário" → /caso/:id
```

### 18.3 Fluxo: Registrar Demanda com Caso Vinculado

```
/demandas
  1. Clica "Registrar Nova Demanda" → abre DemandaFormModal
  2. Preenche tipo_documento, instituicao_origem, etc.
  3. Digita nome do caso na busca → debounce 500ms
     → GET /api/casos?q=termo → lista de resultados
  4. Seleciona um caso da lista → selectedCaso
  5. useEffect detecta selectedCaso:
     → Busca tecnico na lista allUsers pelo nome_completo dentro de tecRef
     → Auto-preenche tecnico_designado_id
  6. Clica "Registrar" → POST /api/demandas → toast.success
  7. onSuccess() → fetchDemandas() → lista atualizada
```

---

## 19. CONVENÇÕES DE NOMENCLATURA

| Elemento          | Convenção                       | Exemplo                               |
| ----------------- | ------------------------------- | ------------------------------------- |
| Componentes React | PascalCase                      | `CasoDetalhe`, `MseRegistroModal`     |
| Hooks             | camelCase com `use`             | `usePermissoesSUAS`, `useCreateUser`  |
| Funções de API    | camelCase                       | `getCasoById`, `createMseRegistro`    |
| Interfaces        | PascalCase                      | `FiltrosCasos`, `MseRegistroBody`     |
| Types             | PascalCase                      | `UserRole`, `MseTipo`                 |
| Constants         | UPPER_SNAKE_CASE                | `CREAS_UNIT_ID`, `CARD_FILTERS_MAP`   |
| Variáveis         | camelCase                       | `isLoading`, `selectedFilter`         |
| CSS files         | kebab-case (par com componente) | `Dashboard.css`, `MapaCalor.css`      |
| Rotas URL         | kebab-case                      | `/controle-mse`, `/painel-vigilancia` |

---

## 20. MAPA DE DEPENDÊNCIAS ENTRE ARQUIVOS

```
App.tsx
  ├── AuthContext.tsx
  │     └── api.ts (login)
  ├── ProtectedRoute.tsx
  │     └── AuthContext.tsx
  └── [todas as pages]

Layout.tsx
  ├── AuthContext.tsx
  ├── usePermissoesSUAS.ts
  │     ├── AuthContext.tsx
  │     └── constants.ts
  └── ui/* (shadcn)

Dashboard.tsx
  ├── api.ts
  ├── ListaCasosModal.tsx
  │     └── ui/dialog, table
  └── recharts

PainelVigilancia.tsx
  ├── api.ts
  ├── CardKPI.tsx
  ├── MapaCalor.tsx (leaflet)
  ├── GraficoBarras.tsx (recharts)
  ├── GraficoPizza.tsx (recharts)
  └── ListaCasosModal.tsx

Cadastro.tsx / CrasProntuario.tsx
  ├── react-hook-form + zod
  ├── api.ts
  ├── AuthContext.tsx
  └── ui/* (shadcn)

GerenciarUsuarios.tsx
  ├── api.ts
  ├── AuthContext.tsx
  ├── constants.ts
  ├── UserEditModal.tsx
  └── ReassignCasesModal.tsx

ControleMSE.tsx
  ├── api.ts
  ├── AuthContext.tsx
  └── MseRegistroModal.tsx
        ├── api.ts
        ├── dateUtils.ts
        └── react-hook-form + zod
```
