# 📋 CONTEXTO GERAL DO SISTEMA — SUAS Patos/PB

> **Arquivo de contexto para IA.** Este documento descreve completamente o sistema, suas entidades, regras de negócio, padrões de código e arquitetura, permitindo que uma IA compreenda o projeto sem leitura adicional de código.

---

## 1. O QUE É O SISTEMA

**Nome:** Sistema de Registros e Monitoramento SUAS — Patos/PB  
**Sigla interna:** RMSUAS  
**Domínio:** Assistência Social pública municipal (SUAS — Sistema Único de Assistência Social)  
**Município:** Patos, Paraíba, Brasil

O sistema é um **software web de gestão social** utilizado pelas equipes das unidades de assistência social do município. Ele permite:

- Registrar, consultar e acompanhar **casos de violência e vulnerabilidade social** (prontuários PAEFI/CREAS).
- Controlar **Medidas Socioeducativas (MSE)** de adolescentes em conflito com a lei.
- Gerenciar **demandas externas** (ofícios, encaminhamentos judiciais, memorandos).
- Visualizar **dashboards analíticos** com indicadores de atendimento.
- Monitorar o território via **Painel de Vigilância Socioassistencial**.
- Gerenciar **usuários/servidores** com perfis e permissões específicas.
- Integrar com sistemas externos (IBGE, futuramente CadÚnico, Saúde, Educação).

---

## 2. UNIDADES DO SISTEMA

Cada usuário pertence a uma unidade (`unit_id`). As unidades são:

| ID  | Nome                                                             |
| --- | ---------------------------------------------------------------- |
| 1   | CREAS (Centro de Referência Especializado de Assistência Social) |
| 2   | CRAS Geralda Medeiros                                            |
| 3   | CRAS Mariana Alves                                               |
| 4   | CRAS Matheus Leitão                                              |
| 5   | CRAS Severina Celestino                                          |
| 6   | Vigilância Socioassistencial                                     |
| 7   | Centro POP                                                       |
| 8   | Conselho Tutelar Norte                                           |

> **Regra importante:** O CREAS (ID 1) é a unidade principal. É onde ocorrem os atendimentos PAEFI e o Controle MSE. O módulo MSE é **exclusivo** para usuários com `unit_id = 1`.

---

## 3. PERFIS DE USUÁRIO (ROLES)

| ID  | Valor (`role`)                      | Label                        |
| --- | ----------------------------------- | ---------------------------- |
| 1   | `tecnico_superior`                  | Técnico de Nível Superior    |
| 2   | `tecnico_medio`                     | Técnico de Nível Médio       |
| 3   | `coordenador_creas` / `coordenador` | Coordenador(a) CREAS         |
| 4   | `gestor`                            | Secretário(a) / Gestor Geral |
| 5   | `vigilancia`                        | Vigilância Socioassistencial |
| 6   | `coordenador_cras`                  | Coordenador(a) CRAS          |
| 7   | `tecnico_cras`                      | Técnico(a) CRAS              |
| 8   | `admin`                             | Administrador Sistema        |

> **Regra:** O Gestor Geral (`gestor`) tem `unit_id = null`, indicando que ele enxerga **todas as unidades**. Todos os demais usuários têm um `unit_id` fixo.

---

## 4. SISTEMA DE PERMISSÕES

### 4.1 Modelo

O sistema usa **permissões baseadas em strings**, armazenadas como um array no JWT/localStorage. Cada usuário recebe um conjunto de permissões ao fazer login.

**Entidades com permissões CRUD:**

```
usuarios:        users.create, users.read, users.edit, users.delete, users.archive
unidades:        units.create, units.read, units.edit, units.delete, units.archive
casos (PAEFI):   casos.create, casos.read, casos.edit, casos.delete, casos.archive
mse:             mse.create, mse.read, mse.edit, mse.delete, mse.archive
demandas:        demandas.create, demandas.read, demandas.edit, demandas.delete, demandas.archive
anexos:          anexos.create, anexos.read, anexos.edit, anexos.delete, anexos.archive
encaminhamentos: encaminhamentos.create, encaminhamentos.read, encaminhamentos.edit, encaminhamentos.delete, encaminhamentos.archive
```

**Permissões de tela:**

```
screen.dashboard.access     → Acesso ao Dashboard PAEFI
screen.vigilancia.access    → Acesso ao Painel de Vigilância
screen.relatorios.access    → Acesso ao Módulo de Relatórios
screen.integrations.access  → Acesso à tela de Integrações
```

> **Nota:** As strings de permissão de tela estão centralizadas na constante `SCREEN_PERMISSIONS` em `src/utils/constants.ts`.

### 4.2 Hook Central: `usePermissoesSUAS`

Arquivo: `src/hooks/usePermissoesSUAS.ts`

