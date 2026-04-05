"use client";

import { Locale } from "@/shared/i18n/messages";
import { create } from "zustand";

type Theme = "dark" | "light";
type FontSize = "small" | "medium" | "large";
export type Currency = "USD" | "BRL";

type UiState = {
  theme: Theme;
  fontSize: FontSize;
  locale: Locale;
  currency: Currency;
  exchangeRateUsdToBrl: number;
  exchangeRateUpdatedAt: string | null;
  exchangeRateLoading: boolean;
  setTheme: (theme: Theme) => void;
  setFontSize: (fontSize: FontSize) => void;
  setLocale: (locale: Locale) => void;
  setCurrency: (currency: Currency) => void;
  refreshExchangeRate: () => Promise<void>;
};

function applyDom(theme: Theme, fontSize: FontSize, locale: Locale): void {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  root.classList.remove("dark", "fontSmall", "fontMedium", "fontLarge");
  if (theme === "dark") {
    root.classList.add("dark");
  }
  root.classList.add(fontSize === "small" ? "fontSmall" : fontSize === "large" ? "fontLarge" : "fontMedium");
  root.lang = locale;
}

export const useUiPreferencesStore = create<UiState>((set, get) => ({
  theme: "dark",
  fontSize: "medium",
  locale: "pt-BR",
  currency: "USD",
  exchangeRateUsdToBrl: 5.2,
  exchangeRateUpdatedAt: null,
  exchangeRateLoading: false,
  setTheme: (theme) => {
    set({ theme });
    const state = get();
    applyDom(theme, state.fontSize, state.locale);
  },
  setFontSize: (fontSize) => {
    set({ fontSize });
    const state = get();
    applyDom(state.theme, fontSize, state.locale);
  },
  setLocale: (locale) => {
    set({ locale });
    const state = get();
    applyDom(state.theme, state.fontSize, locale);
  },
  setCurrency: (currency) => {
    set({ currency });
  },
  refreshExchangeRate: async () => {
    set({ exchangeRateLoading: true });
    try {
      const response = await fetch("/api/exchangeRate", { method: "GET", cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Exchange rate request failed: ${response.status}`);
      }
      const payload = (await response.json()) as { rate: number; updatedAt: string };
      if (!Number.isFinite(payload.rate) || payload.rate <= 0) {
        throw new Error("Invalid exchange rate");
      }
      set({
        exchangeRateUsdToBrl: payload.rate,
        exchangeRateUpdatedAt: payload.updatedAt,
        exchangeRateLoading: false
      });
    } catch {
      set({ exchangeRateLoading: false });
    }
  }
}));
