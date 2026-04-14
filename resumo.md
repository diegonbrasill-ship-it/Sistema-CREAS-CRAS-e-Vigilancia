# Resumo Geral do Projeto

## Objetivo deste resumo

Este documento consolida uma analise funcional e tecnica do projeto tomando como base principal:

- `frontend/docs/`
- `backend/docs/`
- confirmacoes pontuais no codigo atual de `frontend/src/` e `backend/src/`

O foco aqui e responder:

- quais funcionalidades existem hoje
- o que cada uma faz
- o que parece funcional, parcial ou fragil
- quais melhorias sao mais importantes
- quais inconsistencias de seguranca merecem prioridade

---

## Panorama geral

O sistema e um monolito web dividido em:

- `frontend`: SPA em React + TypeScript + Vite
- `backend`: API em Express + TypeScript + PostgreSQL

Dominio principal do projeto:

- atendimento social CREAS/CRAS
- cadastro e acompanhamento de casos
- consulta operacional
- indicadores de dashboard e vigilancia
- gestao de demandas, anexos, encaminhamentos e usuarios

Leitura geral do estado atual:

- o modulo de `casos` e o mais maduro e melhor documentado
- o frontend de `Cadastro` tambem esta relativamente organizado
- `Dashboard` e `Painel de Vigilancia` funcionam, mas ainda carregam dividas de contrato e legado
- `Demandas`, `Anexos`, `MSE`, `CRAS` e `Integracoes` ainda parecem mais heterogeneos e com menor nivel de padronizacao

---

## Analise por funcionalidade

## 1. Autenticacao e controle de acesso

### O que faz

- login com JWT
- persistencia de sessao no frontend
- protecao de rotas no frontend
- controle de visibilidade por permissao
- recorte de dados por unidade no backend

### Estado atual

- **Funciona**, e e a base da navegacao protegida do sistema
- `PrivateRoute` e `ProtectedRoute` estao ativos no frontend
- o backend injeta `req.user` e `req.accessFilter`
- o acesso por unidade esta melhor consolidado em `casos`

### Melhorias

- migrar o token do `localStorage` para cookie `HttpOnly` com estrategia CSRF adequada
- substituir checks por `role` textual por autorizacao baseada em permissao real
- padronizar a aplicacao do `accessFilter` em todos os modulos, nao apenas em `casos`
- remover segredos padrao em JWT e endurecer configuracao por ambiente

---

## 2. Cadastro de casos

### O que faz

- cria e edita o prontuario principal do atendimento
- organiza os dados em 7 abas:
  - Atendimento
  - Vitima
  - Familia
  - Saude
  - Encaminhamentos
  - Agressor
  - Moradia

### Estado atual

- **Funciona bem** e e uma das areas mais estruturadas do sistema
- o frontend usa `react-hook-form` + `zod` + adapters
- o backend de `casos` ja tem contrato mais canonico
- ha suporte a criacao, edicao, merge parcial, validacao e soft delete

### Melhorias

- concluir a remocao dos campos legados que ainda coexistem com os campos canonicos
- reduzir a dependencia de aliases historicos no payload
- ampliar testes de ponta a ponta do fluxo de criacao/edicao
- garantir que todos os campos usados em dashboard e vigilancia saiam normalizados pelo backend

---

## 3. Consulta de casos

### O que faz

- lista casos com busca
- filtra por status, bairro e tipo de violencia
- serve como entrada operacional para localizar prontuarios

### Estado atual

- **Funciona**, mas ainda convive com compatibilidade legado
- o backend canonico `GET /api/casos` ja esta melhor desenhado
- parte do frontend ainda usa camada de compatibilidade antiga (`filtro/valor`)

### Melhorias

- migrar totalmente a consulta para o contrato canonico de `GET /api/casos`
- centralizar normalizacao de resposta e filtros
- eliminar parametros legados como formato principal

---

## 4. Detalhe do caso

### O que faz

- exibe dados completos do caso
- permite editar, alterar status, excluir logicamente
- agrega acompanhamentos, encaminhamentos, anexos e demandas vinculadas

### Estado atual

