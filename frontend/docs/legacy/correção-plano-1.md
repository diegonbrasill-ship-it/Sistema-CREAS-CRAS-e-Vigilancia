# 🔧 PLANO DE CORREÇÃO 1 — Erro crítico na página CasoDetalhe

> **Gerado em:** 20 de Fevereiro de 2026  
> **Baseado em:** Verificação do `docs/plano-de-ação-1.md` + erro reportado em runtime  
> **Escopo:** Corrigir o crash `Objects are not valid as a React child` na página `/caso/:id`  
> **Critério de solução:** Menor mudança possível com maior impacto corretivo.

---

## 📋 CONTEXTO

### Plano de Ação 1 — Status de Execução

O `docs/plano-de-ação-1.md` foi **100% executado** conforme verificado em `docs/VERIFICAÇÃO-PLANO-1.md`. Todas as 6 tarefas foram concluídas:

| Tarefa | Descrição                                                    | Status       |
| ------ | ------------------------------------------------------------ | ------------ |
| 1.1    | Remover import `zod` não usado                               | ✅ Concluído |
| 1.2    | Remover `RouteProtegida` legado                              | ✅ Concluído |
| 1.3    | Corrigir permissão da rota `/caso/:id` para `["casos.read"]` | ✅ Concluído |
| 2.1    | Corrigir permissões mínimas de todas as rotas                | ✅ Concluído |
| 2.2    | Adicionar permissões granulares ao `usePermissoesSUAS`       | ✅ Concluído |
| 2.3    | Refatorar verificação de permissão em `CasoDetalhe.tsx`      | ✅ Concluído |

**Resultado:** As permissões estão corretas. O usuário agora consegue **acessar a rota** `/caso/:id` com apenas `casos.read`. Porém, **ao acessar a página, ocorre um crash de renderização**.

---

### Erro Reportado

```
Uncaught Error: Objects are not valid as a React child
(found: object with keys {id, data_cad, tec_ref, nome, status, dados_completos, user_id, unit_id, created_at, updated_at, deleted_at})
```

**Stack trace aponta para:**

- `CardContent` (`card.tsx:63`) → `CasoDetalhe` (`CasoDetalhe.tsx:67`)

**Observação importante:** As keys do objeto no erro são **snake_case** (`data_cad`, `tec_ref`, `dados_completos`, `user_id`, `unit_id`, `created_at`, `updated_at`, `deleted_at`), confirmando que a API retorna o registro bruto do banco de dados (PostgreSQL).

---

## 🔍 DIAGNÓSTICO — Causa Raiz

### Problema Principal: `Object.entries(caso)` renderiza valores que são objetos

**Arquivo:** `src/pages/CasoDetalhe.tsx`  
**Trecho crítico (linhas ~302-305):**

```tsx
<div className="grid md:grid-cols-3 lg:grid-cols-4 gap-x-6">
  {Object.entries(caso).map(([key, value]) => (
    <DataItem key={key} label={key} value={value} />
  ))}
</div>
```

**O que acontece:**

1. A API `GET /api/casos/:id` retorna o registro bruto do banco com campos **snake_case**
2. O campo `dados_completos` é um **JSONB do PostgreSQL** — um **objeto aninhado** com dezenas de sub-campos (cpf, bairro, composicaoFamiliar, etc.)
3. `Object.entries(caso)` itera sobre TODAS as propriedades, incluindo `dados_completos`
4. O componente `DataItem` recebe `value = dados_completos` (um objeto complexo)
5. Mesmo com `{String(value)}`, o campo `dados_completos` pode conter sub-objetos ou arrays de objetos que causam o erro no React reconciler

### Problema Secundário: Filtro do `DataItem` usa camelCase mas API retorna snake_case

**Trecho do DataItem (linhas ~43-44):**

```tsx
function DataItem({ label, value }: { label: string; value: any }) {
    if (value === null || value === undefined || value === ""
        || label === 'status'
        || label === 'demandasVinculadas'  // ← camelCase
        || label === 'unit_id') return null;
```

**Problemas:**

