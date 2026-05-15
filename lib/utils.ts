import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatVND(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return "—"
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)
}

export function formatPct(value: number | undefined | null, digits = 2): string {
  if (value == null || isNaN(value)) return "—"
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(digits)}%`
}

export function formatVolume(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return "—"
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return value.toFixed(0)
}

export function dateNDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function changeColor(pct: number): string {
  if (pct > 0) return "text-green-600"
  if (pct < 0) return "text-red-600"
  return "text-slate-500"
}

export function changeBg(pct: number): string {
  if (pct > 6) return "#16a34a"
  if (pct > 3) return "#22c55e"
  if (pct > 0) return "#86efac"
  if (pct < -6) return "#dc2626"
  if (pct < -3) return "#ef4444"
  if (pct < 0) return "#fca5a5"
  return "#94a3b8"
}
