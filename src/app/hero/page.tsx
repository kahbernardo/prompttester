"use client";

import logoBlack from "@/assets/logo_black.png";
import gsap from "gsap";
import { Activity, ArrowRight, BarChart3, Clock3, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";

const models = [
  "o3",
  "o4-mini",
  "gpt-4o",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-5.4",
  "gpt-5-nano",
  "codex-mini-latest",
  "o1",
  "o1-mini",
  "claude-3-5-haiku",
  "claude-3-5-sonnet",
  "claude-3-7-sonnet",
  "claude-3-opus",
  "claude-sonnet-4",
  "claude-opus-4",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-pro-exp",
  "grok-2",
  "mistral-large",
  "mixtral-8x7b-instruct",
  "deepseek-chat",
  "deepseek-reasoner",
  "qwen2.5-72b-instruct",
  "qwen2.5-coder-32b-instruct"
];

const providers = ["openai", "anthropic", "google", "mistral", "deepseek", "xai", "amazon", "codex"];

const providerShowcase = [
  { name: "openai", slug: "openai", domain: "openai.com" },
  { name: "anthropic", slug: "anthropic" },
  { name: "google", slug: "google" },
  { name: "mistral", slug: "mistralai" },
  { name: "deepseek", slug: "deepseek", domain: "deepseek.com" },
  { name: "xai", slug: "x" },
  { name: "amazon", slug: "amazon" },
  { name: "codex", slug: "openai", domain: "openai.com" }
] as const;

function resolveProviderLogo(provider: (typeof providerShowcase)[number]): string {
  if ("domain" in provider && provider.domain) {
    return `https://icon.horse/icon/${provider.domain}`;
  }
  return `https://cdn.simpleicons.org/${provider.slug}/9ca3af`;
}

export default function HeroPage() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const logoSrc = useMemo(() => logoBlack, []);

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-fade",
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: "power2.out" }
      );
      gsap.fromTo(
        ".hero-chip",
        { opacity: 0, scale: 0.96 },
        { opacity: 1, scale: 1, duration: 0.4, stagger: 0.02, ease: "power2.out", delay: 0.2 }
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <main
      ref={rootRef}
      className="relative min-h-screen overflow-hidden bg-black px-6 py-10 text-zinc-100 sm:px-10 lg:px-16"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col">
        <div className="grid min-h-[calc(100vh-5rem)] items-stretch gap-10 lg:grid-cols-2">
          <div className="flex h-full flex-col justify-between gap-8 py-2">
            <div className="hero-fade">
              <Image
                src={logoSrc}
                alt="Prompt Tester"
                priority
                className="h-24 w-auto select-none object-contain sm:h-32 lg:h-40"
              />
            </div>

            <div className="hero-fade space-y-4">
              <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-zinc-100 sm:text-5xl lg:text-6xl">
                Compare modelos de IA com
                <span className="text-emerald-300">
                  {" "}
                  dados reais
                </span>
                .
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
                Analise custo, latencia, consistencia e qualidade em uma interface unica. Execucao em paralelo,
                logs em tempo real e painel analitico pronto para tomada de decisao.
              </p>
            </div>

            <div className="hero-fade flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/70 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
              >
                Comecar agora
                <Zap className="h-4 w-4" />
              </Link>
              <a
                href="https://github.com/kahbernardo/prompttester/fork"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/70 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
              >
                Fazer fork e adaptar
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="hero-fade grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                <div className="mb-1 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
                  <BarChart3 className="h-3.5 w-3.5 text-cyan-300" />
                  Analytics
                </div>
                <p className="text-sm font-semibold text-zinc-100">Ranking inteligente + graficos interativos</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                <div className="mb-1 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
                  <Clock3 className="h-3.5 w-3.5 text-violet-300" />
                  Tempo real
                </div>
                <p className="text-sm font-semibold text-zinc-100">Progresso por request e logs durante execucao</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                <div className="mb-1 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
                  <Activity className="h-3.5 w-3.5 text-emerald-300" />
                  Providers
                </div>
                <p className="text-sm font-semibold text-zinc-100">Health-check, fallback opcional e modo estrito</p>
              </div>
            </div>
          </div>

          <aside className="hero-fade grid h-full min-w-0 grid-rows-2 gap-5 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-zinc-800 bg-zinc-950/45 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Modelos em destaque</p>
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                <div className="grid h-full min-h-0 min-w-0 grid-cols-2 content-start gap-2 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-4">
                  {models.map((model) => (
                    <span
                      key={model}
                      className="hero-chip inline-flex min-h-[38px] items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/80 px-2.5 py-2 text-[11px] font-semibold text-zinc-200"
                    >
                      {model}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-zinc-800 bg-zinc-950/45 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Providers conectados</p>
              <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 px-2 py-4">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-zinc-950 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-zinc-950 to-transparent" />
                <div className="hero-marquee-track flex min-h-full w-max items-center gap-4">
                  {[...providerShowcase, ...providerShowcase].map((provider, index) => (
                    <div
                      key={`${provider.name}-${index}`}
                      className="hero-chip inline-flex h-[190px] w-[190px] shrink-0 flex-col items-center justify-center gap-4 rounded-2xl border border-zinc-700 bg-zinc-950/95 p-5"
                    >
                      <span className="inline-flex h-16 w-16 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/80">
                        <img
                          src={resolveProviderLogo(provider)}
                          alt={`${provider.name} logo`}
                          className="h-10 w-10 rounded-sm object-contain"
                          onError={(event) => {
                            const image = event.currentTarget;
                            const providerDomain = "domain" in provider ? provider.domain : null;
                            if (!providerDomain || image.dataset.fallbackLoaded === "true") return;
                            image.dataset.fallbackLoaded = "true";
                            image.src = `https://www.google.com/s2/favicons?domain=${providerDomain}&sz=64`;
                          }}
                        />
                      </span>
                      <span className="text-base font-black uppercase tracking-[0.12em] text-zinc-100">
                        {provider.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
      <style jsx global>{`
        @keyframes heroMarquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .hero-marquee-track {
          animation: heroMarquee 28s linear infinite;
        }
        .hero-marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>
    </main>
  );
}
