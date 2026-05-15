"use client"
import { useState } from "react"
import { useQueries } from "@tanstack/react-query"
import { Plus, Loader2, X } from "lucide-react"
import { ReturnChart } from "@/components/charts/ReturnChart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fetchIndicators } from "@/lib/api-client"
import { formatVND, formatPct, dateNDaysAgo, today, changeColor } from "@/lib/utils"

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#f59e0b", "#7c3aed", "#0891b2"]

export default function ComparePage() {
  const [symbols, setSymbols] = useState(["VNM", "FPT"])
  const [newSym, setNewSym]   = useState("")
  const [lookback, setLookback] = useState(180)

  const start = dateNDaysAgo(lookback)
  const end   = today()

  const queries = useQueries({
    queries: symbols.map((sym) => ({
      queryKey: ["compare", sym, start, end],
      queryFn: () => fetchIndicators({ symbol: sym, start, end }),
      staleTime: 60_000,
    })),
  })

  function addSymbol() {
    const clean = newSym.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (clean.length >= 2 && !symbols.includes(clean) && symbols.length < 6) {
      setSymbols((s) => [...s, clean])
      setNewSym("")
    }
  }

  function removeSymbol(sym: string) {
    setSymbols((s) => s.filter((x) => x !== sym))
  }

  // Build normalised return series (base=100)
  const allLoaded = queries.every((q) => q.data)
  const chartData: Record<string, number | string>[] = []
  if (allLoaded) {
    const series = queries.map((q) => q.data!.data)
    const minLen = Math.min(...series.map((s) => s.length))
    const startIdx = series.map((s) => (s.length > minLen ? s.length - minLen : 0))
    for (let i = 0; i < minLen; i++) {
      const row: Record<string, number | string> = { time: series[0][startIdx[0] + i]?.time }
      series.forEach((s, si) => {
        const base  = s[startIdx[si]]?.close ?? 1
        const close = s[startIdx[si] + i]?.close ?? base
        row[symbols[si]] = parseFloat(((close / base) * 100).toFixed(2))
      })
      chartData.push(row)
    }
  }

  // Summary table
  const summaries = queries.map((q, i) => {
    const rows = q.data?.data ?? []
    if (rows.length < 2) return null
    const last = rows[rows.length - 1]
    const first = rows[0]
    const prev  = rows[rows.length - 2]
    const chgPct = prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0
    const retAll = first.close ? ((last.close / first.close) - 1) * 100 : 0
    const ret5   = rows.length >= 5 ? ((last.close / rows[rows.length - 5].close) - 1) * 100 : NaN
    const vols   = rows.map((r) => r.returnPct ?? 0)
    const std    = Math.sqrt(vols.reduce((a, v) => a + (v - vols.reduce((x, y) => x + y, 0) / vols.length) ** 2, 0) / vols.length)
    return { sym: symbols[i], close: last.close, chgPct, retAll, ret5, std, color: COLORS[i] }
  })

  const isLoading = queries.some((q) => q.isLoading)

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => { e.preventDefault(); addSymbol() }}
          className="flex gap-2"
        >
          <Input
            value={newSym}
            onChange={(e) => setNewSym(e.target.value)}
            placeholder="Thêm mã..."
            className="w-28 uppercase"
          />
          <Button type="submit" size="sm" disabled={symbols.length >= 6}>
            <Plus className="h-4 w-4" />
            Thêm
          </Button>
        </form>

        {/* Active symbols */}
        <div className="flex flex-wrap gap-1.5">
          {symbols.map((sym, i) => (
            <span
              key={sym}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white"
              style={{ background: COLORS[i] }}
            >
              {sym}
              <button onClick={() => removeSymbol(sym)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        {/* Lookback */}
        {[90, 180, 365].map((d) => (
          <button
            key={d}
            onClick={() => setLookback(d)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              lookback === d
                ? "bg-slate-700 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {d === 90 ? "3T" : d === 180 ? "6T" : "1N"}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      )}

      {/* Normalised Return Chart */}
      {allLoaded && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lợi nhuận tích lũy (chuẩn hoá, base = 100)</CardTitle>
          </CardHeader>
          <CardContent>
            <ReturnChart data={chartData as any} symbols={symbols} height={400} />
          </CardContent>
        </Card>
      )}

      {/* Summary Table */}
      {allLoaded && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tóm tắt so sánh</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-500">
                    {["Mã", "Giá", "Hôm nay", "5 phiên", "Toàn kỳ", "Volatility"].map((h) => (
                      <th key={h} className="py-2 px-3 text-right first:text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summaries.filter(Boolean).map((s) => (
                    <tr key={s!.sym} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 px-3">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                          style={{ background: s!.color }}
                        >
                          {s!.sym}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-xs">{formatVND(s!.close)}</td>
                      <td className={`py-2 px-3 text-right font-mono text-xs ${changeColor(s!.chgPct)}`}>
                        {formatPct(s!.chgPct)}
                      </td>
                      <td className={`py-2 px-3 text-right font-mono text-xs ${changeColor(s!.ret5)}`}>
                        {isNaN(s!.ret5) ? "—" : formatPct(s!.ret5)}
                      </td>
                      <td className={`py-2 px-3 text-right font-mono text-xs ${changeColor(s!.retAll)}`}>
                        {formatPct(s!.retAll)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-xs text-slate-500">
                        {s!.std.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
