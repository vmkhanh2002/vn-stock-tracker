"use client"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { RefreshCw, Loader2 } from "lucide-react"
import { HeatmapTreemap } from "@/components/charts/HeatmapTreemap"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { fetchBoard } from "@/lib/api-client"
import { formatVND, formatVolume, formatPct, changeColor } from "@/lib/utils"

const VN30 = [
  "ACB","BCM","BID","BVH","CTG","FPT","GAS","GVR","HDB","HPG",
  "MBB","MSN","MWG","PLX","POW","SAB","SHB","SSI","STB","TCB",
  "TPB","VCB","VHM","VIB","VIC","VJC","VNM","VPB","VRE","VND",
]

export default function RealtimePage() {
  const [source, setSource] = useState<"VCI" | "KBS">("VCI")

  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["board", source],
    queryFn: () => fetchBoard(VN30, source),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const rows = data?.data ?? []
  const sorted = [...rows].sort((a, b) => b.changePct - a.changePct)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-900">Bảng giá Realtime (VN30)</h1>
        <div className="flex gap-1">
          {(["VCI", "KBS"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                source === s ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />
          Làm mới
        </Button>
        {dataUpdatedAt > 0 && (
          <span className="text-xs text-slate-400">
            Cập nhật: {new Date(dataUpdatedAt).toLocaleTimeString("vi-VN")}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {(error as Error).message}
        </div>
      )}

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      )}

      {rows.length > 0 && (
        <>
          {/* Treemap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Heatmap — màu theo % thay đổi, kích thước theo khối lượng</CardTitle>
            </CardHeader>
            <CardContent>
              <HeatmapTreemap data={rows} height={380} />
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                {[
                  { color: "#16a34a", label: "> +6%" },
                  { color: "#22c55e", label: "+3~6%" },
                  { color: "#86efac", label: "0~3%" },
                  { color: "#94a3b8", label: "0%" },
                  { color: "#fca5a5", label: "0~-3%" },
                  { color: "#ef4444", label: "-3~-6%" },
                  { color: "#dc2626", label: "< -6%" },
                ].map(({ color, label }) => (
                  <span key={label} className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-sm" style={{ background: color }} />
                    {label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Board Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Bảng giá chi tiết</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500">
                      {["Mã", "Giá", "Mở", "Cao", "Thấp", "KL", "Thay đổi", "%"].map((h) => (
                        <th key={h} className="py-2 px-2 text-right first:text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((r) => (
                      <tr key={r.symbol} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-1.5 px-2 font-bold text-slate-900">{r.symbol}</td>
                        <td className="py-1.5 px-2 text-right font-mono font-semibold">{formatVND(r.close)}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-500">{formatVND(r.open)}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-green-700">{formatVND(r.high)}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-red-700">{formatVND(r.low)}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-500">{formatVolume(r.volume)}</td>
                        <td className={`py-1.5 px-2 text-right font-mono ${changeColor(r.changePct)}`}>
                          {formatVND(r.change)}
                        </td>
                        <td className={`py-1.5 px-2 text-right font-mono font-semibold ${changeColor(r.changePct)}`}>
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
