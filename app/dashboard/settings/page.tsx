"use client"
import { useEffect, useState } from "react"
import { Loader2, Save, Eye, EyeOff, CheckCircle } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function SettingsPage() {
  const { data: settings, isLoading } = trpc.user.getSettings.useQuery()
  const update = trpc.user.updateSettings.useMutation()

  const [apiKey,   setApiKey]   = useState("")
  const [model,    setModel]    = useState("gemini-2.5-flash-lite")
  const [source,   setSource]   = useState<"VCI" | "KBS">("VCI")
  const [interval, setInterval] = useState<"1D" | "1W" | "1M">("1D")
  const [showKey,  setShowKey]  = useState(false)
  const [saved,    setSaved]    = useState(false)

  useEffect(() => {
    if (settings) {
      setModel(settings.geminiModel)
      setSource(settings.defaultSource as any)
      setInterval(settings.defaultInterval as any)
    }
  }, [settings])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const payload: Parameters<typeof update.mutate>[0] = {
      geminiModel:     model,
      defaultSource:   source,
      defaultInterval: interval,
    }
    if (apiKey.trim().length >= 10) payload.geminiApiKey = apiKey.trim()
    await update.mutateAsync(payload)
    setSaved(true)
    setApiKey("")
    setTimeout(() => setSaved(false), 3000)
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-lg font-semibold text-slate-900">Cài đặt</h1>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Gemini API Key */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Gemini API Key</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3">
              {settings?.hasGeminiKey ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">API Key đã được cấu hình</span>
                </>
              ) : (
                <span className="text-sm text-amber-700">⚠️ Chưa có API Key — AI Khuyến nghị sẽ không hoạt động</span>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">
                {settings?.hasGeminiKey ? "Đổi API Key mới" : "Nhập Gemini API Key"}
              </label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={settings?.hasGeminiKey ? "Để trống = giữ key cũ" : "AIza..."}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Lấy tại{" "}
                <span className="text-blue-600">aistudio.google.com</span>. Key được mã hoá và lưu an toàn trong database.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Gemini Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite (Nhanh, tiết kiệm)</option>
                <option value="gemini-2.5-flash">gemini-2.5-flash (Cân bằng)</option>
                <option value="gemini-2.5-pro">gemini-2.5-pro (Mạnh nhất)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Data Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tuỳ chọn mặc định</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Nguồn dữ liệu</label>
              <div className="flex gap-2">
                {(["VCI", "KBS"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSource(s)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      source === s ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Khung thời gian</label>
              <div className="flex gap-2">
                {[
                  { v: "1D", l: "Ngày" },
                  { v: "1W", l: "Tuần" },
                  { v: "1M", l: "Tháng" },
                ].map(({ v, l }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setInterval(v as any)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      interval === v ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={update.isPending} className="w-full sm:w-auto">
          {update.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <><CheckCircle className="h-4 w-4" /> Đã lưu!</>
          ) : (
            <><Save className="h-4 w-4" /> Lưu cài đặt</>
          )}
        </Button>
      </form>
    </div>
  )
}
