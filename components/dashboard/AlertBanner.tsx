"use client"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface AlertBannerProps {
  type?: "warning" | "error" | "success" | "info"
  message: string
  onDismiss?: () => void
}

const styles = {
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  error: "bg-red-50 border-red-200 text-red-800",
  success: "bg-green-50 border-green-200 text-green-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
}

export function AlertBanner({ type = "info", message, onDismiss }: AlertBannerProps) {
  return (
    <div className={cn("flex items-center justify-between rounded-lg border px-4 py-3 text-sm", styles[type])}>
      <span>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-3 opacity-60 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