O hook centraliza **toda** a lógica de permissões do frontend. Retorna:

| Propriedade                   | Tipo             | Descrição                                      |
| ----------------------------- | ---------------- | ---------------------------------------------- |
| `unitId`                      | `number \| null` | ID da unidade do usuário logado                |
| `dashboardFilterUnits`        | `number[]`       | IDs para filtrar dados no dashboard            |
| `isGestorGeral`               | `boolean`        | `true` se role contém "gestor" ou "admin"      |
| `isVigilancia`                | `boolean`        | `true` se role contém "vigilancia"             |
| `isLotadoNoCreas`             | `boolean`        | `true` se `unit_id === 1`                      |
| `canViewCreasOperacional`     | `boolean`        | Pode ver casos, MSE e demandas (CREAS)         |
| `canAccessAnaliseGroup`       | `boolean`        | Pode ver pelo menos uma tela analítica         |
| `canManageUsers`              | `boolean`        | Tem todas as permissões de `users.*`           |
| `canManageCasos`              | `boolean`        | Tem todas as permissões de `casos.*`           |
| `canManageMse`                | `boolean`        | Tem todas as permissões de `mse.*`             |
| `canManageDemandas`           | `boolean`        | Tem todas as permissões de `demandas.*`        |
| `canManageAnexos`             | `boolean`        | Tem todas as permissões de `anexos.*`          |
| `canManageEncaminhamentos`    | `boolean`        | Tem todas as permissões de `encaminhamentos.*` |
| `canAccessDashboardScreen`    | `boolean`        | Permissão de tela: dashboard                   |
| `canAccessVigilanciaScreen`   | `boolean`        | Permissão de tela: vigilância                  |
| `canAccessIntegrationsScreen` | `boolean`        | Permissão de tela: integrações                 |
| `canAccessRelatoriosScreen`   | `boolean`        | Permissão de tela: relatórios                  |
| `canReadCasos`                | `boolean`        | Permissão granular: `casos.read`               |
| `canEditCasos`                | `boolean`        | Permissão granular: `casos.edit`               |
| `canDeleteCasos`              | `boolean`        | Permissão granular: `casos.delete`             |
| `canCreateCasos`              | `boolean`        | Permissão granular: `casos.create`             |

### 4.3 Componente `ProtectedRoute`

Arquivo: `src/contexts/ProtectedRoute.tsx`

Guarda rotas verificando se o usuário autenticado possui **todas** as permissões listadas em `requiredPermissions` (array). Se não tiver acesso, redireciona para `/dashboard`.

```tsx
<ProtectedRoute
  element={<MinhaPage />}
  requiredPermissions={["casos.read", "casos.create"]}
  fallbackPath="/dashboard"
/>
```

---

## 5. ENTIDADES DE DADOS

### 5.1 Caso (Prontuário PAEFI/CREAS)

A entidade central do sistema. Representa um atendimento a uma família/vítima no CREAS.

**Campos de nível superior (colunas SQL):**

- `id` — Identificador único
- `data_cad` / `dataCad` — Data do cadastro
- `tec_ref` / `tecRef` — Técnico de referência responsável
- `nome` — Nome completo da vítima
- `status` — `"Ativo"`, `"Desligado"`, `"Arquivado"`
- `unit_id` — ID da unidade que cadastrou

**Campos em JSONB (`dados_completos`):**

- **Violência:** `tipo_violencia`, `local_ocorrencia`, `confirmacaoViolencia`, `notificacaoSINAM`, `canalDenuncia`
- **Vítima:** `cpf`, `nis`, `idade`, `sexo`, `corEtnia`, `bairro`, `escolaridade`
- **Família:** `rendaFamiliar`, `recebePBF`, `recebeBPC`, `recebeBE`, `membrosCadUnico`, `membroPAI`, `composicaoFamiliar`, `tipoMoradia`, `referenciaFamiliar`, `membroCarcerario`, `membroSocioeducacao`, `dependeFinanceiro`
- **Saúde:** `vitimaPCD`, `vitimaPCDDetalhe`, `tratamentoSaude`, `tratamentoSaudeDetalhe`
- **Serviço:** `inseridoPAEFI`, `reincidente`, `qtdAtendimentos`, `encaminhadaSCFV`, `encaminhamento`, `encaminhamentoDetalhe`

**Sub-entidades vinculadas a um Caso:**

- **Acompanhamentos:** registros textuais de evolução do caso
- **Encaminhamentos:** serviço de destino, data, status (`Pendente`, `Concluído`, etc.), observações
- **Anexos:** arquivos (PDF, imagens, documentos) vinculados ao prontuário

### 5.2 Medida Socioeducativa (MSE)

Exclusiva do CREAS. Rastreia adolescentes em cumprimento de medidas.