- **Funciona bem** e complementa o modulo de cadastro
- esta bem alinhado com a maturidade da entidade `casos`
- o middleware `checkCaseAccess` reforca o controle por unidade

### Melhorias

- revisar consistencia dos dados agregados entre modulos filhos
- ampliar cobertura para cenarios com soft delete e itens vinculados
- reduzir divergencias de naming entre campos vindos do backend

---

## 5. Dashboard

### O que faz

- mostra indicadores gerenciais
- exibe rankings e distribuicoes por bairro, sexo, cor, canal, violencia etc.
- abre drill-down para listar os casos por insight clicado

### Estado atual

- **Funciona**, mas com divida tecnica relevante
- agregados de dashboard existem e sao consumidos pelo frontend
- o drill-down do frontend foi planejado para convergir em `GET /api/casos`
- o backend do dashboard ainda depende parcialmente de chaves legadas e nao esta tao endurecido quanto `casos`

### Melhorias

- aplicar `deleted_at IS NULL` em todas as consultas do dashboard
- remover dependencia de chaves legadas do JSON (`tipo_violencia`, `corEtnia`, `tipoMoradia` etc.)
- alinhar tipos numericos da resposta para evitar normalizacao extra no frontend
- consolidar filtros e contrato do drill-down em cima do mesmo parser da entidade `casos`

---

## 6. Painel de Vigilancia

### O que faz

- apresenta KPIs territoriais e operacionais
- mostra fluxo de demanda, reincidencia, bairros, fontes de acionamento e perfil de violacoes
- usa mapa e graficos com abertura de lista detalhada

### Estado atual

- **Funciona, mas e uma das areas mais frageis**
- a tela e util e ja consolidou parte do drill-down no frontend
- no backend, a implementacao ainda e muito manual e com mais sinais de legado

### Melhorias

- migrar totalmente o drill-down legado para `GET /api/casos`
- introduzir whitelist real de filtros
- parar de ler chaves inconsistentes como `canal` e `violencia` no lugar das chaves canonicas
- unificar a aplicacao de filtros de unidade e soft delete

---

## 7. Demandas

### O que faz

- registra demandas/documentos recebidos
- associa demandas a casos
- permite listar, detalhar e alterar status

### Estado atual

- **Funciona de forma parcial / MVP**
- ha fluxo de criacao, listagem e detalhe
- existe regra de anonimizar nome do caso para certos cenarios de vigilancia
- a implementacao ainda esta muito procedural e menos padronizada que `casos`

### Melhorias

- mover regras para service/repository
- aplicar filtro de acesso por unidade de forma consistente na listagem
- formalizar contrato de permissao por papel e por unidade
- incluir testes de autorizacao e visibilidade

---

## 8. Encaminhamentos, acompanhamentos e anexos

### O que fazem

- acompanhamentos registram historico textual de evolucao
- encaminhamentos registram destinos e situacoes de encaminhamento
- anexos guardam arquivos ligados a casos e demandas

### Estado atual

- **Funcionam**, mas com assimetria de maturidade
- o fluxo e importante para o prontuario do caso
- anexos e um ponto sensivel porque mistura upload, acesso por unidade e download de arquivo

### Melhorias

- padronizar schema e naming das colunas de anexos
- aplicar checagem de acesso equivalente para uploads de demanda
- evitar exposicao publica desnecessaria da pasta de arquivos
- acrescentar auditoria e testes de acesso para anexos

---

## 9. Gestao de usuarios

### O que faz

- lista usuarios
- cria usuarios
- atualiza usuarios
- controla ativacao e reatribuicao de casos

### Estado atual

- **Funciona**, mas a regra de autorizacao ainda parece mesclar papel textual e permissao granular
- ha base de roles/permissoes no banco
- no frontend existem hooks e paginas coexistindo sem consolidacao total

### Melhorias

- deixar a autorizacao orientada por permissao e nao por string de role
- revisar consistencia de regras entre backend e frontend
- consolidar hooks e telas de administracao

---

## 10. Relatorios

### O que faz

- gera PDF geral via backend
- o frontend baixa o blob retornado pela API

### Estado atual

- **Funciona no fluxo principal**
- a documentacao mostra tambem estudo para PDF de dashboard no frontend, mas isso ainda parece transitorio

