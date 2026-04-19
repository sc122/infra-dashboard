"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bell, Send, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function AlertsPage() {
  const t = useTranslations("AlertsPage");
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
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
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
            <h3 className="font-medium">{t("telegramSetupTitle")}</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>{t("telegramSteps.step1")}</li>
              <li>{t("telegramSteps.step2")}</li>
              <li>{t("telegramSteps.step3")}</li>
              <li>{t("telegramSteps.step4")}</li>
              <li>{t("telegramSteps.step5")}</li>
            </ol>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={sendTestNotification} disabled={testStatus === "sending"}>
              {testStatus === "sending" ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 me-2" />
              )}
              {t("sendTest")}
            </Button>

            {testStatus === "success" && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 me-1" />
                {t("sentSuccess")}
              </Badge>
            )}
            {testStatus === "error" && (
              <Badge className="bg-red-100 text-red-800">
                <XCircle className="h-3 w-3 me-1" />
                {t("errorPrefix", { error: errorMsg })}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alert Types */}
      <Card>
        <CardHeader>
          <CardTitle>{t("alertTypesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <AlertTitle className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
              {t("types.criticalServiceDownTitle")}
            </AlertTitle>
            <AlertDescription>
              {t("types.criticalServiceDownDesc")}
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertTitle className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
              {t("types.criticalVpsDownTitle")}
            </AlertTitle>
            <AlertDescription>
              {t("types.criticalVpsDownDesc")}
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertTitle className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-yellow-500" />
              {t("types.warningDeployFailedTitle")}
            </AlertTitle>
            <AlertDescription>
              {t("types.warningDeployFailedDesc")}
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertTitle className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-yellow-500" />
              {t("types.warningSslExpiringTitle")}
            </AlertTitle>
            <AlertDescription>
              {t("types.warningSslExpiringDesc")}
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertTitle className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
              {t("types.infoCostsExceededTitle")}
            </AlertTitle>
            <AlertDescription>
              {t("types.infoCostsExceededDesc")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Cron Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>{t("scheduleTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("scheduleDescription")}
          </p>
          <p className="text-sm font-mono mt-2 bg-muted p-2 rounded">
            cron: */5 * * * * → /api/cron
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
