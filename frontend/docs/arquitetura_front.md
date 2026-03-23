# Arquitetura Frontend

Documento de referência técnica do frontend React/TypeScript do sistema SUAS Patos/PB, revisado contra o código em `2026-03-23`.

## 1. Visão Geral

O frontend é uma SPA em React com Vite, roteamento via `react-router-dom`, autenticação baseada em token JWT salvo em `localStorage` e controle de acesso por permissões granulares vindas do backend.

Fluxo estrutural atual:

```text
main.tsx
  └─ React.StrictMode
     ├─ App
     └─ ToastContainer (global)

App.tsx
  └─ AuthProvider
     └─ BrowserRouter
        └─ Routes
           ├─ /login
           └─ / -> PrivateRoute -> Layout -> rotas protegidas
```

Principais camadas:

- `src/main.tsx`: bootstrap do React e `ToastContainer`.
- `src/App.tsx`: `BrowserRouter`, `PrivateRoute`, `ProtectedRoute` e tabela de rotas.
- `src/contexts/AuthContext.tsx`: sessão, login, logout e hidratação do usuário.
- `src/hooks/usePermissoesSUAS.ts`: derivação central das permissões de tela e operação.
- `src/services/api.ts`: cliente HTTP principal do projeto.
- `src/components/Layout.tsx`: shell autenticado com sidebar e dropdown de usuário.
- `src/pages/*`: módulos funcionais.

## 2. Stack Atual

### 2.1 Core

| Biblioteca | Versão | Uso atual |
| --- | --- | --- |
| `react` | `^18.3.1` | renderização da UI |
| `react-dom` | `^18.3.1` | renderização DOM |
| `typescript` | `^5.2.2` | tipagem estática |
| `vite` | `^5.1.4` | dev server e build |
| `react-router-dom` | `^6.22.3` | rotas SPA |

### 2.2 UI, formulários e feedback

| Biblioteca | Versão | Uso atual |
| --- | --- | --- |
| `tailwindcss` | `^3.4.1` | base utilitária |
| `@radix-ui/*` | vários | primitives do shadcn/ui |
| `react-hook-form` | `^7.62.0` | formulários complexos |
| `zod` | `^4.1.12` | schema e validação |
| `@hookform/resolvers` | `^5.2.2` | integração RHF + Zod |
| `react-toastify` | `^11.0.5` | notificações |
| `lucide-react` | `^0.544.0` | ícones |
| `clsx`, `class-variance-authority`, `tailwind-merge` | atuais | composição de classes |

### 2.3 Visualização de dados

| Biblioteca | Versão | Uso atual |
| --- | --- | --- |
| `recharts` | `^3.2.0` | gráficos do dashboard |
| `leaflet` + `react-leaflet` | `^1.9.4`, `^4.2.1` | mapa do painel de vigilância |
| `jspdf` + `jspdf-autotable` | `^3.0.2`, `^5.0.2` | dependências de PDF instaladas, mas o fluxo principal atual de relatório usa blob vindo da API |

### 2.4 Dependências instaladas sem uso claro no fluxo principal

- `react-slick`
- `slick-carousel`
- `swiper`

No código lido nesta revisão, essas bibliotecas não aparecem no frontend ativo.

## 3. Estrutura de Pastas

```text
frontend/
├── docs/
│   ├── arquitetura_front.md
│   ├── VERIFICAÇÃO-PLANO-1.md
│   ├── cadastro/
│   └── legacy/
├── public/
│   └── vite.svg
├── src/
│   ├── assets/logos/
│   ├── components/
│   │   ├── DrillDown/
│   │   ├── demandas/
│   │   ├── mse/
│   │   ├── ui/
│   │   ├── users/
│   │   └── vigilancia/
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── ProtectedRoute.tsx
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   │   ├── Cadastro/
│   │   ├── Cras/
│   │   ├── PainelVigilancia/
│   │   └── *.tsx
│   ├── services/
│   │   └── api.ts
│   ├── utils/
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── package.json
├── tailwind.config.cjs
├── tsconfig.json
└── vite.config.ts
```

Observações relevantes:

- `src/pages/Cadastro.tsx` hoje é apenas um reexport para `src/pages/Cadastro/Cadastro.tsx`.
- `src/components/Header.tsx` existe, mas não está integrado no layout atual.
- `src/hooks/useUsers.ts`, `src/hooks/useCreateUser.ts` e `src/hooks/useUnidades.ts` coexistem com implementações diretas em páginas; o projeto ainda não está totalmente consolidado em hooks.

## 4. Roteamento

Rotas declaradas em `src/App.tsx`:

```text
/login
/
  ├─ index -> Navigate("/dashboard")
  ├─ /dashboard
  ├─ /painel-vigilancia
  ├─ /relatorios
  ├─ /integracoes
  ├─ /cadastro
  ├─ /cadastro/:id
  ├─ /consulta
  ├─ /caso/:id
  ├─ /demandas
  ├─ /demandas/:id
  ├─ /controle-mse
  ├─ /cras/cadastro
  ├─ /cras/cadastro/:id
  ├─ /cras/consulta
  └─ /gerenciar-usuarios
* -> Navigate("/login")
```

### 4.1 Guards

- `PrivateRoute` está definido dentro de `src/App.tsx`.
- `ProtectedRoute` está em `src/contexts/ProtectedRoute.tsx`.

Comportamento atual:

- `PrivateRoute` exige autenticação.
- `ProtectedRoute` exige autenticação e checa se o usuário possui todas as permissões de `requiredPermissions`.
- O fallback padrão de `ProtectedRoute` é `/dashboard`.

### 4.2 Divergência importante

O `Layout` ainda contém uma lógica de redirecionamento baseada em permissões para a rota `/`, mas o índice da rota já faz `Navigate("/dashboard")` de forma fixa. Na prática:

- o redirecionamento dinâmico planejado no `Layout` está parcialmente obsoleto;
- o comportamento real de entrada hoje privilegia `/dashboard`.

## 5. Autenticação e Sessão

### 5.1 AuthContext

`src/contexts/AuthContext.tsx` é a fonte global da sessão:

- guarda `user`, `isAuthenticated` e `isLoading`;
- lê `token` e `user` do `localStorage` na montagem;
- normaliza `unit_id` para `number | null`;
- persiste `token` e `user` no login;
- remove ambos no logout.

### 5.2 Fluxo de login

```text
Login.tsx
  -> useAuth().login(username, password)
  -> api.login()
  -> POST {VITE_API_BASE_URL}/api/login/
  -> localStorage(token, user)
  -> navigate("/dashboard")
```

### 5.3 Observações

- `main.tsx` já renderiza um `ToastContainer` global.
- `Login.tsx` ainda importa `ToastContainer`, mas não o renderiza; é resíduo de implementação anterior.

## 6. Sistema de Permissões

O centro da regra de acesso está em `src/hooks/usePermissoesSUAS.ts`.

Esse hook deriva:

- perfil percebido (`isGestorGeral`, `isVigilancia`, `isLotadoNoCreas`);
- acesso a grupos de menu;
- permissões de entidades (`canManageCasos`, `canManageDemandas`, `canManageUsers`, etc.);
- permissões granulares (`canReadCasos`, `canEditCasos`, `canDeleteCasos`, `canCreateCasos`);
- acesso a telas (`screen.dashboard.access`, `screen.vigilancia.access`, `screen.relatorios.access`, `screen.integrations.access`);
- filtro de unidades para dashboards (`dashboardFilterUnits`).

Dependências desse fluxo:

- `AuthContext` fornece `user.permissions`, `user.role`, `user.role_id` e `user.unit_id`.
- `src/utils/constants.ts` define `entityPermissions`, `SCREEN_PERMISSIONS`, `UNIT_OPTIONS`, `Roles` e `Units`.

### 6.1 Estado atual do menu

`src/components/Layout.tsx` monta a sidebar por grupos:

- `MODULO CRAS`: hoje `isVisible: false`
- `Atendimento Operacional CREAS`
- `Análise e Gestão`
- `Administração`

O grupo CRAS existe na árvore de rotas, mas ainda está desativado no menu.

## 7. Shell da Aplicação

`src/components/Layout.tsx` implementa:

- sidebar fixa à esquerda;
- dropdown de usuário no topo do conteúdo;
- `Outlet` para páginas;
- badge de diagnóstico em `import.meta.env.DEV`.

Itens relevantes:

- o layout usa classes Tailwind dinâmicas como `bg-${linkColorClass}-100`;
- a logo da sidebar aponta para `/logos/rmsuas-logo.svg`;
- `public/` atualmente contém apenas `vite.svg`.

Isso indica um ponto de inconsistência entre o layout e os assets públicos.

## 8. Camada de Serviços

`src/services/api.ts` continua sendo o cliente HTTP principal.

### 8.1 Comportamento do `fetchWithAuth`

- lê o token do `localStorage`;
- injeta `Authorization: Bearer ...`;
- usa `Content-Type: application/json` quando o body não é `FormData`;
- faz `fetch` contra `import.meta.env.VITE_API_BASE_URL`;
- lança `Error` com a mensagem devolvida pela API;
- retorna `Response` para conteúdo binário (`application/pdf` ou `application/octet-stream`);
- retorna `response.json()` nos demais casos.

### 8.2 Funções existentes

Domínios exportados atualmente:

- autenticação: `login`
- casos: `createCase`, `updateCase`, `updateCasoStatus`, `deleteCaso`, `getCasoById`, `getCasosFiltrados`, `searchCasosByTerm`
- acompanhamentos: `getAcompanhamentos`, `createAcompanhamento`
- encaminhamentos: `getEncaminhamentos`, `createEncaminhamento`, `updateEncaminhamento`
- anexos: `getAnexosByCasoId`, `uploadAnexoParaCaso`, `uploadAnexoParaDemanda`, `downloadAnexo`
- usuários: `getUsers`, `createUser`, `updateUser`, `updateUserStatus`, `reassignUserCases`
- relatórios: `generateReport`
- dashboard: `getDashboardData`
- vigilância: `getVigilanciaFluxoDemanda`, `getVigilanciaSobrecargaEquipe`, `getVigilanciaIncidenciaBairros`, `getVigilanciaFontesAcionamento`, `getVigilanciaTaxaReincidencia`, `getVigilanciaPerfilViolacoes`
- demandas: `getDemandas`, `createDemanda`, `getDemandaById`, `updateDemandaStatus`
- MSE: `getMseRegistros`, `createMseRegistro`, `getMseRegistroById`

### 8.3 Roteamento de casos por origem

`getCasosFiltrados` muda o endpoint quando `filters.origem === "vigilancia"`:

- padrão: `/api/casos`
- vigilância: `/api/vigilancia/casos-filtrados`

### 8.4 Limite da padronização

O documento anterior afirmava que toda integração HTTP passava por `api.ts`. Isso não é mais verdade:

- `src/pages/Integracoes.tsx` faz `fetch` direto para a API do IBGE.

## 9. Módulos Funcionais

### 9.1 Cadastro de casos

O módulo de cadastro foi modularizado e hoje vive em `src/pages/Cadastro/`.

Arquivos centrais:

- `Cadastro.tsx`: composição visual das abas
- `useCadastroForm.ts`: orquestração do formulário
- `schema.ts`: validação Zod
- `adapters.ts`: adaptação entre payload da API e shape do formulário
- `options.ts`: opções auxiliares
- `components/Tab*.tsx`: seções do formulário

Fluxo atual:

```text
modo criação
  -> createCase({ data_cad, tec_ref, unit_id, dados_completos_payload })
  -> navega para /cadastro/:id

modo edição
  -> getCasoById(id)
  -> caseToFormValues()
  -> salva somente dirtyFields relevantes
  -> updateCase(id, { data_cad?, tec_ref?, dados_completos_payload })
  -> navega para /caso/:id
```

Abas ativas hoje:

1. Atendimento
2. Vítima
3. Família
4. Saúde
5. Encaminhamentos
6. Agressor
7. Moradia

### 9.2 Consulta

`src/pages/Consulta.tsx` implementa:

- busca geral;
- filtro por status;
- filtro por tipo de violência;
- filtro por bairro;
- debounce de `300ms`.

O backend é tratado como responsável pelo recorte de unidade do usuário.

### 9.3 Caso detalhado

`src/pages/CasoDetalhe.tsx` concentra:

- leitura do prontuário;
- edição via retorno para `/cadastro/:id`;
- desligamento/reativação/exclusão;
- acompanhamentos;
- encaminhamentos;
- anexos;
- demandas vinculadas.

Os dados exibidos combinam:

- campos de topo do caso;
- `dados_completos` achatado para renderização.

### 9.4 Dashboard

`src/pages/Dashboard.tsx` usa:

- filtros por mês, técnico e bairro;
- `getDashboardData`;
- `ListaCasosModal` para drill-down;
- `recharts` para barras e pizzas;
- modo apresentação com Fullscreen API.

### 9.5 Painel de Vigilância

`src/pages/PainelVigilancia/PainelVigilancia.tsx` agrega várias chamadas paralelas:

- fluxo de demanda;
- sobrecarga da equipe;
- incidência por bairros;
- fontes de acionamento;
- reincidência;
- perfil de violações.

Também usa:

- `MapaCalor`
- `GraficoBarras`
- `GraficoPizza`
- `ListaCasosModal`

### 9.6 Demandas

Fluxo atual dividido em:

- `src/pages/Demandas.tsx`: listagem e abertura do modal
- `src/components/demandas/DemandaFormModal.tsx`: criação
- `src/pages/DemandaDetalhe.tsx`: detalhe, status e anexos

Há designação automática do técnico ao selecionar um caso associado, tentando casar `selectedCaso.tecRef` com `user.nome_completo`.

### 9.7 Controle MSE

Arquivos:

- `src/pages/ControleMSE.tsx`
- `src/components/mse/MseRegistroModal.tsx`

Funcionalidades:

- KPIs do módulo;
- busca com debounce;
- criação de registro MSE;
- abertura do modal em modo de detalhe/edição.

Limitação atual:

- o modal em modo edição carrega os dados, mas o `update` ainda não está implementado de fato; o submit apenas exibe toast de sucesso.

### 9.8 Relatórios

`src/pages/Relatorios.tsx` gera um PDF a partir da API:

- formulário com data inicial e final;
- `generateReport`;
- download do blob gerado.

### 9.9 Integrações

`src/pages/Integracoes.tsx` é um módulo mais demonstrativo do que consolidado:

- lista integrações prioritárias, intermediárias e estratégicas;
- consulta o IBGE diretamente via `fetch`;
- não usa `api.ts`;
- mistura conteúdo institucional com uma integração operacional real.

## 10. Padrões de Formulário

### 10.1 Padrão dominante

O padrão principal hoje é:

```text
react-hook-form
  + zodResolver
  + schema Zod
  + componentes shadcn/ui
  + adapters para compatibilizar payload legado/canônico
```

### 10.2 Exemplos reais

- `Cadastro`: fluxo mais elaborado e canônico do projeto.
- `MseRegistroModal`: RHF + Zod + `Controller`.

### 10.3 Exceções

Nem todos os formulários seguem esse padrão:

- `DemandaFormModal` usa `useState` manual.
- `GerenciarUsuarios.tsx` também usa estado manual para o formulário de criação.

## 11. Estado e Reutilização

Estratégia observada no código:

- `useState`: dominante em páginas e modais
- `useEffect`: fetch inicial e debounce
- `useCallback`: usado em páginas com recarga de dados
- `useMemo`: usado principalmente em `useCadastroForm`
- `useContext`: apenas autenticação
- custom hooks: uso parcial, não homogêneo

Hooks existentes:

- `usePermissoesSUAS`: central e ativo
- `useUsers`: ativo, mas não adotado pela página de gestão
- `useCreateUser`: existe, mas não é usado em `GerenciarUsuarios.tsx`
- `useUnidades`: existe, porém depende de exports ausentes em `api.ts`

## 12. Normalização de Respostas

`src/utils/apiNormalizer.ts` expõe `normalizeListResponse`, que trata:

- array puro
- `rows`
- `data`
- `results`

Estado atual:

- a utility existe;
- é usada por `useUsers` e `useUnidades`;
- não foi incorporada de forma uniforme às páginas nem ao `api.ts`.

## 13. Build e Ambiente

### 13.1 Vite

`vite.config.ts` define:

- plugin React
- alias `@ -> ./src`
- proxy local para `/api` e `/news`

Proxy dev atual:

- `/api -> http://localhost:4000`
- `/news -> http://localhost:4000`

### 13.2 TypeScript

`tsconfig.json` define:

- `strict: true`
- `jsx: react-jsx`
- `baseUrl: "."`
- `paths["@/*"] = ["./src/*"]`

### 13.3 Estilos globais

O carregamento global real é:

- `src/styles.css` em `main.tsx`
- CSS específicos importados nas páginas/componentes

`App.css` e `index.css` existem no repositório, mas não aparecem no bootstrap principal lido nesta revisão.

## 14. Divergências e Débitos Arquiteturais

Itens verificados no código que merecem atenção:

1. `Layout.tsx` aponta para `/logos/rmsuas-logo.svg`, mas `public/` não contém essa estrutura.
2. O redirecionamento inicial documentado anteriormente não corresponde ao comportamento real; o índice da rota vai direto para `/dashboard`.
3. `Integracoes.tsx` contorna `api.ts` e depende de `fetch` direto para um serviço externo.
4. `useUnidades.ts` importa `getUnidades` e `Unidades` de `api.ts`, mas esses exports não existem no arquivo revisado.
5. `MseRegistroModal.tsx` carrega edição, mas ainda não persiste atualização no backend.
6. O projeto combina hooks reutilizáveis e implementações locais para o mesmo domínio, sem padronização completa.
7. `normalizeListResponse` ainda não é a camada padrão de entrada para listas.
8. Existem dependências instaladas e componentes legados não integrados ao fluxo principal.

## 15. Resumo Executivo

A arquitetura atual continua baseada em uma SPA React com autenticação local, permissões granulares e uma camada principal de serviços em `api.ts`. O avanço mais relevante desde a versão anterior da documentação é a modularização do cadastro de casos em `src/pages/Cadastro/`, com schema, adapters e hook dedicados.

Ao mesmo tempo, o frontend ainda convive com trechos legados e algumas inconsistências arquiteturais: redirecionamento inicial parcialmente obsoleto, integrações fora da camada padrão de serviços, hooks não adotados de forma uniforme e o fluxo de edição de MSE incompleto.
