export interface OHLCVRow {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  ma10?: number
  ma20?: number
  ma50?: number
  bbMid?: number
  bbUpper?: number
  bbLower?: number
  rsi?: number
  macd?: number
  macdSig?: number
  macdHist?: number
  stochK?: number
  stochD?: number
  adx?: number
  diPlus?: number
  diMinus?: number
  atr?: number
  obv?: number
  cci?: number
  volMa20?: number
  returnPct?: number
}

export interface IndicatorParams {
  maFast?: number
  maMid?: number
  maSlow?: number
  rsiPer?: number
  bbPer?: number
  bbStd?: number
  macdF?: number
  macdS?: number
  macdSig?: number
}

export interface IndicatorRequest {
  symbol: string
  start: string
  end: string
  source?: "VCI" | "KBS"
  interval?: "1D" | "1W" | "1M"
  params?: IndicatorParams
}

export interface AIContextRequest {
  symbol: string
  start: string
  end: string
  source?: string
  interval?: string
  params?: IndicatorParams
}

export interface BoardRow {
  symbol: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  change: number
  changePct: number
}

export type Recommendation = "MUA" | "BAN" | "GIU"

export interface ScreenerRow {
  symbol: string
  organ_name: string
  price: number
  pct_change: number
  volume: number
  foreign_buy: number
  foreign_sell: number
  foreign_net: number
  exchange: string
  pe: number | null
  pb: number | null
  roe: number | null
  roa: number | null
  debt_to_equity: number | null
  debt_to_assets: number | null
  rev_growth: number | null
  profit_growth: number | null
}