**Campos:**

- `nome_adolescente`, `data_nascimento`, `nis`, `responsavel`, `endereco`, `contato`
- `mse_tipo`: `'LA'` (Liberdade Assistida), `'PSC'` (Prestação de Serviço à Comunidade), `'LA + PSC'`
- `mse_data_inicio`, `mse_duracao_meses`, `mse_data_final` (calculado)
- `situacao`: `'CUMPRIMENTO'` | `'DESCUMPRIMENTO'`
- `local_descumprimento`
- `pia_data_elaboracao`, `pia_status` (Plano Individual de Atendimento)
- `registrado_por` — Nome do técnico que registrou
- `unit_id` — Sempre 1 (CREAS)

**KPIs calculados:**

- `total_medidas`, `total_cumprimento`, `total_descumprimento`, `expirando_em_60_dias`

**Alerta de negócio:** Se taxa de descumprimento > 20%, o card KPI fica vermelho. Se > 10%, fica amarelo.

### 5.3 Demanda

Representa um documento externo recebido pelo CREAS que exige resposta ou ação.

**Campos:**

- `id`, `tipo_documento` (Ofício, Memorando, Encaminhamento, Requisição Judicial, Outro)
- `instituicao_origem` — Quem enviou
- `numero_documento` — Número do ofício/memorando
- `data_recebimento`, `prazo_resposta`
- `assunto` — Descrição do conteúdo
- `status`: `"Nova"` | `"Em Andamento"` | `"Finalizada"`
- `caso_associado_id` — ID do caso PAEFI vinculado (opcional)
- `tecnico_designado_id` / `tecnico_designado` — Responsável pela resposta
- `registrado_por_id` / `registrado_por`
- `anexos` — Documentos de resposta anexados

### 5.4 Usuário/Servidor

**Campos:**

- `id`, `username`, `password` (hash — apenas backend)
- `nome_completo`, `cargo` (ex: "Psicólogo", "Assistente Social")
- `role` — string do perfil (ex: `"tecnico_superior"`)
- `role_id` — ID numérico do perfil
- `unit_id` — ID da unidade (null para Gestor Geral)
- `is_active` — Ativo/Inativo
- `permissions` — Array de strings com as permissões

### 5.5 Anexo

- `id`, `nomeOriginal`, `tamanhoArquivo`, `dataUpload`, `descricao`, `uploadedBy`
- Pode ser vinculado a um `caso` OU a uma `demanda`
- Upload via `FormData` (multipart)
- Download via blob com header `content-disposition`

### 5.6 Prontuário CRAS (Em Desenvolvimento)

Versão simplificada do prontuário para unidades CRAS. Campos adicionais:

- `rua`, `pontoReferencia`, `contato`
- `primeiraInfSuas`, `recebePropPai`, `recebePAA`, `recebeHabitacaoSocial`
- `unit_id` é derivado da URL (`/cras/:unitName/`)

---

## 6. REGRAS DE NEGÓCIO

### 6.1 Controle de Acesso por Unidade

- O **backend filtra os dados pela `unit_id`** do usuário autenticado. O frontend não precisa enviar filtro de unidade explicitamente para listagens normais.
- Para dashboards e painéis, o filtro é enviado via `dashboardFilterUnits` (array de IDs).
- O **Gestor Geral** (`unit_id = null`) vê dados de **todas as unidades** — `dashboardFilterUnits = []` (sem filtro).
- Usuários da **Vigilância** e do **CREAS** filtram apenas pela unidade 1: `dashboardFilterUnits = [1]`.

### 6.2 Anonimização de Dados

- Usuários com perfil `vigilancia` podem visualizar a Consulta de Casos, mas **dados nominais são anonimizados** para `"DADO SIGILOSO"` (regra aplicada no backend).
- O frontend exibe um **alerta visual** quando casos anonimizados aparecem na lista.

### 6.3 Cadastro de Caso (Fluxo em 2 etapas)

1. **Criação (POST):** Apenas `data_cad`, `tec_ref`, `tipo_violencia`, `local_ocorrencia` e `unit_id` são enviados. O backend retorna o `id` do novo caso.
2. **Edição (PUT):** O frontend redireciona para `/cadastro/:id`. As abas "Vítima", "Família", "Saúde" e "Encaminhamentos" são **desbloqueadas** apenas em modo edição. Apenas os campos modificados (`dirtyFields`) são enviados no PUT.
3. **Finalização:** O botão "Finalizar" salva as alterações e redireciona para `/caso/:id`.

### 6.4 Designação Inteligente de Técnico em Demandas

Ao associar uma demanda a um caso existente, o sistema busca o técnico responsável pelo caso (`tecRef`) e tenta **auto-preencher** o campo `tecnico_designado_id` comparando o `nome_completo` do técnico com a lista de usuários.