### Melhorias

- padronizar contrato de filtros e validacao de periodo
- adicionar controle de autorizacao mais explicito para tipos de relatorio
- revisar eventual volume/custo de geracao para cenarios grandes

---

## 11. Controle MSE

### O que faz

- cadastro e listagem de registros de medidas socioeducativas
- exibe KPIs do modulo
- abre modal para detalhe/edicao

### Estado atual

- **Parcial**
- criacao e listagem existem
- a documentacao do frontend indica que o modo edicao ainda nao persiste de fato

### Melhorias

- implementar update real no backend e no frontend
- aplicar controle de acesso por unidade tambem no detalhe por ID
- formalizar contrato e testes do modulo

---

## 12. CRAS

### O que faz

- possui rotas e paginas de cadastro/prontuario/consulta para CRAS

### Estado atual

- **Em desenvolvimento / baixa maturidade**
- existe na arvore de rotas
- o proprio frontend documenta que o grupo CRAS ainda esta desligado no menu

### Melhorias

- fechar escopo funcional antes de expor no menu
- alinhar contrato e autorizacao por unidade/perfil
- produzir documentacao funcional especifica do modulo

---

## 13. Integracoes

### O que faz

- tela institucional com integracoes priorizadas
- consulta direta ao IBGE

### Estado atual

- **Experimental**
- nao segue o mesmo padrao da camada `api.ts`
- mistura conteudo demonstrativo com integracao operacional

### Melhorias

- separar tela demonstrativa de integracao real
- centralizar chamadas externas na camada de servicos
- definir politica de timeout, erro e observabilidade para integracoes

---

## Principais inconsistencias funcionais e arquiteturais

1. O projeto convive com dois modelos ao mesmo tempo:

   - contrato canonico mais novo, principalmente em `casos`
   - contratos legados ainda ativos em dashboard, vigilancia e partes da consulta

2. Ha mistura de naming:

   - `camelCase`
   - `snake_case`
   - chaves historicas e chaves canonicas para o mesmo conceito

3. A entidade `casos` esta mais madura do que os modulos adjacentes, o que gera assimetria arquitetural.

4. Existem hooks, adapters e utilitarios bons no frontend, mas ainda sem adocao uniforme entre paginas.

5. O backend ainda tem varias rotas com SQL montado manualmente, fora do nivel de padronizacao ja atingido em `casos`.

---

## Inconsistencias de seguranca

Os itens abaixo sao os mais relevantes e deveriam entrar em backlog prioritario.

### 1. Segredo JWT com fallback inseguro

Foi identificado fallback para segredo padrao:

- `process.env.JWT_SECRET || 'seu_segredo_padrao_para_testes'`

Impacto:

- risco de emissao/validacao de tokens com segredo previsivel
- alto risco se configuracao de ambiente falhar

Prioridade:

- **critica**

### 2. CORS totalmente aberto no backend

Uso atual:

- `app.use(cors())`

Impacto:

- qualquer origem pode tentar consumir a API
- aumenta superficie de ataque e dificulta governanca entre ambientes

Prioridade:

- **alta**

### 3. Token JWT salvo em `localStorage`

Estado atual:

- o frontend persiste `token` e `user` em `localStorage`

Impacto:

- qualquer XSS no frontend passa a expor o token
- sessao fica mais vulneravel a extracao por script

Prioridade:

- **alta**

### 4. Dashboard e Vigilancia ainda nao filtram soft delete de forma consistente

A propria documentacao aponta:

- dashboard nao garante `deleted_at IS NULL`
- drill-down legado de vigilancia tambem nao garante esse filtro

Impacto:

- exposicao de registros que deveriam estar logicamente excluidos
- distorcao de indicador e de listagem

Prioridade:

- **alta**

### 5. Drill-down legado de Vigilancia sem whitelist real de filtros

Estado atual:

- qualquer chave nao tratada cai em filtro generico sobre `dados_completos->>'<filtro>'`

Impacto:

- contrato imprevisivel
- ampliacao indevida da superficie de consulta
- maior risco de inconsistencias e bypass de regras esperadas

Prioridade:

- **alta**

### 6. Listagem de demandas ignora o filtro de unidade

