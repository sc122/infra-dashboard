"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("Sidebar.languageSwitcher");
  const tLang = useTranslations("Languages");
  const [isPending, startTransition] = useTransition();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale as (typeof routing.locales)[number] });
    });
  }

  return (
    <label
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
      title={t("ariaLabel")}
    >
      <Languages className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">{t("label")}</span>
      <select
        aria-label={t("ariaLabel")}
        value={locale}
        onChange={onChange}
        disabled={isPending}
        className="bg-transparent border border-border rounded-md px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 cursor-pointer"
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {tLang(loc)}
          </option>
        ))}
      </select>
    </label>
  );
}
