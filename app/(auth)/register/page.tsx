"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { TrendingUp, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/components/providers/LanguageProvider"

export default function RegisterPage() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? (language === "vi" ? "Đăng ký thất bại" : "Registration failed"))
        return
      }
      router.push("/login?registered=1")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t("register.title")}</h1>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">{t("register.name")}</label>
              <Input placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">{t("register.email")}</label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">{t("register.password")}</label>
              <Input type="password" placeholder={language === "vi" ? "Tối thiểu 8 ký tự" : "Min 8 characters"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("register.signingup")}
                </>
              ) : (
                t("register.signup")
              )}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <span className="text-sm text-slate-500">{t("register.alreadyHaveAccount")}{" "}</span>
            <a href="/login" className="text-sm font-medium text-blue-600 hover:underline">{t("register.signin")}</a>
          </div>
        </div>
      </div>
    </div>
  )
}
