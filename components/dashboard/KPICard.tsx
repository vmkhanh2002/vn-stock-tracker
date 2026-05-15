import { cn } from "@/lib/utils"

interface KPICardProps {
  label: string
  value: string
  sub?: string
  trend?: "up" | "down" | "neutral"
  icon?: React.ReactNode
  className?: string
}

export function KPICard({ label, value, sub, trend, icon, className }: KPICardProps) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <p
        className={cn(
          "mt-1.5 text-xl font-bold",
          trend === "up" && "text-green-600",
          trend === "down" && "text-red-600",
          trend === "neutral" && "text-slate-800",
          !trend && "text-slate-900"
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}
