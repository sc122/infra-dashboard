import type { AuditReport, AuditFinding, HealthCheck } from "@/lib/types";

import { config } from "@/lib/config";

const TELEGRAM_API = "https://api.telegram.org";
const DASHBOARD_URL = config.dashboardUrl;

function getBotUrl() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return `${TELEGRAM_API}/bot${token}`;
}

function getChatId() {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) throw new Error("TELEGRAM_CHAT_ID is not set");
  return chatId;
}

export async function sendMessage(text: string, parseMode: "HTML" | "Markdown" = "HTML") {
  const res = await fetch(`${getBotUrl()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: getChatId(),
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram error: ${err}`);
  }
  return res.json();
}

// ─── DAILY REPORT ──────────────────────────────────────────────

export async function sendDailyReport(
  healthResults: HealthCheck[],
  audit: AuditReport
) {
  const now = new Date().toLocaleDateString("he-IL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const up = healthResults.filter((h) => h.status === "up");
  const down = healthResults.filter((h) => h.status === "down");

  // Health section
  const healthLines = healthResults
    .sort((a, b) => (a.status === "down" ? -1 : 1))
    .map((h) => {
      const icon = h.status === "up" ? "\u2705" : "\u274C";
      const time = h.status === "up" ? ` (${h.responseTime}ms)` : ` (${h.statusCode ?? "timeout"})`;
      return `  ${icon} ${h.name}${time}`;
    })
    .join("\n");

  // Audit section - top warnings only
  const topFindings = audit.findings
    .filter((f) => f.severity !== "info")
    .slice(0, 5)
    .map((f) => {
      const icon = f.severity === "critical" ? "\u{1F534}" : "\u{1F7E1}";
      return `  ${icon} ${f.title}`;
    })
    .join("\n");

  // Score emoji
  const scoreEmoji = audit.score >= 80 ? "\u2705" : audit.score >= 50 ? "\u{1F7E1}" : "\u{1F534}";

  const message = [
    `\u{1F4CA} <b>\u05D3\u05D5\u05D7 \u05D9\u05D5\u05DE\u05D9 - Infra Dashboard</b>`,
    `${now}`,
    ``,
    `\u{1F3E5} Health Score: ${scoreEmoji} <b>${audit.score}/100</b>`,
    ``,
    `\u{1F4E1} <b>\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9\u05DD: ${up.length}/${healthResults.length} UP</b>${down.length > 0 ? ` (\u{26A0} ${down.length} DOWN)` : ""}`,
    healthLines,
    ``,
    `\u{1F50D} <b>\u05D1\u05D9\u05E7\u05D5\u05E8\u05EA:</b> ${audit.summary.critical} \u05E7\u05E8\u05D9\u05D8\u05D9, ${audit.summary.warning} \u05D0\u05D6\u05D4\u05E8\u05D5\u05EA, ${audit.summary.info} \u05DE\u05D9\u05D3\u05E2`,
    topFindings || "  \u2705 \u05D0\u05D9\u05DF \u05DE\u05DE\u05E6\u05D0\u05D9\u05DD \u05D3\u05D7\u05D5\u05E4\u05D9\u05DD",
    ``,
    `\u{1F517} <a href="${DASHBOARD_URL}">\u05E4\u05EA\u05D7 \u05D3\u05E9\u05D1\u05D5\u05E8\u05D3</a> | <a href="${DASHBOARD_URL}/audit">\u05D1\u05D9\u05E7\u05D5\u05E8\u05EA</a> | <a href="${DASHBOARD_URL}/health">Health</a>`,
  ].join("\n");

  return sendMessage(message);
}

// ─── IMMEDIATE ALERTS ──────────────────────────────────────────

export async function sendServiceDown(services: HealthCheck[]) {
  if (services.length === 0) return;

  const lines = services.map(
    (s) => `  \u274C <b>${s.name}</b> - ${s.statusCode ?? "timeout"}`
  ).join("\n");

  const message = [
    `\u{1F6A8} <b>\u05E9\u05D9\u05E8\u05D5\u05EA \u05E0\u05E4\u05DC!</b>`,
    ``,
    lines,
    ``,
    `<i>${new Date().toLocaleString("he-IL")}</i>`,
    `<a href="${DASHBOARD_URL}/health">\u05D1\u05D3\u05D5\u05E7 \u05E2\u05DB\u05E9\u05D9\u05D5</a>`,
  ].join("\n");

  return sendMessage(message);
}

export async function sendServiceRecovered(name: string) {
  return sendMessage(
    `\u2705 <b>${name}</b> \u05D7\u05D6\u05E8 \u05DC\u05E4\u05E2\u05D5\u05DC\u05D4!\n\n<i>${new Date().toLocaleString("he-IL")}</i>`
  );
}

export async function sendCriticalFinding(finding: AuditFinding) {
  const message = [
    `\u{1F534} <b>\u05DE\u05DE\u05E6\u05D0 \u05E7\u05E8\u05D9\u05D8\u05D9 \u05D7\u05D3\u05E9!</b>`,
    ``,
    `<b>${finding.title}</b>`,
    finding.description,
    ``,
    `\u{1F4A1} ${finding.recommendation}`,
    finding.resource.url ? `\u{1F517} <a href="${finding.resource.url}">\u05E4\u05EA\u05D7 \u05DC\u05D8\u05D9\u05E4\u05D5\u05DC</a>` : "",
    ``,
    `<i>${new Date().toLocaleString("he-IL")}</i>`,
  ].filter(Boolean).join("\n");

  return sendMessage(message);
}

// ─── BOT COMMAND RESPONSES ────────────────────────────────────

export async function sendStatusSummary(healthResults: HealthCheck[]) {
  const up = healthResults.filter((h) => h.status === "up").length;
  const down = healthResults.filter((h) => h.status === "down").length;
  const total = healthResults.length;

  const icon = down === 0 ? "\u2705" : "\u{26A0}";
  const downList = healthResults
    .filter((h) => h.status === "down")
    .map((h) => `  \u274C ${h.name}`)
    .join("\n");

  const message = [
    `${icon} <b>\u05EA\u05DE\u05D5\u05E0\u05EA \u05DE\u05E6\u05D1</b>`,
    ``,
    `\u{1F7E2} UP: ${up}/${total}`,
    down > 0 ? `\u{1F534} DOWN: ${down}/${total}` : "",
    downList,
    ``,
    `<i>${new Date().toLocaleString("he-IL")}</i>`,
  ].filter(Boolean).join("\n");

  return sendMessage(message);
}

export async function sendAuditSummary(audit: AuditReport) {
  const scoreEmoji = audit.score >= 80 ? "\u2705" : audit.score >= 50 ? "\u{1F7E1}" : "\u{1F534}";
  const topFindings = audit.findings
    .filter((f) => f.severity !== "info")
    .slice(0, 8)
    .map((f) => {
      const icon = f.severity === "critical" ? "\u{1F534}" : "\u{1F7E1}";
      return `  ${icon} ${f.title}`;
    })
    .join("\n");

  const message = [
    `\u{1F50D} <b>\u05D1\u05D9\u05E7\u05D5\u05E8\u05EA \u05EA\u05E9\u05EA\u05D9\u05D5\u05EA</b>`,
    ``,
    `Health Score: ${scoreEmoji} <b>${audit.score}/100</b>`,
    `\u05DE\u05DE\u05E6\u05D0\u05D9\u05DD: ${audit.summary.total} (${audit.summary.critical} \u05E7\u05E8\u05D9\u05D8\u05D9, ${audit.summary.warning} \u05D0\u05D6\u05D4\u05E8\u05D5\u05EA)`,
    ``,
    topFindings || "\u2705 \u05D0\u05D9\u05DF \u05DE\u05DE\u05E6\u05D0\u05D9\u05DD \u05D3\u05D7\u05D5\u05E4\u05D9\u05DD",
    ``,
    `<a href="${DASHBOARD_URL}/audit">\u05E4\u05E8\u05D8\u05D9\u05DD \u05DE\u05DC\u05D0\u05D9\u05DD</a>`,
  ].join("\n");

  return sendMessage(message);
}

// Legacy exports for backward compatibility
export async function sendAlert(
  severity: "critical" | "warning" | "info",
  title: string,
  details: string
) {
  const emoji = { critical: "\u{1F534}", warning: "\u{1F7E1}", info: "\u{1F535}" }[severity];
  return sendMessage(`${emoji} <b>${title}</b>\n\n${details}\n\n<i>${new Date().toLocaleString("he-IL")}</i>`);
}

export async function sendHealthReport(
  results: { name: string; status: "up" | "down"; responseTime: number }[]
) {
  const down = results.filter((r) => r.status === "down");
  if (down.length === 0) return;
  return sendAlert("critical", `${down.length} service(s) down!`, down.map((s) => `\u274C <b>${s.name}</b>`).join("\n"));
}
