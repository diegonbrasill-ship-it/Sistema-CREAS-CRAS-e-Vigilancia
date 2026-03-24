# Plano de Abandono do Legado no Backend

## Objetivo

Executar uma migracao rapida do backend para um contrato canonico unico, sem manter compatibilidade transitoria com campos, filtros e endpoints legados.

Premissa adotada neste plano:

- nao havera dual-writing
- nao havera camada de normalizacao para aceitar payload legado
- quebras temporarias sao esperadas e aceitas como parte da migracao

## Resultado Esperado

Ao final da migracao:

- o backend aceita apenas o contrato canonico
- dashboards e drilldown usam apenas chaves canonicas
- o endpoint legado de drilldown e removido
- aliases e nomes antigos deixam de existir no contrato publico

## Escopo do Abandono

Campos e nomes legados que devem sair do backend:

- `tipo_violencia`
- `corEtnia`
- `violencia`
- `canal`
- `notificacaoSINAM`
- `tecRef`
- `dataCad`

Contrato canonico alvo:

- `tipoViolencia`
- `racaCor`
- `canalDenuncia`
- `notificacaoSINAN`
- `tec_ref`
- `data_cad`

Tambem entra no escopo a remocao de:

- `GET /api/vigilancia/casos-filtrados`

## Principio da Migracao

O backend deve parar de tolerar nomes antigos. Se o cliente mandar payload legado ou tentar usar endpoint legado, a resposta deve falhar de forma clara.

Essa estrategia simplifica a migracao porque evita:

- regras paralelas de leitura
- comportamento ambiguo
- dashboards agregando em uma chave e drilldown filtrando em outra

## Etapa 1. Fechar o Contrato Canonico

Definir formalmente o contrato final da entidade `caso` e dos endpoints que dependem dela.

Isso inclui:

- nomes definitivos dos campos
- enums canonicos
- shape de create/update
- shape de listagem
- shape dos filtros de `GET /api/casos`
- shape dos agregados de `GET /api/dashboard`

Os campos canonicos devem ser a unica referencia valida na documentacao e no codigo.

## Etapa 2. Migrar os Dados Historicos

Rodar migracao direta no banco para atualizar os registros antigos.

Essa migracao deve:

- copiar ou renomear os valores antigos para as chaves canonicas
- eliminar dependencia de `tipo_violencia`
- eliminar dependencia de `corEtnia`
- eliminar dependencia de `violencia`
- eliminar dependencia de `canal`
- eliminar dependencia de `notificacaoSINAM`

Ao final dessa etapa, os registros historicos relevantes para dashboard, consulta e drilldown precisam existir nas chaves canonicas.

## Etapa 3. Remover Leitura de Legado nas Queries

As queries do backend devem passar a consultar apenas os nomes canonicos.

Isso vale para:

- `GET /api/dashboard`
- `GET /api/casos`
- consultas auxiliares
- agregacoes de relatorios

Em especial:

- grafico de tipo de violencia deve agregar apenas por `tipoViolencia`
- grafico de cor/etnia deve agregar apenas por `racaCor`
- filtros de listagem devem usar apenas `filters[tipoViolencia]` e `filters[racaCor]`

Nao deve haver:

- `coalesce` entre legado e canonico
- fallback para chave antiga
- alias silencioso

## Etapa 4. Remover Endpoint Legado de Drilldown

Remover `GET /api/vigilancia/casos-filtrados`.

O unico contrato de listagem e drilldown deve ser:

```http
GET /api/casos
```

Com isso:

- dashboard usa o mesmo contrato da entidade
- vigilancia usa o mesmo contrato da entidade
- filtros passam por uma whitelist unica
- desaparece a divergencia entre `filtro/valor` e `filters[...]`

## Etapa 5. Endurecer Create e Update

As rotas de create/update devem aceitar somente o contrato novo.

Se o payload vier com campo legado, a API deve responder com erro de validacao.

Exemplos de payload que devem falhar:

- payload com `tipo_violencia`
- payload com `corEtnia`
- payload com `notificacaoSINAM`

Exemplos de payload aceito:

- payload com `tipoViolencia`
- payload com `racaCor`
- payload com `notificacaoSINAN`

## Etapa 6. Padronizar Filtros e Parametros

O backend deve aceitar apenas uma forma de filtro por campo.

Padrao recomendado:

- `tec_ref`
- `data_cad`
- `mes`
- `search`
- `searchBy`
- `filters[tipoViolencia]`
- `filters[racaCor]`
- `filters[canalDenuncia]`

O backend nao deve mais aceitar:

- `tecRef`
- `dataCad`
- `filtro=por_violencia`
- `filtro=por_canal`
- filtros genericos sem whitelist

## Etapa 7. Corrigir Inconsistencias Estruturais

Durante a migracao, o backend tambem deve corrigir inconsistencias de comportamento que hoje mascaram erro de contrato.

Minimo necessario:

- aplicar `deleted_at IS NULL` nas listagens e agregacoes
- remover filtros sem whitelist em `GET /api/casos`
- definir semantica clara para busca de tecnico
- definir semantica clara para filtros booleanos e `Sim/Não`

Sem isso, o abandono do legado troca um problema de nomenclatura por um problema de comportamento.

## Etapa 8. Atualizar Documentacao Publica

Depois da mudanca:

- atualizar a documentacao dos endpoints
- remover exemplos com campos antigos
- remover exemplos com endpoint legado
- registrar explicitamente que o backend usa apenas o contrato canonico

## Etapa 9. Cobrir com Testes

Testes minimos necessarios:

- create com payload canonico
- update com payload canonico
- erro 400 para payload legado
- listagem por `filters[tipoViolencia]`
- listagem por `filters[racaCor]`
- dashboard agregando por `tipoViolencia`
- dashboard agregando por `racaCor`
- erro para uso do endpoint legado, se ele for removido

## Ordem Recomendada de Execucao

1. fechar o contrato canonico
2. migrar os dados historicos
3. atualizar queries de dashboard e listagem
4. remover endpoint legado de drilldown
5. endurecer create/update para aceitar so canonicos
6. atualizar frontend
7. atualizar documentacao e testes

## Riscos Aceitos

Riscos assumidos por esta estrategia:

- clientes antigos vao quebrar
- payload antigo vai falhar imediatamente
- dados historicos nao migrados podem sumir de grafico e filtro
- telas podem parar parcialmente ate o frontend ser ajustado

Esses riscos sao intencionais nesta abordagem e fazem parte da escolha por uma migracao rapida.

## Criterio de Conclusao

O abandono do legado so esta concluido quando:

- o banco usa apenas chaves canonicas nos dados relevantes
- dashboard nao consulta mais nenhuma chave antiga
- `GET /api/casos` e o unico contrato de listagem e drilldown
- payload legado falha explicitamente
- a documentacao publica nao menciona mais os nomes antigos
