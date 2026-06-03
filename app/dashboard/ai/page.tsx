"use client"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { BrainCircuit, Loader2, Search, ChevronDown } from "lucide-react"
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

const HORIZONS = ["Ngắn hạn (1-5 phiên)", "Trung hạn (1-3 tháng)", "Dài hạn (> 6 tháng)"]
const RISKS    = ["Thấp (bảo thủ)", "Trung bình", "Cao (tích cực)"]
const LOOKBACKS = [
  { v: 30,  l: "30 phiên" },
  { v: 60,  l: "60 phiên" },
  { v: 90,  l: "90 phiên" },
  { v: 120, l: "120 phiên" },
  { v: 180, l: "180 phiên" },
  { v: 240, l: "240 phiên" },
  { v: 300, l: "300 phiên" },
]

function AnalyzePanel({ symbol }: { symbol: string }) {
  const [horizon, setHorizon] = useState(HORIZONS[0])
  const [risk,    setRisk]    = useState(RISKS[1])
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
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: ctxData.context,
          question,
          horizon,
          risk,
          symbol,
          mode: "single",
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
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Khung đầu tư</label>
          <select
            value={horizon}
            onChange={(e) => setHorizon(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {HORIZONS.map((h) => <option key={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Khẩu vị rủi ro</label>
          <select
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {RISKS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Số phiên phân tích</label>
          <select
            value={lookback}
            onChange={(e) => setLookback(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {LOOKBACKS.map((l) => <option key={l.v} value={l.v}>{l.l}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">Câu hỏi tùy chỉnh (tuỳ chọn)</label>
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="VD: Khi nào nên chốt lời?"
        />
      </div>

      <Button onClick={analyze} disabled={loading || ctxLoading || !ctxData} className="w-full sm:w-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
        {ctxLoading ? "Đang tải dữ liệu..." : "Phân tích AI"}
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
          body: JSON.stringify({ context: ctxRes.context, symbol: sym, horizon: "Ngắn hạn", risk: "Trung bình", mode: "scan" }),
        })
        const d = await aiRes.json()
        if (aiRes.ok) {
          setResults((r) => [...r, { sym, rec: d.recommendation, answer: d.answer }])
        }
      } catch {
        setResults((r) => [...r, { sym, rec: "GIU", answer: "Lỗi phân tích." }])
      }
    }
    setLoading(false)
  }

  const recColor: Record<Recommendation, string> = {
    MUA: "bg-green-100 text-green-700",
    BAN: "bg-red-100 text-red-700",
    GIU: "bg-amber-100 text-amber-700",
  }
  const recLabel: Record<Recommendation, string> = { MUA: "MUA", BAN: "BÁN", GIU: "GIỮ" }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="VNM, FPT, VIC, ... (tối đa 10 mã)"
          className="flex-1 min-w-[200px]"
        />
        <select
          value={lookback}
          onChange={(e) => setLookback(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm h-10"
        >
          {LOOKBACKS.map((l) => <option key={l.v} value={l.v}>{l.l}</option>)}
        </select>
        <Button onClick={startScan} disabled={loading} className="h-10">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Quét
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
          Đang phân tích {results.length + 1}/{symbols.length}: {symbols[results.length]}…
        </p>
      )}
    </div>
  )
}

export default function AIPage() {
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
            <TabsTrigger value="single">Phân tích 1 mã</TabsTrigger>
            <TabsTrigger value="scan">Quét nhiều mã</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="single">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-base">AI Khuyến nghị — {symbol}</CardTitle>
                <form onSubmit={handleSearch} className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Mã CK..."
                    className="w-28 uppercase"
                  />
                  <Button type="submit" size="sm" variant="outline">Chọn</Button>
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
              <CardTitle className="text-base">Quét danh mục</CardTitle>
              <p className="text-xs text-slate-500 mt-1">Nhập nhiều mã, AI sẽ phân tích lần lượt và đưa ra khuyến nghị.</p>
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
