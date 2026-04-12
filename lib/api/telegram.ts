const TELEGRAM_API = "https://api.telegram.org";

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
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram error: ${err}`);
  }
  return res.json();
}

export async function sendAlert(
  severity: "critical" | "warning" | "info",
  title: string,
  details: string
) {
  const emoji = {
    critical: "\u{1F534}",
    warning: "\u{1F7E1}",
    info: "\u{1F535}",
  }[severity];

  const message = `${emoji} <b>${title}</b>\n\n${details}\n\n<i>${new Date().toLocaleString("he-IL")}</i>`;
  return sendMessage(message);
}

export async function sendHealthReport(
  results: { name: string; status: "up" | "down"; responseTime: number }[]
) {
  const downServices = results.filter((r) => r.status === "down");
  if (downServices.length === 0) return;

  const lines = downServices.map(
    (s) => `\u{274C} <b>${s.name}</b> - DOWN`
  );

  return sendAlert(
    "critical",
    `${downServices.length} service(s) down!`,
    lines.join("\n")
  );
}
