"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bell, Send, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { fetchApi } from "@/lib/fetchers";

export default function AlertsPage() {
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function sendTestNotification() {
    setTestStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "test" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
      }
      setTestStatus("success");
    } catch (err) {
      setTestStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">התראות</h1>
        <p className="text-muted-foreground">הגדרת התראות Telegram</p>
      </div>

      {/* Telegram Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Telegram Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">הגדרה:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>פתח @BotFather בטלגרם ושלח <code>/newbot</code></li>
              <li>תן שם לבוט (למשל: Infra Dashboard Bot)</li>
              <li>העתק את ה-Token ושים ב-<code>TELEGRAM_BOT_TOKEN</code></li>
              <li>שלח הודעה לבוט ואז גש ל-<code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code></li>
              <li>העתק את ה-chat_id ושים ב-<code>TELEGRAM_CHAT_ID</code></li>
            </ol>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={sendTestNotification} disabled={testStatus === "sending"}>
              {testStatus === "sending" ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 ml-2" />
              )}
              שלח הודעת בדיקה
            </Button>

            {testStatus === "success" && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 ml-1" />
                נשלח בהצלחה!
              </Badge>
            )}
            {testStatus === "error" && (
              <Badge className="bg-red-100 text-red-800">
                <XCircle className="h-3 w-3 ml-1" />
                שגיאה: {errorMsg}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alert Types */}
      <Card>
        <CardHeader>
          <CardTitle>סוגי התראות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <AlertTitle className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
              Critical - שירות נפל
            </AlertTitle>
            <AlertDescription>
              התראה מיידית כשפרויקט לא מגיב לבדיקת health check
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertTitle className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
              Critical - VPS לא מגיב
            </AlertTitle>
            <AlertDescription>
              כששרת Hetzner לא מגיב ל-API
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertTitle className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-yellow-500" />
              Warning - Deploy נכשל
            </AlertTitle>
            <AlertDescription>
              כש-Vercel deployment נכשל
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertTitle className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-yellow-500" />
              Warning - SSL פג תוקף
            </AlertTitle>
            <AlertDescription>
              כשתעודת SSL עומדת לפוג ב-14 הימים הקרובים
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertTitle className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
              Info - חריגה בעלויות
            </AlertTitle>
            <AlertDescription>
              כשעלות חודשית חורגת מהתקציב שהוגדר
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Cron Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>לוח זמנים</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Health check רץ כל 5 דקות דרך Vercel Cron Jobs.
            התראות נשלחות רק כשיש בעיה (לא כל 5 דקות).
          </p>
          <p className="text-sm font-mono mt-2 bg-muted p-2 rounded">
            cron: */5 * * * * → /api/cron
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
