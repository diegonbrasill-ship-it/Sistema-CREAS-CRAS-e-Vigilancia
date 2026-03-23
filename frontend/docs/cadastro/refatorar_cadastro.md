## 1. Leitura do contexto atual
Como `docs/arquitetura.md` não existe no workspace, usei [docs/arquitetura_front.md](c:/Users/Ricardo/Desktop/projects/Sistema-CREAS-CRAS-e-Vigilancia/frontend/docs/arquitetura_front.md) como referência principal, junto com [docs/formulario-cadastro.md](c:/Users/Ricardo/Desktop/projects/Sistema-CREAS-CRAS-e-Vigilancia/frontend/docs/formulario-cadastro.md), [Cadastro.tsx#L35](c:/Users/Ricardo/Desktop/projects/Sistema-CREAS-CRAS-e-Vigilancia/frontend/src/pages/Cadastro.tsx#L35), [api.ts#L121](c:/Users/Ricardo/Desktop/projects/Sistema-CREAS-CRAS-e-Vigilancia/frontend/src/services/api.ts#L121), [PainelVigilancia.tsx#L51](c:/Users/Ricardo/Desktop/projects/Sistema-CREAS-CRAS-e-Vigilancia/frontend/src/pages/PainelVigilancia/PainelVigilancia.tsx#L51), [Consulta.tsx#L135](c:/Users/Ricardo/Desktop/projects/Sistema-CREAS-CRAS-e-Vigilancia/frontend/src/pages/Consulta.tsx#L135) e [MapaCalor.tsx#L12](c:/Users/Ricardo/Desktop/projects/Sistema-CREAS-CRAS-e-Vigilancia/frontend/src/components/vigilancia/MapaCalor.tsx#L12).

- Arquitetura relevante: frontend React 18 + React Hook Form + Zod + Radix/shadcn + Tailwind; chamadas HTTP concentradas em `src/services/api.ts`; autenticação em `AuthContext`; casos usam `JSONB` (`dados_completos`) no backend, conforme a documentação.
- Formulário de cadastro/prontuário: `Cadastro.tsx` é monolítico, com schema, regras, carga, submit e UI no mesmo arquivo; usa fluxo criação `POST /api/casos` e edição `PUT /api/casos/:id`; `src/pages/Cadastro/schema.ts` existe, mas está vazio.
- Padrões de UI: o padrão consolidado é `Tabs + Card + Input + Select + Button` com mensagens inline em vermelho e `toast`; não há componente reutilizável de `chips`, `radio-group` ou `toggle-group` em `src/components/ui`.
- Padrões de validação: o projeto já usa `z.preprocess`, `z.enum`, `refine` e `Controller`; CPF/NIS já têm máscara e validação; condicionais hoje só controlam exibição, não reset nem regra forte de dependência.
- Rotas/backend relacionados: as rotas de casos já estão protegidas por permissão granular em [App.tsx#L39](c:/Users/Ricardo/Desktop/projects/Sistema-CREAS-CRAS-e-Vigilancia/frontend/src/App.tsx#L39); `createCase`, `updateCase` e `getCasoById` continuam tipados com `any`, e `CasoDetalhado` ainda é frouxo.
- Possíveis limitações atuais: há drift de contrato entre `snake_case` e `camelCase`; o detalhe do caso ainda depende de `dados_completos` cru; `Cadastro` não normaliza leitura/escrita de forma consistente; dashboards e vigilância já dependem de nomes literais de campo para filtros e relatórios.

## 2. Diagnóstico dos problemas
- O ponto mais crítico é o contrato inconsistente: `Cadastro` grava `tipo_violencia`, enquanto a vigilância já consulta `tipoViolencia` em [PainelVigilancia.tsx#L57](c:/Users/Ricardo/Desktop/projects/Sistema-CREAS-CRAS-e-Vigilancia/frontend/src/pages/PainelVigilancia/PainelVigilancia.tsx#L57); `GET /api/casos/:id` aparenta retornar o registro cru com `dados_completos`, mas o formulário de edição faz `reset({ ...casoData })` sem achatar o JSONB em [Cadastro.tsx#L174](c:/Users/Ricardo/Desktop/projects/Sistema-CREAS-CRAS-e-Vigilancia/frontend/src/pages/Cadastro.tsx#L174).
- `tec_ref` já é pré-preenchido pelo usuário logado, mas continua editável na criação em [Cadastro.tsx#L349](c:/Users/Ricardo/Desktop/projects/Sistema-CREAS-CRAS-e-Vigilancia/frontend/src/pages/Cadastro.tsx#L349); isso viola a exigência de autoria confiável e enfraquece auditoria.
- A maior perda atual de qualidade de dados vem de campos livres ou submodelados: `canalDenuncia` livre, `bairro` livre, `tipo_violencia` sem subtipos, `escolaridade` com apenas 2 opções, `sexo` binário, `corEtnia` parcial e `inseridoPAEFI` binário.
- Há inconsistência de valores que impacta filtros e relatórios, por exemplo `Não` vs `NÃO`, além de typo legado como `notificacaoSINAM`; isso é um risco real para agregações.
- O projeto já tem um sinal de privacidade em `Consulta.tsx` com anonimização para vigilância, mas o formulário não tem microcopy, regra de opt-out nem segregação clara para dados sensíveis.
- Mudanças com mais retorno: contrato canônico de payload, `tec_ref` autoritativo, estruturação de violência/origem/bairro, enumeração forte para escolaridade/raça/cor e tratamento correto dos campos sensíveis.
- Mudanças que exigem mais cuidado: renomear campos usados em dashboard/vigilância, migrar dados legados, e decidir se o backend aceitará aliases temporários ou fará backfill imediato.
- Assunção adotada: considerei mais seguro manter `dados_completos` flat no JSONB, porque filtros, dashboards e consultas já parecem depender de chaves de primeiro nível.

## 3. Plano de ação priorizado

| Prioridade | Mudança proposta | Motivo | Impacto esperado na coleta de dados | Impacto técnico no frontend | Impacto técnico no backend | Risco / observações | Dependências |
|---|---|---|---|---|---|---|---|
| Alta | Definir contrato canônico do caso: top-level SQL + `dados_completos` padronizado | Hoje create, read, update e analytics não falam o mesmo idioma | Alto | Médio | Alto | Sem isso, qualquer melhoria de campo vira dívida nova | Nenhuma |
| Alta | Tornar `tec_ref` somente leitura no FE e autoritativo no BE | Melhora auditoria e evita fraude/erro humano | Alto | Baixo | Médio | Recomendo aplicar a mesma lógica a `unit_id` | Auth estável |
| Alta | Trocar `tipo_violencia` por `tipoViolencia` canônico com `tipoViolenciaDescricoes[]` | Maior ganho estatístico e clínico no registro da violência | Muito alto | Médio | Alto | Precisa compatibilizar `tipo_violencia` legado e filtros atuais | Contrato canônico |
| Alta | Estruturar `canalOrigem`, `dataDenuncia`, `protocolo` e `especificacaoOutroCanal` | Hoje a origem do caso perde qualidade por ser texto livre | Muito alto | Médio | Médio | `canalDenuncia` deve virar alias legado | Contrato canônico |
| Alta | Padronizar `bairro` por lista controlada e manter `macroRegiao` livre | `bairro` já alimenta dashboard, consulta e mapa | Muito alto | Médio | Médio | Sem lista canônica, mapa e relatórios seguem ruins | Fonte canônica de bairros |
| Média | Reestruturar `escolaridade`, `racaCor` e `inseridoPAEFI` com enums fechados | Melhora relatórios e reduz dispersão | Alto | Baixo | Médio | `corEtnia` e valores antigos devem virar alias/migração | Contrato canônico |
| Média | Incluir `sexo`, `orientacaoSexual` e `identidadeGenero` com UX sensível | Completa o cadastro com padrão mais atual e seguro | Médio/alto | Médio | Médio | Exige regra explícita de privacidade e acesso | Microcopy LGPD |
| Média | Incluir `vinculoAgressor`, `coabitaComAgressor` e bloco mínimo do agressor | Aumenta capacidade analítica do caso e do risco | Alto | Médio | Médio | Não bloquear fechamento por campos do agressor desconhecidos | Contrato canônico |
| Média | Incluir bloco de moradia com regras condicionais | Amplia leitura socioeconômica e vulnerabilidade | Alto | Médio | Médio | Precisa reset correto para `SITUACAO_DE_RUA` e `ALUGADA` | RHF/Zod condicional |
| Baixa | Extrair schema/tipos/componentes do `Cadastro` e tipar DTOs de caso | Reduz regressão e facilita evolução | Médio | Médio | Baixo | `schema.ts` vazio hoje é sintoma de refatoração incompleta | Após contrato canônico |

## 4. Proposta de modelagem de dados
Premissa: manter `tec_ref` no topo por compatibilidade e persistir os campos novos/alterados dentro de `dados_completos`, em nível flat.

### Metadados e vítima

| Campo | Tipo | Obrig. | Enum | Padrão | Regra condicional | Sensibilidade |
|---|---|---:|---|---|---|---|
| `tec_ref` | `string` | Sim no domínio, não confiável no request | — | usuário autenticado | FE não edita; BE sobrescreve pelo usuário logado | dado funcional interno |
| `escolaridade` | `string` | Sim | `SEM_IDADE_ESCOLAR`, `EJA`, `FUNDAMENTAL_1_INCOMPLETO`, `FUNDAMENTAL_1_COMPLETO`, `FUNDAMENTAL_2_INCOMPLETO`, `FUNDAMENTAL_2_COMPLETO`, `ENSINO_MEDIO_INCOMPLETO`, `ENSINO_MEDIO_COMPLETO`, `TECNICO_INCOMPLETO`, `TECNICO_COMPLETO`, `SUPERIOR_INCOMPLETO`, `SUPERIOR_COMPLETO` | `null` | — | dado pessoal não sensível |
| `sexo` | `string \| null` | Não | `MASCULINO`, `FEMININO`, `INTERSEXO` | `null` | deixar em branco = opt-out | sensível |
| `orientacaoSexual` | `string \| null` | Não | `HETEROSSEXUAL`, `HOMOSSEXUAL`, `BISSEXUAL`, `OUTRA`, `PREFIRO_NAO_INFORMAR` | `null` | — | sensível |
| `identidadeGenero` | `string \| null` | Não | `HOMEM`, `MULHER`, `TRAVESTI`, `NAO_BINARIO`, `OUTROS` | `null` | deixar em branco = opt-out | sensível |
| `racaCor` | `string` | Sim | `BRANCA`, `PRETA`, `PARDA`, `AMARELA`, `INDIGENA`, `NAO_DECLARADO` | `null` | — | sensível |
| `etniaIndigena` | `string \| null` | Não | — | `null` | exibir só se `racaCor = INDIGENA` | sensível |
| `bairro` | `string` | Sim | lista canônica de bairros | `null` | seleção controlada | dado pessoal |
| `macroRegiao` | `string \| null` | Não | — | `null` | texto livre | dado territorial |

### Violência, origem e serviço

| Campo | Tipo | Obrig. | Enum | Padrão | Regra condicional | Sensibilidade |
|---|---|---:|---|---|---|---|
| `tipoViolencia` | `string` | Sim | `FISICA`, `PSICOLOGICA`, `SEXUAL`, `PATRIMONIAL`, `MORAL` | `null` | — | sensível |
| `tipoViolenciaDescricoes` | `string[]` | Sim | depende de `tipoViolencia`; ver schema | `[]` | mínimo 1 item; resetar ao trocar `tipoViolencia` | sensível |
| `inseridoPAEFI` | `string` | Sim | `SIM`, `NAO`, `NAO_ADERIU` | `null` | — | dado de atendimento |
| `canalOrigem` | `string` | Sim | `DISQUE_100_180`, `CONSELHO_TUTELAR`, `PODER_JUDICIARIO_MINISTERIO_PUBLICO`, `DELEGACIA_DE_POLICIA`, `DEMANDA_ESPONTANEA`, `ENCAMINHAMENTO_DA_REDE`, `OUTROS` | `null` | — | dado de atendimento |
| `dataDenuncia` | `string(date)` | Sim | — | data atual ou vazia | validar data válida | dado de atendimento |
| `protocolo` | `string \| null` | Não | — | `null` | — | dado de atendimento |
| `especificacaoOutroCanal` | `string \| null` | Condicional | — | `null` | obrigatório se `canalOrigem = OUTROS` | dado de atendimento |

### Vínculo e agressor

| Campo | Tipo | Obrig. | Enum | Padrão | Regra condicional | Sensibilidade |
|---|---|---:|---|---|---|---|
| `vinculoAgressor` | `string` | Sim | lista fechada; ver schema | `null` | — | sensível |
| `coabitaComAgressor` | `string` | Sim | `SIM`, `NAO` | `null` | — | sensível |
| `especificacaoOutroVinculo` | `string \| null` | Condicional | — | `null` | obrigatório se `vinculoAgressor = OUTROS` | sensível |
| `faixaEtariaAgressor` | `string \| null` | Não | `MENOR_18`, `FAIXA_18_30`, `FAIXA_31_40`, `FAIXA_41_50`, `FAIXA_51_60`, `FAIXA_61_MAIS` | `null` | — | sensível |
| `bairroAgressor` | `string \| null` | Não | — | `null` | texto livre normalizado | sensível |
| `sexoAgressor` | `string \| null` | Não | `HOMEM`, `MULHER`, `OUTRO` | `null` | — | sensível |

### Moradia

| Campo | Tipo | Obrig. | Enum | Padrão | Regra condicional | Sensibilidade |
|---|---|---:|---|---|---|---|
| `tipoResidencia` | `string` | Sim | `CASA`, `APARTAMENTO`, `COMODO_QUITINETE`, `BARRACO_OCUPACAO`, `UNIDADE_INSTITUCIONAL`, `SITUACAO_DE_RUA` | `null` | — | dado socioeconômico |
| `formaOcupacao` | `string \| null` | Condicional | `PROPRIA_PAGA`, `PROPRIA_EM_AQUISICAO`, `ALUGADA`, `CEDIDA_FAMILIAR_AMIGO`, `CEDIDA_EMPREGADOR`, `OCUPADA_IRREGULAR` | `null` | obrigatório se `tipoResidencia != SITUACAO_DE_RUA` | dado socioeconômico |
| `materialConstrucao` | `string \| null` | Condicional | `ALVENARIA_TIJOLO`, `MADEIRA_APARELHADA`, `MATERIAL_REAPROVEITADO`, `SEM_CONSTRUCAO_PERMANENTE` | `null` | obrigatório se `tipoResidencia != SITUACAO_DE_RUA` | dado socioeconômico |
| `valorAluguel` | `number \| null` | Não | — | `null` | habilitar só se `formaOcupacao = ALUGADA` | dado socioeconômico |

## 5. JSON schema consolidado
Schema canônico do objeto persistido. Para update parcial, o backend deve derivar uma versão `partial` deste mesmo contrato.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CasoCadastroProntuarioPayload",
  "type": "object",
  "additionalProperties": false,
  "required": ["data_cad", "dados_completos"],
  "properties": {
    "data_cad": {
      "type": "string",
      "format": "date"
    },
    "tec_ref": {
      "type": ["string", "null"],
      "readOnly": true
    },
    "dados_completos": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "tipoViolencia",
        "tipoViolenciaDescricoes",
        "escolaridade",
        "racaCor",
        "bairro",
        "inseridoPAEFI",
        "canalOrigem",
        "dataDenuncia",
        "vinculoAgressor",
        "coabitaComAgressor",
        "tipoResidencia"
      ],
      "properties": {
        "escolaridade": { "$ref": "#/$defs/escolaridadeEnum" },
        "sexo": {
          "anyOf": [
            { "$ref": "#/$defs/sexoEnum" },
            { "type": "null" }
          ]
        },
        "orientacaoSexual": {
          "anyOf": [
            { "$ref": "#/$defs/orientacaoSexualEnum" },
            { "type": "null" }
          ]
        },
        "identidadeGenero": {
          "anyOf": [
            { "$ref": "#/$defs/identidadeGeneroEnum" },
            { "type": "null" }
          ]
        },
        "tipoViolencia": { "$ref": "#/$defs/tipoViolenciaEnum" },
        "tipoViolenciaDescricoes": {
          "type": "array",
          "minItems": 1,
          "uniqueItems": true,
          "items": { "type": "string" }
        },
        "racaCor": { "$ref": "#/$defs/racaCorEnum" },
        "etniaIndigena": {
          "type": ["string", "null"],
          "maxLength": 100
        },
        "bairro": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "macroRegiao": {
          "type": ["string", "null"],
          "maxLength": 80
        },
        "inseridoPAEFI": { "$ref": "#/$defs/inseridoPAEFIEnum" },
        "canalOrigem": { "$ref": "#/$defs/canalOrigemEnum" },
        "dataDenuncia": {
          "type": "string",
          "format": "date"
        },
        "protocolo": {
          "type": ["string", "null"],
          "maxLength": 50
        },
        "especificacaoOutroCanal": {
          "type": ["string", "null"],
          "maxLength": 120
        },
        "vinculoAgressor": { "$ref": "#/$defs/vinculoAgressorEnum" },
        "coabitaComAgressor": { "$ref": "#/$defs/simNaoEnum" },
        "especificacaoOutroVinculo": {
          "type": ["string", "null"],
          "maxLength": 120
        },
        "tipoResidencia": { "$ref": "#/$defs/tipoResidenciaEnum" },
        "formaOcupacao": {
          "anyOf": [
            { "$ref": "#/$defs/formaOcupacaoEnum" },
            { "type": "null" }
          ]
        },
        "materialConstrucao": {
          "anyOf": [
            { "$ref": "#/$defs/materialConstrucaoEnum" },
            { "type": "null" }
          ]
        },
        "valorAluguel": {
          "type": ["number", "null"],
          "minimum": 0,
          "multipleOf": 0.01
        },
        "faixaEtariaAgressor": {
          "anyOf": [
            { "$ref": "#/$defs/faixaEtariaAgressorEnum" },
            { "type": "null" }
          ]
        },
        "bairroAgressor": {
          "type": ["string", "null"],
          "maxLength": 100
        },
        "sexoAgressor": {
          "anyOf": [
            { "$ref": "#/$defs/sexoAgressorEnum" },
            { "type": "null" }
          ]
        }
      },
      "allOf": [
        {
          "if": {
            "properties": { "canalOrigem": { "const": "OUTROS" } },
            "required": ["canalOrigem"]
          },
          "then": {
            "required": ["especificacaoOutroCanal"],
            "properties": {
              "especificacaoOutroCanal": {
                "type": "string",
                "minLength": 1,
                "maxLength": 120
              }
            }
          }
        },
        {
          "if": {
            "properties": { "vinculoAgressor": { "const": "OUTROS" } },
            "required": ["vinculoAgressor"]
          },
          "then": {
            "required": ["especificacaoOutroVinculo"],
            "properties": {
              "especificacaoOutroVinculo": {
                "type": "string",
                "minLength": 1,
                "maxLength": 120
              }
            }
          }
        },
        {
          "if": {
            "properties": { "tipoResidencia": { "const": "SITUACAO_DE_RUA" } },
            "required": ["tipoResidencia"]
          },
          "then": {
            "properties": {
              "formaOcupacao": { "type": "null" },
              "materialConstrucao": { "type": "null" },
              "valorAluguel": { "type": "null" }
            }
          },
          "else": {
            "required": ["formaOcupacao", "materialConstrucao"]
          }
        },
        {
          "if": {
            "properties": { "tipoViolencia": { "const": "FISICA" } },
            "required": ["tipoViolencia"]
          },
          "then": {
            "properties": {
              "tipoViolenciaDescricoes": {
                "items": { "$ref": "#/$defs/violenciaFisicaDescricaoEnum" }
              }
            }
          }
        },
        {
          "if": {
            "properties": { "tipoViolencia": { "const": "PSICOLOGICA" } },
            "required": ["tipoViolencia"]
          },
          "then": {
            "properties": {
              "tipoViolenciaDescricoes": {
                "items": { "$ref": "#/$defs/violenciaPsicologicaDescricaoEnum" }
              }
            }
          }
        },
        {
          "if": {
            "properties": { "tipoViolencia": { "const": "SEXUAL" } },
            "required": ["tipoViolencia"]
          },
          "then": {
            "properties": {
              "tipoViolenciaDescricoes": {
                "items": { "$ref": "#/$defs/violenciaSexualDescricaoEnum" }
              }
            }
          }
        },
        {
          "if": {
            "properties": { "tipoViolencia": { "const": "PATRIMONIAL" } },
            "required": ["tipoViolencia"]
          },
          "then": {
            "properties": {
              "tipoViolenciaDescricoes": {
                "items": { "$ref": "#/$defs/violenciaPatrimonialDescricaoEnum" }
              }
            }
          }
        },
        {
          "if": {
            "properties": { "tipoViolencia": { "const": "MORAL" } },
            "required": ["tipoViolencia"]
          },
          "then": {
            "properties": {
              "tipoViolenciaDescricoes": {
                "items": { "$ref": "#/$defs/violenciaMoralDescricaoEnum" }
              }
            }
          }
        }
      ]
    }
  },
  "$defs": {
    "escolaridadeEnum": {
      "type": "string",
      "enum": [
        "SEM_IDADE_ESCOLAR",
        "EJA",
        "FUNDAMENTAL_1_INCOMPLETO",
        "FUNDAMENTAL_1_COMPLETO",
        "FUNDAMENTAL_2_INCOMPLETO",
        "FUNDAMENTAL_2_COMPLETO",
        "ENSINO_MEDIO_INCOMPLETO",
        "ENSINO_MEDIO_COMPLETO",
        "TECNICO_INCOMPLETO",
        "TECNICO_COMPLETO",
        "SUPERIOR_INCOMPLETO",
        "SUPERIOR_COMPLETO"
      ]
    },
    "sexoEnum": {
      "type": "string",
      "enum": ["MASCULINO", "FEMININO", "INTERSEXO"]
    },
    "orientacaoSexualEnum": {
      "type": "string",
      "enum": [
        "HETEROSSEXUAL",
        "HOMOSSEXUAL",
        "BISSEXUAL",
        "OUTRA",
        "PREFIRO_NAO_INFORMAR"
      ]
    },
    "identidadeGeneroEnum": {
      "type": "string",
      "enum": ["HOMEM", "MULHER", "TRAVESTI", "NAO_BINARIO", "OUTROS"]
    },
    "tipoViolenciaEnum": {
      "type": "string",
      "enum": ["FISICA", "PSICOLOGICA", "SEXUAL", "PATRIMONIAL", "MORAL"]
    },
    "racaCorEnum": {
      "type": "string",
      "enum": ["BRANCA", "PRETA", "PARDA", "AMARELA", "INDIGENA", "NAO_DECLARADO"]
    },
    "inseridoPAEFIEnum": {
      "type": "string",
      "enum": ["SIM", "NAO", "NAO_ADERIU"]
    },
    "canalOrigemEnum": {
      "type": "string",
      "enum": [
        "DISQUE_100_180",
        "CONSELHO_TUTELAR",
        "PODER_JUDICIARIO_MINISTERIO_PUBLICO",
        "DELEGACIA_DE_POLICIA",
        "DEMANDA_ESPONTANEA",
        "ENCAMINHAMENTO_DA_REDE",
        "OUTROS"
      ]
    },
    "simNaoEnum": {
      "type": "string",
      "enum": ["SIM", "NAO"]
    },
    "vinculoAgressorEnum": {
      "type": "string",
      "enum": [
        "CONJUGE",
        "COMPANHEIRO",
        "EX_CONJUGE_EX_COMPANHEIRO",
        "NAMORADO",
        "EX_NAMORADO",
        "PAI",
        "MAE",
        "FILHO",
        "IRMAO",
        "AVO",
        "PADRASTO_MADRASTA",
        "TIO_PRIMO",
        "VIZINHO",
        "AMIGO_CONHECIDO",
        "CUIDADOR",
        "EMPREGADOR_CHEFE",
        "COLEGA_DE_TRABALHO",
        "PESSOA_COM_AUTORIDADE",
        "DESCONHECIDO",
        "OUTROS"
      ]
    },
    "tipoResidenciaEnum": {
      "type": "string",
      "enum": [
        "CASA",
        "APARTAMENTO",
        "COMODO_QUITINETE",
        "BARRACO_OCUPACAO",
        "UNIDADE_INSTITUCIONAL",
        "SITUACAO_DE_RUA"
      ]
    },
    "formaOcupacaoEnum": {
      "type": "string",
      "enum": [
        "PROPRIA_PAGA",
        "PROPRIA_EM_AQUISICAO",
        "ALUGADA",
        "CEDIDA_FAMILIAR_AMIGO",
        "CEDIDA_EMPREGADOR",
        "OCUPADA_IRREGULAR"
      ]
    },
    "materialConstrucaoEnum": {
      "type": "string",
      "enum": [
        "ALVENARIA_TIJOLO",
        "MADEIRA_APARELHADA",
        "MATERIAL_REAPROVEITADO",
        "SEM_CONSTRUCAO_PERMANENTE"
      ]
    },
    "faixaEtariaAgressorEnum": {
      "type": "string",
      "enum": [
        "MENOR_18",
        "FAIXA_18_30",
        "FAIXA_31_40",
        "FAIXA_41_50",
        "FAIXA_51_60",
        "FAIXA_61_MAIS"
      ]
    },
    "sexoAgressorEnum": {
      "type": "string",
      "enum": ["HOMEM", "MULHER", "OUTRO"]
    },
    "violenciaFisicaDescricaoEnum": {
      "type": "string",
      "enum": [
        "ESPANCAMENTO",
        "SACUDIDAS",
        "CHUTES",
        "BOFETADAS",
        "QUEIMADURAS",
        "EMPURROES",
        "ARREMESSO_DE_OBJETOS",
        "LESOES_COM_ARMAS",
        "OFENSA_A_INTEGRIDADE_CORPORAL"
      ]
    },
    "violenciaPsicologicaDescricaoEnum": {
      "type": "string",
      "enum": [
        "AMEACA",
        "HUMILHACAO",
        "ISOLAMENTO",
        "VIGILANCIA_CONSTANTE",
        "PERSEGUICAO",
        "INSULTO",
        "CHANTAGEM",
        "RIDICULARIZACAO",
        "LIMITACAO_DE_IR_E_VIR",
        "DANO_EMOCIONAL"
      ]
    },
    "violenciaSexualDescricaoEnum": {
      "type": "string",
      "enum": [
        "ESTUPRO",
        "COACAO_SEXUAL",
        "IMPEDIR_USO_DE_CONTRACEPTIVO",
        "FORCAR_ABORTO",
        "FORCAR_MATRIMONIO",
        "PROSTITUICAO_FORCADA",
        "GRAVIDEZ_NAO_DESEJADA"
      ]
    },
    "violenciaPatrimonialDescricaoEnum": {
      "type": "string",
      "enum": [
        "RETENCAO_DE_DOCUMENTOS",
        "SUBTRACAO_DE_BENS",
        "DESTRUICAO_DE_FERRAMENTAS",
        "CONTROLE_DE_SALARIO",
        "QUEBRA_DE_CELULAR",
        "DANO_PATRIMONIAL"
      ]
    },
    "violenciaMoralDescricaoEnum": {
      "type": "string",
      "enum": [
        "CALUNIA",
        "DIFAMACAO",
        "INJURIA",
        "EXPOSICAO_DE_INTIMIDADE",
        "MENTIRAS_PUBLICAS"
      ]
    }
  }
}
```

## 6. Orientação para validação no frontend
- Centralize tudo em [src/pages/Cadastro/schema.ts](c:/Users/Ricardo/Desktop/projects/Sistema-CREAS-CRAS-e-Vigilancia/frontend/src/pages/Cadastro/schema.ts) e tipifique o payload no `api.ts`; hoje o schema continua dentro de `Cadastro.tsx`, e isso já virou fonte de drift.
- Use `z.enum` para todos os campos fechados e `superRefine` para regras condicionais: `tipoViolenciaDescricoes`, `especificacaoOutroCanal`, `especificacaoOutroVinculo`, `formaOcupacao/materialConstrucao` e `valorAluguel`.
- Campos obrigatórios: `escolaridade`, `tipoViolencia`, `tipoViolenciaDescricoes`, `racaCor`, `bairro`, `inseridoPAEFI`, `canalOrigem`, `dataDenuncia`, `vinculoAgressor`, `coabitaComAgressor`, `tipoResidencia`; `tec_ref` não deve ser editável, mas deve estar visível e preenchido.
- Campos opcionais: `sexo`, `orientacaoSexual`, `identidadeGenero`, `etniaIndigena`, `macroRegiao`, `protocolo`, dados complementares do agressor e `valorAluguel`; para sensíveis, `null` é melhor que string vazia.
- Resets de dependência: trocar `tipoViolencia` limpa `tipoViolenciaDescricoes`; trocar `canalOrigem` para qualquer valor diferente de `OUTROS` limpa `especificacaoOutroCanal`; trocar `vinculoAgressor` limpa `especificacaoOutroVinculo`; trocar `racaCor` para diferente de `INDIGENA` limpa `etniaIndigena`; `SITUACAO_DE_RUA` limpa `formaOcupacao`, `materialConstrucao` e `valorAluguel`; valor diferente de `ALUGADA` limpa `valorAluguel`.
- Comportamento `onChange`: apenas normalização leve e resets; não persista texto sensível em estado derivado desnecessário; para `bairro`, use valor canônico da lista; para `protocolo`, normalize com `trim`.
- Comportamento `onSubmit`: transforme `""` em `null`, remova duplicidade de `tipoViolenciaDescricoes`, aplique `trim`, monte `dados_completos` canônico e envie o mínimo possível; não faça `console.log` de payload sensível.
- Mensagens de erro esperadas: “Selecione o tipo de violência.”, “Selecione ao menos uma descrição da violência.”, “Selecione a raça/cor.”, “Selecione o bairro.”, “Informe a data da denúncia.”, “Especifique o outro canal.”, “Especifique o outro vínculo.”, “Informe a forma de ocupação.”, “Informe o material da construção.”
- Cuidados com campos sensíveis: use microcopy curta de LGPD, não preencha automaticamente, não mostre em listagens gerais, e só exiba para perfis autorizados; como o projeto não tem `chips` reutilizáveis, eu criaria um componente pequeno baseado em `Button` apenas para seleções curtas e sensíveis, com semântica de `radiogroup`.

## 7. Orientação para backend e rotas
- Eu não criaria um novo CRUD para isso; estenderia as rotas já consolidadas de casos: `POST /api/casos`, `GET /api/casos/:id`, `PUT /api/casos/:id` e `GET /api/casos` com filtros.
- Endpoint sugerido para criação: `POST /api/casos` recebendo `data_cad` e `dados_completos`; `tec_ref`, `unit_id`, `user_id`, `status`, `created_at` e `updated_at` devem ser definidos pelo servidor.
- Endpoint sugerido para atualização: manter `PUT /api/casos/:id` como merge parcial por compatibilidade; idealmente o backend valida contra o schema canônico e aplica merge só em `dados_completos`, sem sobrescrever o objeto inteiro por acidente.
- Payload esperado: o schema da seção 5; por compatibilidade, o backend deve aceitar temporariamente `dados_completos_payload`, `tipo_violencia`, `corEtnia` e `canalDenuncia`, normalizando tudo para `dados_completos.tipoViolencia`, `dados_completos.racaCor` e `dados_completos.canalOrigem`.
- Validações de entrada: autenticação, permissão de escrita, enum fechado, datas válidas, `tipoViolenciaDescricoes.length >= 1`, obrigatoriedade condicional, bairro presente na lista canônica, deduplicação de arrays e rejeição de valores não previstos.
- Normalização de dados: `trim`, collapse de espaços, conversão de labels legadas para códigos canônicos, alias de `tipo_violencia -> tipoViolencia`, `corEtnia -> racaCor`, `canalDenuncia -> canalOrigem`, `Sim/Não/NÃO -> SIM/NAO`; eu também normalizaria o typo `SINAM/SINAN` em camada separada.
- Cuidados com auditoria: registrar `created_by_user_id`, `updated_by_user_id`, timestamp, rota e diff lógico; para campos sensíveis, o log operacional não deve expor payload bruto em console, APM ou access logs.
- Campos preenchidos pelo servidor: `tec_ref`, `unit_id`, `user_id`, `status`, `created_at`, `updated_at`, `deleted_at`; o cliente pode exibir `tec_ref`, mas o backend é quem decide o valor final.
- Estratégia de compatibilidade: aceitar aliases legados na entrada, devolver payload normalizado no detalhe, manter filtros e dashboards funcionando com aliases durante a transição, e executar backfill lazily ao salvar registros antigos; só depois remover `tipo_violencia`, `corEtnia` e `canalDenuncia` do contrato público.
- Rota nova só se necessário: para `bairro` controlado, a única criação que considero justificável é algo como `GET /api/territorios/bairros`, caso o backend ainda não tenha fonte territorial canônica.

## 8. Regras de negócio e comportamento esperado por campo

| Campo / grupo | Comportamento na interface | Regra de preenchimento | Regra de persistência / validação | Dependências / UX |
|---|---|---|---|---|
| `tec_ref` | Input somente leitura, preenchido ao abrir | automático pelo usuário autenticado | servidor sobrescreve sempre | não usar `disabled` puro se isso prejudicar acessibilidade; preferir `readOnly` |
| `escolaridade` | `Select` simples | obrigatório | enum fechado | manter agrupamento visual por etapa escolar |
| `sexo`, `orientacaoSexual`, `identidadeGenero` | `chips` de seleção única | opcionais por sensibilidade | enum ou `null` | microcopy de autodeclaração e LGPD; sem preselect |
| `tipoViolencia` + `tipoViolenciaDescricoes` | primeiro seletor único; depois grid multi-seleção | `tipoViolencia` obrigatório; ao menos 1 descrição | descrições compatíveis com o tipo escolhido | trocar o tipo reseta as descrições e desabilita o segundo nível até escolha |
| `racaCor` + `etniaIndigena` | seleção única + campo texto condicional | `racaCor` obrigatório; `etniaIndigena` opcional | enum IBGE + texto opcional | mostrar helper “autodeclaração segundo padrão IBGE”; campo só aparece em `INDIGENA` |
| `bairro` + `macroRegiao` | `bairro` em lista pesquisável; `macroRegiao` texto | `bairro` obrigatório; `macroRegiao` opcional | `bairro` precisa ser valor canônico | isso melhora dashboard, mapa e consulta imediatamente |
| `inseridoPAEFI` | seleção simples | obrigatório | enum `SIM/NAO/NAO_ADERIU` | usar label clara para “Não aderiu” |
| `canalOrigem`, `dataDenuncia`, `protocolo`, `especificacaoOutroCanal` | bloco de origem do caso | `canalOrigem` e `dataDenuncia` obrigatórios; `protocolo` opcional | enum + data válida; “Outros” exige especificação | manter o bloco no início do fluxo, porque é informação de entrada do caso |
| `vinculoAgressor`, `coabitaComAgressor`, `especificacaoOutroVinculo` | vínculo em `Select` agrupado; coabitação em escolha binária | vínculo e coabitação obrigatórios | enum fechado; “Outros” exige texto | eu não usaria chips aqui, porque a lista é longa demais |
| `tipoResidencia`, `formaOcupacao`, `materialConstrucao`, `valorAluguel` | bloco progressivo de moradia | `tipoResidencia` obrigatório; demais condicionais | `SITUACAO_DE_RUA` oculta e limpa os demais; `ALUGADA` habilita `valorAluguel` | use textos de apoio curtos; não sobrecarregar a tela inicial |
| `faixaEtariaAgressor`, `bairroAgressor`, `sexoAgressor` | subseção “Dados do agressor” | opcionais, para não travar o fluxo | enum + texto opcional | recomendo subseção no mesmo domínio de violência/agressor, não uma aba isolada |

## 9. Recomendações finais
- Quick wins: travar `tec_ref` no frontend, sobrescrevê-lo no backend, estruturar `tipoViolencia` em dois níveis, transformar `canalDenuncia` em `canalOrigem` estruturado e trocar `bairro` por lista canônica.
- Mudanças estruturais: criar contrato canônico de `dados_completos`, tipar DTOs de caso em `api.ts`, preencher `src/pages/Cadastro/schema.ts`, e inserir camada de normalização/alias no backend.
- Riscos de inconsistência: trocar nomes sem alias quebra dashboard/vigilância; manter texto livre para `bairro` e `canal` perpetua dado ruim; tratar campos sensíveis sem microcopy e sem controle de acesso aumenta risco LGPD.
- Sugestão de ordem de implementação: 1. contrato canônico + normalização backend; 2. `tec_ref` autoritativo; 3. `tipoViolencia` + `canalOrigem` + `bairro`; 4. `escolaridade` + `racaCor` + `inseridoPAEFI`; 5. vínculo/agressor + moradia; 6. identidade/orientação com UX sensível; 7. refatoração do `Cadastro`.
- O que vale fazer primeiro para gerar mais retorno: contrato canônico, violência estruturada, origem do caso e bairro controlado. Esses quatro pontos dão o maior salto em qualidade estatística, relatórios e consistência operacional com o menor risco de virar retrabalho.