### 6.5 Reatribuição de Casos

Ao inativar um servidor, o gestor pode reatribuir todos os casos para outro técnico **da mesma unidade**, com perfil operacional (`tecnico` ou `vigilancia`) e que esteja **ativo**.

### 6.6 Status de Caso

- **Ativo:** Em acompanhamento
- **Desligado:** Atendimento encerrado (pode ser reativado)
- **Arquivado:** Arquivado definitivamente

### 6.7 Status de Demanda

- **Nova** (badge vermelho) → **Em Andamento** (badge cinza) → **Finalizada** (badge verde)

### 6.8 MSE — Alertas de Prazo

- Medidas com prazo a vencer em até 60 dias aparecem no KPI "Expirando".
- Taxa de descumprimento > 20%: alerta vermelho. Entre 10% e 20%: alerta amarelo.

### 6.9 Drill-Down (Análise Interativa)

Tanto o Dashboard PAEFI quanto o Painel de Vigilância possuem **drill-down**: ao clicar em um card KPI ou gráfico, abre um modal (`ListaCasosModal`) com a lista de casos filtrados correspondentes. A lógica usa mapas de filtros (`CARD_FILTERS_MAP`, `VIGILANCIA_FILTERS_MAP`) que traduzem a ação de clique para o par `filtro + valor` enviado ao backend.

---

## 7. FLUXO DE AUTENTICAÇÃO

1. Usuário faz login em `/login` com `username` e `password`.
2. Backend retorna `{ token, user: { id, username, role, role_id, nome_completo, cargo, unit_id, permissions[] } }`.
3. Token JWT e dados do usuário são salvos no `localStorage`.
4. `AuthContext` expõe `{ isAuthenticated, user, isLoading, login, logout }`.
5. `PrivateRoute` bloqueia todas as rotas para usuários não autenticados.
6. `ProtectedRoute` verifica permissões específicas por rota.
7. No logout, `localStorage` é limpo e o usuário é redirecionado para `/login`.

---

## 8. PADRÕES DE API

### Base URL

Definida via variável de ambiente: `VITE_API_BASE_URL`

### Autenticação

Todas as requisições (exceto login) enviam o header:

```
Authorization: Bearer <token>
```

### Função Central: `fetchWithAuth`

Localizada em `src/services/api.ts`. Gerencia automaticamente:

- Adição do header de autorização
- Tratamento de erros HTTP
- Resposta como JSON ou como blob (para PDFs/downloads)
- Suporte a `FormData` (sem `Content-Type: application/json`)

### Endpoints Principais

| Método | Endpoint                                | Descrição                       |
| ------ | --------------------------------------- | ------------------------------- |
| POST   | `/api/login/`                           | Autenticação                    |
| GET    | `/api/casos`                            | Listagem/filtro de casos        |
| POST   | `/api/casos`                            | Criar caso                      |
| PUT    | `/api/casos/:id`                        | Editar caso                     |
| PATCH  | `/api/casos/:id/status`                 | Alterar status                  |
| DELETE | `/api/casos/:id`                        | Excluir caso                    |
| GET    | `/api/casos/:id`                        | Detalhe do caso                 |
| GET    | `/api/acompanhamentos/:casoId`          | Listar acompanhamentos          |
| POST   | `/api/acompanhamentos/:casoId`          | Criar acompanhamento            |
| GET    | `/api/casos/:id/encaminhamentos`        | Listar encaminhamentos          |
| POST   | `/api/encaminhamentos`                  | Criar encaminhamento            |
| PUT    | `/api/encaminhamentos/:id`              | Atualizar encaminhamento        |
| GET    | `/api/anexos/casos/:casoId`             | Listar anexos do caso           |
| POST   | `/api/anexos/upload/caso/:casoId`       | Upload de anexo para caso       |
| POST   | `/api/anexos/upload/demanda/:demandaId` | Upload de anexo para demanda    |
| GET    | `/api/anexos/download/:anexoId`         | Download de anexo               |
| GET    | `/api/users`                            | Listar usuários                 |
| POST   | `/api/users`                            | Criar usuário                   |
| PUT    | `/api/users/:id`                        | Editar usuário                  |
| PATCH  | `/api/users/:id/status`                 | Ativar/Inativar usuário         |
| POST   | `/api/users/reatribuir`                 | Reatribuir casos                |
| GET    | `/api/demandas`                         | Listar demandas                 |
| POST   | `/api/demandas`                         | Criar demanda                   |
| GET    | `/api/demandas/:id`                     | Detalhe da demanda              |
| PATCH  | `/api/demandas/:id/status`              | Atualizar status da demanda     |
| GET    | `/api/mse/registros`                    | Listar registros MSE            |
| POST   | `/api/mse/registros`                    | Criar registro MSE              |
| GET    | `/api/mse/registros/:id`                | Detalhe de registro MSE         |
| GET    | `/api/dashboard`                        | Dados do dashboard PAEFI        |
| GET    | `/api/vigilancia/casos-filtrados`       | Casos filtrados para vigilância |
| GET    | `/api/vigilancia/fluxo-demanda`         | KPI: novos casos                |
| GET    | `/api/vigilancia/sobrecarga-equipe`     | KPI: carga por técnico          |
| GET    | `/api/vigilancia/incidencia-bairros`    | Mapa de calor por bairro        |
| GET    | `/api/vigilancia/fontes-acionamento`    | Gráfico de canais de denúncia   |
| GET    | `/api/vigilancia/taxa-reincidencia`     | Taxa de reincidência            |
| GET    | `/api/vigilancia/perfil-violacoes`      | Perfil dos tipos de violência   |
| POST   | `/api/relatorios/geral`                 | Gera relatório PDF              |

