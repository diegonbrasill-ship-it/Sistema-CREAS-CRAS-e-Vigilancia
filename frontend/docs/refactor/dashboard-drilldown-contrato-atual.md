# Contrato Atual do Backend - Dashboard e Drill-down

## Escopo

Este documento descreve como o backend espera hoje:

- a requisicao de `GET /api/dashboard`
- a requisicao da funcao de drill-down atual em `GET /api/vigilancia/casos-filtrados`

O objetivo aqui e documentar o contrato real implementado no codigo atual, incluindo:

- query params aceitos
- headers obrigatorios
- shape de resposta
- formatos JSON equivalentes
- comportamentos importantes e limitacoes conhecidas

Arquivos-base usados:

- `src/routes/dashboard.ts`
- `src/routes/vigilancia.ts`
- `src/middleware/auth/auth.ts`
- `src/middleware/unitAccess.middleware.ts`

## Regras comuns aos dois endpoints

### Autenticacao

Ambos os endpoints exigem:

```http
Authorization: Bearer <jwt>
```

Sem token valido:

```json
{
  "message": "Token de autenticação não fornecido."
}
```

ou:

```json
{
  "message": "Token inválido ou expirado."
}
```

### Filtro automatico por unidade

Os dois endpoints passam por:

- `authMiddleware`
- `unitAccessMiddleware('casos', 'unit_id')`

Regra de visibilidade atual:

- usuario `gestor` recebe acesso total
- usuarios comuns ficam restritos a sua unidade
- nesses endpoints, a implementacao atual ainda considera tambem registros globais com `unit_id IS NULL`

Em outras palavras:

- gestor ve todos os casos
- usuario comum ve casos da propria unidade e, se existirem, casos globais (`unit_id IS NULL`)

## 1. Dashboard

### Endpoint

```http
GET /api/dashboard
```

### Body

Nao usa body.

### Query params aceitos

O backend le apenas estes query params:

- `mes`
- `tec_ref`
- `bairro`

Qualquer outro query param e ignorado por essa rota.

### Shape conceitual da requisicao

Embora a chamada real seja por query string, o shape logico esperado e:

```json
{
  "mes": "2026-03",
  "tec_ref": "Tecnica Ana",
  "bairro": "Centro"
}
```

Todos os campos sao opcionais.

### Exemplo de URL

```http
GET /api/dashboard?mes=2026-03&tec_ref=Tecnica%20Ana&bairro=Centro
```

### Como cada filtro funciona hoje

#### `mes`

Formato esperado:

```json
{
  "mes": "YYYY-MM"
}
```

Regra SQL atual:

```sql
TO_CHAR(casos.data_cad, 'YYYY-MM') = $N
```

Exemplo:

```http
GET /api/dashboard?mes=2026-03
```

#### `tec_ref`

Formato esperado:

```json
{
  "tec_ref": "Nome do tecnico"
}
```

Regra SQL atual:

```sql
casos.tec_ref ILIKE $N
```

Importante:

- a rota usa `ILIKE`, mas nao adiciona `%` automaticamente
- na pratica, o valor enviado precisa ser exato, a menos que o cliente envie `%` manualmente

Exemplo de match exato:

```http
GET /api/dashboard?tec_ref=Tecnica Ana
```

Exemplo de match parcial manual:

```http
GET /api/dashboard?tec_ref=%25Ana%25
```

#### `bairro`

Formato esperado:

```json
{
  "bairro": "Centro"
}
```

Regra SQL atual:

```sql
LOWER(casos.dados_completos->>'bairro') = LOWER($N)
```

Ou seja:

- comparacao case-insensitive
- comparacao exata

### Shape de resposta

O backend retorna um objeto com duas chaves de topo:

- `dados`
- `opcoesFiltro`

Shape conceitual:

```json
{
  "dados": {
    "indicadores": {
      "totalAtendimentos": 0,
      "novosNoMes": 0,
      "inseridosPAEFI": 0,
      "reincidentes": 0,
      "recebemBolsaFamilia": 0,
      "recebemBPC": 0,
      "violenciaConfirmada": 0,
      "notificadosSINAN": 0,
      "contextoFamiliar": {
        "dependenciaFinanceira": "0",
        "vitimaPCD": "0",
        "membroCarcerario": "0",
        "membroSocioeducacao": "0"
      }
    },
    "principais": {
      "moradiaPrincipal": "N/I",
      "escolaridadePrincipal": "N/I",
      "violenciaPrincipal": "N/I",
      "localPrincipal": "N/I"
    },
    "graficos": {
      "casosPorBairro": [
        { "name": "Centro", "value": 12 }
      ],
      "tiposViolacao": [
        { "name": "FISICA", "value": 8 }
      ],
      "encaminhamentosTop5": [
        { "name": "CREAS", "value": 4 }
      ],
      "casosPorSexo": [
        { "name": "FEMININO", "value": 7 }
      ],
      "canalDenuncia": [
        { "name": "DISQUE_100_180", "value": 5 }
      ],
      "casosPorCor": [
        { "name": "PARDA", "value": 6 }
      ],
      "casosPorFaixaEtaria": [
        { "name": "Adolescente (12-17)", "value": 3 }
      ]
    }
  },
  "opcoesFiltro": {
    "meses": ["2026-03", "2026-02"],
    "tecnicos": ["Tecnica Ana", "Tecnico Bruno"],
    "bairros": ["Centro", "Jatoba"]
  }
}
```

### Shape detalhado da resposta

#### `dados.indicadores`

```json
{
  "totalAtendimentos": 0,
  "novosNoMes": 0,
  "inseridosPAEFI": 0,
  "reincidentes": 0,
  "recebemBolsaFamilia": 0,
  "recebemBPC": 0,
  "violenciaConfirmada": 0,
  "notificadosSINAN": 0,
  "contextoFamiliar": {
    "dependenciaFinanceira": "0",
    "vitimaPCD": "0",
    "membroCarcerario": "0",
    "membroSocioeducacao": "0"
  }
}
```

Importante:

- quase todos os indicadores sao convertidos para `number`
- `contextoFamiliar` hoje e retornado exatamente como vem do PostgreSQL
- isso significa que os campos internos de `contextoFamiliar` hoje tendem a vir como `string`, nao `number`

#### `dados.principais`

```json
{
  "moradiaPrincipal": "CASA",
  "escolaridadePrincipal": "EJA",
  "violenciaPrincipal": "FISICA",
  "localPrincipal": "Centro"
}
```

Fallback atual quando nao existe valor:

```json
{
  "moradiaPrincipal": "N/I",
  "escolaridadePrincipal": "N/I",
  "violenciaPrincipal": "N/I",
  "localPrincipal": "N/I"
}
```

#### `dados.graficos`

Cada grafico segue o shape:

```json
[
  {
    "name": "Algum rotulo",
    "value": 10
  }
]
```

Campos retornados:

- `casosPorBairro`
- `tiposViolacao`
- `encaminhamentosTop5`
- `casosPorSexo`
- `canalDenuncia`
- `casosPorCor`
- `casosPorFaixaEtaria`

#### `opcoesFiltro`

```json
{
  "meses": ["2026-03", "2026-02"],
  "tecnicos": ["Tecnica Ana", "Tecnico Bruno"],
  "bairros": ["Centro", "Jatoba"]
}
```

### Exemplo completo de resposta

```json
{
  "dados": {
    "indicadores": {
      "totalAtendimentos": 32,
      "novosNoMes": 7,
      "inseridosPAEFI": 11,
      "reincidentes": 5,
      "recebemBolsaFamilia": 14,
      "recebemBPC": 3,
      "violenciaConfirmada": 9,
      "notificadosSINAN": 2,
      "contextoFamiliar": {
        "dependenciaFinanceira": "4",
        "vitimaPCD": "3",
        "membroCarcerario": "1",
        "membroSocioeducacao": "2"
      }
    },
    "principais": {
      "moradiaPrincipal": "CASA",
      "escolaridadePrincipal": "EJA",
      "violenciaPrincipal": "FISICA",
      "localPrincipal": "Centro"
    },
    "graficos": {
      "casosPorBairro": [
        { "name": "Centro", "value": 10 },
        { "name": "Jatoba", "value": 8 }
      ],
      "tiposViolacao": [
        { "name": "FISICA", "value": 12 },
        { "name": "PSICOLOGICA", "value": 9 }
      ],
      "encaminhamentosTop5": [
        { "name": "CREAS", "value": 4 }
      ],
      "casosPorSexo": [
        { "name": "FEMININO", "value": 20 },
        { "name": "MASCULINO", "value": 12 }
      ],
      "canalDenuncia": [
        { "name": "DISQUE_100_180", "value": 7 }
      ],
      "casosPorCor": [
        { "name": "PARDA", "value": 15 }
      ],
      "casosPorFaixaEtaria": [
        { "name": "Adolescente (12-17)", "value": 6 }
      ]
    }
  },
  "opcoesFiltro": {
    "meses": ["2026-03", "2026-02", "2026-01"],
    "tecnicos": ["Tecnica Ana", "Tecnico Bruno"],
    "bairros": ["Centro", "Jatoba", "Mutirao"]
  }
}
```