- O filtro verifica `label === 'demandasVinculadas'` (camelCase), mas a API pode retornar `demandas_vinculadas` (snake_case) — o filtro **não captura**
- O filtro **não exclui** `dados_completos` (objeto JSONB aninhado)
- O filtro **não exclui** campos técnicos como `created_at`, `updated_at`, `deleted_at`, `user_id`, `id`
- O filtro **não exclui** valores do tipo `object` ou `array`

### Problema Terciário: Interface `CasoDetalhado` usa camelCase mas a API retorna snake_case

**Trecho da interface (api.ts):**

```typescript
export interface CasoDetalhado {
  id: number;
  nome: string;
  dataCad: string;
  tecRef: string;
  status: string;
  [key: string]: any;
  demandasVinculadas: DemandaResumida[];
}
```

A interface espera `dataCad` e `tecRef`, mas a API retorna `data_cad` e `tec_ref`. O `[key: string]: any` aceita qualquer coisa sem validação. Isso faz com que `caso.tecRef` seja `undefined` enquanto `caso.tec_ref` contém o valor real.

---

## 📋 TAREFAS DE CORREÇÃO

Execute as tarefas **nesta ordem exata**.

---

### Tarefa C1 — Proteger o `DataItem` contra valores não-primitivos

**Arquivo:** `src/pages/CasoDetalhe.tsx`

**Problema:**  
O componente `DataItem` não verifica se `value` é um objeto ou array antes de tentar renderizar. Quando `Object.entries(caso)` inclui `dados_completos` (um JSONB aninhado), o React recebe um objeto como child e lança o erro fatal.

**Causa exata no código (linhas ~43-52):**

```tsx
function DataItem({ label, value }: { label: string; value: any }) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    label === "status" ||
    label === "demandasVinculadas" ||
    label === "unit_id"
  )
    return null;
  return (
    <div className="py-2">
      <p className="text-sm font-medium text-slate-500 capitalize">
        {label.replace(/([A-Z])/g, " $1")}
      </p>
      <p className="text-base text-slate-900 break-words">{String(value)}</p>
    </div>
  );
}
```

**Solução:**  
Adicionar verificação completa de tipos e lista de labels a ignorar (tanto camelCase quanto snake_case):

```tsx
// Labels técnicos/internos que não devem ser exibidos ao usuário
const LABELS_OCULTOS = new Set([
  "id",
  "status",
  "unit_id",
  "user_id",
  "created_at",
  "updated_at",
  "deleted_at",
  "dados_completos",
  "demandasVinculadas",
  "demandas_vinculadas",
]);

function DataItem({ label, value }: { label: string; value: any }) {
  // Ignorar campos nulos, vazios, técnicos ou de tipo complexo
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    LABELS_OCULTOS.has(label) ||
    typeof value === "object" // Objetos e arrays (Array.isArray é subset de typeof object)
  ) {
    return null;
  }

  // Formatar label: snake_case → espaços, camelCase → espaços
  const labelFormatado = label
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .trim();

  return (
    <div className="py-2">
      <p className="text-sm font-medium text-slate-500 capitalize">
        {labelFormatado}
      </p>
      <p className="text-base text-slate-900 break-words">{String(value)}</p>
    </div>
  );
}
```

**Validação:**

- Campos como `dados_completos`, `demandasVinculadas`, `created_at`, etc. são ignorados
- Valores que são objetos ou arrays são automaticamente ignorados (proteção genérica)
- Campos com snake_case são formatados corretamente (`data_cad` → "Data cad")
- O componente não lança mais o erro `Objects are not valid as a React child`

---

### Tarefa C2 — Exibir os campos de `dados_completos` de forma legível

**Arquivo:** `src/pages/CasoDetalhe.tsx`

**Problema:**  
Após a Tarefa C1, o `DataItem` ignora `dados_completos` (por ser um objeto). Mas `dados_completos` contém os campos mais importantes do prontuário: CPF, bairro, tipo de violência, escolaridade, etc. Estes dados devem ser exibidos.

**Causa exata:**  
O `Object.entries(caso)` itera apenas as propriedades de nível superior. Os campos dentro de `dados_completos` (que são os campos reais do prontuário) ficam escondidos dentro do objeto aninhado.

**Solução:**  
Modificar a seção de "Informações Cadastrais" para iterar tanto os campos de nível superior quanto os campos dentro de `dados_completos`, achatando-os em uma única lista:

```tsx
// Dentro do CardContent de "Informações Cadastrais":
<div className="grid md:grid-cols-3 lg:grid-cols-4 gap-x-6">
  {Object.entries({
    ...caso,
    ...(typeof caso.dados_completos === "object" &&
    caso.dados_completos !== null
      ? caso.dados_completos
      : {}),
  }).map(([key, value]) => (
    <DataItem key={key} label={key} value={value} />
  ))}
</div>
```

Isso faz o spread de `dados_completos` para o nível superior, e o `DataItem` (já corrigido na C1) ignora automaticamente os campos técnicos e objetos aninhados dentro de `dados_completos`.

**Validação:**

- Os campos do prontuário (CPF, bairro, violência, etc.) aparecem na tela
- Campos técnicos e objetos aninhados continuam sendo filtrados pelo `DataItem`
- Nenhum crash de renderização

---

### Tarefa C3 — Corrigir referências snake_case vs camelCase no componente

**Arquivo:** `src/pages/CasoDetalhe.tsx`

**Problema:**  
O componente assume camelCase em vários locais (`caso.tecRef`, `caso.dataCad`, `caso.demandasVinculadas`), mas a API retorna snake_case (`tec_ref`, `data_cad`, `demandas_vinculadas`). Isso causa:

- `caso.tecRef` → `undefined` (não encontra a propriedade)
- `caso.dataCad` → `undefined`
- `caso.demandasVinculadas` → pode ser `undefined` se a API retorna `demandas_vinculadas`

**Locais afetados no código:**

1. **Linha ~298 (formatação de data):**

   ```tsx
   const dataCadastroFormatada = new Date(caso.dataCad).toLocaleDateString(...)
   ```

   Se a API retorna `data_cad`, `caso.dataCad` é `undefined` → `new Date(undefined)` → "Invalid Date"

2. **Linha ~306 (exibição do técnico):**

   ```tsx
   <CardDescription>... por {caso.tecRef}</CardDescription>
   ```

   Se a API retorna `tec_ref`, `caso.tecRef` é `undefined` → renderiza vazio

3. **Linha ~312 (demandas vinculadas):**
   ```tsx
   {caso.demandasVinculadas && caso.demandasVinculadas.length > 0 && (...)}
   ```
   Se a API retorna `demandas_vinculadas`, `caso.demandasVinculadas` é `undefined` → seção nunca renderiza

**Solução:**  
Usar fallback duplo (`caso.dataCad || caso.data_cad`) para suportar ambas as formas:

```tsx
// Linha ~298: Data de cadastro
const dataCadastroFormatada = new Date(
  caso.dataCad || caso.data_cad
).toLocaleDateString("pt-BR", { timeZone: "UTC" });

// Linha ~306: Técnico de referência
<CardDescription>
  Prontuário de Atendimento | Cadastrado em: {dataCadastroFormatada} por{" "}
  {caso.tecRef || caso.tec_ref || "N/A"}
</CardDescription>;

// Linha ~312: Demandas vinculadas
const demandasVinculadas =
  caso.demandasVinculadas || caso.demandas_vinculadas || [];
// Usar `demandasVinculadas` na renderização condicional
```

**Validação:**

- A data de cadastro é exibida corretamente independente do formato da API
- O nome do técnico é exibido corretamente
- As demandas vinculadas são exibidas quando existem, independente do formato do campo

---

### Tarefa C4 — Proteger renderização de demandas vinculadas contra objetos inesperados

**Arquivo:** `src/pages/CasoDetalhe.tsx`

**Problema:**  
Se a API retornar `demandasVinculadas` como um array de objetos do tipo caso (em vez de `DemandaResumida`), o acesso a `demanda.tipo_documento` e `demanda.instituicao_origem` será `undefined`. Embora isso não cause crash, produz UI confusa com campos vazios.

Além disso, o trecho de renderização das demandas (linhas ~313-326) não possui proteção contra dados malformados.

**Solução:**  
Adicionar verificação defensiva ao renderizar cada demanda:

```tsx
{demandasVinculadas.length > 0 && (
    <Card>
        ...
        {demandasVinculadas.map((demanda: any) => (
            <div key={demanda.id} ...>
                <div>
                    <p className="font-semibold text-slate-800">
                        {demanda.tipo_documento || demanda.tipo || "Documento"} - {demanda.instituicao_origem || "Origem não informada"}
                    </p>
                    <p className="text-xs text-slate-500">
                        Recebido em: {demanda.data_recebimento
                            ? new Date(demanda.data_recebimento).toLocaleDateString("pt-BR", { timeZone: 'UTC' })
                            : "Data não informada"
                        } | Status: {demanda.status || "N/A"}
                    </p>
                </div>
                ...
            </div>
        ))}
    </Card>
)}
```

**Validação:**

- A seção de demandas não quebra com dados malformados
- Campos ausentes exibem fallbacks legíveis

---

## RESUMO DE EXECUÇÃO

Execute as tarefas **nesta ordem exata**:

```
1. Tarefa C1 → CasoDetalhe.tsx — Proteger DataItem contra objetos/arrays e labels técnicos
2. Tarefa C2 → CasoDetalhe.tsx — Achatar dados_completos para exibir campos do prontuário
3. Tarefa C3 → CasoDetalhe.tsx — Corrigir referências snake_case vs camelCase com fallbacks
4. Tarefa C4 → CasoDetalhe.tsx — Proteger renderização de demandas vinculadas
```

Todas as tarefas são no **mesmo arquivo** (`src/pages/CasoDetalhe.tsx`) e podem ser feitas em sequência.

---

## Arquivo modificado

| Arquivo                     | Tarefas        | Tipo de mudança                                                |
| --------------------------- | -------------- | -------------------------------------------------------------- |
| `src/pages/CasoDetalhe.tsx` | C1, C2, C3, C4 | Correção de renderização + proteção contra dados brutos da API |

**Nenhum arquivo novo** precisa ser criado.  
**Nenhuma dependência** nova precisa ser instalada.  
**Nenhuma alteração no backend** é necessária (o frontend deve ser resiliente ao formato da API).

---

## ANÁLISE DE IMPACTO

### Por que o Plano de Ação 1 não detectou este bug?

O Plano de Ação 1 focou em:

1. **Permissões de rota** — corrigiu o acesso à rota `/caso/:id`
2. **Permissões internas** — corrigiu a lógica de `isOperacional` e `canDelete`

O bug atual é um **problema de renderização** causado pela incompatibilidade entre o formato dos dados da API (snake_case, JSONB aninhado) e a forma como o componente `CasoDetalhe` renderiza esses dados (iteração genérica via `Object.entries`). Este bug existia **antes** do Plano de Ação 1 mas só ficou visível quando as permissões foram corrigidas (antes, os usuários eram bloqueados na rota e nunca chegavam a ver a página).

### Risco das correções

- **Baixo:** As alterações são defensivas (adicionar filtros, fallbacks). Nenhum comportamento existente é removido.
- **Compatibilidade:** As correções funcionam com API retornando camelCase OU snake_case.
- **Reversibilidade:** Se a API mudar no futuro, os fallbacks simplesmente usarão a propriedade que existir.

---

## RECOMENDAÇÕES FUTURAS (Fora do escopo deste plano)

1. **Normalizar a resposta da API:** Criar uma função de normalização em `apiNormalizer.ts` que converta snake_case → camelCase automaticamente ao receber dados da API. Isso eliminaria a necessidade de fallbacks duplos.

2. **Tipar `dados_completos` explicitamente:** Em vez de `[key: string]: any` na interface `CasoDetalhado`, criar uma interface `DadosCompletos` com todos os campos JSONB tipados.

3. **Renderizar campos do prontuário de forma estruturada:** Em vez de `Object.entries()`, criar uma lista fixa de campos a exibir com labels amigáveis em português:

   ```tsx
   const CAMPOS_PRONTUARIO = [
     { key: "cpf", label: "CPF" },
     { key: "bairro", label: "Bairro" },
     { key: "tipo_violencia", label: "Tipo de Violência" },
     // ...
   ];
   ```

   Isso daria controle total sobre a ordem, formatação e visibilidade dos campos.

4. **Adicionar Error Boundary:** Conforme sugerido pelo próprio React no console, adicionar um Error Boundary ao redor de `CasoDetalhe` para capturar erros de renderização sem derrubar toda a aplicação.