### Filtros de Query String (FiltrosBase)

```typescript
interface FiltrosBase {
  mes?: string; // "YYYY-MM" para filtrar por mês
  tecRef?: string; // Nome do técnico
  bairro?: string; // Nome do bairro
  unidades?: string; // IDs separados por vírgula (ex: "1,2")
  isFiltroTotal?: boolean; // Flag para Gestor Geral (sem filtro de unidade)
}
```

---

## 9. DASHBOARD PAEFI — INDICADORES

O Dashboard carrega dados via `GET /api/dashboard` com filtros opcionais de `mes`, `tecRef`, `bairro`.

### Indicadores (cards)

- **Visão Geral:** Total de Atendimentos, Novos no Mês, Inseridos no PAEFI, Casos Reincidentes
- **Perfil Socioeconômico:** Recebem Bolsa Família, Recebem BPC, Moradia Principal, Escolaridade Principal
- **Indicadores de Violência:** Violência Principal, Violência Confirmada, Notificados no SINAN, Local Principal
- **Contexto Familiar:** Dependência Financeira, Vítima PCD, Membro em Sist. Carcerário, Membro em Socioeducação

### Gráficos

- Casos por Bairro (Top 5) — BarChart horizontal
- Tipos de Violação — PieChart (donut)
- Encaminhamentos Realizados (Top 5) — BarChart
- Casos por Sexo — PieChart (donut)
- Canal de Denúncia — PieChart
- Casos por Cor/Etnia — PieChart
- Casos por Faixa Etária — BarChart

### Mapa de Filtros Drill-Down

```typescript
const CARD_FILTERS_MAP = {
  violencia_confirmada: { campo: "confirmacaoViolencia", valor: "Confirmada" },
  notificados_sinan: { campo: "notificacaoSINAM", valor: "Sim" },
  reincidentes: { campo: "reincidente", valor: "Sim" },
  inseridos_paefi: { campo: "inseridoPAEFI", valor: "Sim" },
  recebem_bolsa_familia: { campo: "recebePBF", valor: "Sim" },
  recebem_bpc: { campo: "recebeBPC", valor: "Idoso" },
  dependencia_financeira: { campo: "dependeFinanceiro", valor: "Sim" },
  vitima_pcd: { campo: "vitimaPCD", valor: "Sim" },
  membro_carcerario: { campo: "membroCarcerario", valor: "Sim" },
  membro_socioeducacao: { campo: "membroSocioeducacao", valor: "Sim" },
  todos: null,
  novos_no_mes: null,
};
```

Filtros dinâmicos dos gráficos: `'por_bairro'`, `'por_violencia'`, `'sexo'`, `'canalDenuncia'`, `'corEtnia'`, `'por_faixa_etaria'`.

---

## 10. PAINEL DE VIGILÂNCIA

O Painel usa exclusivamente os endpoints `/api/vigilancia/*`. O drill-down usa `origem: 'vigilancia'` no `getCasosFiltrados`, que chama `/api/vigilancia/casos-filtrados` em vez de `/api/casos`.

### Dados carregados via `Promise.all` em paralelo:

| Chamada API                        | Dado retornado                                                  |
| ---------------------------------- | --------------------------------------------------------------- |
| `getVigilanciaFluxoDemanda()`      | `{ casosNovosUltimos30Dias: number }`                           |
| `getVigilanciaSobrecargaEquipe()`  | `{ mediaCasosPorTecnico, limiteRecomendado, totalCasosAtivos }` |
| `getVigilanciaIncidenciaBairros()` | `[{ bairro, casos }]`                                           |
| `getVigilanciaFontesAcionamento()` | `[{ fonte, quantidade }]`                                       |
| `getVigilanciaTaxaReincidencia()`  | `{ taxaReincidencia: number }`                                  |
| `getVigilanciaPerfilViolacoes()`   | `[{ tipo, quantidade }]`                                        |

