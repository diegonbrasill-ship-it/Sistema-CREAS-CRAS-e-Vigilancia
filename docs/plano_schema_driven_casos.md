# Plano de Implementação: Formulário de Casos Schema-Driven

## Objetivo

Migrar o módulo de casos para um modelo dirigido por schema, em que frontend e backend compartilhem a mesma definição estrutural do formulário, reduzindo código hardcoded e tornando mudanças de campos e opções mais baratas.

## Entregas desta etapa

- rota nova `GET /api/casos/schema`;
- schema declarativo alvo em `backend/src/routes/casos/casos.form-schema.ts`;
- modelagem já adaptada para:
  - violência cumulativa;
  - detalhamento selecionável por tipo de violência;
  - campos com `Outro` passíveis de promoção para opção persistida;
  - abas, campos, option sets, regras de visibilidade, resumo e filtros.

## Situação atual

Hoje o módulo de casos tem bom contrato para listagem e detalhe, mas o formulário depende de múltiplas fontes:

- enums e validações no backend;
- opções e labels hardcoded no frontend;
- schema Zod separado;
- tabs e componentes escritos manualmente;
- resumo do detalhe derivado de convenções locais.

Isso faz com que uma mudança simples em campo ou opção exija alterações em vários pontos.

## Estratégia alvo

## 1. O schema passa a ser a fonte de verdade

O schema deve descrever:

- abas;
- campos;
- tipos de componente;
- obrigatoriedade;
- option sets;
- regras condicionais;
- regras de resumo;
- regras de filtro;
- destino de persistência (`meta` ou `payload`).

## 2. Violência cumulativa

Substituir o modelo atual:

- `tipoViolencia: string`
- `tipoViolenciaDescricoes: string[]`

Pelo modelo alvo:

- `tiposViolencia: string[]`
- `detalhesViolencia: Record<string, string[]>`

Exemplo:

```json
{
  "tiposViolencia": ["FISICA", "PSICOLOGICA"],
  "detalhesViolencia": {
    "FISICA": ["ESPANCAMENTO", "CHUTES"],
    "PSICOLOGICA": ["AMEACA", "HUMILHACAO"]
  }
}
```

Benefícios:

- um caso pode ter mais de um tipo principal;
- cada descrição fica ligada ao tipo correto;
- filtros e analytics ficam mais precisos.

## 3. Promoção de “Outro” para opção padrão

Campos com `allowCustomOption` devem seguir este fluxo:

1. usuário seleciona `Outro`;
2. informa o rótulo desejado;
3. backend normaliza o valor canônico;
4. backend persiste a nova opção em catálogo;
5. o caso passa a salvar o valor novo, não apenas `OUTROS`;
6. o schema seguinte já retorna essa opção junto das padrão.

## Fases recomendadas

## Fase 1. Contrato declarativo

- manter `GET /api/casos/schema` como fonte oficial da modelagem;
- estabilizar a estrutura do schema;
- registrar incompatibilidades temporárias com o contrato legado de create/update.

## Fase 2. Adaptação do backend de mutação

- alterar `normalizeCreateCasoInput` e `normalizeUpdateCasoInput`;
- aceitar `tiposViolencia` e `detalhesViolencia`;
- validar coerência entre tipos selecionados e detalhes por grupo;
- manter compatibilidade temporária com o payload antigo.

## Fase 3. Catálogo persistido de opções

Criar tabela de opções customizadas por campo, por exemplo:

```sql
CREATE TABLE case_field_options (
  id serial primary key,
  field_key text not null,
  value text not null,
  label text not null,
  unit_id integer null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
```

Uso:

- unir opções padrão + customizadas ao montar `/api/casos/schema`;
- permitir escopo por unidade;
- permitir desativar opções sem apagar histórico.

## Fase 4. Frontend schema-driven

- substituir `options.ts` e selects hardcoded por consumo do schema;
- renderizar tabs dinamicamente;
- criar renderer genérico para `text`, `select`, `multiselect` e `grouped-multiselect`;
- usar o mesmo schema no resumo do caso.

## Fase 5. Filtros e analytics

- derivar filtros permitidos a partir do schema;
- expor quais campos são `filterable`;
- adicionar filtros compatíveis com violência cumulativa.

## Compatibilidade temporária

Nesta etapa, a rota `GET /api/casos/schema` já expõe o estado alvo, mas as rotas de create/update ainda não consomem integralmente esse novo shape.

Portanto:

- o schema novo já está pronto como contrato de migração;
- a mutação ainda precisa ser adaptada antes de o frontend passar a enviar o novo payload;
- a migração recomendada é incremental, com compatibilidade de leitura e escrita durante a transição.

## Ordem sugerida

1. estabilizar o schema declarativo;
2. adaptar create/update;
3. criar catálogo de opções customizadas;
4. migrar o frontend de cadastro;
5. migrar o resumo do detalhe;
6. migrar filtros e dashboards.

## Critérios de conclusão

- inclusão de campo novo sem edição manual de múltiplas tabs;
- inclusão de opção nova sem alterar código-fonte;
- `Outro` promovido para opção persistida;
- violência cumulativa salva com detalhamento por tipo;
- cadastro e detalhe consumindo a mesma definição estrutural.
