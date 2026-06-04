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


def build_context(df: pd.DataFrame, symbol: str, source: str = "VCI") -> str:
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
        rsi_val  = float(r["rsi"])  if ("rsi" in r.index and r["rsi"] == r["rsi"]) else float("nan")
        macdh    = float(r["macdHist"]) if ("macdHist" in r.index and r["macdHist"] == r["macdHist"]) else float("nan")
        rsi_s    = f"{rsi_val:.1f}" if rsi_val == rsi_val else "—"
        macdh_s  = f"{macdh:.2f}" if macdh == macdh else "—"
        rows.append(
            f"{str(r['time'])[:10]} | {r['close']:,.0f} | "
            f"O:{r['open']:,.0f} H:{r['high']:,.0f} L:{r['low']:,.0f} | "
            f"Vol:{r['volume']:,.0f} | RSI:{rsi_s} | MACD-H:{macdh_s}"
        )
    table_str = "\n".join(rows)

    # 1. Fetch Fundamental Analysis (FA) data using KBS source (highly detailed ratio endpoint)
    fa_md = ""
    try:
        from vnstock import Finance
        fin = Finance(symbol=symbol, source='KBS')
        df_ratio = fin.ratio(period='year')
        if df_ratio is not None and not df_ratio.empty:
            period_cols = [c for c in df_ratio.columns if c not in ['item', 'item_id', 'item_en', 'unit', 'levels', 'row_number']]
            year_cols = sorted([c for c in period_cols if any(char.isdigit() for char in c)], reverse=True)
            if year_cols:
                latest_p = year_cols[0]
                
                metrics_mapping = {
                    'eps': 'trailing_eps',
                    'pe': 'pe_ratio',
                    'pb': 'pb_ratio',
                    'beta': 'beta',
                    'roe': 'roe',
                    'roa': 'roa',
                    'debt_to_equity': 'debt_to_equity',
                    'debt_to_assets': 'debt_to_assets',
                    'rev_growth': 'net_revenue',
                    'profit_growth': 'profit_after_tax_for_shareholders_of_the_parent_company',
                    'gross_margin': 'gross_margin',
                    'net_margin': 'net_margin',
                    'short_term_ratio': 'short_term_ratio',
                    'quick_ratio': 'quick_ratio',
                    'interest_coverage': 'interest_coverage',
                    'dividend_yield': 'dividend_yield'
                }
                
                extracted = {}
                for key, item_id in metrics_mapping.items():
                    row = df_ratio[df_ratio['item_id'] == item_id]
                    if row.empty and key == 'profit_growth':
                        row = df_ratio[df_ratio['item_id'] == 'profit_before_tax']
                    
                    if not row.empty:
                        extracted[key] = row[latest_p].iloc[0]
                    else:
                        extracted[key] = None
                
                def format_val(val, suffix="", is_pct=False):
                    if val is None or pd.isna(val):
                        return "—"
                    if isinstance(val, str):
                        val = val.strip()
                        if val.endswith('%'):
                            val = val[:-1]
                        try:
                            val = float(val)
                        except ValueError:
                            return val
                    
                    float_val = float(val)
                    if is_pct:
                        return f"{float_val:+.2f}%" if float_val >= 0 else f"{float_val:.2f}%"
                    if float_val >= 1000 or float_val <= -1000:
                        return f"{float_val:,.0f}{suffix}"
                    return f"{float_val:.2f}{suffix}"

                fa_md = f"""
## Chỉ số tài chính cơ bản ({latest_p.replace('-Năm', '')})
- EPS: {format_val(extracted['eps'], ' VNĐ')} | P/E: {format_val(extracted['pe'], 'x')} | P/B: {format_val(extracted['pb'], 'x')}
- ROE: {format_val(extracted['roe'], '%')} | ROA: {format_val(extracted['roa'], '%')} | Beta: {format_val(extracted['beta'])}
- Biên LN gộp: {format_val(extracted['gross_margin'], '%')} | Biên LN ròng: {format_val(extracted['net_margin'], '%')}
- Khả năng thanh toán hiện hành: {format_val(extracted['short_term_ratio'], 'x')} | Thanh toán nhanh: {format_val(extracted['quick_ratio'], 'x')}
- Khả năng trả lãi vay (Interest Coverage): {format_val(extracted['interest_coverage'], 'x')} | Tỷ suất cổ tức: {format_val(extracted['dividend_yield'], '%')}
- Nợ/Vốn chủ sở hữu: {format_val(extracted['debt_to_equity'], '%')} | Nợ/Tổng tài sản: {format_val(extracted['debt_to_assets'], '%')}
- Tăng trưởng doanh thu YoY: {format_val(extracted['rev_growth'], '%', is_pct=True)}
- Tăng trưởng lợi nhuận YoY: {format_val(extracted['profit_growth'], '%', is_pct=True)}
"""
    except BaseException as e:
        fa_md = f"\n## Chỉ số tài chính cơ bản\n(Không lấy được dữ liệu tài chính cơ bản: {str(e)})\n"

    # 2. Fetch Foreign Trade/Flow data
    foreign_md = ""
    try:
        from vnstock import Quote
        q = Quote(symbol=symbol, source='VCI')
        if hasattr(q, 'foreign_flow'):
            ff_df = q.foreign_flow(limit=5)
            if ff_df is not None and not ff_df.empty:
                rows_ff = []
                for _, r in ff_df.head(5).iterrows():
                    rows_ff.append(f"- Ngày {r.get('date', '—')}: Ròng {r.get('net_value', 0):+,.0f} VNĐ (Mua: {r.get('buy_value', 0):,.0f} | Bán: {r.get('sell_value', 0):,.0f})")
                foreign_md = "\n## Dòng tiền khối ngoại (5 phiên gần nhất)\n" + "\n".join(rows_ff) + "\n"
    except BaseException:
        pass

    if not foreign_md:
        try:
            from vnstock import Trading
            trading = Trading(symbol=symbol, source='KBS')
            board_df = trading.price_board(symbols_list=[symbol])
            if board_df is not None and not board_df.empty:
                buy_vol = board_df.get('foreign_buy_volume', pd.Series([None])).iloc[0]
                sell_vol = board_df.get('foreign_sell_volume', pd.Series([None])).iloc[0]
                if buy_vol is not None and sell_vol is not None and not (pd.isna(buy_vol) or pd.isna(sell_vol)):
                    net_vol = buy_vol - sell_vol
                    net_flow_vnd = ""
                    close_price = board_df.get('close_price', pd.Series([None])).iloc[0] or board_df.get('reference_price', pd.Series([None])).iloc[0]
                    if close_price:
                        try:
                            close_price = float(close_price)
                            if 0 < close_price < 10000:
                                close_price *= 1000
                            net_flow_vnd = f" (~{net_vol * close_price / 1_000_000_000:+.2f} tỷ VNĐ)"
                        except:
                            pass
                    foreign_md = f"""
## Dòng tiền khối ngoại (Phiên gần nhất)
- Khối ngoại Mua: {buy_vol:,.0f} cổ phiếu | Bán: {sell_vol:,.0f} cổ phiếu
- Ròng: {net_vol:+,.0f} cổ phiếu{net_flow_vnd}
"""
        except BaseException as e:
            foreign_md = f"\n## Dòng tiền khối ngoại\n(Không lấy được dữ liệu dòng tiền khối ngoại: {str(e)})\n"

    ctx = f"""# Báo cáo phân tích kỹ thuật: {symbol}
Kỳ phân tích: {df["time"].iloc[0].date()} → {df["time"].iloc[-1].date()} ({len(df)} phiên)

## Giá & biến động
- Giá đóng cửa gần nhất: {v('close'):,.0f} VNĐ ({chg_pct:+.2f}%)
- Mở cửa / Cao / Thấp: {v('open'):,.0f} / {v('high'):,.0f} / {v('low'):,.0f}
- Cao nhất kỳ: {df['high'].max():,.0f} | Thấp nhất kỳ: {df['low'].min():,.0f}

## Sinh lời
- 5 phiên: {ret5:+.2f}% | 20 phiên: {ret20:+.2f}% | Toàn kỳ: {ret_all:+.2f}%
- Win rate: {win_r:.1f}% | Volatility σ: {std:.2f}%
{fa_md}{foreign_md}
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
    return {"symbol": sym, "context": build_context(df, sym, req.source)}

