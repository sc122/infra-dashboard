"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchApi } from "@/lib/fetchers";
import {
  Server, Triangle, Hexagon, Cloud, GitBranch, Bell,
  ArrowLeft, CheckCircle, XCircle, Loader2, ExternalLink, Rocket,
} from "lucide-react";

interface Platform {
  id: string; name: string; connected: boolean;
  tokenVar: string; guideUrl: string; description: string;
}

const icons: Record<string, typeof Triangle> = {
  vercel: Triangle, netlify: Hexagon, cloudflare: Cloud,
  hetzner: Server, github: GitBranch, telegram: Bell,
};

export function SetupWizard() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [step, setStep] = useState(0); // 0=check, 1=welcome, 2=connect, 3=done
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const router = useRouter();

  useEffect(() => {
    fetchApi<{ platforms: Platform[] }>("/api/settings")
      .then((data) => {
        setPlatforms(data.platforms);
        const anyConnected = data.platforms.some((p) => p.connected);
        setIsFirstRun(!anyConnected);
        setStep(anyConnected ? 0 : 1);
        // Pre-fill results for already connected
        const r: Record<string, boolean> = {};
        data.platforms.forEach((p) => { if (p.connected) r[p.id] = true; });
        setResults(r);
      })
      .catch(() => setStep(0))
      .finally(() => setLoading(false));
  }, []);

  async function testToken(id: string) {
    if (!tokens[id]) return;
    setTesting(id);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: id, token: tokens[id] }),
      });
      const data = await res.json();
      setResults((prev) => ({ ...prev, [id]: data.success }));
    } catch {
      setResults((prev) => ({ ...prev, [id]: false }));
    } finally {
      setTesting(null);
    }
  }

  // Don't show wizard if platforms are already connected
  if (loading || !isFirstRun || step === 0) return null;

  const connectedCount = Object.values(results).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-6">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center space-y-4">
              <Server className="h-12 w-12 mx-auto text-primary" />
              <h2 className="text-xl font-bold">ברוך הבא ל-Infra Dashboard</h2>
              <p className="text-muted-foreground text-sm">
                חבר את הפלטפורמות שלך כדי לראות את כל הפרויקטים במקום אחד.
                תוכל להוסיף ולשנות בכל עת בהגדרות.
              </p>
              <Button onClick={() => setStep(2)} className="w-full">
                <Rocket className="h-4 w-4 ml-2" />
                בוא נתחיל
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setIsFirstRun(false); router.push("/settings"); }}>
                דלג — אגדיר אחר כך
              </Button>
            </div>
          )}

          {/* Step 2: Connect platforms */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">חבר פלטפורמות</h2>
                <Badge variant="secondary">{connectedCount} מחוברים</Badge>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {platforms.map((p) => {
                  const Icon = icons[p.id] ?? Server;
                  const tested = results[p.id];
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-md border">
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{p.name}</span>
                          {tested === true && <CheckCircle className="h-3 w-3 text-green-500" />}
                          {tested === false && <XCircle className="h-3 w-3 text-red-500" />}
                          {p.connected && !tokens[p.id] && <Badge variant="outline" className="text-[9px]">כבר מחובר</Badge>}
                        </div>
                        <div className="flex gap-1 mt-1">
                          <input
                            type="password"
                            placeholder={p.connected ? "••••" : p.tokenVar}
                            value={tokens[p.id] ?? ""}
                            onChange={(e) => setTokens((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            className="flex-1 h-7 rounded border bg-transparent px-2 text-[11px] font-mono outline-none"
                          />
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2"
                            disabled={!tokens[p.id] || testing === p.id}
                            onClick={() => testToken(p.id)}>
                            {testing === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "בדוק"}
                          </Button>
                        </div>
                        <a href={p.guideUrl} target="_blank" rel="noopener noreferrer"
                          className="text-[9px] text-blue-500 hover:underline flex items-center gap-0.5 mt-0.5">
                          <ExternalLink className="h-2.5 w-2.5" /> איך להשיג token
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} size="sm">
                  <ArrowLeft className="h-3 w-3 ml-1" /> חזור
                </Button>
                <Button className="flex-1" onClick={() => setStep(3)} disabled={connectedCount === 0}>
                  המשך ({connectedCount} מחוברים)
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <h2 className="text-xl font-bold">הכל מוכן!</h2>
              <p className="text-muted-foreground text-sm">
                {connectedCount} פלטפורמות מחוברות. הדשבורד יגלה אוטומטית את כל הפרויקטים שלך.
              </p>
              <p className="text-xs text-muted-foreground">
                לשמירת ה-tokens, הוסף אותם כ-environment variables ב-Vercel או ב-<code>.env.local</code>
              </p>
              <Button className="w-full" onClick={() => { setIsFirstRun(false); router.push("/"); }}>
                פתח דשבורד
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
