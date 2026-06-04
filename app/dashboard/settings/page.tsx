"use client"
import { useEffect, useState } from "react"
import { Loader2, Save, Eye, EyeOff, CheckCircle } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/components/providers/LanguageProvider"

export default function SettingsPage() {
  const { t, language } = useLanguage()
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
      <h1 className="text-lg font-semibold text-slate-900">{t("settings.title")}</h1>

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
                  <span className="text-sm text-green-700">{t("settings.apiKeyConfigured")}</span>
                </>
              ) : (
                <span className="text-sm text-amber-700">⚠️ {t("settings.apiKeyMissing")}</span>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">
                {settings?.hasOpenRouterKey ? (language === "vi" ? "Thay đổi API Key" : "Change API Key") : t("settings.apiKeyLabel")}
              </label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={settings?.hasOpenRouterKey ? t("settings.apiKeyPlaceholder") : "sk-or-v1-..."}
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
                {t("settings.apiKeyHelp")}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">{t("settings.aiModel")}</label>
              <Input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="openrouter/owl-alpha"
              />
              <p className="text-xs text-slate-400">
                {t("settings.aiModelHelp")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Vnstock API Key */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("settings.vnstockConfig")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3">
              {settings?.hasVnstockKey ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">{t("settings.vnstockStatusConfigured")}</span>
                </>
              ) : (
                <span className="text-sm text-amber-700">⚠️ {t("settings.vnstockStatusMissing")}</span>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">
                {settings?.hasVnstockKey ? (language === "vi" ? "Thay đổi Vnstock Key" : "Change Vnstock Key") : t("settings.vnstockLabel")}
              </label>
              <div className="relative">
                <Input
                  type={showVnstockKey ? "text" : "password"}
                  value={vnstockKey}
                  onChange={(e) => setVnstockKey(e.target.value)}
                  placeholder={settings?.hasVnstockKey ? t("settings.apiKeyPlaceholder") : "vnstock_..."}
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
                {t("settings.vnstockHelp")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI System Prompt */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("settings.customPromptTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500">
              {t("settings.customPromptHelp")}
            </p>
            <Textarea
              rows={10}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={t("settings.customPromptPlaceholder")}
              className="font-mono text-xs resize-y"
            />
            <p className="text-xs text-slate-400">
              {t("settings.customPromptNote", { horizon: "{horizon}", risk: "{risk}" })}
            </p>
          </CardContent>
        </Card>

        {/* Data Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("settings.defaultsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">{t("settings.defaultSource")}</label>
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
              <label className="text-xs font-medium text-slate-600">{t("settings.defaultInterval")}</label>
              <div className="flex gap-2">
                {[
                  { v: "1D", l: t("lookup.day") },
                  { v: "1W", l: t("lookup.week") },
                  { v: "1M", l: t("lookup.month") },
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
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("settings.buttonSaving")}</>
          ) : saved ? (
            <><CheckCircle className="h-4 w-4 mr-2" /> {t("common.saved")}</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> {t("settings.buttonSave")}</>
          )}
        </Button>
      </form>
    </div>
  )
}
