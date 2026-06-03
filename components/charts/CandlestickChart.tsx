"use client"
import { useEffect, useRef } from "react"
import {
  createChart,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts"
import type { OHLCVRow } from "@/types"

interface Props {
  data: OHLCVRow[]
  height?: number
  ma10?: boolean
  ma20?: boolean
  ma50?: boolean
  bbands?: boolean
}

export function CandlestickChart({ data, height = 440, ma10, ma20, ma50, bbands }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | undefined>(undefined)

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    chartRef.current?.remove()

    const chart = createChart(containerRef.current, {
      height,
      layout: { background: { color: "#ffffff" }, textColor: "#475569" },
      grid: { vertLines: { color: "#f1f5f9" }, horzLines: { color: "#f1f5f9" } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#e2e8f0" },
      timeScale: { borderColor: "#e2e8f0", timeVisible: true },
    })
    chartRef.current = chart

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#16a34a",
      downColor: "#dc2626",
      borderUpColor: "#16a34a",
      borderDownColor: "#dc2626",
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
    })
    candleSeries.setData(
      data.map((r) => ({
        time: r.time as any,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
      }))
    )

    const lineData = (key: keyof OHLCVRow) =>
      data
        .filter((r) => r[key] != null)
        .map((r) => ({ time: r.time as any, value: r[key] as number }))

    if (ma10) {
      const s = chart.addLineSeries({ color: "#f59e0b", lineWidth: 1, title: "MA10" })
      s.setData(lineData("ma10"))
    }
    if (ma20) {
      const s = chart.addLineSeries({ color: "#2563eb", lineWidth: 1, title: "MA20" })
      s.setData(lineData("ma20"))
    }
    if (ma50) {
      const s = chart.addLineSeries({ color: "#7c3aed", lineWidth: 1, title: "MA50" })
      s.setData(lineData("ma50"))
    }
    if (bbands) {
      const upper = chart.addLineSeries({ color: "#94a3b8", lineWidth: 1, lineStyle: LineStyle.Dashed, title: "BB Upper" })
      upper.setData(lineData("bbUpper"))
      const lower = chart.addLineSeries({ color: "#94a3b8", lineWidth: 1, lineStyle: LineStyle.Dashed, title: "BB Lower" })
      lower.setData(lineData("bbLower"))
    }

    chart.timeScale().fitContent()

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      chart.remove()
    }
  }, [data, height, ma10, ma20, ma50, bbands])

  return <div ref={containerRef} className="w-full rounded-lg overflow-hidden" style={{ height }} />
}
