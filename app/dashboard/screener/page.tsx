"use client"
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { SlidersHorizontal, Search, Star, Loader2, ArrowUpDown, TrendingUp, ShieldAlert, BadgeDollarSign } from "lucide-react"
import Link from "next/link"
import { trpc } from "@/lib/trpc/client"
import { fetchScreener } from "@/lib/api-client"
import type { ScreenerRow } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatVND, formatPct, formatVolume } from "@/lib/utils"
import { useLanguage } from "@/components/providers/LanguageProvider"

type PresetType = "value" | "growth" | "safety" | "none"

export default function ScreenerPage() {
  const { t, language } = useLanguage()
  const [group, setGroup] = useState("VN30")
  const [peMin, setPeMin] = useState<string>("")
  const [peMax, setPeMax] = useState<string>("")
  const [pbMin, setPbMin] = useState<string>("")
  const [pbMax, setPbMax] = useState<string>("")
  const [roeMin, setRoeMin] = useState<string>("")
  const [roaMin, setRoaMin] = useState<string>("")
  const [pctChangeMin, setPctChangeMin] = useState<string>("")
  const [pctChangeMax, setPctChangeMax] = useState<string>("")
  const [volumeMin, setVolumeMin] = useState<string>("")
  
  const [preset, setPreset] = useState<PresetType>("none")
  const [sortField, setSortField] = useState<keyof ScreenerRow | null>(null)
  const [sortAsc, setSortAsc] = useState<boolean>(true)

  // tRPC watchlist
  const { data: watchlistItems = [] } = trpc.watchlist.list.useQuery()
  const utils = trpc.useUtils()
  const addToWatchlist = trpc.watchlist.add.useMutation({
    onSuccess: () => utils.watchlist.list.invalidate(),
  })
  const removeFromWatchlist = trpc.watchlist.remove.useMutation({
    onSuccess: () => utils.watchlist.list.invalidate(),
  })

  // Gọi API Screener
  const { mutate: runFilter, data: results = [], isPending, error } = useMutation({
    onSuccess: (data) => {
      // Do nothing extra, but we could
    },
    mutationFn: () => {
      return fetchScreener({
        group,
        peMin: peMin !== "" ? parseFloat(peMin) : null,
        peMax: peMax !== "" ? parseFloat(peMax) : null,
        pbMin: pbMin !== "" ? parseFloat(pbMin) : null,
        pbMax: pbMax !== "" ? parseFloat(pbMax) : null,
        roeMin: roeMin !== "" ? parseFloat(roeMin) : null,
        roaMin: roaMin !== "" ? parseFloat(roaMin) : null,
        pctChangeMin: pctChangeMin !== "" ? parseFloat(pctChangeMin) : null,
        pctChangeMax: pctChangeMax !== "" ? parseFloat(pctChangeMax) : null,
        volumeMin: volumeMin !== "" ? parseFloat(volumeMin) : null,
      })
    }
  })

  // Áp dụng bộ lọc mẫu (Presets)
  const applyPreset = (type: PresetType) => {
    setPreset(type)
    if (type === "value") {
      setPeMin("")
      setPeMax("12")
      setPbMin("")
      setPbMax("1.5")
      setRoeMin("15")
      setRoaMin("")
      setPctChangeMin("")
      setPctChangeMax("")
      setVolumeMin("100000")
    } else if (type === "growth") {
      setPeMin("10")
      setPeMax("25")
      setPbMin("")
      setPbMax("")
      setRoeMin("20")
      setRoaMin("8")
      setPctChangeMin("1.0")
      setPctChangeMax("")
      setVolumeMin("200000")
    } else if (type === "safety") {
      setPeMin("")
      setPeMax("15")
      setPbMin("")
      setPbMax("2.0")
      setRoeMin("20")
      setRoaMin("10")
      setPctChangeMin("")
      setPctChangeMax("")
      setVolumeMin("50000")
    } else {
      // Clear filters
      setPeMin("")
      setPeMax("")
      setPbMin("")
      setPbMax("")
      setRoeMin("")
      setRoaMin("")
      setPctChangeMin("")
      setPctChangeMax("")
      setVolumeMin("")
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    runFilter()
  }

  const toggleWatchlist = (symbol: string) => {
    const isWatched = watchlistItems.some(item => item.symbol === symbol)
    if (isWatched) {
      removeFromWatchlist.mutate({ symbol })
    } else {
      addToWatchlist.mutate({ 
        symbol, 
        note: language === "vi" ? "Thêm từ bộ lọc cổ phiếu" : "Added from stock screener" 
      })
    }
  }

  // Sắp xếp dữ liệu kết quả
  const handleSort = (field: keyof ScreenerRow) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const sortedResults = [...results].sort((a, b) => {
    if (!sortField) return 0
    let aVal = a[sortField]
    let bVal = b[sortField]

    if (aVal === null || aVal === undefined) return sortAsc ? 1 : -1
    if (bVal === null || bVal === undefined) return sortAsc ? -1 : 1

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
  })

  return (
    <div className="space-y-6 pb-12">
      {/* Tiêu đề trang */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t("screener.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("screener.desc")}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-slate-500 font-medium">{t("screener.presets")}:</span>
        <Button 
          variant={preset === "value" ? "default" : "outline"} 
          size="sm" 
          onClick={() => applyPreset("value")}
          className="h-8 gap-1.5"
        >
          <BadgeDollarSign className="h-4 w-4" />
          {t("screener.presetValue")}
        </Button>
        <Button 
          variant={preset === "growth" ? "default" : "outline"} 
          size="sm" 
          onClick={() => applyPreset("growth")}
          className="h-8 gap-1.5"
        >
          <TrendingUp className="h-4 w-4" />
          {t("screener.presetGrowth")}
        </Button>
        <Button 
          variant={preset === "safety" ? "default" : "outline"} 
          size="sm" 
          onClick={() => applyPreset("safety")}
          className="h-8 gap-1.5"
        >
          <ShieldAlert className="h-4 w-4" />
          {t("screener.presetSafety")}
        </Button>
        {preset !== "none" && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => applyPreset("none")}
            className="h-8 text-xs text-slate-500 hover:text-slate-950"
          >
            {t("screener.reset")}
          </Button>
        )}
      </div>

      {/* Filter Parameters Form */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="py-4 border-b border-slate-50">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            {t("screener.configTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Cột 1: Rổ cổ phiếu */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("screener.stockGroup")}</label>
                <select
                  value={group}
                  onChange={(e) => { setGroup(e.target.value); setPreset("none"); }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="VN30">{language === "vi" ? "Rổ VN30 (30 mã vốn hóa lớn HOSE)" : "VN30 Basket (30 large HOSE stocks)"}</option>
                  <option value="HNX30">{language === "vi" ? "Rổ HNX30 (30 mã lớn sàn HNX)" : "HNX30 Basket (30 large HNX stocks)"}</option>
                  <option value="VN100">{language === "vi" ? "Rổ VN100 (100 mã lớn nhất)" : "VN100 Basket (100 largest stocks)"}</option>
                  <option value="VNMidCap">{language === "vi" ? "Cổ phiếu vốn hóa vừa (VNMidCap)" : "Mid Cap (VNMidCap)"}</option>
                  <option value="VNSmallCap">{language === "vi" ? "Cổ phiếu vốn hóa nhỏ (VNSmallCap)" : "Small Cap (VNSmallCap)"}</option>
                  <option value="HOSE">{language === "vi" ? "Sàn HOSE (Top 150 thanh khoản)" : "HOSE Exchange (Top 150 Liquidity)"}</option>
                  <option value="HNX">{language === "vi" ? "Sàn HNX (Top 150 thanh khoản)" : "HNX Exchange (Top 150 Liquidity)"}</option>
                  <option value="UPCOM">{language === "vi" ? "Sàn UPCoM (Top 150 thanh khoản)" : "UPCoM Exchange (Top 150 Liquidity)"}</option>
                </select>
              </div>

              {/* Cột 2: P/E & P/B */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{language === "vi" ? "Chỉ số P/E & P/B" : "P/E & P/B Ratios"}</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    type="number" 
                    step="0.1" 
                    value={peMax} 
                    onChange={(e) => { setPeMax(e.target.value); setPreset("none"); }} 
                    placeholder={t("screener.maxPE")} 
                    className="h-9 placeholder:text-slate-300 text-sm"
                  />
                  <Input 
                    type="number" 
                    step="0.1" 
                    value={pbMax} 
                    onChange={(e) => { setPbMax(e.target.value); setPreset("none"); }} 
                    placeholder={t("screener.maxPB")} 
                    className="h-9 placeholder:text-slate-300 text-sm"
                  />
                </div>
              </div>

              {/* Cột 3: ROE & ROA */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ROE & ROA (%)</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    type="number" 
                    step="0.5" 
                    value={roeMin} 
                    onChange={(e) => { setRoeMin(e.target.value); setPreset("none"); }} 
                    placeholder={t("screener.minROE")} 
                    className="h-9 placeholder:text-slate-300 text-sm"
                  />
                  <Input 
                    type="number" 
                    step="0.5" 
                    value={roaMin} 
                    onChange={(e) => { setRoaMin(e.target.value); setPreset("none"); }} 
                    placeholder={t("screener.minROA")} 
                    className="h-9 placeholder:text-slate-300 text-sm"
                  />
                </div>
              </div>

              {/* Cột 4: Biến động giá & Khối lượng */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{language === "vi" ? "Biến động giá & Khối lượng (Thời gian thực)" : "Price Change & Vol (Real-time)"}</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    type="number" 
                    step="0.1" 
                    value={pctChangeMin} 
                    onChange={(e) => { setPctChangeMin(e.target.value); setPreset("none"); }} 
                    placeholder={t("screener.minPriceChange")} 
                    className="h-9 placeholder:text-slate-300 text-sm"
                  />
                  <Input 
                    type="number" 
                    value={volumeMin} 
                    onChange={(e) => { setVolumeMin(e.target.value); setPreset("none"); }} 
                    placeholder={t("screener.minVolume")} 
                    className="h-9 placeholder:text-slate-300 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-50">
              <Button type="submit" disabled={isPending} className="h-9 gap-1.5 shadow-sm">
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("screener.buttonFiltering")}
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    {t("screener.buttonFilter")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-100 bg-red-50/50">
          <CardContent className="py-3 text-sm text-red-600 font-medium">
            {language === "vi" ? "Đã xảy ra lỗi: " : "An error occurred: "}{error.message || "Please check your Vnstock API key in Settings."}
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="py-4 border-b border-slate-50 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold text-slate-800">
            {t("screener.scanResults", { count: results.length })}
          </CardTitle>
          <div className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">
            {t("screener.cacheNotice")}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!isPending && results.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm text-slate-400">{t("screener.noResults")}</p>
            </div>
          )}

          {isPending && (
            <div className="py-24 text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
              <p className="text-sm text-slate-400">{t("screener.loadingNotice")}</p>
            </div>
          )}

          {results.length > 0 && !isPending && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-medium select-none">
                    <th className="py-3 px-4 w-12"></th>
                    <th onClick={() => handleSort("symbol")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors w-24">
                      <span className="flex items-center gap-1">{t("common.symbol")} <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th onClick={() => handleSort("organ_name")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors max-w-xs">
                      <span className="flex items-center gap-1">{t("common.companyName")} <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th onClick={() => handleSort("price")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors text-right">
                      <span className="flex items-center gap-1 justify-end">{t("common.price")} <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th onClick={() => handleSort("pct_change")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors text-right">
                      <span className="flex items-center gap-1 justify-end">{t("common.pctChange")} <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th onClick={() => handleSort("volume")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors text-right">
                      <span className="flex items-center gap-1 justify-end">{t("common.volume")} <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th onClick={() => handleSort("pe")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors text-right">
                      <span className="flex items-center gap-1 justify-end">{t("common.pe")} <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th onClick={() => handleSort("pb")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors text-right">
                      <span className="flex items-center gap-1 justify-end">{t("common.pb")} <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th onClick={() => handleSort("roe")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors text-right">
                      <span className="flex items-center gap-1 justify-end">{t("common.roe")} <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th onClick={() => handleSort("roa")} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors text-right">
                      <span className="flex items-center gap-1 justify-end">{t("common.roa")} <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="py-3 px-4 text-center">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedResults.map((r) => {
                    const isWatched = watchlistItems.some((w) => w.symbol === r.symbol)
                    const chgColor = r.pct_change > 0 ? "text-emerald-600" : r.pct_change < 0 ? "text-red-500" : "text-slate-500"
                    
                    return (
                      <tr key={r.symbol} className="hover:bg-slate-50/50 transition-colors">
                        {/* 1. Nút Watchlist */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => toggleWatchlist(r.symbol)}
                            disabled={addToWatchlist.isPending || removeFromWatchlist.isPending}
                            className="p-1 text-slate-300 hover:text-amber-400 transition-colors"
                          >
                            <Star className={`h-4 w-4 ${isWatched ? "fill-amber-400 text-amber-400" : ""}`} />
                          </button>
                        </td>

                        {/* 2. Mã */}
                        <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                          {r.symbol}
                          <Badge variant="outline" className="text-[10px] scale-90 px-1 font-normal opacity-70">
                            {r.exchange}
                          </Badge>
                        </td>

                        {/* 3. Tên công ty */}
                        <td className="py-3 px-4 text-slate-600 truncate max-w-[200px]" title={r.organ_name}>
                          {r.organ_name || "—"}
                        </td>

                        {/* 4. Giá */}
                        <td className="py-3 px-4 text-right font-medium text-slate-900">
                          {r.price > 0 ? formatVND(r.price) : "—"}
                        </td>

                        {/* 5. % Thay đổi */}
                        <td className={`py-3 px-4 text-right font-semibold ${chgColor}`}>
                          {formatPct(r.pct_change)}
                        </td>

                        {/* 6. Khối lượng */}
                        <td className="py-3 px-4 text-right text-slate-600">
                          {r.volume > 0 ? formatVolume(r.volume) : "—"}
                        </td>

                        {/* 7. PE */}
                        <td className="py-3 px-4 text-right text-slate-700 font-medium">
                          {typeof r.pe === "number" ? `${r.pe.toFixed(2)}x` : "—"}
                        </td>

                        {/* 8. PB */}
                        <td className="py-3 px-4 text-right text-slate-700 font-medium">
                          {typeof r.pb === "number" ? `${r.pb.toFixed(2)}x` : "—"}
                        </td>

                        {/* 9. ROE */}
                        <td className={`py-3 px-4 text-right font-semibold ${typeof r.roe === "number" && r.roe >= 20 ? "text-emerald-700" : "text-slate-700"}`}>
                          {typeof r.roe === "number" ? `${r.roe.toFixed(2)}%` : "—"}
                        </td>

                        {/* 10. ROA */}
                        <td className="py-3 px-4 text-right text-slate-700">
                          {typeof r.roa === "number" ? `${r.roa.toFixed(2)}%` : "—"}
                        </td>

                        {/* 11. Các nút Action */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center items-center gap-2">
                            <Link href={`/dashboard/lookup?symbol=${r.symbol}`} className="text-xs text-blue-500 font-medium hover:underline flex items-center">
                              {t("common.chart")}
                            </Link>
                            <span className="text-slate-200">|</span>
                            <Link href={`/dashboard/ai?symbol=${r.symbol}`} className="text-xs text-purple-500 font-medium hover:underline flex items-center">
                              {t("common.aiAnalysis")}
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
