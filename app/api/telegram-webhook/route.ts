import { NextRequest, NextResponse } from "next/server";
import { sendStatusSummary, sendAuditSummary, sendMessage } from "@/lib/api/telegram";
import { runAudit } from "@/lib/audit/engine";
import type { HealthCheck } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
    from?: { id: number; first_name: string };
  };
}

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();
    const chatId = update.message?.chat?.id;
    const text = update.message?.text?.trim();

    // Only respond to our chat
    const allowedChat = process.env.TELEGRAM_CHAT_ID;
    if (!chatId || String(chatId) !== allowedChat) {
      return NextResponse.json({ ok: true });
    }

    if (!text) return NextResponse.json({ ok: true });

    const command = text.split(" ")[0].toLowerCase().replace("@infadordebot", "");

    switch (command) {
      case "/status":
      case "/s": {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000";
        try {
          const res = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
          const data = await res.json();
          await sendStatusSummary(data.results ?? []);
        } catch {
          await sendMessage("\u274C \u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA health check");
        }
        break;
      }

      case "/audit":
      case "/a": {
        await sendMessage("\u{1F50D} \u05DE\u05E8\u05D9\u05E5 \u05D1\u05D9\u05E7\u05D5\u05E8\u05EA...");
        try {
          const audit = await runAudit();
          await sendAuditSummary(audit);
        } catch {
          await sendMessage("\u274C \u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E8\u05E6\u05EA \u05D1\u05D9\u05E7\u05D5\u05E8\u05EA");
        }
        break;
      }

      case "/health":
      case "/h": {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000";
        try {
          const res = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
          const data = await res.json();
          const results: HealthCheck[] = data.results ?? [];
          const lines = results.map((h) => {
            const icon = h.status === "up" ? "\u2705" : "\u274C";
            return `${icon} ${h.name} - ${h.responseTime}ms`;
          }).join("\n");
          await sendMessage(`\u{1F4E1} <b>Health Check</b>\n\n${lines || "\u05D0\u05D9\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD"}\n\n<i>${new Date().toLocaleString("he-IL")}</i>`);
        } catch {
          await sendMessage("\u274C \u05E9\u05D2\u05D9\u05D0\u05D4");
        }
        break;
      }

      case "/help":
      case "/start": {
        await sendMessage(
          `\u{1F916} <b>Infra Dashboard Bot</b>\n\n` +
          `<b>\u05E4\u05E7\u05D5\u05D3\u05D5\u05EA:</b>\n` +
          `/status - \u05EA\u05DE\u05D5\u05E0\u05EA \u05DE\u05E6\u05D1 \u05DE\u05D4\u05D9\u05E8\u05D4\n` +
          `/health - \u05D1\u05D3\u05D9\u05E7\u05EA \u05D6\u05DE\u05D9\u05E0\u05D5\u05EA \u05DE\u05E4\u05D5\u05E8\u05D8\u05EA\n` +
          `/audit - \u05D4\u05E8\u05E6\u05EA \u05D1\u05D9\u05E7\u05D5\u05E8\u05EA \u05EA\u05E9\u05EA\u05D9\u05D5\u05EA\n` +
          `/help - \u05E2\u05D6\u05E8\u05D4\n\n` +
          `\u{1F4CA} \u05D3\u05D5\u05D7 \u05D9\u05D5\u05DE\u05D9 \u05E0\u05E9\u05DC\u05D7 \u05DB\u05DC \u05D1\u05D5\u05E7\u05E8 \u05D1-8:00\n` +
          `\u{1F6A8} \u05D4\u05EA\u05E8\u05D0\u05D5\u05EA \u05DE\u05D9\u05D9\u05D3\u05D9\u05D5\u05EA \u05E2\u05DC \u05E0\u05E4\u05D9\u05DC\u05D5\u05EA \u05D5\u05DE\u05DE\u05E6\u05D0\u05D9\u05DD \u05E7\u05E8\u05D9\u05D8\u05D9\u05D9\u05DD`
        );
        break;
      }

      default:
        // Ignore unknown commands
        break;
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // Always 200 for Telegram
  }
}