**KPIs com alertas:**

- **Sobrecarga da Equipe**: `status = 'alerta'` se `mediaCasosPorTecnico > limiteRecomendado`
- **Fluxo de Demanda**: exibe `casosNovosUltimos30Dias` com `status = 'ok'`
- **Taxa de Reincidência**: `status = 'alerta'` se `taxaReincidencia > 10`

**Componentes visuais:**

- `CardKPI` — Props: `{ title, subtitle, value, status? }`. `status = 'alerta'` → classe CSS `kpi-card--alerta`
- `MapaCalor` — Props: `{ data: [{bairro, casos}], onMarkerClick? }`. Marcadores circulares Leaflet com escala de cores
- `GraficoBarras` — Props: `{ data: [{name, value}], onBarClick? }`. BarChart Recharts horizontal
- `GraficoPizza` — Props: `{ data: [{name, value}], onSliceClick? }`. PieChart Recharts

> **ATENÇÃO:** Os dados das APIs de vigilância usam nomes de campo diferentes das props dos componentes. O `PainelVigilancia.tsx` faz o mapeamento explícito:
>
> ```typescript
> fontesAcionamento.map((d) => ({ name: d.fonte, value: d.quantidade }));
> perfilViolacoes.map((d) => ({ name: d.tipo, value: d.quantidade }));
> ```

**Mapa de Filtros Drill-Down (Vigilância):**

```typescript
const VIGILANCIA_FILTERS_MAP = {
  total_ativos: { campo: "status", valor: "Ativo" },
  novos_no_mes: { campo: "mes", valor: "<YYYY-MM atual>" },
  reincidentes: { campo: "reincidente", valor: "Sim" },
  por_bairro: { campo: "bairro" }, // valor vem do clique no mapa
  por_canal: { campo: "canalDenuncia" }, // valor vem do clique no gráfico
  por_violencia: { campo: "tipoViolencia" }, // valor vem do clique no gráfico
  casos_novos_30d: { campo: "dataCad", valor: "ultimos_30_dias" },
};
```

**Bairros mapeados com coordenadas reais de Patos/PB:**

```
'Centro':          [-7.0285, -37.2799]
'Belo Horizonte':  [-7.0224, -37.2885]
'Liberdade':       [-7.0363, -37.2825]
'Jatobá':          [-7.0451, -37.2910]
'São Sebastião':   [-7.0315, -37.2701]
```

---

## 11. MÓDULO DE INTEGRAÇÕES

Tela informativa com status de integrações externas:

| Integração         | Status                                             |
| ------------------ | -------------------------------------------------- |
| CadÚnico           | Em desenvolvimento                                 |
| Sistema de Justiça | Em desenvolvimento                                 |
| CRAS               | Em desenvolvimento                                 |
| IBGE               | **Ativa** (consulta de municípios via API pública) |
| Saúde              | Futura                                             |
| Educação           | Futura                                             |
| Trabalho e Emprego | Futura                                             |
| Habitação          | Futura                                             |

A integração IBGE usa `https://servicodados.ibge.gov.br/api/v1/localidades/municipios?nome=...`

---

## 12. MÓDULO DE RELATÓRIOS

- Gera um PDF via `POST /api/relatorios/geral` com `{ startDate, endDate }`.
- O frontend recebe um blob e dispara download automático com nome `relatorio_geral_{start}_a_{end}.pdf`.

---

## 13. MÓDULO CRAS (Em Desenvolvimento)

Rotas: `/cras/cadastro`, `/cras/cadastro/:id`, `/cras/consulta`

Módulo paralelo ao CREAS para as unidades CRAS. Usa os mesmos endpoints de casos (`/api/casos`) mas com `unit_id` diferente (IDs 2–5). O prontuário CRAS tem campos específicos: endereço completo, benefícios CRAS-específicos.

> **Status atual:** `CrasConsulta` é um placeholder. `CrasProntuario` tem a estrutura base implementada.

---

## 14. PADRÕES DE CÓDIGO

### Stack Tecnológico

| Camada         | Tecnologia                                                                         |
| -------------- | ---------------------------------------------------------------------------------- |
| Framework      | React 18 + TypeScript                                                              |
| Build          | Vite 5                                                                             |
| Roteamento     | React Router DOM v6                                                                |
| Formulários    | React Hook Form + Zod (validação)                                                  |
| Estilização    | Tailwind CSS v3                                                                    |
| Componentes UI | Radix UI (via shadcn/ui pattern)                                                   |
| Gráficos       | Recharts                                                                           |
| Mapas          | Leaflet + React-Leaflet                                                            |
| Notificações   | react-toastify (configurado em `main.tsx` com `theme="colored"`, `autoClose=5000`) |
| Ícones         | Lucide React                                                                       |
| HTTP           | fetch nativo (função `fetchWithAuth`)                                              |
| Utilitário CSS | `cn()` em `src/lib/utils.ts` (combina `clsx` + `tailwind-merge`)                   |

