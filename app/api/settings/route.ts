import { NextRequest, NextResponse } from "next/server";
import { getPlatformStatus } from "@/lib/config";

export const dynamic = "force-dynamic";

// GET: return platform connection status + config
export async function GET() {
  try {
    const status = getPlatformStatus();
    const platforms = [
      {
        id: "vercel", name: "Vercel", connected: status.vercel,
        tokenVar: "MY_VERCEL_TOKEN",
        guideUrl: "https://vercel.com/account/tokens",
        description: "Next.js & static site deployments",
      },
      {
        id: "netlify", name: "Netlify", connected: status.netlify,
        tokenVar: "NETLIFY_TOKEN",
        guideUrl: "https://app.netlify.com/user/applications#personal-access-tokens",
        description: "Static & JAMstack sites",
      },
      {
        id: "cloudflare", name: "Cloudflare", connected: status.cloudflare,
        tokenVar: "CF_API_TOKEN",
        guideUrl: "https://dash.cloudflare.com/profile/api-tokens",
        description: "DNS, R2, Workers",
      },
      {
        id: "hetzner", name: "Hetzner", connected: status.hetzner,
        tokenVar: "HETZNER_API_TOKEN",
        guideUrl: "https://console.hetzner.cloud",
        description: "VPS / Docker containers",
      },
      {
        id: "github", name: "GitHub", connected: status.github,
        tokenVar: "GITHUB_TOKEN",
        guideUrl: "https://github.com/settings/tokens",
        description: "Repositories & CI/CD",
      },
      {
        id: "telegram", name: "Telegram", connected: status.telegram,
        tokenVar: "TELEGRAM_BOT_TOKEN",
        guideUrl: "https://t.me/BotFather",
        description: "Notifications & alerts",
      },
    ];

    return NextResponse.json({
      platforms,
      config: {
        dashboardName: process.env.NEXT_PUBLIC_DASHBOARD_NAME || "Infra Dashboard",
        deployDomain: process.env.NEXT_PUBLIC_DEPLOY_DOMAIN || "",
        githubUsername: process.env.NEXT_PUBLIC_GITHUB_USERNAME || "",
        vercelTeamSlug: process.env.NEXT_PUBLIC_VERCEL_TEAM_SLUG || "",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}

// POST: test a platform connection
export async function POST(request: NextRequest) {
  try {
    const { platform, token } = await request.json();

    const testUrls: Record<string, { url: string; headers: Record<string, string> }> = {
      vercel: { url: "https://api.vercel.com/v9/projects?limit=1", headers: { Authorization: `Bearer ${token}` } },
      netlify: { url: "https://api.netlify.com/api/v1/sites?per_page=1", headers: { Authorization: `Bearer ${token}` } },
      cloudflare: { url: "https://api.cloudflare.com/client/v4/user/tokens/verify", headers: { Authorization: `Bearer ${token}` } },
      hetzner: { url: "https://api.hetzner.cloud/v1/servers?per_page=1", headers: { Authorization: `Bearer ${token}` } },
      github: { url: "https://api.github.com/user", headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } },
      telegram: { url: `https://api.telegram.org/bot${token}/getMe`, headers: {} },
    };

    const cfg = testUrls[platform];
    if (!cfg) return NextResponse.json({ error: "Unknown platform" }, { status: 400 });

    const res = await fetch(cfg.url, { headers: cfg.headers });
    const data = await res.json();

    if (res.ok) {
      return NextResponse.json({ success: true, message: `Connected! (${res.status})` });
    } else {
      return NextResponse.json({ success: false, message: `Failed: ${data.message || data.error || res.statusText}` });
    }
  } catch (err) {
    return NextResponse.json({ success: false, message: err instanceof Error ? err.message : "Connection failed" });
  }
}
