"use client"
import { useEffect, useRef } from "react"
import * as d3 from "d3"
import { changeBg } from "@/lib/utils"
import type { BoardRow } from "@/types"

interface Props {
  data: BoardRow[]
  height?: number
}

export function HeatmapTreemap({ data, height = 400 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return

    const width = containerRef.current.clientWidth
    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()
    svg.attr("width", width).attr("height", height)

    const root = d3
      .hierarchy({ children: data } as any)
      .sum((d: any) => Math.max(d.volume ?? 1, 1))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    d3.treemap().size([width, height]).padding(2)(root)

    const cell = svg
      .selectAll("g")
      .data(root.leaves())
      .join("g")
      .attr("transform", (d: any) => `translate(${d.x0},${d.y0})`)

    cell
      .append("rect")
      .attr("width", (d: any) => Math.max(0, d.x1 - d.x0))
      .attr("height", (d: any) => Math.max(0, d.y1 - d.y0))
      .attr("rx", 4)
      .attr("fill", (d: any) => changeBg(d.data.changePct))
      .attr("stroke", "#f0f4f8")
      .attr("stroke-width", 1)

    cell
      .append("text")
      .attr("x", (d: any) => (d.x1 - d.x0) / 2)
      .attr("y", (d: any) => (d.y1 - d.y0) / 2 - 6)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "white")
      .attr("font-size", (d: any) => Math.min(14, Math.max(8, (d.x1 - d.x0) / 5)))
      .attr("font-weight", "600")
      .text((d: any) => (d.x1 - d.x0 > 30 ? d.data.symbol : ""))

    cell
      .append("text")
      .attr("x", (d: any) => (d.x1 - d.x0) / 2)
      .attr("y", (d: any) => (d.y1 - d.y0) / 2 + 10)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "rgba(255,255,255,0.85)")
      .attr("font-size", (d: any) => Math.min(11, Math.max(7, (d.x1 - d.x0) / 7)))
      .text((d: any) =>
        d.x1 - d.x0 > 40
          ? `${d.data.changePct >= 0 ? "+" : ""}${d.data.changePct?.toFixed(1)}%`
          : ""
      )
  }, [data, height])

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} style={{ height }} />
    </div>
  )
}
