"use client";

import { ComparatorPanel } from "@/features/comparator/components/ComparatorPanel";
import { useComparatorStore } from "@/features/comparator/store/comparatorStore";
import { CheckButton } from "@/shared/components/checkButton";
import { getMessage } from "@/shared/i18n/messages";
import { useUiPreferencesStore } from "@/shared/store/uiPreferencesStore";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import gsap from "gsap";
import { ChevronLeft, ChevronRight, RefreshCw, Settings } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import logoBlack from "@/assets/logo_black.png";
import logoWhite from "@/assets/logo_white.png";

export default function HomePage() {
  const [isPrefsOpen, setIsPrefsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const theme = useUiPreferencesStore((state) => state.theme);
  const fontSize = useUiPreferencesStore((state) => state.fontSize);
  const locale = useUiPreferencesStore((state) => state.locale);
  const currency = useUiPreferencesStore((state) => state.currency);
  const exchangeRateUsdToBrl = useUiPreferencesStore((state) => state.exchangeRateUsdToBrl);
  const exchangeRateUpdatedAt = useUiPreferencesStore((state) => state.exchangeRateUpdatedAt);
  const exchangeRateLoading = useUiPreferencesStore((state) => state.exchangeRateLoading);
  const loading = useComparatorStore((state) => state.loading);
  const results = useComparatorStore((state) => state.results);
  const allowUnavailableFallback = useComparatorStore((state) => state.allowUnavailableFallback);
  const setAllowUnavailableFallback = useComparatorStore((state) => state.setAllowUnavailableFallback);
  const setTheme = useUiPreferencesStore((state) => state.setTheme);
  const setFontSize = useUiPreferencesStore((state) => state.setFontSize);
  const setLocale = useUiPreferencesStore((state) => state.setLocale);
  const setCurrency = useUiPreferencesStore((state) => state.setCurrency);
  const refreshExchangeRate = useUiPreferencesStore((state) => state.refreshExchangeRate);
  const asideRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const usdToBrl = exchangeRateUsdToBrl;
  const brlToUsd = exchangeRateUsdToBrl > 0 ? 1 / exchangeRateUsdToBrl : 0;
  const reciprocalValue =
    currency === "BRL"
      ? new Intl.NumberFormat(locale === "pt-BR" ? "pt-BR" : "en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 4,
          maximumFractionDigits: 4
        }).format(brlToUsd)
      : new Intl.NumberFormat(locale === "pt-BR" ? "pt-BR" : "en-US", {
          style: "currency",
          currency: "BRL",
          minimumFractionDigits: 4,
          maximumFractionDigits: 4
        }).format(usdToBrl);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }
    const timeline = gsap.timeline({ defaults: { ease: "power2.out" } });
    if (asideRef.current) {
      timeline.fromTo(asideRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4, clearProps: "opacity" });
    }
    if (panelRef.current) {
      timeline.fromTo(panelRef.current, { opacity: 0 }, { opacity: 1, duration: 0.35, clearProps: "opacity" }, "-=0.2");
    }
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }
    const status = loading ? "Executando" : results.length > 0 ? "Concluido" : "Pronto";
    document.title = `Prompt Tester - ${status}`;
    const descriptionContent = `Prompt Tester (${status}). Compare modelos de LLM com metricas de custo, latencia e qualidade.`;
    let descriptionTag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!descriptionTag) {
      descriptionTag = document.createElement("meta");
      descriptionTag.setAttribute("name", "description");
      document.head.appendChild(descriptionTag);
    }
    descriptionTag.setAttribute("content", descriptionContent);
  }, [isMounted, loading, results.length]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }
    void refreshExchangeRate();
  }, [isMounted, currency, refreshExchangeRate]);

  if (!isMounted) {
    return (
      <main className="min-h-screen bg-black px-4 py-8 text-zinc-100">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-14 animate-pulse rounded-lg bg-black/80" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-zinc-100">
      <div className="mx-auto max-w-[1800px] space-y-6">
        <div className="flex justify-center">
          <Image
            src={theme === "dark" ? logoBlack : logoWhite}
            alt="Prompt Performance Tester"
            className="h-12 w-auto select-none rounded-sm object-contain sm:h-16 lg:h-20"
            priority
          />
        </div>

        <div className="flex gap-4 2xl:gap-6">
          <aside
            ref={asideRef}
            className={`fixed left-0 top-0 z-40 border border-zinc-800 bg-zinc-950/85 shadow-sm backdrop-blur transition-all ${
              isPrefsOpen
                ? "h-screen w-96 overflow-y-auto rounded-none border-l-0 p-4 2xl:w-[28rem]"
                : "h-screen w-5 overflow-visible rounded-none border-l-0 border-y-0 border-r-0 bg-zinc-950/60 p-0 shadow-none"
            }`}
          >
            <button
              type="button"
              onClick={() => setIsPrefsOpen((value) => !value)}
              className={`absolute z-50 inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 shadow-sm transition hover:border-emerald-400/70 hover:text-emerald-300 ${
                isPrefsOpen ? "-right-3 top-6" : "left-1 top-6"
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              {isPrefsOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            <div className={`${isPrefsOpen ? "opacity-100" : "pointer-events-none opacity-0"} flex h-full flex-col space-y-3 transition`}>
              <div>
                <h1 className="text-sm font-semibold text-zinc-100">Prompt Performance Tester</h1>
                <p className="text-[11px] text-zinc-400">Preferências da interface</p>
              </div>
              <div className="flex flex-1 flex-col space-y-1 text-xs">
                <p className="font-semibold uppercase tracking-wide text-zinc-400">{getMessage(locale, "theme")}</p>
                <ToggleGroup.Root
                  type="single"
                  value={theme}
                  onValueChange={(value) => {
                    if (value === "dark" || value === "light") {
                      setTheme(value);
                    }
                  }}
                  className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1"
                  aria-label={getMessage(locale, "theme")}
                >
                  <ToggleGroup.Item
                    value="dark"
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 transition data-[state=on]:border-emerald-500 data-[state=on]:bg-emerald-900/30 data-[state=on]:text-emerald-300"
                  >
                    {getMessage(locale, "themeDark")}
                  </ToggleGroup.Item>
                  <ToggleGroup.Item
                    value="light"
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 transition data-[state=on]:border-emerald-500 data-[state=on]:bg-emerald-900/30 data-[state=on]:text-emerald-300"
                  >
                    {getMessage(locale, "themeLight")}
                  </ToggleGroup.Item>
                </ToggleGroup.Root>
                <p className="pt-2 font-semibold uppercase tracking-wide text-zinc-400">{getMessage(locale, "font")}</p>
                <ToggleGroup.Root
                  type="single"
                  value={fontSize}
                  onValueChange={(value) => {
                    if (value === "small" || value === "medium" || value === "large") {
                      setFontSize(value);
                    }
                  }}
                  className="grid grid-cols-3 gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1"
                  aria-label={getMessage(locale, "font")}
                >
                  <ToggleGroup.Item
                    value="small"
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 transition data-[state=on]:border-emerald-500 data-[state=on]:bg-emerald-900/30 data-[state=on]:text-emerald-300"
                  >
                    P
                  </ToggleGroup.Item>
                  <ToggleGroup.Item
                    value="medium"
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 transition data-[state=on]:border-emerald-500 data-[state=on]:bg-emerald-900/30 data-[state=on]:text-emerald-300"
                  >
                    M
                  </ToggleGroup.Item>
                  <ToggleGroup.Item
                    value="large"
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 transition data-[state=on]:border-emerald-500 data-[state=on]:bg-emerald-900/30 data-[state=on]:text-emerald-300"
                  >
                    G
                  </ToggleGroup.Item>
                </ToggleGroup.Root>
                <p className="pt-2 font-semibold uppercase tracking-wide text-zinc-400">{getMessage(locale, "language")}</p>
                <ToggleGroup.Root
                  type="single"
                  value={locale}
                  onValueChange={(value) => {
                    if (value === "pt-BR" || value === "en") {
                      setLocale(value);
                    }
                  }}
                  className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1"
                  aria-label={getMessage(locale, "language")}
                >
                  <ToggleGroup.Item
                    value="pt-BR"
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 transition data-[state=on]:border-emerald-500 data-[state=on]:bg-emerald-900/30 data-[state=on]:text-emerald-300"
                  >
                    PT-BR
                  </ToggleGroup.Item>
                  <ToggleGroup.Item
                    value="en"
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 transition data-[state=on]:border-emerald-500 data-[state=on]:bg-emerald-900/30 data-[state=on]:text-emerald-300"
                  >
                    EN
                  </ToggleGroup.Item>
                </ToggleGroup.Root>
                <p className="pt-2 font-semibold uppercase tracking-wide text-zinc-400">{getMessage(locale, "currency")}</p>
                <ToggleGroup.Root
                  type="single"
                  value={currency}
                  onValueChange={(value) => {
                    if (value === "USD" || value === "BRL") {
                      setCurrency(value);
                    }
                  }}
                  className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1"
                  aria-label={getMessage(locale, "currency")}
                >
                  <ToggleGroup.Item
                    value="USD"
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 transition data-[state=on]:border-emerald-500 data-[state=on]:bg-emerald-900/30 data-[state=on]:text-emerald-300"
                  >
                    $
                    {" "}
                    USD
                  </ToggleGroup.Item>
                  <ToggleGroup.Item
                    value="BRL"
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 transition data-[state=on]:border-emerald-500 data-[state=on]:bg-emerald-900/30 data-[state=on]:text-emerald-300"
                  >
                    R$
                    {" "}
                    BRL
                  </ToggleGroup.Item>
                </ToggleGroup.Root>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void refreshExchangeRate()}
                    className="inline-flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 transition hover:border-emerald-400/70 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={exchangeRateLoading}
                  >
                    <RefreshCw className={`h-3 w-3 ${exchangeRateLoading ? "animate-spin" : ""}`} />
                    {getMessage(locale, "refreshRate")}
                  </button>
                  <span className="text-xs text-zinc-300">
                    {getMessage(locale, "exchangeRateLabel")}: {exchangeRateUsdToBrl.toFixed(4)}
                    {exchangeRateUpdatedAt ? ` • ${new Date(exchangeRateUpdatedAt).toLocaleTimeString(locale === "pt-BR" ? "pt-BR" : "en-US")}` : ""}
                    {exchangeRateLoading ? ` • ${getMessage(locale, "loadingRate")}` : ""}
                  </span>
                </div>
                <p className="text-sm text-zinc-300">
                  {getMessage(locale, "currencyEquivalent")}:{" "}
                  {currency === "BRL" ? getMessage(locale, "brlWorthUsd") : getMessage(locale, "usdWorthBrl")}{" "}
                  <span className="font-semibold text-zinc-100">{reciprocalValue}</span>
                </p>
                <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2">
                  <CheckButton
                    id="allow-unavailable-fallback-toggle"
                    checked={allowUnavailableFallback}
                    onCheckedChange={setAllowUnavailableFallback}
                    label={getMessage(locale, "allowUnavailableFallback")}
                    compact
                  />
                  <p className="mt-1 text-[10px] text-zinc-400">{getMessage(locale, "allowUnavailableFallbackHint")}</p>
                </div>
                <p className="mt-auto pt-4 text-[10px] text-zinc-400">Atual: {theme} • {fontSize} • {locale} • {currency}</p>
              </div>
            </div>
          </aside>

          <section
            ref={panelRef}
            className={`min-w-0 flex-1 transition-all ${isPrefsOpen ? "ml-[24.5rem] 2xl:ml-[28.5rem]" : "ml-6"}`}
          >
            <ComparatorPanel />
          </section>
        </div>
        <footer className="mt-8 border-t border-zinc-800/80 pt-4 text-center text-xs text-zinc-400">
          <p>kahbernardo • feito em 2026 • Prompt Tester • copyright</p>
          <p className="mt-1">
            <a
              href="https://github.com/kahbernardo"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-emerald-300"
            >
              GitHub
            </a>
            {" • "}
            <a
              href="https://www.linkedin.com/in/kaique-bernardo/"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-emerald-300"
            >
              LinkedIn
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
