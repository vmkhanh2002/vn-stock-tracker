"use client"
import { useState } from "react"
import { Loader2, ChevronLeft, ChevronRight, Download } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/LanguageProvider"

const recStyle: Record<string, string> = {
  MUA: "bg-green-100 text-green-700 border-green-200",
  BAN: "bg-red-100 text-red-700 border-red-200",
  GIU: "bg-amber-100 text-amber-700 border-amber-200",
}

const getRecLabel = (rec: string, lang: string) => {
  if (lang === "vi") {
    const labels: Record<string, string> = { MUA: "MUA", BAN: "BÁN", GIU: "GIỮ" }
    return labels[rec] ?? rec
  } else {
    const labels: Record<string, string> = { MUA: "BUY", BAN: "SELL", GIU: "HOLD" }
    return labels[rec] ?? rec
  }
}

export default function AdminLogsPage() {
  const { t, language } = useLanguage()
  const [page, setPage] = useState(1)
  const limit = 50

  const { data, isLoading } = trpc.aiUsage.adminLogs.useQuery({ page, limit })

  function exportCSV() {
    const rows = data?.logs ?? []
    const header = "user,symbol,mode,model,promptTokens,outputTokens,latencyMs,recommendation,date"
    const lines = rows.map((r) =>
      [
        r.user?.email, r.symbol, r.mode, r.model,
        r.promptTokens, r.outputTokens, r.latencyMs,
        r.recommendation, new Date(r.createdAt).toISOString(),
      ].join(",")
    )
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url; a.download = "ai-logs.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const total      = data?.total ?? 0
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">{t("admin.logsTitle")} ({total})</h1>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1.5" />
          {language === "vi" ? "Xuất CSV" : "Export CSV"}
        </Button>
      </div>

      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      )}

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 font-medium">
                {[
                  language === "vi" ? "Người dùng" : "User",
                  t("common.symbol"),
                  t("admin.mode"),
                  "Model",
                  "Prompt",
                  "Output",
                  language === "vi" ? "Độ trễ" : "Latency",
                  language === "vi" ? "Khuyến nghị" : "Rec",
                  language === "vi" ? "Ngày" : "Date"
                ].map((h, i) => (
                  <th key={i} className="py-2 px-2 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-1.5 px-2 text-slate-600">{log.user?.email}</td>
                  <td className="py-1.5 px-2 font-semibold">{log.symbol ?? "—"}</td>
                  <td className="py-1.5 px-2">{log.mode}</td>
                  <td className="py-1.5 px-2 text-slate-400 font-mono">
                    {log.model.replace("gemini-", "g-").replace("openrouter/", "or/")}
                  </td>
                  <td className="py-1.5 px-2 text-right">{log.promptTokens ?? "—"}</td>
                  <td className="py-1.5 px-2 text-right">{log.outputTokens ?? "—"}</td>
                  <td className="py-1.5 px-2 text-right">{log.latencyMs ? `${log.latencyMs}ms` : "—"}</td>
                  <td className="py-1.5 px-2">
                    {log.recommendation ? (
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${recStyle[log.recommendation] ?? ""}`}>
                        {getRecLabel(log.recommendation, language)}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-slate-400">
                    {new Date(log.createdAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-slate-500">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
