"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApi } from "@/lib/fetchers";
import {
  Triangle, Hexagon, Cloud, Server, GitBranch, Bell,
  CheckCircle, XCircle, Loader2, ExternalLink, Shield,
  Settings as SettingsIcon,
} from "lucide-react";

interface Platform {
  id: string; name: string; connected: boolean;
  tokenVar: string; guideUrl: string; description: string;
}

interface SettingsData {
  platforms: Platform[];
  config: { dashboardName: string; deployDomain: string; githubUsername: string; vercelTeamSlug: string };
}

const platformIcons: Record<string, typeof Triangle> = {
  vercel: Triangle, netlify: Hexagon, cloudflare: Cloud,
  hetzner: Server, github: GitBranch, telegram: Bell,
};

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [tokens, setTokens] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchApi<SettingsData>("/api/settings")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function testConnection(platformId: string) {
    const token = tokens[platformId];
    if (!token) return;
    setTesting(platformId);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: platformId, token }),
      });
      const result = await res.json();
      setTestResults((prev) => ({ ...prev, [platformId]: result }));
    } catch {
      setTestResults((prev) => ({ ...prev, [platformId]: { success: false, message: "Network error" } }));
    } finally {
      setTesting(null);
    }
  }

  if (loading) {
    return (
      <main className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">הגדרות</h1>
        <p className="text-muted-foreground">ניהול פלטפורמות, התראות, והגדרות כלליות</p>
      </div>

      <Tabs defaultValue="platforms" className="space-y-4">
        <TabsList>
          <TabsTrigger value="platforms">פלטפורמות</TabsTrigger>
          <TabsTrigger value="notifications">התראות</TabsTrigger>
          <TabsTrigger value="general">כללי</TabsTrigger>
        </TabsList>

        {/* ── Platforms Tab ── */}
        <TabsContent value="platforms" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            חבר פלטפורמות כדי לראות את הפרויקטים שלך בדשבורד. Tokens נשמרים כ-environment variables מוצפנים.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.platforms.map((platform) => {
              const Icon = platformIcons[platform.id] ?? SettingsIcon;
              const result = testResults[platform.id];
              return (
                <Card key={platform.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        <div>
                          <h3 className="font-semibold">{platform.name}</h3>
                          <p className="text-xs text-muted-foreground">{platform.description}</p>
                        </div>
                      </div>
                      <Badge variant={platform.connected ? "default" : "secondary"} className={platform.connected ? "bg-green-500" : ""}>
                        {platform.connected ? "מחובר" : "לא מחובר"}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder={platform.connected ? "••••••••" : `הזן ${platform.tokenVar}`}
                          value={tokens[platform.id] ?? ""}
                          onChange={(e) => setTokens((prev) => ({ ...prev, [platform.id]: e.target.value }))}
                          className="flex-1 h-8 rounded-md border bg-transparent px-2 text-xs outline-none focus:ring-1 focus:ring-primary font-mono"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testConnection(platform.id)}
                          disabled={!tokens[platform.id] || testing === platform.id}
                          className="h-8"
                        >
                          {testing === platform.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "בדוק"
                          )}
                        </Button>
                      </div>

                      {result && (
                        <div className={`flex items-center gap-1 text-xs ${result.success ? "text-green-600" : "text-red-600"}`}>
                          {result.success ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {result.message}
                        </div>
                      )}

                      <a
                        href={platform.guideUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        איך להשיג {platform.tokenVar}?
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <p>
                  Tokens נשמרים כ-Vercel Environment Variables (מוצפנים at rest).
                  להוספה/עדכון: <code className="bg-muted px-1 rounded text-xs">vercel env add TOKEN_NAME production</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notifications Tab ── */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Telegram Bot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={data?.platforms.find((p) => p.id === "telegram")?.connected ? "default" : "secondary"}
                  className={data?.platforms.find((p) => p.id === "telegram")?.connected ? "bg-green-500" : ""}>
                  {data?.platforms.find((p) => p.id === "telegram")?.connected ? "מחובר" : "לא מחובר"}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-medium">הגדרה:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
                  <li>פתח @BotFather בטלגרם → <code>/newbot</code></li>
                  <li>העתק token → הגדר כ-<code>TELEGRAM_BOT_TOKEN</code></li>
                  <li>שלח הודעה לבוט, אז גש ל-<code>/getUpdates</code> API</li>
                  <li>העתק chat_id → הגדר כ-<code>TELEGRAM_CHAT_ID</code></li>
                </ol>
              </div>
              <div className="border-t pt-3 space-y-2">
                <p className="text-sm font-medium">התראות פעילות:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> דוח יומי (8:00)</div>
                  <div className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> שירות נפל</div>
                  <div className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> ממצא קריטי</div>
                  <div className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> פקודות בוט (/status, /health, /audit)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── General Tab ── */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>הגדרות כלליות</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium">שם הדשבורד</label>
                  <p className="text-sm mt-1 bg-muted px-2 py-1 rounded">{data?.config.dashboardName || "Infra Dashboard"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">env: NEXT_PUBLIC_DASHBOARD_NAME</p>
                </div>
                <div>
                  <label className="text-xs font-medium">GitHub Username</label>
                  <p className="text-sm mt-1 bg-muted px-2 py-1 rounded font-mono">{data?.config.githubUsername || "—"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">env: NEXT_PUBLIC_GITHUB_USERNAME</p>
                </div>
                <div>
                  <label className="text-xs font-medium">Vercel Team</label>
                  <p className="text-sm mt-1 bg-muted px-2 py-1 rounded font-mono">{data?.config.vercelTeamSlug || "—"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">env: NEXT_PUBLIC_VERCEL_TEAM_SLUG</p>
                </div>
                <div>
                  <label className="text-xs font-medium">VPS Deploy Domain</label>
                  <p className="text-sm mt-1 bg-muted px-2 py-1 rounded font-mono">{data?.config.deployDomain || "—"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">env: NEXT_PUBLIC_DEPLOY_DOMAIN</p>
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground">
                  לשינוי הגדרות: עדכן env vars ב-Vercel Dashboard או דרך <code>vercel env add</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
