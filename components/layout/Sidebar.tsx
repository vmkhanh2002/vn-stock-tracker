"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart2, GitCompare, Activity, BrainCircuit, Bell, Settings, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard/lookup",   label: "Tra cứu mã",       icon: BarChart2 },
  { href: "/dashboard/compare",  label: "So sánh mã",       icon: GitCompare },
  { href: "/dashboard/realtime", label: "Realtime & Heatmap",icon: Activity },
  { href: "/dashboard/ai",       label: "AI Khuyến nghị",   icon: BrainCircuit },
  { href: "/dashboard/watchlist",label: "Watchlist & Cảnh báo",icon: Bell },
  { href: "/dashboard/settings", label: "Cài đặt",          icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        <span className="text-sm font-bold text-slate-900">VN Stock</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
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
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
