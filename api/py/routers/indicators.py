"""
POST /api/py/indicators
Body: { symbol, start, end, source, interval, params }
Returns: OHLCV + all computed indicators as JSON
"""
import re
from typing import Literal, Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class IndicatorParams(BaseModel):
    maFast:  int   = 10
    maMid:   int   = 20
    maSlow:  int   = 50
    rsiPer:  int   = 14
    bbPer:   int   = 20
    bbStd:   float = 2.0
    macdF:   int   = 12
    macdS:   int   = 26
    macdSig: int   = 9


class IndicatorRequest(BaseModel):
    symbol:   str
    start:    str
    end:      str
    source:   Literal["VCI", "KBS"] = "VCI"
    interval: Literal["1D", "1W", "1M"] = "1D"
    params:   IndicatorParams = IndicatorParams()


def compute(df: pd.DataFrame, p: IndicatorParams) -> pd.DataFrame:
    df = df.copy()
    c = df["close"]

    df[f"ma{p.maFast}"] = c.rolling(p.maFast).mean()
    df[f"ma{p.maMid}"]  = c.rolling(p.maMid).mean()
    df[f"ma{p.maSlow}"] = c.rolling(p.maSlow).mean()

    df["bbMid"]   = c.rolling(p.bbPer).mean()
    bb_std        = c.rolling(p.bbPer).std()
    df["bbUpper"] = df["bbMid"] + p.bbStd * bb_std
    df["bbLower"] = df["bbMid"] - p.bbStd * bb_std

    d  = c.diff()
    g  = d.clip(lower=0).rolling(p.rsiPer).mean()
    l  = (-d.clip(upper=0)).rolling(p.rsiPer).mean()
    df["rsi"] = 100 - 100 / (1 + g / l.replace(0, np.nan))

    ef = c.ewm(span=p.macdF, adjust=False).mean()
    es = c.ewm(span=p.macdS, adjust=False).mean()
    df["macd"]     = ef - es
    df["macdSig"]  = df["macd"].ewm(span=p.macdSig, adjust=False).mean()
    df["macdHist"] = df["macd"] - df["macdSig"]

    lo = df["low"].rolling(14).min()
    hi = df["high"].rolling(14).max()
    df["stochK"] = 100 * (c - lo) / (hi - lo + 1e-9)
    df["stochD"] = df["stochK"].rolling(3).mean()

    adxp = 14
    pc   = c.shift(1)
    tr   = pd.concat(
        [df["high"] - df["low"], (df["high"] - pc).abs(), (df["low"] - pc).abs()],
        axis=1,
    ).max(axis=1)
    up  = df["high"].diff()
    dn  = -df["low"].diff()
    dmp = pd.Series(np.where((up > dn) & (up > 0), up, 0.0), index=df.index)
    dmm = pd.Series(np.where((dn > up) & (dn > 0), dn, 0.0), index=df.index)
    atr  = tr.ewm(alpha=1 / adxp, adjust=False).mean()
    di_p = 100 * dmp.ewm(alpha=1 / adxp, adjust=False).mean() / atr
    di_m = 100 * dmm.ewm(alpha=1 / adxp, adjust=False).mean() / atr
    dx   = 100 * (di_p - di_m).abs() / (di_p + di_m + 1e-9)
    df["adx"]     = dx.ewm(alpha=1 / adxp, adjust=False).mean()
    df["diPlus"]  = di_p
    df["diMinus"] = di_m
    df["atr"]     = atr

    direction = c.diff().apply(lambda x: 1 if x > 0 else (-1 if x < 0 else 0))
    df["obv"]  = (df["volume"] * direction).cumsum()

    tp    = (df["high"] + df["low"] + c) / 3
    tpMa  = tp.rolling(20).mean()
    tpMd  = tp.rolling(20).apply(lambda x: np.mean(np.abs(x - x.mean())), raw=True)
    df["cci"] = (tp - tpMa) / (0.015 * tpMd + 1e-9)

    df["volMa20"]   = df["volume"].rolling(20).mean()
    df["returnPct"] = c.pct_change() * 100

    return df


@router.post("")
def get_indicators(req: IndicatorRequest):
    sym = re.sub(r"[^A-Z0-9]", "", req.symbol.strip().upper())
    from routers.stock import fetch_history

    df = fetch_history(sym, req.start, req.end, req.source, req.interval)
    if df.empty:
        raise HTTPException(404, "No data found")
    df = compute(df, req.params)
    records = df.where(df.notna(), None).to_dict(orient="records")
    for r in records:
        r["time"] = str(r["time"])[:10]
    return {
        "symbol": sym,
        "data": records,
        "count": len(records),
        "params": req.params.model_dump(),
    }
