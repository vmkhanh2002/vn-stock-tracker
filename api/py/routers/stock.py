"""
GET /api/py/stock/history   → OHLCV history
GET /api/py/stock/realtime  → latest quote
POST /api/py/stock/board    → batch real-time board via Trading.price_board()
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
        cleaned = [re.sub(r"[^A-Z0-9]", "", s.strip().upper()) for s in v if s.strip()]
        if len(cleaned) > 50:
            raise ValueError("Max 50 symbols per request")
        return cleaned


def _safe_float(val, default: float = 0.0) -> float:
    try:
        f = float(val)
        return f if f == f else default  # NaN check
    except (TypeError, ValueError):
        return default


@router.get("/board-debug")
def board_debug(source: str = "KBS"):
    try:
        from vnstock import Trading
        trading = Trading(source=source, symbol="VNM")
        df = trading.price_board(symbols_list=["VNM", "VCB"])
        df.columns = [str(c).lower().replace(" ", "_") for c in df.columns]
        return {
            "columns": list(df.columns),
            "sample": df.head(1).to_dict(orient="records"),
        }
    except Exception as exc:
        import traceback
        return {"error": str(exc), "trace": traceback.format_exc()}


@router.post("/board")
def get_board(req: BoardRequest):
    import traceback
    today = str(date.today())

    try:
        from vnstock import Trading

        trading = Trading(source=req.source, symbol=req.symbols[0])
        df = trading.price_board(symbols_list=req.symbols)

        if df is None or df.empty:
            raise HTTPException(502, "price_board returned empty data")

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [
                "_".join(str(x) for x in col).lower()
                for col in df.columns.values
            ]
        else:
            df.columns = [str(c).lower().replace(" ", "_") for c in df.columns]

        records = df.to_dict(orient="records")
        result = []

        for row in records:
            sym = str(
                row.get("symbol") or row.get("listing_symbol", "")
            ).strip().upper()
            if not sym:
                continue

            if req.source == "KBS":
                open_ = _safe_float(row.get("open_price") or row.get("reference_price"))
                high  = _safe_float(row.get("high_price"))
                low   = _safe_float(row.get("low_price"))
                close = _safe_float(row.get("close_price") or row.get("match_price"))
                vol   = _safe_float(row.get("volume_accumulated") or row.get("volume_last"))
                change     = _safe_float(row.get("price_change"))
                change_pct = round(_safe_float(row.get("percent_change")), 2)
            else:
                open_ = _safe_float(
                    row.get("listing_ref_price") or row.get("match_open_price")
                )
                high  = _safe_float(row.get("match_highest"))
                low   = _safe_float(row.get("match_lowest"))
                close = _safe_float(row.get("match_match_price"))
                vol   = _safe_float(
                    row.get("match_accumulated_volume") or row.get("match_match_vol")
                )
                change     = close - open_
                change_pct = round((change / open_ * 100) if open_ else 0.0, 2)

            if 0 < close < 10_000:
                open_ *= 1000; high *= 1000; low *= 1000; close *= 1000
                change = close - open_
                change_pct = round((change / open_ * 100) if open_ else 0.0, 2)

            result.append({
                "symbol":    sym,
                "open":      open_,
                "high":      high,
                "low":       low,
                "close":     close,
                "volume":    vol,
                "change":    round(change, 2),
                "changePct": change_pct,
            })

        result.sort(key=lambda r: r["symbol"])
        return {"date": today, "data": result}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(502, f"board error: {exc}\n{traceback.format_exc()}")
