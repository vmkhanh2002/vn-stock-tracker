import { cn } from "@/lib/utils"

interface SignalPillProps {
  label: string
  signal: "bullish" | "bearish" | "neutral"
  value?: string
}

const colors = {
  bullish: "bg-green-50 text-green-700 border-green-200",
  bearish: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-slate-50 text-slate-600 border-slate-200",
}

const dots = {
  bullish: "bg-green-500",
  bearish: "bg-red-500",
  neutral: "bg-slate-400",
}

export function SignalPill({ label, signal, value }: SignalPillProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        colors[signal]
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dots[signal])} />
      <span>{label}</span>
      {value && <span className="opacity-70">· {value}</span>}
    </div>
  )
}
