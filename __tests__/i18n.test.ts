import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import he from "@/messages/he.json";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import ru from "@/messages/ru.json";

type Messages = Record<string, unknown>;

const dictionaries: Record<string, Messages> = { he, en, ar, ru };

function flattenKeys(obj: Messages, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Messages, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

describe("i18n message dictionaries", () => {
  it("has a dictionary for every supported locale", () => {
    for (const locale of routing.locales) {
      expect(dictionaries[locale], `missing dictionary for ${locale}`).toBeDefined();
    }
  });

  it("all locales contain the same keys as the default locale (he)", () => {
    const baseKeys = new Set(flattenKeys(dictionaries[routing.defaultLocale]));
    for (const locale of routing.locales) {
      if (locale === routing.defaultLocale) continue;
      const localeKeys = new Set(flattenKeys(dictionaries[locale]));
      const missing = [...baseKeys].filter((k) => !localeKeys.has(k));
      const extra = [...localeKeys].filter((k) => !baseKeys.has(k));
      expect(missing, `${locale} is missing keys: ${missing.join(", ")}`).toEqual([]);
      expect(extra, `${locale} has extra keys not in ${routing.defaultLocale}: ${extra.join(", ")}`).toEqual([]);
    }
  });

  it("no message value is empty", () => {
    for (const locale of routing.locales) {
      const flatten = (obj: Messages, prefix = ""): Array<[string, unknown]> => {
        const out: Array<[string, unknown]> = [];
        for (const [key, value] of Object.entries(obj)) {
          const path = prefix ? `${prefix}.${key}` : key;
          if (value && typeof value === "object" && !Array.isArray(value)) {
            out.push(...flatten(value as Messages, path));
          } else {
            out.push([path, value]);
          }
        }
        return out;
      };
      for (const [path, value] of flatten(dictionaries[locale])) {
        expect(typeof value === "string" && value.length > 0, `${locale}:${path} is empty or non-string`).toBe(true);
      }
    }
  });
});
