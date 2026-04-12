/**
 * Centralized configuration derived from environment variables.
 * All user-specific values come from here — nothing hardcoded.
 *
 * For client-side access, variables must be prefixed with NEXT_PUBLIC_.
 * Server-side variables (tokens) are accessed directly via process.env.
 */

// ─── Client-side config (available in browser) ───────────────

export const config = {
  /** Vercel team slug for management URLs */
  vercelTeamSlug: process.env.NEXT_PUBLIC_VERCEL_TEAM_SLUG || "",

  /** Cloudflare account ID for management URLs */
  cfAccountId: process.env.NEXT_PUBLIC_CF_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || "",

  /** GitHub username/org for profile links */
  githubUsername: process.env.NEXT_PUBLIC_GITHUB_USERNAME || "",

  /** Primary domain used on VPS (for subdomain detection in deploy scripts) */
  deployDomain: process.env.NEXT_PUBLIC_DEPLOY_DOMAIN || "",

  /** Dashboard display name */
  dashboardName: process.env.NEXT_PUBLIC_DASHBOARD_NAME || "Infra Dashboard",

  /** Dashboard public URL (for Telegram links) */
  dashboardUrl: process.env.NEXT_PUBLIC_DASHBOARD_URL || (
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"
  ),
};

// ─── Platform connection status (server-side check) ──────────

export function getPlatformStatus() {
  return {
    vercel: !!process.env.MY_VERCEL_TOKEN,
    netlify: !!process.env.NETLIFY_TOKEN,
    cloudflare: !!process.env.CF_API_TOKEN,
    hetzner: !!process.env.HETZNER_API_TOKEN,
    github: !!process.env.GITHUB_TOKEN,
    telegram: !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_CHAT_ID,
  };
}

/** Check if any platform is configured (for first-run detection) */
export function isFirstRun() {
  const status = getPlatformStatus();
  return !status.vercel && !status.netlify && !status.cloudflare &&
         !status.hetzner && !status.github;
}
