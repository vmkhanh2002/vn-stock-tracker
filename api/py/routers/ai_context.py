"""
POST /api/py/ai-context
Builds the markdown context string sent to Gemini.
The actual Gemini call is made from Next.js edge function
(user's own API key, never stored on server).
"""
import re

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from routers.indicators import IndicatorParams, compute
from routers.stock import fetch_history

router = APIRouter()


class AIContextRequest(BaseModel):
    symbol:   str
    start:    str
    end:      str
    source:   str = "VCI"
    interval: str = "1D"
    params:   IndicatorParams = IndicatorParams()


def build_context(df: pd.DataFrame, symbol: str) -> str:
    if df.empty or len(df) < 2:
        return "Không đủ dữ liệu để phân tích."

    last  = df.iloc[-1]
    prev  = df.iloc[-2]
    first = df.iloc[0]

    def v(k):
        return last.get(k, float("nan"))

    chg      = v("close") - prev["close"]
    chg_pct  = chg / prev["close"] * 100 if prev["close"] else 0
    ret5     = (v("close") / df.iloc[-5]["close"] - 1) * 100 if len(df) >= 5 else float("nan")
    ret20    = (v("close") / df.iloc[-20]["close"] - 1) * 100 if len(df) >= 20 else float("nan")
    ret_all  = (v("close") / first["close"] - 1) * 100
    vol_avg  = df["volume"].tail(20).mean()
    vol_r    = v("volume") / vol_avg if vol_avg else 1
    rsi_lbl  = "Quá mua" if v("rsi") > 70 else ("Quá bán" if v("rsi") < 30 else "Trung tính")
    macd_lbl = "Bullish" if v("macdHist") and v("macdHist") > 0 else "Bearish"
    std      = df["returnPct"].std()
    win_r    = (df["returnPct"].dropna() > 0).mean() * 100
    p        = IndicatorParams()

    cols = ["time", "open", "high", "low", "close", "volume", "rsi", "macdHist", "returnPct"]
    tbl  = df[[c for c in cols if c in df.columns]].tail(30)
    rows = []
    for _, r in tbl.sort_values("time", ascending=False).iterrows():
        rsi_val  = r.get("rsi", float("nan"))
        macdh    = r.get("macdHist", float("nan"))
        rows.append(
            f"{str(r['time'])[:10]} | {r['close']:,.0f} | "
            f"O:{r['open']:,.0f} H:{r['high']:,.0f} L:{r['low']:,.0f} | "
            f"Vol:{r['volume']:,.0f} | RSI:{rsi_val:.1f} | MACD-H:{macdh:.2f}"
        )
    table_str = "\n".join(rows)

    ctx = f"""# Báo cáo phân tích kỹ thuật: {symbol}
Kỳ phân tích: {df["time"].iloc[0].date()} → {df["time"].iloc[-1].date()} ({len(df)} phiên)

## Giá & biến động
- Giá đóng cửa gần nhất: {v('close'):,.0f} VNĐ ({chg_pct:+.2f}%)
- Mở cửa / Cao / Thấp: {v('open'):,.0f} / {v('high'):,.0f} / {v('low'):,.0f}
- Cao nhất kỳ: {df['high'].max():,.0f} | Thấp nhất kỳ: {df['low'].min():,.0f}

## Sinh lời
- 5 phiên: {ret5:+.2f}% | 20 phiên: {ret20:+.2f}% | Toàn kỳ: {ret_all:+.2f}%
- Win rate: {win_r:.1f}% | Volatility σ: {std:.2f}%

## Chỉ báo kỹ thuật (phiên gần nhất)
| Chỉ báo | Giá trị | Tín hiệu |
|---------|---------|----------|
| MA{p.maFast} | {v(f'ma{p.maFast}'):,.0f} | {'Trên MA' if v('close') > v(f'ma{p.maFast}') else 'Dưới MA'} |
| BB Upper/Lower | {v('bbUpper'):,.0f} / {v('bbLower'):,.0f} | {'Quá mua' if v('close') > v('bbUpper') else 'Quá bán' if v('close') < v('bbLower') else 'Trong dải'} |
| RSI({p.rsiPer}) | {v('rsi'):.1f} | {rsi_lbl} |
| MACD Hist | {v('macdHist'):.2f} | {macd_lbl} |
| Stoch K/D | {v('stochK'):.1f} / {v('stochD'):.1f} | {'Quá mua K>80' if v('stochK') > 80 else 'Quá bán K<20' if v('stochK') < 20 else 'Trung tính'} |
| ADX | {v('adx'):.1f} | {'Xu hướng mạnh' if v('adx') > 25 else 'Giằng co'} |
| Volume/TB20 | {vol_r:.1f}x | {'Dòng tiền bùng nổ' if vol_r > 1.5 else 'Dòng tiền yếu' if vol_r < 0.7 else 'Bình thường'} |

## 30 phiên giao dịch gần nhất
Ngày | Đóng cửa | OHLC | Volume | RSI | MACD-H
{table_str}
"""
    return ctx


@router.post("")
def get_ai_context(req: AIContextRequest):
    sym = re.sub(r"[^A-Z0-9]", "", req.symbol.strip().upper())
    df  = fetch_history(sym, req.start, req.end, req.source, req.interval)
    if df.empty:
        raise HTTPException(404, "No data")
    df = compute(df, req.params)
    return {"symbol": sym, "context": build_context(df, sym)}
