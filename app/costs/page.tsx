"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Triangle, Cloud, Server } from "lucide-react";

// Cost data - will be dynamic once APIs are connected
const costItems = [
  {
    platform: "Vercel",
    icon: Triangle,
    plan: "Hobby (Free)",
    monthlyCost: 0,
    details: [
      { item: "Bandwidth", usage: "100 GB/mo included", cost: 0 },
      { item: "Serverless Functions", usage: "100 GB-Hrs included", cost: 0 },
      { item: "Builds", usage: "6,000 min/mo included", cost: 0 },
    ],
  },
  {
    platform: "Cloudflare",
    icon: Cloud,
    plan: "Free",
    monthlyCost: 0,
    details: [
      { item: "R2 Storage", usage: "10 GB/mo included", cost: 0 },
      { item: "R2 Operations", usage: "10M reads/mo included", cost: 0 },
      { item: "DNS", usage: "Unlimited", cost: 0 },
    ],
  },
  {
    platform: "Hetzner VPS",
    icon: Server,
    plan: "Cloud Server",
    monthlyCost: 0,
    details: [
      { item: "Server", usage: "TBD - connect Hetzner API", cost: 0 },
      { item: "Bandwidth", usage: "20 TB/mo included", cost: 0 },
      { item: "Backups", usage: "20% of server price", cost: 0 },
    ],
  },
];

export default function CostsPage() {
  const totalMonthlyCost = costItems.reduce((sum, c) => sum + c.monthlyCost, 0);

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">עלויות</h1>
        <p className="text-muted-foreground">מעקב עלויות חודשי לכל הפלטפורמות</p>
      </div>

      {/* Total cost card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>עלות חודשית כוללת</CardTitle>
          <DollarSign className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            ${totalMonthlyCost.toFixed(2)}
            <span className="text-sm font-normal text-muted-foreground mr-2">/חודש</span>
          </div>
        </CardContent>
      </Card>

      {/* Per-platform breakdown */}
      {costItems.map((platform) => (
        <Card key={platform.platform}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <platform.icon className="h-4 w-4" />
                {platform.platform}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{platform.plan}</Badge>
                <span className="font-bold">${platform.monthlyCost.toFixed(2)}/mo</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">פריט</TableHead>
                  <TableHead className="text-right">שימוש</TableHead>
                  <TableHead className="text-right">עלות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platform.details.map((d) => (
                  <TableRow key={d.item}>
                    <TableCell className="font-medium">{d.item}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.usage}</TableCell>
                    <TableCell className="font-mono">${d.cost.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </main>
  );
}
