import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["he", "en", "ar", "ru"],
  defaultLocale: "he",
  localePrefix: "always",
});

export const rtlLocales = new Set(["he", "ar"]);

export type Locale = (typeof routing.locales)[number];

export const isRtl = (locale: string): boolean => rtlLocales.has(locale);
