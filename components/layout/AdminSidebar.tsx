"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, FileText, TrendingUp, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

import { useLanguage } from "@/components/providers/LanguageProvider"

const navItems = [
  { href: "/admin",       key: "sidebar.admin",  icon: LayoutDashboard },
  { href: "/admin/users", key: "sidebar.users",  icon: Users },
  { href: "/admin/logs",  key: "sidebar.aiLogs", icon: FileText },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
        <TrendingUp className="h-5 w-5 text-purple-600" />
        <span className="text-sm font-bold text-slate-900">Admin</span>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === href
                ? "bg-purple-50 text-purple-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {t(key)}
          </Link>
        ))}
      </nav>
      <div className="p-2 border-t border-slate-100">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("sidebar.backToDashboard")}
        </Link>
      </div>
    </aside>
  )
}
