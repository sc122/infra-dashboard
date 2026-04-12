import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/dashboard/sidebar";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { SetupWizard } from "@/components/dashboard/setup-wizard";
import { TooltipProvider } from "@/components/ui/tooltip";

const rubik = Rubik({ subsets: ["hebrew", "latin"] });

export const metadata: Metadata = {
  title: "Infra Dashboard - מרכז שליטה בתשתיות",
  description: "Unified infrastructure control center for Vercel, Cloudflare, and Hetzner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${rubik.className} antialiased`}>
        <TooltipProvider>
          <CommandPalette />
          <SetupWizard />
          <div className="flex min-h-screen">
            <div className="flex-1 overflow-auto">{children}</div>
            <Sidebar />
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
