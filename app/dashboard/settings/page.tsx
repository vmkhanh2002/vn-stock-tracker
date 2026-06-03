"use client"
import { useEffect, useState } from "react"
import { Loader2, Save, Eye, EyeOff, CheckCircle } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function SettingsPage() {
  const { data: settings, isLoading } = trpc.user.getSettings.useQuery()
  const update = trpc.user.updateSettings.useMutation()

  const [apiKey,       setApiKey]       = useState("")
  const [vnstockKey,   setVnstockKey]   = useState("")
  const [model,        setModel]        = useState("openrouter/owl-alpha")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [source,       setSource]       = useState<"VCI" | "KBS">("VCI")
  const [interval,     setInterval]     = useState<"1D" | "1W" | "1M">("1D")
  const [showKey,      setShowKey]      = useState(false)
  const [showVnstockKey, setShowVnstockKey] = useState(false)
  const [saved,        setSaved]        = useState(false)

  useEffect(() => {
    if (settings) {
      setModel(settings.openrouterModel || "openrouter/owl-alpha")
      setSource(settings.defaultSource as any)
      setInterval(settings.defaultInterval as any)
      setSystemPrompt(settings.aiSystemPrompt ?? "")
      if (settings.vnstockApiKey) {
        document.cookie = `vnstock_api_key=${settings.vnstockApiKey}; path=/; max-age=31536000; SameSite=Lax`
      }
    }
  }, [settings])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const payload: Parameters<typeof update.mutate>[0] = {
      openrouterModel: model,
      defaultSource:   source,
      defaultInterval: interval,
      aiSystemPrompt:  systemPrompt.trim() || undefined,
    }
    if (apiKey.trim().length >= 10) payload.openrouterApiKey = apiKey.trim()
    if (vnstockKey.trim().length >= 10) {
      payload.vnstockApiKey = vnstockKey.trim()
      document.cookie = `vnstock_api_key=${vnstockKey.trim()}; path=/; max-age=31536000; SameSite=Lax`
    }
    await update.mutateAsync(payload)
    setSaved(true)
    setApiKey("")
    setVnstockKey("")
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
        {/* OpenRouter API Key */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">OpenRouter API Key</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3">
              {settings?.hasOpenRouterKey ? (
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
                {settings?.hasOpenRouterKey ? "Đổi API Key mới" : "Nhập OpenRouter API Key"}
              </label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={settings?.hasOpenRouterKey ? "Để trống = giữ key cũ" : "sk-or-v1-..."}
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
                Lấy tại <span className="text-blue-600">openrouter.ai</span>. Key được mã hoá và lưu an toàn trong database.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Model OpenRouter</label>
              <Input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="openrouter/owl-alpha"
              />
              <p className="text-xs text-slate-400">
                Tên model được dùng để AI phân tích chứng khoán (ví dụ: <code>openrouter/owl-alpha</code>, <code>google/gemini-2.5-pro</code>, <code>deepseek/deepseek-chat</code>...).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Vnstock API Key */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Vnstock API Key / Premium Token</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3">
              {settings?.hasVnstockKey ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">Vnstock Key đã được cấu hình</span>
                </>
              ) : (
                <span className="text-sm text-amber-700">⚠️ Chưa có Vnstock Key — dữ liệu chứng khoán sẽ không hoạt động</span>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">
                {settings?.hasVnstockKey ? "Đổi Vnstock Key mới" : "Nhập Vnstock Key cá nhân"}
              </label>
              <div className="relative">
                <Input
                  type={showVnstockKey ? "text" : "password"}
                  value={vnstockKey}
                  onChange={(e) => setVnstockKey(e.target.value)}
                  placeholder={settings?.hasVnstockKey ? "Để trống = giữ key cũ" : "vnstock_..."}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowVnstockKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showVnstockKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Tránh nghẽn băng thông bằng cách đăng ký Vnstock API Key cá nhân của bạn (Lấy miễn phí tại <span className="text-blue-600">vnstocks.com</span>).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI System Prompt */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI System Prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500">
              Tuỳ chỉnh vai trò và hành vi của AI khi phân tích chứng khoán. Để trống sẽ dùng prompt mặc định của hệ thống.
            </p>
            <Textarea
              rows={10}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={`Bạn là một Chuyên gia Kinh tế và Phân tích Tài chính...\n\n(Để trống = dùng prompt mặc định)`}
              className="font-mono text-xs resize-y"
            />
            <p className="text-xs text-slate-400">
              Lưu ý: Biến động của khung đầu tư <code>{'{horizon}'}</code> và khẩu vị rủi ro <code>{'{risk}'}</code> sẽ được tự động điền vào khi phân tích.
            </p>
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
