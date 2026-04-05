# modelExecutionService

Este guia descreve a camada de servico de execucao de modelos em `src/features/comparator/domain/modelExecutionService.ts`.

## Objetivo

Centralizar capacidades de execucao por modelo e decidir, de forma deterministica, entre:

- execucao direta;
- execucao com tool runtime;
- fallback automatico para modelo compativel.

## Responsabilidades

- Definir restricoes por modelo (`ModelExecutionConstraint`) e capacidades exigidas.
- Resolver regras declarativas (`executionRules`) com padroes de modelo.
- Expor funcoes puras para montar plano de execucao (`buildModelExecutionPlan`).
- Resolver fallback por provider quando o runtime nao tiver capacidades necessarias.

## API da camada

- `getModelExecutionConstraint(model)`:
  - retorna restricao da execucao quando existir;
  - retorna `null` quando o modelo pode rodar direto.

- `getModelRequiredCapabilities(model)`:
  - retorna capacidades exigidas para o modelo (ex.: `webSearch`, `fileSearch`, `mcp`).

- `getDefaultExecutionRuntimeCapabilities()`:
  - runtime padrao sem capacidades externas habilitadas.

- `buildExecutionRuntimeCapabilitiesFromEnv(env)`:
  - monta capacidades de runtime usando flags:
    - `COMPARE_ENABLE_WEB_SEARCH`
    - `COMPARE_ENABLE_FILE_SEARCH`
    - `COMPARE_ENABLE_MCP`

- `buildModelExecutionPlan(models, runtimeCapabilities)`:
  - gera plano com:
    - modelo solicitado;
    - modelo final de execucao;
    - motivo da decisao (`directExecution`, `toolRuntimeAvailable`, `fallbackApplied`, `missingToolRuntimeAndFallback`);
    - indicacao se fallback foi aplicado.

## Regras atuais

- Modelos com padrao `deep-research` sao classificados como `requiresExternalTools`.
- Esses modelos exigem uma das capacidades externas (`webSearch`, `fileSearch`, `mcp`).
- Se nenhuma capacidade estiver habilitada, a camada tenta fallback automatico por provider.

## Integracao no projeto

- `ComparatorPanel`:
  - exibe quando um modelo vai executar com fallback;
  - desabilita apenas quando nao existe caminho executavel.

- `comparatorStore`:
  - preserva selecao do usuario;
  - monta plano de execucao antes de chamar a API;
  - aplica fallback automatico quando necessario.

- `providerRegistry`:
  - reconstroi plano no servidor para comportamento consistente;
  - usa capacidades de runtime recebidas do ambiente.

## Como evoluir

Para adicionar nova regra/capacidade:

1. Criar o novo valor em `ModelExecutionConstraint`.
2. Adicionar a regra em `executionRules` com `requiredCapabilities`.
3. Incluir mensagem i18n correspondente para UX.
4. Validar fluxo com `npm run build`.