### Erro

Em erro interno:

```json
{
  "message": "Erro ao buscar dados do dashboard."
}
```

### Observacoes importantes sobre o estado atual do dashboard

#### 1. A rota nao usa `deleted_at IS NULL`

No estado atual do codigo:

- a rota do dashboard nao exclui explicitamente casos deletados via soft delete

#### 2. Parte das agregacoes ainda consulta chaves legadas

A resposta do dashboard ainda depende de algumas chaves antigas em `dados_completos`, por exemplo:

- `notificacaoSINAM`
- `tipo_violencia`
- `corEtnia`
- `tipoMoradia`
- `localOcorrencia`

Ou seja:

- o shape de resposta e estavel
- mas algumas contagens e rankings ainda dependem de chaves historicas, nao apenas do contrato canonico mais novo

## 2. Drill-down atual

### Endpoint

```http
GET /api/vigilancia/casos-filtrados
```

### Objetivo

Esse endpoint lista casos detalhados para abrir modal de drill-down da vigilância.

### Body

Nao usa body.

### Query params aceitos

O backend le:

- `filtro`
- `valor`

Cada um pode vir:

- como string unica
- como array, repetindo o mesmo query param varias vezes

### Shape conceitual da requisicao

Forma simples:

```json
{
  "filtro": "por_bairro",
  "valor": "Centro"
}
```

Forma multipla:

```json
{
  "filtro": ["por_bairro", "status"],
  "valor": ["Centro", "Ativo"]
}
```

### Regra de pareamento

Quando ha arrays:

- `filtro[0]` usa `valor[0]`
- `filtro[1]` usa `valor[1]`
- e assim por diante

Se um item vier sem valor correspondente:

- ele e ignorado

### Exemplos de URL

Filtro simples:

```http
GET /api/vigilancia/casos-filtrados?filtro=por_bairro&valor=Centro
```

Filtro composto:

```http
GET /api/vigilancia/casos-filtrados?filtro=por_bairro&valor=Centro&filtro=status&valor=Ativo
```

### Filtros especiais reconhecidos hoje

#### `status`

Shape logico:

```json
{
  "filtro": "status",
  "valor": "Ativo"
}
```

Regra SQL:

```sql
status = $N::VARCHAR
```

#### `reincidentes`

Shape logico:

```json
{
  "filtro": "reincidentes",
  "valor": "Sim"
}
```

Regra SQL atual:

- se `valor === "Sim"`, aplica `dados_completos->>'reincidente' = 'Sim'`
- para qualquer outro valor, nao adiciona clausula alguma

Importante:

- `Não` nao vira filtro negativo
- so `Sim` gera filtro de fato

#### `por_bairro`

Shape logico:

```json
{
  "filtro": "por_bairro",
  "valor": "Centro"
}
```

Regra SQL atual:

```sql
dados_completos->>'bairro' = $N::TEXT
```

#### `por_canal`

Shape logico:

```json
{
  "filtro": "por_canal",
  "valor": "DISQUE_100_180"
}
```

Regra SQL atual implementada:

```sql
dados_completos->>'canal' = $N::TEXT
```

Observacao critica:

- o endpoint atual nao consulta `canalDenuncia`
- ele consulta a chave `canal`
- isso e um comportamento legado e inconsistente com o contrato canonico de `casos`

#### `por_violencia`

Shape logico:

```json
{
  "filtro": "por_violencia",
  "valor": "FISICA"
}
```

Regra SQL atual implementada:

```sql
dados_completos->>'violencia' = $N::TEXT
```

Observacao critica:

