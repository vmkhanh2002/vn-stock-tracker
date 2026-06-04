"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart2, GitCompare, Activity, BrainCircuit, Bell, Settings, TrendingUp, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

import { useLanguage } from "@/components/providers/LanguageProvider"

const navItems = [
  { href: "/dashboard/lookup",   key: "sidebar.lookup",     icon: BarChart2 },
  { href: "/dashboard/compare",  key: "sidebar.compare",    icon: GitCompare },
  { href: "/dashboard/realtime", key: "sidebar.realtime",   icon: Activity },
  { href: "/dashboard/screener", key: "sidebar.screener",   icon: SlidersHorizontal },
  { href: "/dashboard/ai",       key: "sidebar.ai",         icon: BrainCircuit },
  { href: "/dashboard/watchlist",key: "sidebar.watchlist",  icon: Bell },
  { href: "/dashboard/settings", key: "sidebar.settings",   icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        <span className="text-sm font-bold text-slate-900">VN Stock</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItems.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {t(key)}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