### Proxy de Desenvolvimento (Vite)

O `vite.config.ts` configura dois proxies:

```
/api  → http://localhost:4000  (API principal do sistema)
/news → http://localhost:4000  (legado)
```

O alias `@` aponta para `src/`.

### Bootstrap da Aplicação (`main.tsx`)

O `ToastContainer` é montado **fora** do `<App />`, diretamente em `main.tsx`, com configuração global:

- `position="top-right"`, `autoClose=5000`, `theme="colored"`

### Estrutura de Pastas

```
src/
├── main.tsx                 # Ponto de entrada; monta <App> + <ToastContainer> global
├── App.tsx                  # Roteamento principal (React Router v6)
├── lib/
│   └── utils.ts             # Exporta cn() = clsx + tailwind-merge
├── contexts/
│   ├── AuthContext.tsx       # Autenticação (JWT + localStorage)
│   └── ProtectedRoute.tsx   # Guard de rota por permissão
├── hooks/
│   ├── usePermissoesSUAS.ts  # HOOK CENTRAL de permissões
│   ├── useUsers.ts           # Busca e gerenciamento de usuários
│   ├── useCreateUser.ts      # Criação de usuário (useReducer)
│   └── useUnidades.ts        # Busca de unidades
├── services/
│   └── api.ts               # Todas as chamadas HTTP + interfaces de tipos
├── utils/
│   ├── constants.ts          # Units, Roles, entityPermissions, SCREEN_PERMISSIONS
│   ├── roles.ts              # UserRole type + PROFILE_OPTIONS + PROFILE_LABELS
│   ├── apiNormalizer.ts      # normalizeListResponse (normaliza respostas de array)
│   ├── dateUtils.ts          # calculateAge, addMonthsToDate, formatDateForInput
│   └── masks.ts              # maskCPF, maskNIS, unmask (máscaras de formulário)
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx         # Dashboard PAEFI com drill-down
│   ├── Cadastro.tsx          # Prontuário CREAS (criação/edição)
│   ├── CasoDetalhe.tsx       # View completa do caso
│   ├── Consulta.tsx          # Listagem e busca de casos
│   ├── ControleMSE.tsx       # Gerenciamento de MSE
│   ├── Demandas.tsx          # Listagem de demandas
│   ├── DemandaDetalhe.tsx    # View/edição de demanda
│   ├── Relatorios.tsx        # Geração de PDF
│   ├── Integracoes.tsx       # Integrações externas
│   ├── GerenciarUsuarios.tsx # CRUD de servidores
│   ├── PainelVigilancia/
│   │   └── PainelVigilancia.tsx
│   └── Cras/
│       ├── CrasProntuario.tsx  # Estrutura base implementada
│       └── CrasConsulta.tsx    # ⚠️ Placeholder — apenas retorna <div>
└── components/
    ├── Layout.tsx            # ✅ Shell ATIVO: sidebar inline + cabeçalho (usado em App.tsx)
    ├── Header.tsx            # Cabeçalho standalone (usado dentro de Layout.tsx)
    ├── DrillDown/
    │   └── ListaCasosModal.tsx  # Modal reutilizável de drill-down (z-index: 2000)
    ├── demandas/
    │   └── DemandaFormModal.tsx
    ├── mse/
    │   └── MseRegistroModal.tsx
    ├── users/
    │   ├── UserEditModal.tsx
    │   ├── ReassignCasesModal.tsx
    │   └── UsersTable.tsx
    ├── vigilancia/
    │   ├── CardKPI.tsx
    │   ├── GraficoBarras.tsx
    │   ├── GraficoPizza.tsx
    │   └── MapaCalor.tsx
    └── ui/              # Componentes shadcn/ui (Radix UI)
        ├── badge.tsx, button.tsx, card.tsx, dialog.tsx
        ├── dropdown-menu.tsx, input.tsx, label.tsx
        ├── select.tsx, table.tsx, tabs.tsx, textarea.tsx
```

### Padrões de Formulários

- **React Hook Form + Zod** para validação.
- `zodResolver` conecta o schema ao form.
- Campos obrigatórios na Tab 1 (Atendimento): `data_cad`, `tec_ref`, `tipo_violencia`, `local_ocorrencia`.
- Campos nullable: `z.string().optional().nullable()`.
- CPF e NIS têm validações customizadas (`refine`) e **máscaras visuais** via `maskCPF` / `maskNIS` (`src/utils/masks.ts`).
- `Controller` do RHF é usado para componentes de Select (Radix) e campos com máscara.
- No modo edição, apenas `dirtyFields` são enviados ao backend.

