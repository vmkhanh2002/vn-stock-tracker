"use client"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { RefreshCw, Loader2 } from "lucide-react"
import { HeatmapTreemap } from "@/components/charts/HeatmapTreemap"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { fetchBoard } from "@/lib/api-client"
import { formatVND, formatVolume, formatPct, changeColor } from "@/lib/utils"
import { useLanguage } from "@/components/providers/LanguageProvider"

const GROUPS = [
  { id: "VN30", labelVi: "VN30 (HOSE)", labelEn: "VN30 (HOSE)" },
  { id: "HNX30", labelVi: "HNX30 (HNX)", labelEn: "HNX30 (HNX)" },
  { id: "VN100", labelVi: "VN100 (HOSE)", labelEn: "VN100 (HOSE)" },
  { id: "VNMidCap", labelVi: "VNMidCap (HOSE)", labelEn: "VNMidCap (HOSE)" },
  { id: "VNSmallCap", labelVi: "VNSmallCap (HOSE)", labelEn: "VNSmallCap (HOSE)" },
  { id: "HOSE", labelVi: "Sàn HOSE (Top 150)", labelEn: "HOSE Exchange (Top 150)" },
  { id: "HNX", labelVi: "Sàn HNX (Top 150)", labelEn: "HNX Exchange (Top 150)" },
  { id: "UPCOM", labelVi: "Sàn UPCoM (Top 150)", labelEn: "UPCoM Exchange (Top 150)" },
]

export default function RealtimePage() {
  const { t, language } = useLanguage()
  const [source, setSource] = useState<"VCI" | "KBS">("VCI")
  const [group, setGroup] = useState<string>("VN30")

  // 1. Kéo danh sách mã cổ phiếu động của rổ được chọn từ Backend
  const { data: symbolsData, isLoading: isLoadingSymbols, error: symbolsError } = useQuery({
    queryKey: ["group-symbols", group],
    queryFn: async () => {
      const res = await fetch(`/api/py/stock/group-symbols?group=${group}`)
      if (!res.ok) {
        throw new Error(language === "vi" ? "Không thể tải danh sách mã nhóm cổ phiếu" : "Failed to load index group stock symbols")
      }
      return res.json() as Promise<{ symbols: string[]; count: number }>
    },
    staleTime: 300_000, // 5 phút cache danh sách mã
  })

  const symbols = symbolsData?.symbols ?? []

  // 2. Kéo bảng giá realtime của danh sách mã
  const { data, isLoading: isLoadingBoard, error: boardError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["board", source, group, symbols],
    queryFn: () => fetchBoard(symbols, source),
    enabled: symbols.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const rows = data?.data ?? []
  const sorted = [...rows].sort((a, b) => b.changePct - a.changePct)

  const isLoading = isLoadingSymbols || (isLoadingBoard && symbols.length > 0)
  const error = symbolsError || boardError
  const selectedGroup = GROUPS.find(g => g.id === group)
  const selectedGroupLabel = selectedGroup ? (language === "vi" ? selectedGroup.labelVi : selectedGroup.labelEn) : group

  return (
    <div className="space-y-5">
      {/* Top Header controls */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
          {language === "vi" ? `Bảng giá trực tuyến (${selectedGroupLabel})` : `Real-time Prices (${selectedGroupLabel})`}
        </h1>
        
        {/* Dropdown chọn rổ cổ phiếu */}
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-950"
        >
          {GROUPS.map((g) => (
            <option key={g.id} value={g.id}>
              {language === "vi" ? g.labelVi : g.labelEn}
            </option>
          ))}
        </select>

        {/* Nguồn dữ liệu */}
        <div className="flex gap-1">
          {(["VCI", "KBS"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                source === s ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 gap-1">
          <RefreshCw className="h-3.5 w-3.5" />
          {language === "vi" ? "Làm mới" : "Refresh"}
        </Button>
        {dataUpdatedAt > 0 && (
          <span className="text-xs text-slate-400 font-medium">
            {language === "vi" ? "Cập nhật lúc: " : "Updated: "}{new Date(dataUpdatedAt).toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US")}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 font-medium">
          {error instanceof Error ? error.message : (language === "vi" ? "Đã xảy ra lỗi khi tải dữ liệu bảng giá." : "An error occurred while loading price board data.")}
        </div>
      )}

      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      )}

      {!isLoading && !error && rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
          {language === "vi" ? "Không có dữ liệu bảng giá cho nhóm cổ phiếu này." : "No price board data available for this index group."}
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <>
          {/* Treemap Heatmap */}
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="py-4 border-b border-slate-50">
              <CardTitle className="text-sm font-semibold text-slate-800">
                {language === "vi" ? "Bản đồ nhiệt — màu sắc theo % thay đổi, diện tích theo khối lượng giao dịch" : "Heatmap — color by % change, size by trading volume"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <HeatmapTreemap data={rows} height={380} />
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500 justify-center">
                {[
                  { color: "#16a34a", label: "> +6%" },
                  { color: "#22c55e", label: "+3~6%" },
                  { color: "#86efac", label: "0~3%" },
                  { color: "#94a3b8", label: "0%" },
                  { color: "#fca5a5", label: "0~-3%" },
                  { color: "#ef4444", label: "-3~-6%" },
                  { color: "#dc2626", label: "< -6%" },
                ].map(({ color, label }) => (
                  <span key={label} className="flex items-center gap-1.5 font-medium">
                    <span className="h-3.5 w-3.5 rounded-sm" style={{ background: color }} />
                    {label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Board Table */}
          <Card className="border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="py-4 border-b border-slate-50">
              <CardTitle className="text-sm font-semibold text-slate-800">
                {language === "vi" ? `Bảng giá chi tiết (${rows.length} mã)` : `Detailed Price Board (${rows.length} stocks)`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-medium">
                      {[
                        t("common.symbol"),
                        language === "vi" ? "Giá đóng" : "Close",
                        language === "vi" ? "Giá mở" : "Open",
                        language === "vi" ? "Cao nhất" : "High",
                        language === "vi" ? "Thấp nhất" : "Low",
                        t("common.volume"),
                        language === "vi" ? "Thay đổi" : "Change",
                        t("common.pctChange")
                      ].map((h, i) => (
                        <th key={i} className="py-2.5 px-4 text-right first:text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sorted.map((r) => (
                      <tr key={r.symbol} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2 px-4 font-bold text-slate-900">{r.symbol}</td>
                        <td className="py-2 px-4 text-right font-mono font-semibold text-slate-800">{formatVND(r.close)}</td>
                        <td className="py-2 px-4 text-right font-mono text-slate-500">{formatVND(r.open)}</td>
                        <td className="py-2 px-4 text-right font-mono text-green-700">{formatVND(r.high)}</td>
                        <td className="py-2 px-4 text-right font-mono text-red-700">{formatVND(r.low)}</td>
                        <td className="py-2 px-4 text-right font-mono text-slate-600">{formatVolume(r.volume)}</td>
                        <td className={`py-2 px-4 text-right font-mono ${changeColor(r.changePct)}`}>
                          {formatVND(r.change)}
                        </td>
                        <td className={`py-2 px-4 text-right font-mono font-semibold ${changeColor(r.changePct)}`}>
                          {formatPct(r.changePct)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
