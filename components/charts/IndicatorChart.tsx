"use client"
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from "recharts"
import type { OHLCVRow } from "@/types"

interface Props {
  data: OHLCVRow[]
  type: "rsi" | "macd" | "stoch" | "adx" | "obv" | "cci"
  height?: number
}

const fmt = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v?.toFixed(1))

export function IndicatorChart({ data, type, height = 160 }: Props) {
  const slim = data.slice(-120)

  if (type === "rsi") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={slim} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="time" hide />
          <YAxis domain={[0, 100]} width={32} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: number) => v?.toFixed(1)} contentStyle={{ fontSize: 11 }} />
          <ReferenceLine y={70} stroke="#dc2626" strokeDasharray="3 3" />
          <ReferenceLine y={30} stroke="#16a34a" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="rsi" stroke="#2563eb" dot={false} strokeWidth={1.5} name="RSI" />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (type === "macd") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={slim} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="time" hide />
          <YAxis width={40} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: number) => v?.toFixed(2)} contentStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Bar dataKey="macdHist" name="Histogram" fill="#94a3b8" radius={[1, 1, 0, 0]} label={false} />
          <Line type="monotone" dataKey="macd" stroke="#2563eb" dot={false} strokeWidth={1.5} name="MACD" />
          <Line type="monotone" dataKey="macdSig" stroke="#f59e0b" dot={false} strokeWidth={1.5} name="Signal" />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  if (type === "stoch") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={slim} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="time" hide />
          <YAxis domain={[0, 100]} width={32} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: number) => v?.toFixed(1)} contentStyle={{ fontSize: 11 }} />
          <ReferenceLine y={80} stroke="#dc2626" strokeDasharray="3 3" />
          <ReferenceLine y={20} stroke="#16a34a" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="stochK" stroke="#2563eb" dot={false} strokeWidth={1.5} name="%K" />
          <Line type="monotone" dataKey="stochD" stroke="#f59e0b" dot={false} strokeWidth={1.5} name="%D" />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (type === "adx") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={slim} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="time" hide />
          <YAxis width={32} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: number) => v?.toFixed(1)} contentStyle={{ fontSize: 11 }} />
          <ReferenceLine y={25} stroke="#94a3b8" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="adx" stroke="#7c3aed" dot={false} strokeWidth={2} name="ADX" />
          <Line type="monotone" dataKey="diPlus" stroke="#16a34a" dot={false} strokeWidth={1} name="+DI" />
          <Line type="monotone" dataKey="diMinus" stroke="#dc2626" dot={false} strokeWidth={1} name="-DI" />
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (type === "obv") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={slim} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="time" hide />
          <YAxis width={48} tickFormatter={fmt} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="obv" stroke="#0891b2" dot={false} strokeWidth={1.5} name="OBV" />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (type === "cci") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={slim} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="time" hide />
          <YAxis width={40} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: number) => v?.toFixed(1)} contentStyle={{ fontSize: 11 }} />
          <ReferenceLine y={100} stroke="#dc2626" strokeDasharray="3 3" />
          <ReferenceLine y={-100} stroke="#16a34a" strokeDasharray="3 3" />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Line type="monotone" dataKey="cci" stroke="#db2777" dot={false} strokeWidth={1.5} name="CCI" />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return null
}
