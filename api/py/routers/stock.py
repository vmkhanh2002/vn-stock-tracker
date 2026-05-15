"""
GET /api/py/stock/history   → OHLCV history
GET /api/py/stock/realtime  → latest quote
POST /api/py/stock/board    → batch latest quotes
"""
import re
from datetime import date
from typing import Literal

import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, field_validator

router = APIRouter()
SYM_RE = re.compile(r"^[A-Z0-9]{2,10}$")


def safe_sym(s: str) -> str:
    c = re.sub(r"[^A-Z0-9]", "", s.strip().upper())
    if not SYM_RE.match(c):
        raise HTTPException(400, f"Invalid symbol: {s!r}")
    return c


def to_vnd(series: pd.Series) -> pd.Series:
    return series.apply(lambda x: float(x) * 1000 if float(x) < 10_000 else float(x))


def fetch_history(symbol: str, start: str, end: str, source: str, interval: str) -> pd.DataFrame:
    try:
        from vnstock import Quote

        df = Quote(symbol=symbol, source=source).history(
            start=start, end=end, interval=interval
        )
        if df is None or df.empty:
            return pd.DataFrame()
        df.columns = [c.lower() for c in df.columns]
        df["time"] = pd.to_datetime(df["time"])
        for c in ["open", "high", "low", "close"]:
            if c in df.columns:
                df[c] = to_vnd(df[c])
        return df.sort_values("time").reset_index(drop=True)
    except Exception as e:
        raise HTTPException(502, f"vnstock error: {e}")


@router.get("/history")
def get_history(
    symbol: str = Query(...),
    start: str = Query(...),
    end: str = Query(...),
    source: Literal["VCI", "KBS"] = "VCI",
    interval: Literal["1D", "1W", "1M"] = "1D",
):
    sym = safe_sym(symbol)
    df = fetch_history(sym, start, end, source, interval)
    if df.empty:
        raise HTTPException(404, "No data found")
    records = df.where(df.notna(), None).to_dict(orient="records")
    for r in records:
        r["time"] = str(r["time"])[:10]
    return {"symbol": sym, "data": records, "count": len(records)}


@router.get("/realtime")
def get_realtime(symbol: str = Query(...), source: Literal["VCI", "KBS"] = "VCI"):
    sym = safe_sym(symbol)
    today = str(date.today())
    df = fetch_history(sym, today, today, source, "1D")
    if df.empty:
        raise HTTPException(404, "No realtime data")
    r = df.iloc[-1].where(df.iloc[-1].notna(), None).to_dict()
    r["time"] = str(r["time"])[:10]
    return {"symbol": sym, **r}


class BoardRequest(BaseModel):
    symbols: list[str]
    source: Literal["VCI", "KBS"] = "VCI"

    @field_validator("symbols")
    @classmethod
    def validate_syms(cls, v):
        if len(v) > 30:
            raise ValueError("Max 30 symbols per request")
        return [re.sub(r"[^A-Z0-9]", "", s.strip().upper()) for s in v if s.strip()]


@router.post("/board")
def get_board(req: BoardRequest):
    today = str(date.today())
    result = []
    for sym in req.symbols:
        try:
            df = fetch_history(sym, today, today, req.source, "1D")
            if df.empty:
                continue
            last = df.iloc[-1]
            open_ = float(last.get("open", 0) or 0)
            close = float(last.get("close", 0) or 0)
            change = close - open_
            change_pct = (change / open_ * 100) if open_ else 0.0
            result.append(
                {
                    "symbol": sym,
                    "open": open_,
                    "high": float(last.get("high", 0) or 0),
                    "low": float(last.get("low", 0) or 0),
                    "close": close,
                    "volume": float(last.get("volume", 0) or 0),
                    "change": round(change, 2),
                    "changePct": round(change_pct, 2),
                }
            )
        except Exception:
            pass
    return {"date": today, "data": result}