No codigo atual, a rota de listagem de demandas executa a query sem aplicar o `accessFilter` ao `WHERE`.

Impacto:

- usuario autenticado pode visualizar demandas fora do escopo esperado
- quebra do modelo de segregacao por unidade

Prioridade:

- **critica**

### 7. Upload de anexo em demanda sem checagem equivalente de acesso

No fluxo de upload de anexo para demanda nao ha a mesma protecao forte que existe para upload de anexo em caso.

Impacto:

- possibilidade de anexar arquivo a demanda fora do escopo correto
- quebra de autorizacao por relacao indireta

Prioridade:

- **alta**

### 8. Detalhe de MSE por ID sem recorte explicito por unidade

O `GET /api/mse/registros/:registro_id` nao evidencia filtro por unidade no SQL.

Impacto:

- possibilidade de leitura cruzada de registro entre unidades autorizadas ao modulo

Prioridade:

- **alta**

### 9. Exposicao publica da pasta `/uploads`

Estado atual:

- `app.use('/uploads', express.static(...))`

Impacto:

- arquivos podem ficar acessiveis fora do fluxo autenticado pensado para anexos
- pode haver bypass de trilha de auditoria/download protegido

Prioridade:

- **alta**

### 10. Resposta de login sendo logada no console do frontend

Estado atual:

- ha `console.log(data)` na funcao de login do frontend

Impacto:

- exposicao desnecessaria de token e dados de usuario em ambiente cliente

Prioridade:

- **media**

### 11. Autorizacao ainda muito dependente de `role` textual

Embora exista estrutura de permissoes, varias decisoes ainda dependem de strings de papel.

Impacto:

- regras mais frageis
- maior chance de divergencia entre o que o frontend esconde e o que o backend realmente permite

Prioridade:

- **media/alta**

---

## Melhorias prioritarias recomendadas

### Prioridade 1 - Seguranca e isolamento de dados

1. Remover fallback de segredo JWT e falhar o boot sem `JWT_SECRET`.
2. Restringir `cors()` por ambiente e origens conhecidas.
3. Revisar estrategia de sessao no frontend.
4. Corrigir imediatamente a listagem de demandas para respeitar unidade.
5. Fechar acesso a uploads publicos e padronizar download autenticado.
6. Aplicar filtro de unidade e soft delete em dashboard, vigilancia e MSE.

### Prioridade 2 - Consolidacao de contratos

1. Concluir migracao para o contrato canonico de `GET /api/casos`.
2. Remover `filtro/valor` como contrato principal.
3. Eliminar chaves legadas em dashboard e vigilancia.
4. Normalizar payloads e respostas para um unico naming.

### Prioridade 3 - Padronizacao backend

1. Repetir em `dashboard`, `vigilancia`, `demandas`, `anexos` e `relatorios` o padrao ja aplicado em `casos`.
2. Reduzir SQL inline em rotas.
3. Concentrar acesso a banco em service/repository.
4. Centralizar aplicacao do `accessFilter`.

### Prioridade 4 - Padronizacao frontend

1. Consolidar chamadas em `api.ts`.
2. Adotar hooks compartilhados de forma uniforme.
3. Tratar erros e estados de loading de forma consistente.
4. Limpar residuos arquiteturais e dependencias nao usadas.

---

## Conclusao executiva

O projeto ja tem um nucleo funcional valioso e utilizavel, especialmente em:

- autenticacao e navegacao protegida
- cadastro e ciclo de vida de casos
- consulta operacional
- dashboard/vigilancia como camada de analise

O principal ponto positivo e que a entidade `casos` ja mostra um caminho arquitetural mais forte, com contrato, filtros, soft delete, middleware de acesso e testes melhores.

O principal risco do projeto hoje nao e falta de funcionalidade, e sim **assimetria**:

- algumas areas evoluiram para um padrao melhor
- outras ainda operam em modo MVP, com SQL manual, contratos legados e controles de seguranca menos consistentes

Se o time priorizar primeiro seguranca e isolamento de dados, e depois consolidar tudo em torno do contrato canonico de `casos`, o sistema tende a ganhar previsibilidade, manutencao mais simples e menor risco de vazamento entre unidades.