### Padrões de Estado

- **Estado local** com `useState` para a maioria das páginas.
- **`useReducer`** para o hook `useCreateUser` (formulário complexo).
- **`useCallback`** nas funções de fetch para evitar re-renders desnecessários.
- **Debounce** (setTimeout 300–500ms) nas buscas em tempo real (Consulta, DemandaFormModal).
- **`useEffect` com cleanup** para cancelar timers de debounce.

### Padrões de Componentes

- Componentes de modal sempre recebem `isOpen`, `onClose` e `onSuccess`.
- `onSuccess` é um callback que aciona o refetch da lista pai.
- Componentes de tabela usam shadcn `Table` com estrutura `TableHeader/TableBody/TableRow/TableCell`.
- Loading states: `<Loader2 className="animate-spin" />` do Lucide React.

### Normalização de Resposta de API

```typescript
// src/utils/apiNormalizer.ts
export function normalizeListResponse<T>(response: any): T[] {
  if (Array.isArray(response)) return response;
  return response?.rows ?? response?.data ?? response?.results ?? [];
}
```

Trata diferentes formatos de resposta do backend (array direto, `{rows}`, `{data}`, `{results}`).

---

## 15. VARIÁVEIS DE AMBIENTE

```env
VITE_API_BASE_URL=http://localhost:4000   # URL base da API backend
```

---

## 16. ITENS PENDENTES / DÍVIDAS TÉCNICAS

1. **Módulo CRAS incompleto:** `CrasConsulta` é placeholder. As rotas CRAS não têm `ProtectedRoute`.
2. ~~**Código de debug na sidebar:** Bloco de diagnóstico visível em produção.~~ ✅ Resolvido — protegido por `import.meta.env.DEV`.
3. **MSE sem edição:** `updateMseRegistro` não está implementado (TODO no modal).
4. ~~**Typo em permissão:** `"screen.dashbord.access"`.~~ ✅ Resolvido — corrigido e centralizado em `SCREEN_PERMISSIONS`.
5. **unit_id no createMseRegistro:** Lê do `localStorage` diretamente em vez de usar o contexto de Auth.
6. **`role_id` sem fallback:** Comentário `//todo: se for nulo é para dar erro` no AuthContext sem tratamento.
7. **Filtro `unidades`** no dashboard ainda não totalmente integrado (lógica `dashboardFilterUnits` preparada mas não enviada automaticamente).
8. **`useUnidades`** importa `getUnidades` e `Unidades` do `api.ts`, mas essas funções/tipos não estão declaradas no `api.ts` atual (possível erro de compilação).
9. ~~**`string` importado de `zod`** no `App.tsx` sem uso.~~ ✅ Resolvido — import removido.
10. ~~**`Sidebar.tsx` legado** não referenciado.~~ ✅ Resolvido — arquivo deletado.
11. ~~**`permissionHelpers.ts` vazio.**~~ ✅ Resolvido — arquivo deletado.
12. ~~**`axios` instalado mas não utilizado.**~~ ✅ Resolvido — desinstalado do projeto.

---

## 17. GLOSSÁRIO DO DOMÍNIO

| Termo                        | Significado                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| SUAS                         | Sistema Único de Assistência Social                                                       |
| CREAS                        | Centro de Referência Especializado de Assistência Social                                  |
| CRAS                         | Centro de Referência de Assistência Social                                                |
| PAEFI                        | Serviço de Proteção e Atendimento Especializado a Famílias e Indivíduos                   |
| MSE                          | Medida Socioeducativa (LA = Liberdade Assistida, PSC = Prestação de Serviço à Comunidade) |
| PIA                          | Plano Individual de Atendimento (documento do adolescente em MSE)                         |
| SINAN                        | Sistema de Informação de Agravos de Notificação (saúde pública)                           |
| BPC                          | Benefício de Prestação Continuada (INSS)                                                  |
| PBF                          | Programa Bolsa Família                                                                    |
| CadÚnico                     | Cadastro Único para Programas Sociais do Governo Federal                                  |
| SCFV                         | Serviço de Convivência e Fortalecimento de Vínculos                                       |
| PCD                          | Pessoa com Deficiência                                                                    |
| Técnico de Referência        | Servidor responsável pelo acompanhamento do caso                                          |
| Caso                         | Prontuário de atendimento de uma família/vítima                                           |
| Demanda                      | Documento externo (ofício, encaminhamento) que exige ação da equipe                       |
| Vigilância Socioassistencial | Setor responsável pela análise territorial e monitoramento de indicadores                 |
