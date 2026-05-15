"use client"
import { useEffect, useRef } from "react"
import { createChart, type IChartApi } from "lightweight-charts"
import type { OHLCVRow } from "@/types"

interface Props {
  data: OHLCVRow[]
  height?: number
}

export function VolumeChart({ data, height = 120 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | undefined>(undefined)

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return
    chartRef.current?.remove()

    const chart = createChart(containerRef.current, {
      height,
      layout: { background: { color: "#ffffff" }, textColor: "#475569" },
      grid: { vertLines: { color: "#f8fafc" }, horzLines: { color: "#f8fafc" } },
      rightPriceScale: { borderColor: "#e2e8f0" },
      timeScale: { borderColor: "#e2e8f0", timeVisible: true },
    })
    chartRef.current = chart

    const volSeries = chart.addHistogramSeries({
      color: "#94a3b8",
      priceFormat: { type: "volume" },
    })
    volSeries.setData(
      data.map((r) => ({
        time: r.time as any,
        value: r.volume,
        color: r.close >= r.open ? "#bbf7d0" : "#fecaca",
      }))
    )

    chart.timeScale().fitContent()

    const handleResize = () => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth })
    }
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      chart.remove()
    }
  }, [data, height])

  return <div ref={containerRef} className="w-full rounded-lg overflow-hidden" style={{ height }} />
}
