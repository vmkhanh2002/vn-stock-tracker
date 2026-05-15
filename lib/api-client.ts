import type { OHLCVRow, IndicatorRequest, AIContextRequest, BoardRow } from "@/types"

const PY_BASE = "/api/py"

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(msg)
  }
  return res.json()
}

export async function fetchHistory(params: {
  symbol: string
  start: string
  end: string
  source?: "VCI" | "KBS"
  interval?: "1D" | "1W" | "1M"
}): Promise<{ symbol: string; data: OHLCVRow[]; count: number }> {
  const sp = new URLSearchParams(params as Record<string, string>)
  return apiFetch(`${PY_BASE}/stock/history?${sp}`)
}

export async function fetchIndicators(
  body: IndicatorRequest
): Promise<{ symbol: string; data: OHLCVRow[]; count: number; params: Record<string, unknown> }> {
  return apiFetch(`${PY_BASE}/indicators`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

export async function fetchBoard(
  symbols: string[],
  source = "VCI"
): Promise<{ date: string; data: BoardRow[] }> {
  return apiFetch(`${PY_BASE}/stock/board`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols, source }),
  })
}

export async function fetchAIContext(
  body: AIContextRequest
): Promise<{ symbol: string; context: string }> {
  return apiFetch(`${PY_BASE}/ai-context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}
