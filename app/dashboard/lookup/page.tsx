"use client"
import { useState, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, RefreshCw, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { CandlestickChart } from "@/components/charts/CandlestickChart"
import { VolumeChart } from "@/components/charts/VolumeChart"
import { IndicatorChart } from "@/components/charts/IndicatorChart"
import { KPICard } from "@/components/dashboard/KPICard"
import { SignalPill } from "@/components/dashboard/SignalPill"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchIndicators } from "@/lib/api-client"
import { formatVND, formatPct, formatVolume, dateNDaysAgo, today, changeColor } from "@/lib/utils"
import type { OHLCVRow } from "@/types"

const SOURCES  = ["VCI", "KBS"] as const
const INTERVALS = [
  { v: "1D", l: "Ngày" },
  { v: "1W", l: "Tuần" },
  { v: "1M", l: "Tháng" },
]
const LOOKBACKS = [
  { v: 90,  l: "3T" },
  { v: 180, l: "6T" },
  { v: 365, l: "1N" },
  { v: 730, l: "2N" },
]

function getSignals(last: OHLCVRow, prev: OHLCVRow) {
  const signals: { label: string; signal: "bullish" | "bearish" | "neutral"; value?: string }[] = []
  if (last.ma10 && last.ma20) {
    signals.push({
      label: last.close > last.ma20 ? "Trên MA20" : "Dưới MA20",
      signal: last.close > last.ma20 ? "bullish" : "bearish",
    })
  }
  if (last.rsi != null) {
    signals.push({
      label: last.rsi > 70 ? "Quá mua" : last.rsi < 30 ? "Quá bán" : "RSI trung tính",
      signal: last.rsi > 70 ? "bearish" : last.rsi < 30 ? "bullish" : "neutral",
      value: last.rsi.toFixed(1),
    })
  }
  if (last.macdHist != null) {
    signals.push({
      label: last.macdHist > 0 ? "MACD Bullish" : "MACD Bearish",
      signal: last.macdHist > 0 ? "bullish" : "bearish",
      value: last.macdHist.toFixed(2),
    })
  }
  if (last.adx != null) {
    signals.push({
      label: last.adx > 25 ? "Xu hướng mạnh" : "Giằng co",
      signal: last.adx > 25 ? (last.diPlus! > last.diMinus! ? "bullish" : "bearish") : "neutral",
      value: `ADX ${last.adx.toFixed(0)}`,
    })
  }
  if (last.stochK != null) {
    signals.push({
      label: last.stochK > 80 ? "Stoch quá mua" : last.stochK < 20 ? "Stoch quá bán" : "Stoch trung tính",
      signal: last.stochK > 80 ? "bearish" : last.stochK < 20 ? "bullish" : "neutral",
      value: `K${last.stochK.toFixed(0)}`,
    })
  }
  // Golden/death cross
  if (last.ma10 && last.ma50 && prev.ma10 && prev.ma50) {
    if (prev.ma10 < prev.ma50 && last.ma10 > last.ma50)
      signals.push({ label: "Golden Cross", signal: "bullish" })
    if (prev.ma10 > prev.ma50 && last.ma10 < last.ma50)
      signals.push({ label: "Death Cross", signal: "bearish" })
  }
  return signals
}

