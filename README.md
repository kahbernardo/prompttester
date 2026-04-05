# Prompt Tester - LLM Comparator

Uma plataforma para comparar modelos de IA lado a lado com foco em execucao real, analise tecnica e decisao orientada por dados.

This is a side-by-side AI model comparison platform focused on real execution, technical analytics, and data-driven decisions.

---

## PT-BR

### O que este projeto entrega

O Prompt Tester foi construido para sair do modo "demo simples" e virar uma camada de avaliacao real de modelos.
Aqui voce compara respostas, custo, latencia, consistencia e sinais de qualidade em uma unica experiencia.

### Principais funcionalidades

- Comparacao multi-modelo em paralelo com provedores reais
- Modo mock para experimentacao sem custo
- Camada analitica com ranking inteligente por custo-beneficio, latencia e consistencia
- Metricas de custo, custo por qualidade, custo por token e custo por 1000 execucoes
- Graficos interativos (Recharts): custo vs latencia, custo por qualidade, latencia, tendencias e radar de perfil
- Modo consistencia (multiplas repeticoes do mesmo prompt)
- Suporte a fallback de modelos incompativeis (opcional, com modo estrito sem fallback)
- Indicador visual de redirecionamento `modelo solicitado -> modelo executado`
- Health check de providers em tempo real com revalidacao manual
- Historico persistido localmente com rerun e limpeza
- Progresso real de execucao (loading state + barra) e logs da API em tempo real com sanitizacao de dados sensiveis
- Interface internacionalizada (PT-BR/EN), tema, fonte e seletor de moeda (USD/BRL com cotacao)

### Arquitetura e stack

- Next.js (App Router) + TypeScript
- Zustand para estado global
- Zod para validacao
- TailwindCSS para UI
- Recharts para visualizacao de dados
- GSAP para microanimacoes

### Variaveis de ambiente

Copie `.env.example` para `.env` e preencha as chaves necessarias:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`
- `MISTRAL_API_KEY`
- `DEEPSEEK_API_KEY`
- `XAI_API_KEY`
- `OPENROUTER_API_KEY`
- `CODEX_API_KEY`
- `COMPARE_ENABLE_WEB_SEARCH` (`false` por padrao)

### Como rodar localmente

```bash
npm install
npm run dev
```

Build de producao:

```bash
npm run build
npm run start
```

### Por que usar este projeto

- Acelera decisao tecnica entre modelos sem depender de percepcao subjetiva
- Centraliza custo, qualidade e latencia em um fluxo unico
- Facilita testes comparativos em ambientes reais
- Estrutura modular para evoluir com novos provedores e novas regras de negocio

### Faca um fork e adapte ao seu contexto

Se o seu time precisa de benchmark interno, avaliacao de prompts por dominio, governanca de custo ou observabilidade de modelos, este projeto foi feito para ser extensivel.

Fork, adapte as regras, conecte seus provedores e personalize os paineis conforme a sua realidade.

Contribuicoes sao muito bem-vindas.

---

## EN

### What this project delivers

Prompt Tester was designed to move beyond a simple demo and become a real model evaluation layer.
You can compare responses, cost, latency, consistency, and quality signals in one unified workflow.

### Core features

- Parallel multi-model comparison against real providers
- Mock mode for low-risk experimentation
- Analytics layer with smart ranking by cost-benefit, latency, and consistency
- Cost metrics: cost, cost per quality, cost per token, and cost per 1000 runs
- Interactive charts (Recharts): cost vs latency, cost per quality, latency breakdown, trends, and profile radar
- Consistency mode (multiple runs with the same prompt)
- Optional model fallback for incompatible models (with strict no-fallback mode)
- Visual redirect indicator: `requested model -> executed model`
- Real-time provider health checks with manual revalidation
- Local history with rerun and cleanup controls
- Real execution progress (loading state + progress bar) and real-time API logs with sensitive-data sanitization
- Internationalized UI (PT-BR/EN), theme, font settings, and currency selector (USD/BRL with FX lookup)

### Architecture and stack

- Next.js (App Router) + TypeScript
- Zustand for global state
- Zod for schema validation
- TailwindCSS for UI
- Recharts for data visualization
- GSAP for micro-interactions

### Environment variables

Copy `.env.example` to `.env` and fill in your keys:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`
- `MISTRAL_API_KEY`
- `DEEPSEEK_API_KEY`
- `XAI_API_KEY`
- `OPENROUTER_API_KEY`
- `CODEX_API_KEY`
- `COMPARE_ENABLE_WEB_SEARCH` (`false` by default)

### Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run start
```

### Why this project is useful

- Speeds up model decisions with objective signals instead of guesswork
- Combines cost, quality, and latency in a single workflow
- Enables realistic benchmarking in production-like conditions
- Modular structure for adding new providers and business rules

### Fork it and make it yours

If your team needs internal benchmarks, domain-specific prompt evaluation, cost governance, or model observability, this project is built to be extensible.

Fork it, adapt the rules, plug in your providers, and tailor the dashboards to your own needs.

Contributions are welcome.