- o endpoint atual nao consulta `tipoViolencia`
- ele consulta a chave `violencia`
- isso tambem e um comportamento legado/inconsistente

#### `dataCad` ou `ultimos_30_dias`

Shape logico:

```json
{
  "filtro": "dataCad",
  "valor": "ultimos_30_dias"
}
```

ou:

```json
{
  "filtro": "ultimos_30_dias",
  "valor": "ultimos_30_dias"
}
```

Regra SQL atual:

```sql
data_cad >= CURRENT_DATE - INTERVAL '30 days'
```

### Filtro generico fallback

Qualquer filtro nao tratado pelos casos especiais cai na regra:

```sql
dados_completos->>'<filtro>' = $N::TEXT
```

Exemplo:

```json
{
  "filtro": "sexo",
  "valor": "FEMININO"
}
```

vira:

```sql
dados_completos->>'sexo' = $N::TEXT
```

### Shape de resposta

A resposta e sempre uma lista.

Cada item segue o shape:

```json
{
  "id": 152,
  "data_cad": "2026-03-22T00:00:00.000Z",
  "tec_ref": "admin",
  "nome": "Nome para teste",
  "status": "Ativo",
  "unit_id": 1,
  "bairro": "Centro"
}
```

Shape completo da lista:

```json
[
  {
    "id": 152,
    "data_cad": "2026-03-22T00:00:00.000Z",
    "tec_ref": "admin",
    "nome": "Nome para teste",
    "status": "Ativo",
    "unit_id": 1,
    "bairro": "Centro"
  }
]
```

Campos retornados:

- `id`
- `data_cad`
- `tec_ref`
- `nome`
- `status`
- `unit_id`
- `bairro`

### Exemplo de resposta

```json
[
  {
    "id": 201,
    "data_cad": "2026-03-10T00:00:00.000Z",
    "tec_ref": "Tecnica Ana",
    "nome": "Maria",
    "status": "Ativo",
    "unit_id": 2,
    "bairro": "Centro"
  },
  {
    "id": 198,
    "data_cad": "2026-03-02T00:00:00.000Z",
    "tec_ref": "Tecnica Ana",
    "nome": "Josefa",
    "status": "Arquivado",
    "unit_id": 2,
    "bairro": "Centro"
  }
]
```

### Ordenacao

O endpoint sempre responde com:

```sql
ORDER BY data_cad DESC
```

### Erro

Em erro interno:

```json
{
  "message": "Erro ao buscar lista detalhada."
}
```

### Observacoes importantes sobre o estado atual do drill-down

#### 1. A rota nao usa whitelist de filtros

Qualquer chave nao tratada especialmente vira acesso generico a:

```sql
dados_completos->>'<filtro>'
```

#### 2. A rota nao exclui `deleted_at`

No estado atual:

- casos soft deleted nao sao filtrados explicitamente

#### 3. A rota nao usa o contrato canonico de `GET /api/casos`

Hoje ela ainda usa o esquema legado:

```json
{
  "filtro": "...",
  "valor": "..."
}
```

Enquanto o contrato canonico de `casos` ja usa:

```json
{
  "search": "texto",
  "searchBy": "q",
  "status": "Ativo",
  "mes": "2026-03",
  "filters": {
    "bairro": "Centro"
  }
}
```

#### 4. A rota ainda implementa o filtro de unidade localmente

Ou seja:

- ela nao reaproveita `parseCasoListQuery()`
- ela nao reaproveita `CasosService.list()`
- por isso o comportamento de drill-down atual ainda diverge do contrato principal da entidade

## 3. Recomendacao pratica para quem vai integrar

### Se voce precisa consumir o backend exatamente como esta hoje

Use:

- `GET /api/dashboard` para os agregados e opcoes de filtro
- `GET /api/vigilancia/casos-filtrados` para o modal legado de drill-down

### Se voce esta implementando frontend novo ou refatorando

A recomendacao arquitetural do projeto e migrar o drill-down para:

```http
GET /api/casos
```

Porque essa rota:

- ja tem parser de filtros
- ja tem whitelist
- ja aplica melhor o contrato da entidade
- ja foi alvo da padronizacao mais recente

Documentos relacionados:

- `docs/casos/frontend-migracao-drilldown-vigilancia.md`
- `docs/casos/plano-dashboard-vigilancia.md`
- `docs/casos/arquitetura_caso.md`
