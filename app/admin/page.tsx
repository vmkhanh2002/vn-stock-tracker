"use client"
import { useQuery } from "@tanstack/react-query"
import { Users, BrainCircuit, Bell, Activity, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { KPICard } from "@/components/dashboard/KPICard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/components/providers/LanguageProvider"

export default function AdminPage() {
  const { t, language } = useLanguage()
  const { data: stats, isLoading } = trpc.aiUsage.adminStats.useQuery()

  const { data: health } = useQuery({
    queryKey: ["py-health"],
    queryFn: () => fetch("/api/py/health").then((r) => r.json()),
    staleTime: 30_000,
  })

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
  }

  const dist = stats?.distribution ?? []
  const mua  = dist.find((d) => d.recommendation === "MUA")?._count.recommendation ?? 0
  const ban  = dist.find((d) => d.recommendation === "BAN")?._count.recommendation ?? 0
  const giu  = dist.find((d) => d.recommendation === "GIU")?._count.recommendation ?? 0

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-slate-900">
        {language === "vi" ? "Trang quản trị" : "Admin Dashboard"}
      </h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard label={t("admin.totalUsers")} value={String(stats?.totalUsers ?? "—")} icon={<Users className="h-4 w-4" />} />
        <KPICard label={language === "vi" ? "Số cuộc gọi AI hôm nay" : "AI Calls Today"} value={String(stats?.totalToday ?? "—")} icon={<BrainCircuit className="h-4 w-4" />} />
        <KPICard label="Python API" value={health?.status === "ok" ? (language === "vi" ? "Hoạt động" : "Online") : (language === "vi" ? "Ngoại tuyến" : "Offline")} trend={health?.status === "ok" ? "up" : "down"} icon={<Activity className="h-4 w-4" />} />
        <KPICard label={language === "vi" ? "Ngày DB" : "DB Date"} value={health?.date ?? "—"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {language === "vi" ? "Phân bổ khuyến nghị AI (toàn thời gian)" : "AI Recommendation Distribution (all time)"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm">{language === "vi" ? "MUA" : "BUY"}: <b>{mua}</b></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-sm">{language === "vi" ? "BÁN" : "SELL"}: <b>{ban}</b></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500" />
              <span className="text-sm">{language === "vi" ? "NẮM GIỮ" : "HOLD"}: <b>{giu}</b></span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
