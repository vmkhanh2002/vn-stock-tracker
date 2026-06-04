"use client"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { BrainCircuit, Loader2, Search } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { AIBadge } from "@/components/dashboard/AIBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchAIContext } from "@/lib/api-client"
import { dateNDaysAgo, today } from "@/lib/utils"
import type { Recommendation } from "@/types"
import { useLanguage } from "@/components/providers/LanguageProvider"

const LOOKBACKS = [
  { v: 30,  l: "30 sessions" },
  { v: 60,  l: "60 sessions" },
  { v: 90,  l: "90 sessions" },
  { v: 120, l: "120 sessions" },
  { v: 180, l: "180 sessions" },
  { v: 240, l: "240 sessions" },
  { v: 300, l: "300 sessions" },
]

function AnalyzePanel({ symbol }: { symbol: string }) {
  const { t, language } = useLanguage()

  const horizonOptions = [
    { v: "short", l: t("ai.shortTerm") },
    { v: "medium", l: t("ai.mediumTerm") },
    { v: "long", l: t("ai.longTerm") },
  ]
  const riskOptions = [
    { v: "low", l: t("ai.lowRisk") },
    { v: "medium", l: t("ai.mediumRisk") },
    { v: "high", l: t("ai.highRisk") },
  ]

  const [horizonKey, setHorizonKey] = useState<"short" | "medium" | "long">("short")
  const [riskKey, setRiskKey] = useState<"low" | "medium" | "high">("medium")
  const [question, setQuestion] = useState("")
  const [answer,  setAnswer]  = useState("")
  const [rec,     setRec]     = useState<Recommendation | null>(null)
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState("")

  const [lookback, setLookback] = useState(180)

  const start = dateNDaysAgo(lookback)
  const end   = today()

  const { data: ctxData, isLoading: ctxLoading } = useQuery({
    queryKey: ["ai-context", symbol, start, end],
    queryFn: () => fetchAIContext({ symbol, start, end }),
    enabled: !!symbol,
    staleTime: 300_000,
  })

  async function analyze() {
    if (!ctxData?.context) return
    setLoading(true)
    setAnswer("")
    setRec(null)
    setErr("")
    try {
      const selectedHorizon = horizonOptions.find(o => o.v === horizonKey)?.l || horizonKey
      const selectedRisk = riskOptions.find(o => o.v === riskKey)?.l || riskKey

      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: ctxData.context,
          question,
          horizon: selectedHorizon,
          risk: selectedRisk,
          symbol,
          mode: "single",
          lang: language,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setAnswer(d.answer)
      setRec(d.recommendation as Recommendation)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">{t("ai.selectHorizon")}</label>
          <select
            value={horizonKey}
            onChange={(e) => setHorizonKey(e.target.value as any)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {horizonOptions.map((h) => <option key={h.v} value={h.v}>{h.l}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">{t("ai.selectRisk")}</label>
          <select
            value={riskKey}
            onChange={(e) => setRiskKey(e.target.value as any)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {riskOptions.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">{language === "vi" ? "Số phiên phân tích" : "Analysis Sessions"}</label>
          <select
            value={lookback}
            onChange={(e) => setLookback(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {LOOKBACKS.map((l) => (
              <option key={l.v} value={l.v}>
                {language === "vi" ? `${l.v} phiên` : `${l.v} sessions`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">{language === "vi" ? "Câu hỏi tùy chỉnh (tùy chọn)" : "Custom Question (optional)"}</label>
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={language === "vi" ? "VD: Khi nào tôi nên chốt lời?" : "e.g., When should I take profit?"}
        />
      </div>

      <Button onClick={analyze} disabled={loading || ctxLoading || !ctxData} className="w-full sm:w-auto">
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("ai.buttonAnalyzing")}</>
        ) : (
          <>
            <BrainCircuit className="h-4 w-4 mr-2" />
            {ctxLoading ? (language === "vi" ? "Đang tải dữ liệu..." : "Loading data...") : t("common.aiAnalysis")}
          </>
        )}
      </Button>

      {err && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{err}</div>
      )}

      {rec && (
        <div className="flex justify-center py-2">
          <AIBadge rec={rec} />
        </div>
      )}

      {answer && (
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="prose prose-sm max-w-none text-slate-800">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

function ScanPanel() {
  const { t, language } = useLanguage()
  const [input,   setInput]   = useState("")
  const [symbols, setSymbols] = useState<string[]>([])
  const [results, setResults] = useState<{ sym: string; rec: Recommendation; answer: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState("")
  const [lookback, setLookback] = useState(180)

  async function startScan() {
    const syms = input
      .split(/[,;\s]+/)
      .map((s) => s.toUpperCase().replace(/[^A-Z0-9]/g, ""))
      .filter((s) => s.length >= 2)
      .slice(0, 10)
    if (syms.length === 0) return
    setSymbols(syms)
    setResults([])
    setLoading(true)
    setErr("")
    const start = dateNDaysAgo(lookback)
    const end   = today()
    for (const sym of syms) {
      try {
        const ctxRes = await fetchAIContext({ symbol: sym, start, end })
        const aiRes  = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            context: ctxRes.context, 
            symbol: sym, 
            horizon: language === "vi" ? "ngắn hạn" : "Short-term", 
            risk: language === "vi" ? "trung bình" : "Medium", 
            mode: "scan",
            lang: language,
          }),
        })
        const d = await aiRes.json()
        if (aiRes.ok) {
          setResults((r) => [...r, { sym, rec: d.recommendation, answer: d.answer }])
        }
      } catch {
        setResults((r) => [...r, { sym, rec: "GIU", answer: language === "vi" ? "Lỗi phân tích." : "Analysis error." }])
      }
    }
    setLoading(false)
  }

  const recColor: Record<Recommendation, string> = {
    MUA: "bg-green-100 text-green-700",
    BAN: "bg-red-100 text-red-700",
    GIU: "bg-amber-100 text-amber-700",
  }
  const recLabel: Record<Recommendation, string> = { 
    MUA: language === "vi" ? "MUA" : "BUY", 
    BAN: language === "vi" ? "BÁN" : "SELL", 
    GIU: language === "vi" ? "NẮM GIỮ" : "HOLD" 
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={language === "vi" ? "VNM, HPG, FPT, ... (tối đa 10 mã)" : "VNM, HPG, FPT, ... (max 10 symbols)"}
          className="flex-1 min-w-[200px]"
        />
        <select
          value={lookback}
          onChange={(e) => setLookback(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm h-10"
        >
          {LOOKBACKS.map((l) => (
            <option key={l.v} value={l.v}>
              {language === "vi" ? `${l.v} phiên` : `${l.v} sessions`}
            </option>
          ))}
        </select>
        <Button onClick={startScan} disabled={loading} className="h-10">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
          {language === "vi" ? "Quét" : "Scan"}
        </Button>
      </div>
      {err && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{err}</div>}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map(({ sym, rec, answer }) => (
            <div key={sym} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900">{sym}</span>
                <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${recColor[rec]}`}>
                  {recLabel[rec]}
                </span>
              </div>
              <p className="text-xs text-slate-600 line-clamp-3">{answer.slice(0, 300)}…</p>
            </div>
          ))}
        </div>
      )}
      {loading && symbols.length > results.length && (
        <p className="text-xs text-slate-500">
          {language === "vi" ? `Đang phân tích ${results.length + 1}/${symbols.length}: ${symbols[results.length]}…` : `Analyzing ${results.length + 1}/${symbols.length}: ${symbols[results.length]}…`}
        </p>
      )}
    </div>
  )
}

export default function AIPage() {
  const { language } = useLanguage()
  const [symbol, setSymbol] = useState("VNM")
  const [input,  setInput]  = useState("VNM")

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const clean = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (clean.length >= 2) setSymbol(clean)
  }

  return (
    <div className="space-y-5">
      <Tabs defaultValue="single">
        <div className="flex items-center gap-4">
          <TabsList>
            <TabsTrigger value="single">{language === "vi" ? "Phân tích một mã" : "Single Stock Analysis"}</TabsTrigger>
            <TabsTrigger value="scan">{language === "vi" ? "Quét danh mục" : "Scan Multiple Stocks"}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="single">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-base">
                  {language === "vi" ? `Khuyến nghị AI — ${symbol}` : `AI Advisory — ${symbol}`}
                </CardTitle>
                <form onSubmit={handleSearch} className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={language === "vi" ? "Mã CK..." : "Symbol..."}
                    className="w-28 uppercase"
                  />
                  <Button type="submit" size="sm" variant="outline">
                    {language === "vi" ? "Chọn" : "Select"}
                  </Button>
                </form>
              </div>
            </CardHeader>
            <CardContent>
              <AnalyzePanel key={symbol} symbol={symbol} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scan">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{language === "vi" ? "Quét danh mục" : "Scan Portfolio"}</CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                {language === "vi" ? "Nhập nhiều mã CK, AI sẽ phân tích lần lượt và đưa ra khuyến nghị nhanh." : "Enter multiple symbols, AI will analyze them sequentially and provide recommendations."}
              </p>
            </CardHeader>
            <CardContent>
              <ScanPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
