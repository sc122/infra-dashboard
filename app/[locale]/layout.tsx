import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "../globals.css";
import { Sidebar } from "@/components/dashboard/sidebar";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { SetupWizard } from "@/components/dashboard/setup-wizard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { routing, isRtl } from "@/i18n/routing";

const rubik = Rubik({ subsets: ["hebrew", "latin", "cyrillic", "arabic"] });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} dir={isRtl(locale) ? "rtl" : "ltr"}>
      <body className={`${rubik.className} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TooltipProvider>
            <CommandPalette />
            <SetupWizard />
            <div className="flex min-h-screen">
              <div className="flex-1 overflow-auto">{children}</div>
              <Sidebar />
            </div>
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
