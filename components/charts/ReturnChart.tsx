"use client"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts"

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#f59e0b", "#7c3aed", "#0891b2"]

interface ReturnData {
  time: string
  [symbol: string]: number | string
}

interface Props {
  data: ReturnData[]
  symbols: string[]
  height?: number
}

export function ReturnChart({ data, symbols, height = 400 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} />
        <YAxis
          tickFormatter={(v) => `${v.toFixed(0)}`}
          tick={{ fontSize: 10 }}
          width={40}
        />
        <Tooltip
          formatter={(v: number) => [`${v.toFixed(2)}`, undefined]}
          labelStyle={{ fontSize: 11 }}
          contentStyle={{ fontSize: 11 }}
        />
        <ReferenceLine y={100} stroke="#94a3b8" strokeDasharray="4 4" />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {symbols.map((sym, i) => (
          <Line
            key={sym}
            type="monotone"
            dataKey={sym}
            stroke={COLORS[i % COLORS.length]}
            dot={false}
            strokeWidth={2}
            name={sym}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