export default function LookupPage() {
  const [symbol, setSymbol]   = useState("VNM")
  const [input,  setInput]    = useState("VNM")
  const [source, setSource]   = useState<"VCI" | "KBS">("VCI")
  const [interval, setIv]     = useState("1D")
  const [lookback, setLookback] = useState(180)
  const [showMA, setShowMA]   = useState(true)
  const [showBB, setShowBB]   = useState(false)
  const [tableLimit, setTableLimit] = useState(30)

  const start = dateNDaysAgo(lookback)
  const end   = today()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["indicators", symbol, start, end, source, interval],
    queryFn: () =>
      fetchIndicators({ symbol, start, end, source, interval: interval as any }),
    enabled: !!symbol,
    staleTime: 60_000,
  })

  const rows = data?.data ?? []
  const last = rows[rows.length - 1]
  const prev = rows[rows.length - 2]

  const chg    = last && prev ? last.close - prev.close : null
  const chgPct = last && prev && prev.close ? (chg! / prev.close) * 100 : null
  const signals = last && prev ? getSignals(last, prev) : []

  const volAvg20 = last?.volMa20
  const volRatio = last && volAvg20 ? last.volume / volAvg20 : null

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const clean = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (clean.length >= 2) setSymbol(clean)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="VD: VNM, FPT, VHM"
            className="w-36 uppercase"
          />
          <Button type="submit" size="sm">
            <Search className="h-4 w-4" />
            Tra cứu
          </Button>
        </form>

        {/* Source */}
        <div className="flex gap-1">
          {SOURCES.map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                source === s
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Interval */}
        <div className="flex gap-1">
          {INTERVALS.map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setIv(v)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                interval === v
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Lookback */}
        <div className="flex gap-1">
          {LOOKBACKS.map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setLookback(v)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                lookback === v
                  ? "bg-slate-700 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {(error as Error).message}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      )}

      {last && (
        <>
          {/* KPI Row 1 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KPICard
              label="Giá đóng cửa"
              value={formatVND(last.close)}
              sub={`${formatPct(chgPct)} hôm nay`}
              trend={chgPct == null ? undefined : chgPct > 0 ? "up" : chgPct < 0 ? "down" : "neutral"}
              icon={chgPct != null && chgPct > 0 ? <TrendingUp className="h-4 w-4" /> : chgPct != null && chgPct < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
            />
            <KPICard label="Mở cửa" value={formatVND(last.open)} />
            <KPICard label="Cao nhất" value={formatVND(last.high)} trend="up" />
            <KPICard label="Thấp nhất" value={formatVND(last.low)} trend="down" />
          </div>

          {/* KPI Row 2 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KPICard label="Khối lượng" value={formatVolume(last.volume)} sub={volRatio ? `${volRatio.toFixed(1)}× TB20` : undefined} />
            <KPICard label="RSI(14)" value={last.rsi?.toFixed(1) ?? "—"} sub={last.rsi != null ? (last.rsi > 70 ? "Quá mua" : last.rsi < 30 ? "Quá bán" : "Trung tính") : undefined} />
            <KPICard label="ADX" value={last.adx?.toFixed(1) ?? "—"} sub={last.adx != null ? (last.adx > 25 ? "Xu hướng mạnh" : "Giằng co") : undefined} />
            <KPICard label="MACD Hist" value={last.macdHist?.toFixed(2) ?? "—"} trend={last.macdHist != null ? (last.macdHist > 0 ? "up" : "down") : undefined} />
          </div>

          {/* Signals */}
          {signals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {signals.map((s, i) => (
                <SignalPill key={i} label={s.label} signal={s.signal} value={s.value} />
              ))}
            </div>
          )}

          {/* Overlay toggles */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Overlay:</span>
            {[
              { label: "MA", active: showMA, toggle: () => setShowMA((v) => !v) },
              { label: "BB", active: showBB, toggle: () => setShowBB((v) => !v) },
            ].map(({ label, active, toggle }) => (
              <button
                key={label}
                onClick={toggle}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  active ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Main Chart */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">
                {symbol}
                {chg != null && (
                  <span className={`ml-2 text-sm font-normal ${changeColor(chgPct ?? 0)}`}>
                    {formatVND(chg)} ({formatPct(chgPct)})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <CandlestickChart
                data={rows}
                height={420}
                ma10={showMA}
                ma20={showMA}
                ma50={showMA}
                bbands={showBB}
              />
              <div className="mt-2">
                <VolumeChart data={rows} height={100} />
              </div>
            </CardContent>
          </Card>

          {/* Indicator Tabs */}
          <Card>
            <CardContent className="pt-4">
              <Tabs defaultValue="rsi">
                <TabsList className="mb-3">
                  {["rsi", "macd", "stoch", "adx", "obv", "cci"].map((t) => (
                    <TabsTrigger key={t} value={t} className="uppercase text-xs">
                      {t}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {(["rsi", "macd", "stoch", "adx", "obv", "cci"] as const).map((t) => (
                  <TabsContent key={t} value={t}>
                    <IndicatorChart data={rows} type={t} height={180} />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold">Lịch sử giao dịch</CardTitle>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Hiển thị</span>
                <input
                  type="number"
                  min={5}
                  max={Math.min(300, rows.length)}
                  value={tableLimit}
                  onChange={(e) => {
                    let v = Number(e.target.value)
                    const maxVal = Math.min(300, rows.length)
                    if (v > maxVal) v = maxVal
                    if (v > 0) setTableLimit(v)
                  }}
                  className="w-14 rounded-md border border-slate-200 px-1.5 py-1 text-center font-mono text-xs font-semibold focus:border-blue-500 focus:outline-none"
                />
                <span>phiên gần nhất</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500">
                      {["Ngày", "Mở", "Cao", "Thấp", "Đóng", "KL", "% Thay đổi"].map((h) => (
                        <th key={h} className="py-2 px-2 text-right first:text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows
                      .slice(-tableLimit)
                      .reverse()
                      .map((r, i) => {
                        const pct = r.returnPct ?? 0
                        return (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="py-1.5 px-2 font-mono text-slate-600">{r.time}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{formatVND(r.open)}</td>
                            <td className="py-1.5 px-2 text-right font-mono text-green-700">{formatVND(r.high)}</td>
                            <td className="py-1.5 px-2 text-right font-mono text-red-700">{formatVND(r.low)}</td>
                            <td className="py-1.5 px-2 text-right font-mono font-semibold">{formatVND(r.close)}</td>
                            <td className="py-1.5 px-2 text-right font-mono text-slate-500">{formatVolume(r.volume)}</td>
                            <td className={`py-1.5 px-2 text-right font-mono ${changeColor(pct)}`}>
                              {formatPct(pct)}
                            </td>
                          </tr>
                        )
                      })}
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
