"""
VN Stock Tracker — Streamlit app
Tính năng: Tra cứu, So sánh, Realtime + Heatmap, AI Khuyến nghị, Watchlist, Alerts
"""
import os, json, warnings, time as _time, re
import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import plotly.express as px
from datetime import date, timedelta
from pathlib import Path

_SYMBOL_RE = re.compile(r'^[A-Z0-9]{2,10}$')

def _safe_sym(s: str) -> str:
    """Sanitize and validate stock symbol — alphanumeric only, 2-10 chars."""
    clean = re.sub(r'[^A-Z0-9]', '', s.strip().upper())
    return clean if _SYMBOL_RE.match(clean) else ""

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning, module="vnstock")
warnings.filterwarnings("ignore", message=".*use_container_width.*")

# ─────────────────────────────────────────────────────────────────────────────
# ENV & CONFIG — hỗ trợ cả .env (local) và st.secrets (Streamlit Cloud)
# ─────────────────────────────────────────────────────────────────────────────
_env = Path(__file__).parent / ".env"
if _env.exists():
    for _line in _env.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            k, v = _line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

# Streamlit Cloud secrets override env vars (chỉ hoạt động khi deploy)
try:
    for _k, _v in st.secrets.items():
        if isinstance(_v, str):
            os.environ.setdefault(_k, _v)
except Exception:
    pass  # st.secrets không có khi chạy local mà không có secrets.toml

os.environ["VNSTOCK_SHOW_ADS"]       = "0"
os.environ["VNSTOCK_DISABLE_NOTICE"] = "1"

WATCHLIST_FILE = Path(__file__).parent / "watchlist.json"
ALERTS_FILE    = Path(__file__).parent / "alerts.json"

# ─────────────────────────────────────────────────────────────────────────────
# PAGE CONFIG
# ─────────────────────────────────────────────────────────────────────────────
st.set_page_config(page_title="VN Stock Tracker", page_icon="📈",
                   layout="wide", initial_sidebar_state="expanded")

# ─────────────────────────────────────────────────────────────────────────────
# CSS
# ─────────────────────────────────────────────────────────────────────────────
st.markdown("""<style>
/* Base */
.stApp,[data-testid="stAppViewContainer"]{background:#f0f4f8!important}
[data-testid="stSidebar"]{background:#fff!important;border-right:1px solid #e2e8f0;
    box-shadow:2px 0 8px rgba(0,0,0,.05)}
[data-testid="stSidebar"] *{color:#1e293b!important}
body,.stMarkdown,p,span,label{color:#1e293b!important}
#MainMenu,footer{visibility:hidden}

/* Page header */
.page-header{padding:6px 0 18px;border-bottom:1px solid #e2e8f0;margin-bottom:20px}
.page-title{font-size:22px;font-weight:800;color:#0f172a;line-height:1.2}
.page-sub{font-size:12px;color:#64748b;margin-top:3px}

/* KPI card */
.kpi{background:#fff;border:1px solid #e2e8f0;border-radius:14px;
    padding:14px 16px 10px;text-align:center;
    box-shadow:0 1px 4px rgba(0,0,0,.05);transition:transform .15s,box-shadow .15s}
.kpi:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,.1)}
.kpi-lbl{color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;
    letter-spacing:.08em;margin-bottom:6px}
.kpi-val{color:#0f172a;font-size:19px;font-weight:800;
    font-family:'SF Mono',ui-monospace,monospace;line-height:1.2}
.kpi-sub{font-size:11px;font-weight:600;margin-top:5px}
.kpi-up .kpi-sub{color:#16a34a} .kpi-dn .kpi-sub{color:#dc2626}
.kpi-neu .kpi-sub{color:#64748b}
.acc-blue{border-top:3px solid #2563eb}   .acc-green{border-top:3px solid #16a34a}
.acc-red{border-top:3px solid #dc2626}    .acc-amber{border-top:3px solid #d97706}
.acc-purple{border-top:3px solid #7c3aed} .acc-gray{border-top:3px solid #cbd5e1}

/* Section header */
.shdr{color:#1e40af;font-size:13px;font-weight:700;margin:4px 0 10px;
    padding:6px 12px;background:linear-gradient(90deg,#eff6ff,transparent);
    border-left:3px solid #2563eb;border-radius:0 6px 6px 0}

/* Signal pills */
.pill{display:flex;align-items:flex-start;gap:9px;border-radius:10px;
    padding:9px 12px;margin:4px 0;font-size:12.5px}
.pill-icon{font-size:17px;flex-shrink:0;margin-top:1px}
.pill-body{display:flex;flex-direction:column;gap:1px}
.pill-title{font-weight:700;font-size:13px} .pill-desc{font-size:11px;opacity:.82}
.pill-up{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534}
.pill-dn{background:#fef2f2;border:1px solid #fecaca;color:#991b1b}
.pill-neu{background:#fefce8;border:1px solid #fde68a;color:#854d0e}
.pill-info{background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af}

/* Alert banner */
.alert-fire{background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;
    padding:10px 14px;margin:4px 0;font-size:13px;color:#9a3412}

/* AI badge */
.ai-badge{border-radius:14px;padding:13px 22px;font-size:22px;font-weight:800;
    text-align:center;margin:10px 0 18px;box-shadow:0 4px 16px rgba(0,0,0,.14)}
.ai-MUA{background:linear-gradient(135deg,#15803d,#16a34a);color:#fff}
.ai-BAN{background:linear-gradient(135deg,#b91c1c,#dc2626);color:#fff}
.ai-GIU{background:linear-gradient(135deg,#b45309,#d97706);color:#fff}

/* Table */
[data-testid="stDataFrame"]{border:1px solid #e2e8f0!important;
    border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.04)!important}

/* Buttons */
.stButton>button{background:linear-gradient(135deg,#1e40af,#2563eb)!important;
    color:#fff!important;border:none!important;border-radius:10px!important;
    font-weight:700!important;box-shadow:0 2px 8px rgba(37,99,235,.3)!important;
    padding:0.45rem 1.2rem!important}
.stButton>button:hover{background:linear-gradient(135deg,#1d4ed8,#3b82f6)!important;
    box-shadow:0 4px 14px rgba(37,99,235,.4)!important;transform:translateY(-1px)!important}

/* Input fields */
.stTextInput>div>div>input,.stNumberInput>div>div>input,
.stSelectbox>div>div{border-radius:10px!important}

/* Search bar */
.search-bar{background:#fff;border:1px solid #e2e8f0;border-radius:14px;
    padding:14px 18px;margin-bottom:18px;box-shadow:0 1px 4px rgba(0,0,0,.04)}

/* Divider */
.div-line{border:none;border-top:1px solid #e2e8f0;margin:18px 0}
</style>""", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
# PERSISTENCE HELPERS
# ─────────────────────────────────────────────────────────────────────────────
def load_json(path: Path, default):
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as e:
            st.warning(f"⚠️ Không đọc được {path.name}: {e}")
    return default

def save_json(path: Path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────────────
# SIDEBAR
# ─────────────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("""<div style='padding:10px 0 6px'>
    <div style='font-size:20px;font-weight:800;color:#1e40af'>📈 VN Stock Tracker</div>
    <div style='font-size:11px;color:#64748b;margin-top:2px'>Phân tích chứng khoán Việt Nam</div>
    </div>""", unsafe_allow_html=True)
    st.markdown("<hr style='border-color:#e2e8f0;margin:6px 0 12px'>", unsafe_allow_html=True)

    tab_mode = st.radio("Điều hướng", [
        "📊 Tra cứu 1 mã",
        "🔀 So sánh nhiều mã",
        "📡 Realtime + Heatmap",
        "🤖 AI Khuyến nghị",
    ], label_visibility="collapsed")

    st.markdown("<hr style='border-color:#e2e8f0;margin:10px 0'>", unsafe_allow_html=True)

    # ── Cài đặt dữ liệu ──
    with st.expander("📡 Cài đặt dữ liệu", expanded=True):
        source   = st.selectbox("Nguồn dữ liệu", ["VCI", "KBS"], index=0)
        interval = st.selectbox("Khung thời gian", ["1D", "1W", "1M"], index=0)
        lookback = st.slider("Lookback (ngày)", 30, 730,
                             int(os.environ.get("DEFAULT_LOOKBACK_DAYS", 180)), 30)
        start_date = date.today() - timedelta(days=lookback)
        end_date   = date.today()
        st.caption(f"📅 {start_date} → {end_date}")

    # ── Chỉ báo kỹ thuật ──
    with st.expander("⚙️ Tham số chỉ báo"):
        c1, c2 = st.columns(2)
        ma_fast  = c1.number_input("MA Nhanh",  5,   50,  10, 1)
        ma_mid   = c2.number_input("MA Giữa",   10, 100,  20, 5)
        ma_slow  = c1.number_input("MA Chậm",   20, 200,  50, 10)
        rsi_per  = c2.number_input("RSI Period", 7,  28,  14, 1)
        bb_per   = c1.number_input("BB Period", 10,  50,  20, 1)
        bb_std   = c2.number_input("BB Std",   1.0, 3.0, 2.0, 0.5)
        c3, c4, c5 = st.columns(3)
        macd_f   = c3.number_input("MACD F",  5,  20, 12, 1)
        macd_s   = c4.number_input("MACD S", 15,  50, 26, 1)
        macd_sig = c5.number_input("MACD Sig", 5, 15,  9, 1)

    # ── Watchlist ──
    with st.expander("📌 Watchlist"):
        wl: list[dict] = load_json(WATCHLIST_FILE, [])
        wl_symbols = [w["symbol"] for w in wl]
        if wl_symbols:
            st.caption(f"**{len(wl_symbols)} mã:** " + ", ".join(wl_symbols[:8])
                       + ("…" if len(wl_symbols) > 8 else ""))
        else:
            st.caption("Chưa có mã nào trong watchlist.")

        new_wl  = st.text_input("Thêm mã", placeholder="VD: FPT", key="wl_add")
        note_wl = st.text_input("Ghi chú", placeholder="Mua khi về 90k", key="wl_note")
        c_add, c_rm = st.columns(2)
        if c_add.button("➕ Thêm", key="wl_btn_add", width="stretch"):
            sym = new_wl.strip().upper()
            if sym and sym not in wl_symbols:
                wl.append({"symbol": sym, "added": str(date.today()), "note": note_wl})
                save_json(WATCHLIST_FILE, wl)
                st.rerun()
        rm_sym = st.selectbox("Xoá mã", ["—"] + wl_symbols, key="wl_rm")
        if c_rm.button("🗑 Xoá", key="wl_btn_rm", width="stretch") and rm_sym != "—":
            wl = [w for w in wl if w["symbol"] != rm_sym]
            save_json(WATCHLIST_FILE, wl)
            st.rerun()

    # ── Cảnh báo giá ──
    with st.expander("🔔 Cảnh báo giá"):
        alerts: list[dict] = load_json(ALERTS_FILE, [])
        al_c1, al_c2 = st.columns([3, 2])
        al_sym  = al_c1.text_input("Mã CK", placeholder="VD: VCB", key="al_sym")
        al_cond = al_c2.selectbox("Điều kiện", ["≤ xuống tới", "≥ lên tới"], key="al_cond")
        al_price = st.number_input("Mức giá (VND)", 1_000, 500_000_000,
                                   100_000, 1_000, key="al_price",
                                   format="%d")
        if st.button("🔔 Thêm cảnh báo", key="al_add", width="stretch"):
            sym = al_sym.strip().upper()
            if sym:
                alerts.append({"symbol": sym, "cond": al_cond,
                               "price": al_price, "active": True,
                               "created": str(date.today())})
                save_json(ALERTS_FILE, alerts)
                st.toast(f"✅ Đã thêm cảnh báo {sym} {al_cond} {al_price:,.0f}")
        active_count = sum(1 for a in alerts if a.get("active"))
        if active_count:
            st.caption(f"🔔 {active_count} cảnh báo đang hoạt động")

    # ── API Keys ──
    with st.expander("🔑 API Keys"):
        _key_loaded = bool(os.environ.get("OPENROUTER_API_KEY"))
        if _key_loaded:
            st.success("✅ OpenRouter API Key đã tải từ `.env`", icon="🔐")
        else:
            st.warning("Chưa có API Key.", icon="⚠️")
        # KHÔNG pre-fill value với key thật — tránh lộ qua browser widget state
        openrouter_key = st.text_input(
            "Nhập/đổi OpenRouter API Key",
            value="",
            type="password",
            key="openrouter_key_input",
            placeholder="sk-or-v1-… (để trống nếu đã có trong .env)")
        if openrouter_key:
            os.environ["OPENROUTER_API_KEY"] = openrouter_key
            st.toast("✅ Đã cập nhật API Key cho phiên này.")
        model_name = os.environ.get("OPENROUTER_MODEL", "openrouter/owl-alpha")
        st.caption(f"💡 Sử dụng model: **{model_name}**. Lưu vào file `.env` để không cần nhập lại.")

# ─────────────────────────────────────────────────────────────────────────────
# DATA & INDICATOR HELPERS
# ─────────────────────────────────────────────────────────────────────────────
PARAMS = dict(ma_fast=ma_fast, ma_mid=ma_mid, ma_slow=ma_slow,
              rsi_per=rsi_per, bb_per=bb_per, bb_std=bb_std,
              macd_f=macd_f, macd_s=macd_s, macd_sig=macd_sig)

@st.cache_data(ttl=300, show_spinner=False)
def get_history(symbol: str, start: str, end: str, src: str, iv: str) -> pd.DataFrame:
    try:
        from vnstock import Quote
        df = Quote(symbol=symbol.upper(), source=src).history(
            start=start, end=end, interval=iv)
        if df is None or df.empty: return pd.DataFrame()
        df.columns = [c.lower() for c in df.columns]
        df["time"] = pd.to_datetime(df["time"])
        for c in ["open","high","low","close"]:
            if c in df.columns and df[c].max() < 10_000:
                df[c] *= 1_000
        return df.sort_values("time").reset_index(drop=True)
    except Exception as e:
        st.error(f"❌ Lỗi tải **{symbol}**: {e}")
        return pd.DataFrame()

@st.cache_data(ttl=60, show_spinner=False)
def get_last_price(symbol: str, src: str) -> float:
    today = str(date.today())
    df = get_history(symbol, today, today, src, "1D")
    if df.empty: return float("nan")
    return float(df.iloc[-1]["close"])

def add_indicators(df: pd.DataFrame, p: dict) -> pd.DataFrame:
    import numpy as np
    df = df.copy()
    df["return_pct"] = df["close"].pct_change() * 100

    # Moving Averages
    df[f"ma{p['ma_fast']}"] = df["close"].rolling(p["ma_fast"]).mean()
    df[f"ma{p['ma_mid']}"]  = df["close"].rolling(p["ma_mid"]).mean()
    df[f"ma{p['ma_slow']}"] = df["close"].rolling(p["ma_slow"]).mean()

    # Volume MA
    df["vol_ma20"] = df["volume"].rolling(20).mean()

    # Bollinger Bands
    df["bb_mid"]   = df["close"].rolling(p["bb_per"]).mean()
    df["bb_std"]   = df["close"].rolling(p["bb_per"]).std()
    df["bb_upper"] = df["bb_mid"] + p["bb_std"] * df["bb_std"]
    df["bb_lower"] = df["bb_mid"] - p["bb_std"] * df["bb_std"]

    # RSI
    d    = df["close"].diff()
    gain = d.clip(lower=0).rolling(p["rsi_per"]).mean()
    loss = (-d.clip(upper=0)).rolling(p["rsi_per"]).mean()
    df["rsi"] = 100 - 100 / (1 + gain / loss.replace(0, float("nan")))

    # MACD
    e_f = df["close"].ewm(span=p["macd_f"], adjust=False).mean()
    e_s = df["close"].ewm(span=p["macd_s"], adjust=False).mean()
    df["macd"]      = e_f - e_s
    df["macd_sig"]  = df["macd"].ewm(span=p["macd_sig"], adjust=False).mean()
    df["macd_hist"] = df["macd"] - df["macd_sig"]

    # Stochastic Oscillator (%K, %D)
    stoch_k = 14
    lo = df["low"].rolling(stoch_k).min()
    hi = df["high"].rolling(stoch_k).max()
    df["stoch_k"] = 100 * (df["close"] - lo) / (hi - lo + 1e-9)
    df["stoch_d"] = df["stoch_k"].rolling(3).mean()

    # ADX / +DI / -DI
    adx_p = 14
    prev_close = df["close"].shift(1)
    tr = pd.concat([
        df["high"] - df["low"],
        (df["high"] - prev_close).abs(),
        (df["low"]  - prev_close).abs(),
    ], axis=1).max(axis=1)
    up   = df["high"].diff()
    down = -df["low"].diff()
    dm_p = pd.Series(np.where((up > down) & (up > 0), up, 0.0), index=df.index)
    dm_m = pd.Series(np.where((down > up) & (down > 0), down, 0.0), index=df.index)
    atr_s  = tr.ewm(alpha=1/adx_p, adjust=False).mean()
    dip_s  = dm_p.ewm(alpha=1/adx_p, adjust=False).mean()
    dim_s  = dm_m.ewm(alpha=1/adx_p, adjust=False).mean()
    df["di_plus"]  = 100 * dip_s / atr_s
    df["di_minus"] = 100 * dim_s / atr_s
    dx = 100 * (df["di_plus"] - df["di_minus"]).abs() / (df["di_plus"] + df["di_minus"] + 1e-9)
    df["adx"] = dx.ewm(alpha=1/adx_p, adjust=False).mean()
    df["atr"] = atr_s

    # OBV (On-Balance Volume)
    direction = df["close"].diff().apply(lambda x: 1 if x > 0 else (-1 if x < 0 else 0))
    df["obv"] = (df["volume"] * direction).cumsum()

    # CCI (Commodity Channel Index)
    cci_p = 20
    tp = (df["high"] + df["low"] + df["close"]) / 3
    tp_ma = tp.rolling(cci_p).mean()
    tp_md = tp.rolling(cci_p).apply(lambda x: float(np.mean(np.abs(x - np.mean(x)))), raw=True)
    df["cci"] = (tp - tp_ma) / (0.015 * tp_md + 1e-9)

    return df

# ─────────────────────────────────────────────────────────────────────────────
# CHART HELPERS
# ─────────────────────────────────────────────────────────────────────────────
_CL = dict(paper_bgcolor="#fff", plot_bgcolor="#f8fafc",
           font=dict(color="#475569", size=11, family="Inter,system-ui,sans-serif"),
           margin=dict(l=4, r=4, t=48, b=4),
           hoverlabel=dict(bgcolor="#fff", bordercolor="#e2e8f0",
                           font=dict(color="#0f172a", size=12)))

def _cl(**ov):
    base = dict(_CL); base.update(ov); return base

def make_main_chart(df: pd.DataFrame, symbol: str, p: dict) -> go.Figure:
    fig = make_subplots(rows=4, cols=1, shared_xaxes=True,
                        row_heights=[.50,.16,.18,.16], vertical_spacing=.018,
                        subplot_titles=("","RSI","MACD","Volume"))
    fig.add_trace(go.Candlestick(
        x=df["time"], open=df["open"], high=df["high"],
        low=df["low"], close=df["close"],
        increasing=dict(line=dict(color="#16a34a",width=1.2),fillcolor="#16a34a"),
        decreasing=dict(line=dict(color="#dc2626",width=1.2),fillcolor="#dc2626"),
        name="OHLC"), row=1, col=1)
    for col, lbl, clr in [
        (f"ma{p['ma_fast']}", f"MA{p['ma_fast']}", "#3b82f6"),
        (f"ma{p['ma_mid']}",  f"MA{p['ma_mid']}",  "#f59e0b"),
        (f"ma{p['ma_slow']}", f"MA{p['ma_slow']}", "#8b5cf6"),
    ]:
        if col in df.columns:
            fig.add_trace(go.Scatter(x=df["time"], y=df[col], name=lbl,
                line=dict(color=clr, width=1.3), opacity=.9), row=1, col=1)
    if "bb_upper" in df.columns:
        fig.add_trace(go.Scatter(x=df["time"], y=df["bb_upper"], name="BB Upper",
            line=dict(color="#94a3b8",width=1,dash="dot"), opacity=.7), row=1, col=1)
        fig.add_trace(go.Scatter(x=df["time"], y=df["bb_lower"], name="BB Lower",
            line=dict(color="#94a3b8",width=1,dash="dot"), opacity=.7,
            fill="tonexty", fillcolor="rgba(148,163,184,.07)"), row=1, col=1)
    if "rsi" in df.columns:
        fig.add_trace(go.Scatter(x=df["time"], y=df["rsi"], name="RSI",
            line=dict(color="#7c3aed",width=1.5), showlegend=False), row=2, col=1)
        for y_val, clr in [(70,"#dc2626"),(30,"#16a34a")]:
            fig.add_hline(y=y_val, line_dash="dot", line_color=clr, line_width=1, row=2, col=1)
        fig.add_hrect(y0=30, y1=70, fillcolor="rgba(124,58,237,.04)", line_width=0, row=2, col=1)
    if "macd" in df.columns:
        hc = ["#16a34a" if v >= 0 else "#dc2626" for v in df["macd_hist"].fillna(0)]
        fig.add_trace(go.Bar(x=df["time"], y=df["macd_hist"],
            marker_color=hc, opacity=.7, showlegend=False), row=3, col=1)
        fig.add_trace(go.Scatter(x=df["time"], y=df["macd"],
            line=dict(color="#2563eb",width=1.4), showlegend=False, name="MACD"), row=3, col=1)
        fig.add_trace(go.Scatter(x=df["time"], y=df["macd_sig"],
            line=dict(color="#f59e0b",width=1.4), showlegend=False, name="Sig"), row=3, col=1)
    vc = ["#16a34a" if c >= o else "#dc2626" for c,o in zip(df["close"],df["open"])]
    fig.add_trace(go.Bar(x=df["time"], y=df["volume"],
        marker_color=vc, opacity=.75, showlegend=False), row=4, col=1)
    if "vol_ma20" in df.columns:
        fig.add_trace(go.Scatter(x=df["time"], y=df["vol_ma20"],
            line=dict(color="#2563eb",width=1.3), showlegend=False), row=4, col=1)
    # Legend inside chart top-left — avoids clash with title bar and Plotly toolbar
    fig.update_layout(height=740,
        paper_bgcolor="#fff", plot_bgcolor="#f8fafc",
        font=dict(color="#475569", size=11, family="Inter,system-ui,sans-serif"),
        margin=dict(l=4, r=60, t=8, b=8),
        hoverlabel=dict(bgcolor="#fff", bordercolor="#e2e8f0",
                        font=dict(color="#0f172a", size=12)),
        legend=dict(orientation="h",
                    yanchor="top", y=0.995,
                    xanchor="left", x=0.0,
                    bgcolor="rgba(255,255,255,.88)",
                    bordercolor="#e2e8f0", borderwidth=1,
                    font=dict(size=10, color="#475569"),
                    itemsizing="constant", tracegroupgap=2),
        hovermode="x unified",
        xaxis4=dict(showgrid=True, gridcolor="#f1f5f9", color="#64748b",
                    showline=True, linecolor="#e2e8f0", rangeslider=dict(visible=False)),
    )
    for i in range(1, 5):
        fig.update_yaxes(showgrid=True, gridcolor="#f1f5f9", color="#64748b",
                         side="right", showline=True, linecolor="#e2e8f0",
                         zeroline=False, row=i, col=1)
    fig.update_yaxes(range=[0, 100], row=2, col=1)
    return fig


def make_stochastic_chart(df: pd.DataFrame, symbol: str) -> go.Figure:
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=df["time"], y=df["stoch_k"],
        name="%K", line=dict(color="#2563eb", width=1.5)))
    fig.add_trace(go.Scatter(x=df["time"], y=df["stoch_d"],
        name="%D", line=dict(color="#f59e0b", width=1.5, dash="dash")))
    fig.add_hrect(y0=80, y1=100, fillcolor="rgba(220,38,38,.07)", line_width=0)
    fig.add_hrect(y0=0,  y1=20,  fillcolor="rgba(22,163,74,.07)",  line_width=0)
    for y_val, clr in [(80, "#dc2626"), (20, "#16a34a")]:
        fig.add_hline(y=y_val, line_dash="dot", line_color=clr, line_width=1)
    fig.update_layout(**_cl(
        height=220, margin=dict(l=4, r=60, t=36, b=4),
        yaxis=dict(range=[0,100], showgrid=True, gridcolor="#f1f5f9",
                   color="#64748b", side="right", tickvals=[0,20,50,80,100]),
        xaxis=dict(showgrid=True, gridcolor="#f1f5f9", color="#64748b"),
        title=dict(text=f"<b style='color:#0f172a'>Stochastic Oscillator (%K/%D)</b>"
                        f"<span style='color:#64748b;font-size:11px'> — Quá mua >80, Quá bán <20</span>",
                   font=dict(size=12)),
        legend=dict(orientation="h", x=0, y=1.15, bgcolor="rgba(255,255,255,.85)",
                    font=dict(size=10)),
        hovermode="x unified"))
    return fig


def make_adx_chart(df: pd.DataFrame, symbol: str) -> go.Figure:
    fig = go.Figure()
    if "adx" not in df.columns: return fig
    fig.add_trace(go.Scatter(x=df["time"], y=df["adx"],
        name="ADX", line=dict(color="#7c3aed", width=2)))
    fig.add_trace(go.Scatter(x=df["time"], y=df["di_plus"],
        name="+DI", line=dict(color="#16a34a", width=1.3)))
    fig.add_trace(go.Scatter(x=df["time"], y=df["di_minus"],
        name="-DI", line=dict(color="#dc2626", width=1.3)))
    fig.add_hline(y=25, line_dash="dot", line_color="#94a3b8", line_width=1,
                  annotation_text="Xu hướng mạnh (25)",
                  annotation_font=dict(size=9, color="#94a3b8"))
    fig.update_layout(**_cl(
        height=220, margin=dict(l=4, r=60, t=36, b=4),
        yaxis=dict(showgrid=True, gridcolor="#f1f5f9", color="#64748b",
                   side="right", range=[0, None]),
        xaxis=dict(showgrid=True, gridcolor="#f1f5f9", color="#64748b"),
        title=dict(text=f"<b style='color:#0f172a'>ADX — Sức mạnh xu hướng</b>"
                        f"<span style='color:#64748b;font-size:11px'> · +DI/−DI · ADX>25=xu hướng rõ</span>",
                   font=dict(size=12)),
        legend=dict(orientation="h", x=0, y=1.15, bgcolor="rgba(255,255,255,.85)",
                    font=dict(size=10)),
        hovermode="x unified"))
    return fig


def make_obv_chart(df: pd.DataFrame, symbol: str) -> go.Figure:
    fig = go.Figure()
    if "obv" not in df.columns: return fig
    obv_ma = df["obv"].rolling(20).mean()
    obv_colors = ["#16a34a" if v >= 0 else "#dc2626"
                  for v in df["obv"].diff().fillna(0)]
    fig.add_trace(go.Bar(x=df["time"], y=df["obv"],
        marker_color=obv_colors, opacity=.5, showlegend=False, name="OBV"))
    fig.add_trace(go.Scatter(x=df["time"], y=df["obv"],
        name="OBV", line=dict(color="#2563eb", width=1.5)))
    fig.add_trace(go.Scatter(x=df["time"], y=obv_ma,
        name="MA20", line=dict(color="#f59e0b", width=1.3, dash="dash")))
    fig.update_layout(**_cl(
        height=220, margin=dict(l=4, r=60, t=36, b=4),
        yaxis=dict(showgrid=True, gridcolor="#f1f5f9", color="#64748b",
                   side="right", tickformat=".2s"),
        xaxis=dict(showgrid=True, gridcolor="#f1f5f9", color="#64748b"),
        title=dict(text=f"<b style='color:#0f172a'>OBV — On-Balance Volume</b>"
                        f"<span style='color:#64748b;font-size:11px'> · OBV tăng = dòng tiền vào</span>",
                   font=dict(size=12)),
        legend=dict(orientation="h", x=0, y=1.15, bgcolor="rgba(255,255,255,.85)",
                    font=dict(size=10)),
        hovermode="x unified"))
    return fig


def make_cci_chart(df: pd.DataFrame, symbol: str) -> go.Figure:
    fig = go.Figure()
    if "cci" not in df.columns: return fig
    cci = df["cci"]
    bar_colors = ["#16a34a" if v >= 0 else "#dc2626" for v in cci.fillna(0)]
    fig.add_trace(go.Bar(x=df["time"], y=cci, marker_color=bar_colors,
                         opacity=.55, showlegend=False))
    fig.add_trace(go.Scatter(x=df["time"], y=cci, name="CCI",
        line=dict(color="#0891b2", width=1.5)))
    for y_val, clr, txt in [(100,"#dc2626","Quá mua"),(-100,"#16a34a","Quá bán")]:
        fig.add_hline(y=y_val, line_dash="dot", line_color=clr, line_width=1,
                      annotation_text=txt, annotation_font=dict(size=9, color=clr))
    fig.add_hrect(y0=100, y1=300, fillcolor="rgba(220,38,38,.06)", line_width=0)
    fig.add_hrect(y0=-300, y1=-100, fillcolor="rgba(22,163,74,.06)", line_width=0)
    fig.update_layout(**_cl(
        height=220, margin=dict(l=4, r=60, t=36, b=4),
        yaxis=dict(showgrid=True, gridcolor="#f1f5f9", color="#64748b",
                   side="right", zeroline=True, zerolinecolor="#cbd5e1"),
        xaxis=dict(showgrid=True, gridcolor="#f1f5f9", color="#64748b"),
        title=dict(text=f"<b style='color:#0f172a'>CCI — Commodity Channel Index</b>"
                        f"<span style='color:#64748b;font-size:11px'> · Quá mua >100, Quá bán <-100</span>",
                   font=dict(size=12)),
        hovermode="x unified"))
    return fig

def make_rsi_gauge(rsi_val: float) -> go.Figure:
    color = "#dc2626" if rsi_val > 70 else "#16a34a" if rsi_val < 30 else "#2563eb"
    label = "Quá mua" if rsi_val > 70 else "Quá bán" if rsi_val < 30 else "Trung tính"
    fig = go.Figure(go.Indicator(
        mode="gauge+number",
        value=rsi_val,
        number=dict(font=dict(size=26, color=color, family="SF Mono,monospace"),
                    suffix=f"  {label}"),
        gauge=dict(
            axis=dict(range=[0,100], tickwidth=1, tickcolor="#94a3b8",
                      tickvals=[0,30,50,70,100]),
            bar=dict(color=color, thickness=0.28),
            bgcolor="#f8fafc", borderwidth=1, bordercolor="#e2e8f0",
            steps=[dict(range=[0,30],  color="#dcfce7"),
                   dict(range=[30,70], color="#f1f5f9"),
                   dict(range=[70,100],color="#fee2e2")],
            threshold=dict(line=dict(color="#0f172a",width=2),
                           thickness=0.8, value=rsi_val),
        ),
        title=dict(text=f"RSI ({rsi_per})", font=dict(size=12, color="#475569")),
    ))
    fig.update_layout(height=210, margin=dict(l=20,r=20,t=36,b=10),
                      paper_bgcolor="#ffffff", font=dict(color="#475569"))
    return fig

def make_return_dist(df: pd.DataFrame, symbol: str) -> go.Figure:
    r = df["return_pct"].dropna()
    mean_r, std_r = r.mean(), r.std()
    win = (r > 0).sum() / len(r) * 100
    # Two separate histogram traces for positive/negative bars (per-bar color not supported)
    fig = go.Figure()
    fig.add_trace(go.Histogram(
        x=r[r >= 0], nbinsx=25, name="Tăng",
        marker=dict(color="#16a34a", line=dict(color="#fff", width=.5)),
        opacity=.75, hovertemplate="%{x:.2f}%<extra>Tăng</extra>"))
    fig.add_trace(go.Histogram(
        x=r[r < 0], nbinsx=25, name="Giảm",
        marker=dict(color="#dc2626", line=dict(color="#fff", width=.5)),
        opacity=.75, hovertemplate="%{x:.2f}%<extra>Giảm</extra>"))
    for xval, clr, dash, label in [
        (mean_r, "#2563eb", "dash", f"TB {mean_r:.2f}%"),
        (mean_r+std_r, "#94a3b8", "dot", f"+1σ"),
        (mean_r-std_r, "#94a3b8", "dot", f"-1σ"),
    ]:
        fig.add_vline(x=float(xval), line_width=1.5 if "TB" in label else 1,
                      line_color=clr, line_dash=dash,
                      annotation_text=label,
                      annotation_font=dict(color=clr, size=10))
    fig.update_layout(**_cl(
        height=240, margin=dict(l=4, r=4, t=50, b=4),
        barmode="overlay",
        yaxis=dict(showgrid=True, gridcolor="#f1f5f9", color="#64748b"),
        xaxis=dict(showgrid=True, gridcolor="#f1f5f9", color="#64748b",
                   title="Sinh lời ngày (%)"),
        title=dict(text=f"<b>{symbol}</b><span style='color:#64748b;font-size:11px'>"
                        f" — Phân phối sinh lời · Win rate {win:.0f}% · σ={std_r:.2f}%</span>",
                   font=dict(size=13)),
        legend=dict(orientation="h", x=1, xanchor="right", y=1.12,
                    font=dict(size=10), bgcolor="rgba(255,255,255,.8)"),
        bargap=.04))
    return fig

def make_heatmap(board: pd.DataFrame) -> go.Figure:
    df_hm = board.copy()
    df_hm["label"] = df_hm.apply(
        lambda r: f"<b>{r['Mã']}</b><br>{r['%']:+.2f}%<br>{r['Volume']/1e6:.1f}M", axis=1)
    fig = go.Figure(go.Treemap(
        labels=df_hm["label"], parents=[""] * len(df_hm),
        values=df_hm["Volume"].clip(lower=1),
        customdata=df_hm[["%","Giá","Volume"]].values,
        hovertemplate="<b>%{label}</b><br>Giá: %{customdata[1]:,.0f}<br>Vol: %{customdata[2]:,.0f}<extra></extra>",
        marker=dict(
            colors=df_hm["%"],
            colorscale=[[0,"#dc2626"],[0.5,"#f1f5f9"],[1,"#16a34a"]],
            cmid=0, cmin=-5, cmax=5,
            line=dict(color="#fff", width=2),
        ),
        textfont=dict(size=13, color="#0f172a"),
    ))
    fig.update_layout(height=420, margin=dict(l=4,r=4,t=46,b=4),
                      paper_bgcolor="#ffffff",
                      title=dict(text="Heatmap thị trường (kích thước = Volume, màu = % thay đổi)",
                                 font=dict(size=13, color="#0f172a")))
    return fig

# ─────────────────────────────────────────────────────────────────────────────
# SIGNAL PILLS
# ─────────────────────────────────────────────────────────────────────────────
def signal_pills(df: pd.DataFrame, p: dict):
    if len(df) < p["ma_slow"]:
        st.info(f"Cần ≥ {p['ma_slow']} phiên để tính tín hiệu.")
        return
    last = df.iloc[-1]
    sigs = []
    mf, mm, ms = f"ma{p['ma_fast']}", f"ma{p['ma_mid']}", f"ma{p['ma_slow']}"
    c = last["close"]
    mfv = last.get(mf, float("nan")); mmv = last.get(mm, float("nan")); msv = last.get(ms, float("nan"))
    if pd.notna(mfv) and pd.notna(mmv):
        if c > mfv > mmv:
            sigs.append(("up","🟢","Xu hướng TĂNG",f"Giá ({c:,.0f}) > MA{p['ma_fast']} > MA{p['ma_mid']}"))
        elif c < mfv < mmv:
            sigs.append(("dn","🔴","Xu hướng GIẢM",f"Giá ({c:,.0f}) < MA{p['ma_fast']} < MA{p['ma_mid']}"))
        else:
            sigs.append(("neu","🟡","Giằng co",f"Giá ({c:,.0f}) giao động quanh MA"))
    if pd.notna(mmv) and pd.notna(msv):
        if mmv > msv:
            sigs.append(("up","📈",f"MA{p['ma_mid']} > MA{p['ma_slow']}","Xu hướng dài hạn tích cực"))
        else:
            sigs.append(("dn","📉",f"MA{p['ma_mid']} < MA{p['ma_slow']}","Xu hướng dài hạn tiêu cực"))
    bu, bl = last.get("bb_upper",float("nan")), last.get("bb_lower",float("nan"))
    bm = last.get("bb_mid", float("nan"))
    if pd.notna(bu) and pd.notna(bl):
        bw = (bu-bl)/bm*100 if pd.notna(bm) and bm != 0 else float("nan")
        if c > bu:   sigs.append(("dn","⚠️","Quá mua (BB)",f"Giá vượt BB Upper {bu:,.0f}"))
        elif c < bl: sigs.append(("up","💡","Quá bán (BB)",f"Giá dưới BB Lower {bl:,.0f}"))
        if pd.notna(bw) and bw < 5:
            sigs.append(("info","🎯","BB Thu hẹp",f"Dải BB chỉ {bw:.1f}% — sắp biến động"))
    rsi = last.get("rsi", float("nan"))
    if pd.notna(rsi):
        if rsi > 70:   sigs.append(("dn","🔥",f"RSI Quá mua ({rsi:.1f})","RSI > 70 — áp lực bán"))
        elif rsi < 30: sigs.append(("up","❄️",f"RSI Quá bán ({rsi:.1f})","RSI < 30 — cơ hội mua"))
        elif 45<=rsi<=60: sigs.append(("info","✅",f"RSI ({rsi:.1f})","Vùng RSI khỏe mạnh"))
        else: sigs.append(("neu","📊",f"RSI ({rsi:.1f})","Vùng trung gian"))
    macd, sig = last.get("macd",float("nan")), last.get("macd_sig",float("nan"))
    if pd.notna(macd) and pd.notna(sig):
        if macd > sig: sigs.append(("up","⚡","MACD Bullish",f"MACD ({macd:.1f}) > Signal ({sig:.1f})"))
        else:          sigs.append(("dn","⚡","MACD Bearish",f"MACD ({macd:.1f}) < Signal ({sig:.1f})"))
    vol_avg = df["volume"].tail(20).mean()
    vr = last["volume"]/vol_avg if vol_avg > 0 else 0
    if vr > 2:     sigs.append(("info","🚀","Dòng tiền bùng nổ",f"Volume ×{vr:.1f} TB 20 phiên"))
    elif vr > 1.5: sigs.append(("info","📊","Dòng tiền mạnh",f"Volume ×{vr:.1f} TB 20 phiên"))
    elif vr < 0.5: sigs.append(("neu","📉","Thanh khoản yếu",f"Volume ×{vr:.1f} TB 20 phiên"))
    # Stochastic
    sk, sd = last.get("stoch_k", float("nan")), last.get("stoch_d", float("nan"))
    if pd.notna(sk):
        if sk > 80:   sigs.append(("dn","🔴",f"Stoch Quá mua ({sk:.0f})",f"%K={sk:.0f} > 80 — áp lực bán"))
        elif sk < 20: sigs.append(("up","🟢",f"Stoch Quá bán ({sk:.0f})",f"%K={sk:.0f} < 20 — cơ hội mua"))
        if pd.notna(sd):
            if sk > sd and sk < 20: sigs.append(("up","⬆️","Stoch Bullish Cross",f"%K cắt lên %D ở vùng quá bán"))
            elif sk < sd and sk > 80: sigs.append(("dn","⬇️","Stoch Bearish Cross",f"%K cắt xuống %D ở vùng quá mua"))
    # ADX
    adx_v = last.get("adx", float("nan"))
    dip, dim = last.get("di_plus", float("nan")), last.get("di_minus", float("nan"))
    if pd.notna(adx_v):
        if adx_v > 40:   sigs.append(("info","💪",f"Xu hướng rất mạnh (ADX={adx_v:.0f})","ADX>40 — xu hướng cực mạnh"))
        elif adx_v > 25: sigs.append(("info","📐",f"Xu hướng rõ (ADX={adx_v:.0f})","ADX>25 — có xu hướng rõ ràng"))
        else:             sigs.append(("neu","〰️",f"Thị trường giằng co (ADX={adx_v:.0f})","ADX<25 — không có xu hướng rõ"))
        if pd.notna(dip) and pd.notna(dim):
            if dip > dim: sigs.append(("up","📈",f"+DI>{dim:.0f} (DI+ {dip:.0f})","Lực mua vượt lực bán"))
            else:          sigs.append(("dn","📉",f"-DI>{dip:.0f} (DI- {dim:.0f})","Lực bán vượt lực mua"))
    # OBV Trend
    if "obv" in df.columns and len(df) >= 5:
        obv_now  = df["obv"].iloc[-1]
        obv_prev = df["obv"].iloc[-5]
        obv_chg  = (obv_now - obv_prev) / (abs(obv_prev) + 1) * 100
        if obv_chg > 5:   sigs.append(("up","💹","OBV Tăng mạnh",f"Dòng tiền vào mạnh +{obv_chg:.0f}% (5 phiên)"))
        elif obv_chg < -5:sigs.append(("dn","📤","OBV Giảm mạnh",f"Dòng tiền rút ra {obv_chg:.0f}% (5 phiên)"))
    # CCI
    cci_v = last.get("cci", float("nan"))
    if pd.notna(cci_v):
        if cci_v > 150:   sigs.append(("dn","⚠️",f"CCI Cực quá mua ({cci_v:.0f})","CCI>150 — rất nguy hiểm"))
        elif cci_v > 100: sigs.append(("dn","🔶",f"CCI Quá mua ({cci_v:.0f})","CCI>100 — quá mua"))
        elif cci_v < -100:sigs.append(("up","🔷",f"CCI Quá bán ({cci_v:.0f})","CCI<-100 — quá bán, cơ hội"))
    # Golden / Death Cross detection
    if len(df) >= 2:
        prev2 = df.iloc[-2]
        mf_now, ms_now   = last.get(mf, float("nan")), last.get(ms, float("nan"))
        mf_prev, ms_prev = prev2.get(mf, float("nan")), prev2.get(ms, float("nan"))
        if pd.notna(mf_now) and pd.notna(ms_now) and pd.notna(mf_prev) and pd.notna(ms_prev):
            if mf_prev < ms_prev and mf_now > ms_now:
                sigs.append(("up","⭐","Golden Cross!",
                             f"MA{p['ma_fast']} vừa cắt lên MA{p['ma_slow']} — tín hiệu mua mạnh"))
            elif mf_prev > ms_prev and mf_now < ms_now:
                sigs.append(("dn","💀","Death Cross!",
                             f"MA{p['ma_fast']} vừa cắt xuống MA{p['ma_slow']} — tín hiệu bán mạnh"))
    st_map = {"up":"pill-up","dn":"pill-dn","neu":"pill-neu","info":"pill-info"}
    for kind, icon, title, desc in sigs:
        st.markdown(
            f"<div class='pill {st_map[kind]}'>"
            f"<span class='pill-icon'>{icon}</span>"
            f"<div class='pill-body'><span class='pill-title'>{title}</span>"
            f"<span class='pill-desc'>{desc}</span></div></div>",
            unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
# KPI CARD
# ─────────────────────────────────────────────────────────────────────────────
def kpi(col, lbl, val, sub="", acc="gray", dir="neu"):
    col.markdown(
        f"<div class='kpi acc-{acc} kpi-{dir}'>"
        f"<div class='kpi-lbl'>{lbl}</div>"
        f"<div class='kpi-val'>{val}</div>"
        f"{'<div class=kpi-sub>' + sub + '</div>' if sub else ''}"
        f"</div>", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
# ALERT CHECKER
# ─────────────────────────────────────────────────────────────────────────────
def check_alerts(alerts: list[dict], source: str):
    """Check price alerts — max 5 active checks per run to avoid API rate limits."""
    fired = []
    active = [a for a in alerts if a.get("active")][:5]
    for a in active:
        price = get_last_price(a["symbol"], source)
        if pd.isna(price):
            continue
        if "≤" in a["cond"] and price <= a["price"]:
            fired.append((a["symbol"], price, a["cond"], a["price"]))
        elif "≥" in a["cond"] and price >= a["price"]:
            fired.append((a["symbol"], price, a["cond"], a["price"]))
    return fired

# ─────────────────────────────────────────────────────────────────────────────
# ALERT BANNER
# ─────────────────────────────────────────────────────────────────────────────
alerts_data = load_json(ALERTS_FILE, [])
if alerts_data:
    fired = check_alerts(alerts_data, source)
    for sym, cur, cond, tgt in fired:
        st.markdown(
            f"<div class='alert-fire'>🔔 <b>CẢNH BÁO</b>: <b>{sym}</b> đang ở "
            f"<b>{cur:,.0f}</b> — kích hoạt điều kiện <b>{cond} {tgt:,.0f}</b></div>",
            unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
# REALTIME BOARD — top-level function so @st.cache_data is registered once
# ─────────────────────────────────────────────────────────────────────────────
@st.cache_data(ttl=30, show_spinner=False)
def _board(syms: tuple, src: str) -> pd.DataFrame:
    rows = []
    for sym in syms:
        try:
            from vnstock import Quote
            df_rt = Quote(symbol=sym, source=src).history(
                start=str(date.today()), end=str(date.today()), interval="1D")
            if df_rt is None or df_rt.empty:
                continue
            df_rt.columns = [c.lower() for c in df_rt.columns]
            def _v(x): f = float(x); return f * 1000 if f < 10_000 else f
            row = df_rt.iloc[-1]
            rows.append({"Mã": sym,
                         "Giá":    _v(row.get("close", 0)),
                         "Mở cửa":_v(row.get("open",  0)),
                         "Cao":    _v(row.get("high",  0)),
                         "Thấp":   _v(row.get("low",   0)),
                         "Volume": float(row.get("volume", 0))})
        except Exception:
            pass
    if not rows:
        return pd.DataFrame()
    r = pd.DataFrame(rows)
    r["±"] = r["Giá"] - r["Mở cửa"]
    r["%"] = (r["±"] / r["Mở cửa"] * 100).where(r["Mở cửa"] > 0, 0)
    return r

# ═════════════════════════════════════════════════════════════════════════════
# MODE 1 — Tra cứu 1 mã
# ═════════════════════════════════════════════════════════════════════════════
if tab_mode == "📊 Tra cứu 1 mã":
    st.markdown("""<div class='page-header'>
        <div class='page-title'>📊 Tra cứu cổ phiếu</div>
        <div class='page-sub'>Phân tích kỹ thuật chi tiết — giá, chỉ báo, tín hiệu</div>
    </div>""", unsafe_allow_html=True)

    # ── Search bar ──
    wl_syms = [w["symbol"] for w in load_json(WATCHLIST_FILE, [])]
    with st.container():
        sc1, sc2 = st.columns([3, 2])
        with sc1:
            symbol = _safe_sym(st.text_input("Mã chứng khoán",
                value="FPT", placeholder="Nhập mã: FPT, VCB, TCB, HPG…",
                help="Nhập mã cổ phiếu (2–10 ký tự, chỉ chữ và số)"))
        with sc2:
            wl_pick = st.selectbox("Chọn từ Watchlist",
                ["— Chọn từ danh sách —"] + wl_syms,
                help="Chọn nhanh mã đã lưu trong Watchlist")
            if wl_pick != "— Chọn từ danh sách —":
                symbol = wl_pick

    if not symbol: st.stop()

    with st.spinner(f"⏳ Đang tải dữ liệu **{symbol}**…"):
        df = get_history(symbol, str(start_date), str(end_date), source, interval)

    if df.empty:
        st.warning(f"⚠️ Không tìm thấy dữ liệu **{symbol}**. Kiểm tra mã hoặc thử đổi nguồn sang KBS.")
        st.stop()

    df   = add_indicators(df, PARAMS)
    last = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else last
    chg     = last["close"] - prev["close"]
    chg_pct = chg / prev["close"] * 100 if prev["close"] else 0
    rsi_v   = last.get("rsi", float("nan"))
    macd_h  = last.get("macd_hist", float("nan"))
    ret_all = (last["close"] / df.iloc[0]["close"] - 1) * 100
    vr      = last["volume"] / df["volume"].tail(20).mean() if df["volume"].tail(20).mean() > 0 else 0
    high_p  = df["high"].max()
    from_h  = (last["close"] - high_p) / high_p * 100
    ddir    = "up" if chg >= 0 else "dn"
    dsym    = "▲" if chg >= 0 else "▼"

    st.markdown("<hr class='div-line'>", unsafe_allow_html=True)

    # ── Row 1: Giá (4 KPI) ──
    st.markdown("<div class='shdr'>💰 Thông tin giá</div>", unsafe_allow_html=True)
    r1 = st.columns(4)
    kpi(r1[0], "Giá đóng cửa", f"{last['close']:,.0f}",
        f"{dsym} {chg:,.0f} ({chg_pct:+.2f}%)", "blue", ddir)
    kpi(r1[1], "Giá mở cửa",   f"{last['open']:,.0f}",  acc="gray")
    kpi(r1[2], "Cao phiên",     f"{last['high']:,.0f}",  acc="green", dir="up")
    kpi(r1[3], "Thấp phiên",    f"{last['low']:,.0f}",   acc="red",   dir="dn")

    st.markdown("<div style='height:10px'></div>", unsafe_allow_html=True)

    # ── Row 2: Chỉ báo (4 KPI) ──
    st.markdown("<div class='shdr'>📊 Chỉ báo kỹ thuật</div>", unsafe_allow_html=True)
    r2 = st.columns(4)
    kpi(r2[0], "Volume", f"{last['volume']/1e6:.1f}M",
        f"×{vr:.1f} so với TB 20 phiên", "amber",
        "up" if vr > 1.2 else "dn" if vr < .8 else "neu")
    racc = "red" if rsi_v > 70 else "green" if rsi_v < 30 else "amber"
    rdir = "dn" if rsi_v > 70 else "up" if rsi_v < 30 else "neu"
    kpi(r2[1], f"RSI ({rsi_per})",
        f"{rsi_v:.1f}" if pd.notna(rsi_v) else "—",
        "🔴 Quá mua" if rsi_v > 70 else "🟢 Quá bán" if rsi_v < 30 else "🟡 Trung tính",
        racc, rdir)
    kpi(r2[2], "MACD Histogram",
        f"{macd_h:+.1f}" if pd.notna(macd_h) else "—",
        "📈 Bullish" if pd.notna(macd_h) and macd_h > 0 else "📉 Bearish",
        "green" if pd.notna(macd_h) and macd_h > 0 else "red",
        "up" if pd.notna(macd_h) and macd_h > 0 else "dn")
    kpi(r2[3], f"Sinh lời ({len(df)} phiên)",
        f"{ret_all:+.1f}%",
        f"Cách đỉnh kỳ: {from_h:.1f}%",
        "green" if ret_all > 0 else "red",
        "up" if ret_all > 0 else "dn")

    st.markdown("<hr class='div-line'>", unsafe_allow_html=True)

    # ── Biểu đồ kỹ thuật chính (full width) ──
    st.markdown("<div class='shdr'>📈 Biểu đồ kỹ thuật tổng hợp</div>", unsafe_allow_html=True)
    st.plotly_chart(make_main_chart(df, symbol, PARAMS),
                    width="stretch",
                    config={"displayModeBar": True,
                            "modeBarButtonsToRemove": ["lasso2d","select2d"],
                            "displaylogo": False})

    # ── Chỉ báo bổ sung (Stochastic, ADX, OBV, CCI) ──
    st.markdown("<div class='shdr'>📐 Chỉ báo kỹ thuật nâng cao</div>", unsafe_allow_html=True)
    ind_tab1, ind_tab2, ind_tab3, ind_tab4 = st.tabs([
        "📊 Stochastic", "💪 ADX / DI", "💹 OBV", "📏 CCI"
    ])
    with ind_tab1:
        if "stoch_k" in df.columns:
            st.plotly_chart(make_stochastic_chart(df, symbol),
                            width="stretch", config={"displayModeBar": False})
        else:
            st.info("Không đủ dữ liệu.")
    with ind_tab2:
        if "adx" in df.columns:
            st.plotly_chart(make_adx_chart(df, symbol),
                            width="stretch", config={"displayModeBar": False})
        else:
            st.info("Không đủ dữ liệu.")
    with ind_tab3:
        if "obv" in df.columns:
            st.plotly_chart(make_obv_chart(df, symbol),
                            width="stretch", config={"displayModeBar": False})
        else:
            st.info("Không đủ dữ liệu.")
    with ind_tab4:
        if "cci" in df.columns:
            st.plotly_chart(make_cci_chart(df, symbol),
                            width="stretch", config={"displayModeBar": False})
        else:
            st.info("Không đủ dữ liệu.")

    # ── RSI Gauge + Return Distribution (side by side) ──
    gauge_col, dist_col = st.columns([1, 2])
    with gauge_col:
        st.markdown("<div class='shdr'>🎚️ RSI Gauge</div>", unsafe_allow_html=True)
        if pd.notna(rsi_v):
            st.plotly_chart(make_rsi_gauge(rsi_v), width="stretch",
                            config={"displayModeBar": False})
        else:
            st.info("Không đủ dữ liệu để tính RSI.")
    with dist_col:
        st.markdown("<div class='shdr'>📉 Phân phối sinh lời ngày</div>", unsafe_allow_html=True)
        st.plotly_chart(make_return_dist(df, symbol), width="stretch",
                        config={"displayModeBar": False})

    st.markdown("<hr class='div-line'>", unsafe_allow_html=True)

    # ── Tín hiệu + Bảng dữ liệu ──
    sig_col, tbl_col = st.columns([1, 2])
    with sig_col:
        st.markdown("<div class='shdr'>🎯 Tín hiệu kỹ thuật</div>", unsafe_allow_html=True)
        signal_pills(df, PARAMS)
    with tbl_col:
        st.markdown("<div class='shdr'>📋 50 phiên gần nhất</div>", unsafe_allow_html=True)
        mf_col, mm_col = f"ma{ma_fast}", f"ma{ma_mid}"
        show = [c for c in ["time","open","high","low","close","volume",
                             "return_pct", mf_col, mm_col,"rsi","macd_hist"] if c in df.columns]
        disp = df[show].copy().sort_values("time", ascending=False).head(50).reset_index(drop=True)
        cfg  = {
            "time":       st.column_config.DateColumn("Ngày",   format="DD/MM/YYYY"),
            "open":       st.column_config.NumberColumn("Mở cửa",format="%,.0f"),
            "high":       st.column_config.NumberColumn("Cao",   format="%,.0f"),
            "low":        st.column_config.NumberColumn("Thấp",  format="%,.0f"),
            "close":      st.column_config.NumberColumn("Đóng",  format="%,.0f"),
            "volume":     st.column_config.NumberColumn("Volume",format="%,.0f"),
            "return_pct": st.column_config.NumberColumn("SL%",   format="%.2f%%"),
            mf_col:       st.column_config.NumberColumn(f"MA{ma_fast}", format="%,.0f"),
            mm_col:       st.column_config.NumberColumn(f"MA{ma_mid}",  format="%,.0f"),
            "rsi":        st.column_config.NumberColumn("RSI",   format="%.1f"),
            "macd_hist":  st.column_config.NumberColumn("MACD H",format="%.2f"),
        }
        st.dataframe(disp, column_config=cfg, width="stretch",
                     hide_index=True, height=310)

    st.markdown("<hr class='div-line'>", unsafe_allow_html=True)
    st.download_button("⬇️ Tải xuống CSV", df.to_csv(index=False).encode("utf-8-sig"),
                       f"{symbol}_{date.today()}.csv", "text/csv")

# ═════════════════════════════════════════════════════════════════════════════
# MODE 2 — So sánh nhiều mã
# ═════════════════════════════════════════════════════════════════════════════
elif tab_mode == "🔀 So sánh nhiều mã":
    st.markdown("""<div class='page-header'>
        <div class='page-title'>🔀 So sánh nhiều cổ phiếu</div>
        <div class='page-sub'>Tỷ suất sinh lời tích lũy và các chỉ số tổng hợp</div>
    </div>""", unsafe_allow_html=True)

    wl_syms = [w["symbol"] for w in load_json(WATCHLIST_FILE, [])]
    default_syms = ", ".join(wl_syms) if wl_syms else "FPT, MBB, TCB, HPG, MWG"

    with st.container():
        ic1, ic2 = st.columns([5, 1])
        with ic1:
            raw = st.text_input("Danh sách mã chứng khoán (phân cách bằng dấu phẩy)",
                                value=default_syms,
                                placeholder="VD: FPT, VCB, TCB, HPG, MWG",
                                help="Nhập tối đa 10 mã để so sánh")
        with ic2:
            st.markdown("<div style='height:28px'></div>", unsafe_allow_html=True)
            run_cmp = st.button("📊 So sánh", type="primary", width="stretch")

    symbols = [s for s in (_safe_sym(x) for x in raw.split(",")) if s]
    if symbols:
        st.caption(f"**{len(symbols)} mã:** {', '.join(symbols)}")

    if run_cmp and symbols:
        all_dfs = []
        prog = st.progress(0, text="Đang tải dữ liệu…")
        for i, s in enumerate(symbols):
            prog.progress((i+1)/len(symbols), text=f"Đang tải {s}…")
            d = get_history(s, str(start_date), str(end_date), source, interval)
            if not d.empty:
                d = add_indicators(d, PARAMS)
                d["symbol"]     = s
                d["norm_close"] = d["close"] / d["close"].iloc[0] * 100
                all_dfs.append(d)
        prog.empty()

        if not all_dfs:
            st.warning("⚠️ Không tải được dữ liệu. Kiểm tra mã và nguồn dữ liệu.")
            st.stop()

        combined = pd.concat(all_dfs)

        # Biểu đồ so sánh
        st.markdown("<div class='shdr'>📈 Tỷ suất sinh lời tích lũy (Base = 100%)</div>",
                    unsafe_allow_html=True)
        fig = px.line(combined, x="time", y="norm_close", color="symbol",
                      template="plotly_white",
                      color_discrete_sequence=px.colors.qualitative.Bold,
                      labels={"norm_close":"Base=100 (%)","time":"","symbol":"Mã CK"})
        fig.update_traces(line=dict(width=2))
        fig.update_layout(**_cl(
            height=460,
            yaxis=dict(showgrid=True, gridcolor="#f1f5f9", color="#64748b",
                       ticksuffix="%", side="right"),
            legend=dict(orientation="h", yanchor="bottom", y=1.01, x=0,
                        bgcolor="rgba(255,255,255,.92)", bordercolor="#e2e8f0",
                        borderwidth=1, font=dict(size=11,color="#475569")),
            title=dict(text="Tỷ suất sinh lời tích lũy (Base = 100%)",
                       font=dict(size=14,color="#0f172a")),
            hovermode="x unified"))
        st.plotly_chart(fig, width="stretch", config={"displayModeBar": False})

        # Bảng tóm tắt
        st.markdown("<div class='shdr'>📋 Bảng so sánh tổng hợp</div>", unsafe_allow_html=True)
        rows = []
        for d in all_dfs:
            last  = d.iloc[-1]; first = d.iloc[0]["close"]
            ret   = (last["close"] / first - 1) * 100
            rsi_  = last.get("rsi", float("nan"))
            vr_   = last["volume"] / d["volume"].tail(20).mean() if d["volume"].tail(20).mean() > 0 else 0
            rows.append({
                "Mã":          d["symbol"].iloc[0],
                "Giá hiện tại":last["close"],
                "Sinh lời %":  ret,
                "Max High":    d["high"].max(),
                "Min Low":     d["low"].min(),
                "RSI":         rsi_,
                "Vol×TB20":    vr_,
            })
        summary = pd.DataFrame(rows)
        st.dataframe(summary, column_config={
            "Mã":          st.column_config.TextColumn("Mã CK", width="small"),
            "Giá hiện tại":st.column_config.NumberColumn("Giá hiện tại",format="%,.0f"),
            "Sinh lời %":  st.column_config.NumberColumn("Sinh lời %",  format="%+.2f%%"),
            "Max High":    st.column_config.NumberColumn("Cao nhất kỳ", format="%,.0f"),
            "Min Low":     st.column_config.NumberColumn("Thấp nhất kỳ",format="%,.0f"),
            "RSI":         st.column_config.NumberColumn("RSI",         format="%.1f"),
            "Vol×TB20":    st.column_config.NumberColumn("Vol×TB20",    format="%.1fx"),
        }, width="stretch", hide_index=True)

        st.markdown("<hr class='div-line'>", unsafe_allow_html=True)
        st.download_button("⬇️ Tải xuống CSV",
                           combined.to_csv(index=False).encode("utf-8-sig"),
                           f"compare_{date.today()}.csv", "text/csv")

# ═════════════════════════════════════════════════════════════════════════════
# MODE 3 — Realtime + Heatmap
# ═════════════════════════════════════════════════════════════════════════════
elif tab_mode == "📡 Realtime + Heatmap":
    st.markdown("""<div class='page-header'>
        <div class='page-title'>📡 Bảng giá Realtime + Heatmap</div>
        <div class='page-sub'>Theo dõi giá theo thời gian thực và trực quan hóa thị trường</div>
    </div>""", unsafe_allow_html=True)

    wl_syms = [w["symbol"] for w in load_json(WATCHLIST_FILE, [])]
    default_rt = ", ".join(wl_syms) if wl_syms else "FPT, MBB, TCB, HPG, MWG, VCB, BID, CTG, VNM, MSN"

    # Search + controls
    rc1, rc2, rc3 = st.columns([4, 1, 1])
    with rc1:
        raw_rt = st.text_input("Danh sách mã theo dõi",
                               value=default_rt, placeholder="FPT, VCB, TCB…")
    with rc2:
        st.markdown("<div style='height:28px'></div>", unsafe_allow_html=True)
        refresh = st.button("🔄 Refresh", type="primary", width="stretch")
    with rc3:
        st.markdown("<div style='height:28px'></div>", unsafe_allow_html=True)
        auto = st.toggle("⏱ Auto 30s")

    if auto:
        st.info("⏱ Auto-refresh đang bật — trang sẽ tự động cập nhật mỗi 30 giây.")
        _time.sleep(30)
        st.rerun()
    if refresh:
        st.cache_data.clear()

    rt_syms = tuple(
        s for s in (s.strip().upper() for s in raw_rt.split(","))
        if s and len(s) <= 10 and s.isalnum()
    )

    with st.spinner("📡 Đang lấy giá thị trường…"):
        board = _board(rt_syms, source)

    if board.empty:
        st.warning("⚠️ Không lấy được dữ liệu. Thử đổi nguồn hoặc kiểm tra mã CK.")
        st.stop()

    # ── Tổng quan thị trường ──
    st.markdown("<div class='shdr'>📊 Tổng quan thị trường</div>", unsafe_allow_html=True)
    up   = (board["%"] > 0).sum()
    dn   = (board["%"] < 0).sum()
    flat = (board["%"] == 0).sum()
    avg  = board["%"].mean()
    kc   = st.columns(5)
    kpi(kc[0], "Mã theo dõi", str(len(board)), acc="blue")
    kpi(kc[1], "Tăng giá",  f"▲ {up}",  acc="green", dir="up")
    kpi(kc[2], "Giảm giá",  f"▼ {dn}",  acc="red",   dir="dn")
    kpi(kc[3], "Đứng giá",  f"— {flat}", acc="gray",  dir="neu")
    kpi(kc[4], "TB thay đổi", f"{avg:+.2f}%", acc="amber",
        dir="up" if avg >= 0 else "dn")

    st.markdown("<hr class='div-line'>", unsafe_allow_html=True)

    # ── Hiển thị ──
    view = st.radio("Chế độ hiển thị", ["📋 Bảng giá", "🗺 Heatmap", "📊 Bảng + Heatmap"],
                    horizontal=True, index=2)

    if view in ("📋 Bảng giá", "📊 Bảng + Heatmap"):
        st.markdown("<div class='shdr'>📋 Bảng giá chi tiết</div>", unsafe_allow_html=True)
        st.dataframe(board, column_config={
            "Mã":     st.column_config.TextColumn("Mã CK",  width="small"),
            "Giá":    st.column_config.NumberColumn("Giá",   format="%,.0f"),
            "Mở cửa":st.column_config.NumberColumn("Mở cửa",format="%,.0f"),
            "Cao":    st.column_config.NumberColumn("Cao",   format="%,.0f"),
            "Thấp":   st.column_config.NumberColumn("Thấp",  format="%,.0f"),
            "Volume": st.column_config.NumberColumn("Volume",format="%,.0f"),
            "±":      st.column_config.NumberColumn("±",     format="%+,.0f"),
            "%":      st.column_config.NumberColumn("%",     format="%+.2f%%"),
        }, width="stretch", hide_index=True, height=360)

    if view in ("🗺 Heatmap", "📊 Bảng + Heatmap"):
        st.markdown("<div class='shdr'>🗺 Heatmap thị trường</div>", unsafe_allow_html=True)
        st.plotly_chart(make_heatmap(board), width="stretch",
                        config={"displayModeBar": False})

    # ── Bar chart ──
    st.markdown("<div class='shdr'>📊 % Thay đổi giá phiên</div>", unsafe_allow_html=True)
    pct = board["%"].tolist()
    fig_bar = go.Figure(go.Bar(
        x=board["Mã"], y=pct,
        marker=dict(color=["#16a34a" if v >= 0 else "#dc2626" for v in pct],
                    line=dict(color="#fff", width=.5)),
        opacity=.85,
        text=[f"{v:+.2f}%" for v in pct], textposition="outside",
        textfont=dict(size=11),
        hovertemplate="%{x}: %{y:+.2f}%<extra></extra>", showlegend=False))
    fig_bar.add_hline(y=0, line_width=1.5, line_color="#94a3b8")
    fig_bar.update_layout(**_cl(
        height=300, margin=dict(l=4,r=4,t=36,b=4),
        yaxis=dict(showgrid=True, gridcolor="#f1f5f9", color="#64748b", ticksuffix="%"),
        xaxis=dict(showgrid=False, color="#64748b"),
        title=None))
    st.plotly_chart(fig_bar, width="stretch", config={"displayModeBar": False})

    st.markdown("<hr class='div-line'>", unsafe_allow_html=True)
    st.download_button("⬇️ Tải xuống CSV",
                       board.to_csv(index=False).encode("utf-8-sig"),
                       f"board_{date.today()}.csv", "text/csv")

# ═════════════════════════════════════════════════════════════════════════════
# MODE 4 — AI Khuyến nghị
# ═════════════════════════════════════════════════════════════════════════════
elif tab_mode == "🤖 AI Khuyến nghị":
    OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")

    st.markdown("""<div class='page-header'>
        <div class='page-title'>🤖 AI Phân tích & Khuyến nghị (Owl Alpha)</div>
        <div class='page-sub'>OpenRouter Owl Alpha phân tích kỹ thuật + tài chính · Chỉ mang tính tham khảo</div>
    </div>""", unsafe_allow_html=True)

    if not OPENROUTER_KEY:
        st.warning("⚠️ Chưa có OpenRouter API Key. Vui lòng nhập ở **sidebar → 🔑 API Keys**.")
        st.stop()

    ai_mode = st.radio("Chế độ phân tích", ["🔍 Phân tích 1 mã", "🔭 Quét danh mục"],
                       horizontal=True)

    # ── Helpers ──
    @st.cache_data(ttl=3600, show_spinner=False)
    def _fin_df(symbol: str) -> pd.DataFrame:
        try:
            from vnstock import Finance
            df = Finance(symbol=symbol.upper(), source="VCI").ratio(period="year")
            return df if df is not None else pd.DataFrame()
        except Exception:
            return pd.DataFrame()

    def _md_context(df: pd.DataFrame, symbol: str, fin: pd.DataFrame | None) -> str:
        last = df.iloc[-1]; prev = df.iloc[-2] if len(df) > 1 else last
        chg  = last["close"] - prev["close"]
        chgp = chg / prev["close"] * 100 if prev["close"] else 0
        vavg = df["volume"].tail(20).mean()
        vr   = last["volume"] / vavg if vavg > 0 else 1
        def v(k): return last.get(k, float("nan"))
        rsi_l = "Quá mua" if v("rsi") > 70 else "Quá bán" if v("rsi") < 30 else "Trung tính"
        macd_l = "Bullish" if pd.notna(v("macd")) and v("macd") > v("macd_sig") else "Bearish"
        mf, mm, ms = f"ma{PARAMS['ma_fast']}", f"ma{PARAMS['ma_mid']}", f"ma{PARAMS['ma_slow']}"
        trend = ("TĂNG" if last["close"] > v(mf) > v(mm)
                 else "GIẢM" if last["close"] < v(mf) < v(mm) else "GIẰNG CO")
        n = len(df)
        ret5  = (last["close"] / df.iloc[-5]["close"]  - 1) * 100 if n >= 5  else float("nan")
        ret20 = (last["close"] / df.iloc[-20]["close"] - 1) * 100 if n >= 20 else float("nan")
        retA  = (last["close"] / df.iloc[0]["close"] - 1) * 100
        vstd  = df["return_pct"].std()
        wr    = (df["return_pct"].dropna() > 0).mean() * 100

        md = f"""# Báo cáo: {symbol} — {date.today()}
Kỳ phân tích: {df['time'].iloc[0].date()} → {df['time'].iloc[-1].date()} ({len(df)} phiên)

## Tổng quan giá
| Chỉ tiêu | Giá trị |
|---|---|
| Giá đóng cửa | {last['close']:,.0f} VND |
| Thay đổi phiên | {chg:+,.0f} ({chgp:+.2f}%) |
| Cao/Thấp kỳ | {df['high'].max():,.0f} / {df['low'].min():,.0f} |
| Cách đỉnh kỳ | {(last['close']/df['high'].max()-1)*100:.1f}% |

## Chỉ báo kỹ thuật
| Chỉ báo | Giá trị | Tín hiệu |
|---|---|---|
| MA{PARAMS['ma_fast']} | {v(mf):,.0f} | {'✅' if last['close']>v(mf) else '❌'} |
| MA{PARAMS['ma_mid']}  | {v(mm):,.0f} | {'✅' if last['close']>v(mm) else '❌'} |
| MA{PARAMS['ma_slow']} | {v(ms):,.0f} | {'✅' if last['close']>v(ms) else '❌'} |
| Xu hướng MA | — | **{trend}** |
| BB Upper/Lower | {v('bb_upper'):,.0f} / {v('bb_lower'):,.0f} | {'Quá mua' if last['close']>v('bb_upper') else 'Quá bán' if last['close']<v('bb_lower') else 'Trong dải'} |
| RSI ({PARAMS['rsi_per']}) | {v('rsi'):.1f} | {rsi_l} |
| MACD | {v('macd'):.2f} vs {v('macd_sig'):.2f} | {macd_l} |
| MACD Hist | {v('macd_hist'):.2f} | {'Dương ✅' if v('macd_hist')>0 else 'Âm ❌'} |
| Volume/TB20 | ×{vr:.1f} | {'Mạnh ✅' if vr>1.3 else 'Yếu ❌' if vr<0.7 else 'Bình thường'} |
| Sinh lời 5/20 phiên | {ret5:+.2f}% / {ret20:+.2f}% | — |
| Sinh lời toàn kỳ | {retA:+.2f}% | — |
| Win rate / Volatility | {wr:.0f}% / {vstd:.2f}% | — |

## Lịch sử 30 phiên gần nhất
```csv
date,open,high,low,close,volume,rsi,macd_hist,return_pct
"""
        for _, row in df.sort_values("time", ascending=False).head(30).iterrows():
            md += (f"{row['time'].strftime('%Y-%m-%d')},"
                   f"{row['open']:.0f},{row['high']:.0f},"
                   f"{row['low']:.0f},{row['close']:.0f},"
                   f"{row['volume']:.0f},"
                   f"{row.get('rsi', float('nan')):.1f},"
                   f"{row.get('macd_hist', float('nan')):.2f},"
                   f"{row.get('return_pct', float('nan')):.2f}\n")
        md += "```\n"

        if fin is not None and not fin.empty:
            md += "\n## Chỉ số tài chính (năm gần nhất)\n| Chỉ tiêu | Giá trị |\n|---|---|\n"
            r = fin.iloc[-1]
            for lbl, col in [("P/E","price_to_earning"),("P/B","price_to_book"),
                              ("ROE%","return_on_equity"),("ROA%","return_on_asset"),
                              ("EPS","earning_per_share"),("Nợ/VCP","debt_on_equity"),
                              ("Tăng DT%","revenue_growth"),("Tăng LN%","profit_after_tax_growth")]:
                val = r.get(col)
                if val is not None and pd.notna(val):
                    md += f"| {lbl} | {val:.2f} |\n"
        return md

    def call_openrouter(prompt: str) -> str:
        import requests
        headers = {
            "Authorization": f"Bearer {OPENROUTER_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://vn-stock-tracker-swart.vercel.app",
            "X-Title": "VN Stock Tracker"
        }
        model_name = os.environ.get("OPENROUTER_MODEL", "openrouter/owl-alpha")
        payload = {
            "model": model_name,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 1500
        }
        for attempt in range(1, 4):
            try:
                res = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=90
                )
                if res.status_code == 200:
                    data = res.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if content:
                        return content
                    else:
                        return "❌ Lỗi: Phản hồi từ OpenRouter rỗng."
                else:
                    err_msg = res.text
                    try:
                        err_json = res.json()
                        err_msg = err_json.get("error", {}).get("message", res.text)
                    except: pass
                    if attempt < 3:
                        wait = 6 * attempt
                        st.toast(f"⏳ OpenRouter lỗi ({res.status_code}), thử lại sau {wait}s ({attempt}/3)…")
                        _time.sleep(wait)
                    else:
                        return f"❌ Lỗi OpenRouter ({res.status_code}): {err_msg}"
            except Exception as e:
                if attempt < 3:
                    wait = 6 * attempt
                    st.toast(f"⏳ Lỗi kết nối OpenRouter, thử lại sau {wait}s ({attempt}/3)…")
                    _time.sleep(wait)
                else:
                    return f"❌ Lỗi kết nối API: {e}"

    def _prompt_single(md_ctx, question, horizon, risk):
        return f"""Bạn là chuyên gia phân tích chứng khoán Việt Nam 15 năm kinh nghiệm.

Dữ liệu phân tích (Markdown + CSV):
---
{md_ctx}
---

Câu hỏi nhà đầu tư: {question}
Khung đầu tư: {horizon} | Khẩu vị rủi ro: {risk}

Phân tích bằng tiếng Việt theo cấu trúc sau:

## 🎯 Tóm tắt khuyến nghị
- **Quyết định**: [MUA / GIỮ / BÁN] (in đậm)
- **Điểm tin cậy**: X/10
- **Mức rủi ro**: [Thấp / Trung bình / Cao]
- **Lý do cốt lõi**: (1–2 câu ngắn gọn)

## 📈 Phân tích kỹ thuật
(Nhận xét cụ thể dựa trên bảng chỉ báo và dữ liệu 30 phiên CSV)

## 💼 Phân tích cơ bản
(P/E, P/B, ROE, tăng trưởng — nếu không có dữ liệu ghi rõ "Không có dữ liệu")

## ⚠️ Rủi ro cần lưu ý
1. ...
2. ...
3. ...

## 🗺️ Chiến lược hành động
| Hành động | Mức giá / Điều kiện |
|---|---|
| Vùng mua | ... |
| Mục tiêu T1 | ... |
| Mục tiêu T2 | ... |
| Cắt lỗ | ... |

*⚠️ Phân tích chỉ mang tính tham khảo, không phải lời khuyên tài chính chính thức.*"""

    def _prompt_scan(summaries: list[tuple], horizon, risk):
        combined = "\n\n---\n\n".join(f"## {sym}\n{md}" for sym, md in summaries)
        return f"""Bạn là chuyên gia phân tích chứng khoán Việt Nam.

Dưới đây là dữ liệu kỹ thuật của {len(summaries)} cổ phiếu:

{combined}

Khung đầu tư: {horizon} | Khẩu vị rủi ro: {risk}

Nhiệm vụ:
1. Xếp hạng các cổ phiếu từ hấp dẫn nhất đến kém hấp dẫn nhất
2. Với mỗi mã: Khuyến nghị MUA / GIỮ / BÁN + lý do 2–3 câu
3. Chọn **Top 1–2 mã đáng đầu tư nhất** và giải thích chi tiết tại sao
4. Nêu rủi ro chung của thị trường/danh mục

Trả lời bằng tiếng Việt, dùng bảng Markdown và tiêu đề rõ ràng.
*⚠️ Chỉ mang tính tham khảo, không phải lời khuyên tài chính.*"""

    # ── UI: Phân tích 1 mã ──
    if ai_mode == "🔍 Phân tích 1 mã":
        st.markdown("<hr class='div-line'>", unsafe_allow_html=True)

        # Form phân tích
        fc1, fc2 = st.columns([3, 2])
        with fc1:
            st.markdown("<div class='shdr'>📌 Thông tin cổ phiếu</div>",
                        unsafe_allow_html=True)
            wl_syms = [w["symbol"] for w in load_json(WATCHLIST_FILE, [])]
            ai_sym = st.text_input("Mã chứng khoán", value="FPT",
                placeholder="VD: VCB, TCB, HPG, FPT…",
                help="Nhập mã cổ phiếu cần phân tích").strip().upper()
            if wl_syms:
                wl_ai = st.selectbox("Hoặc chọn từ Watchlist",
                    ["— Chọn —"] + wl_syms)
                if wl_ai != "— Chọn —": ai_sym = wl_ai
            user_q = st.text_area("Câu hỏi của bạn", height=90,
                placeholder="VD: Có nên mua thêm ở giá hiện tại không?\nCổ phiếu có đang trong xu hướng tăng không?",
                help="Đặt câu hỏi cụ thể để AI trả lời chính xác hơn")

        with fc2:
            st.markdown("<div class='shdr'>⚙️ Tùy chỉnh phân tích</div>",
                        unsafe_allow_html=True)
            horizon = st.selectbox("Khung thời gian đầu tư",
                ["Ngắn hạn (1–4 tuần)",
                 "Trung hạn (1–6 tháng)",
                 "Dài hạn (> 6 tháng)"], index=1)
            risk = st.selectbox("Khẩu vị rủi ro",
                ["🛡️ Thấp — Ưu tiên an toàn",
                 "⚖️ Trung bình — Cân bằng",
                 "🚀 Cao — Chấp nhận biến động"], index=1)
            inc_fin = st.checkbox("✅ Bao gồm phân tích tài chính cơ bản",
                                  value=True,
                                  help="Lấy thêm P/E, ROE, EPS từ báo cáo tài chính")
            st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)
            run_ai = st.button("🤖 Bắt đầu phân tích AI", type="primary",
                               width="stretch")

        if run_ai and ai_sym:
            st.markdown("<hr class='div-line'>", unsafe_allow_html=True)
            with st.spinner(f"⏳ Đang tải dữ liệu {ai_sym}…"):
                df_ai = get_history(ai_sym, str(start_date), str(end_date), source, interval)
            if df_ai.empty:
                st.warning(f"⚠️ Không tải được dữ liệu **{ai_sym}**.")
                st.stop()

            df_ai = add_indicators(df_ai, PARAMS)
            fin   = _fin_df(ai_sym) if inc_fin else None
            ctx   = _md_context(df_ai, ai_sym, fin)
            q     = user_q.strip() or f"Tôi có nên mua {ai_sym} không?"
            prompt = _prompt_single(ctx, q, horizon, risk)

            with st.spinner("🤖 Owl Alpha đang phân tích dữ liệu…"):
                answer = call_openrouter(prompt)

            # Badge khuyến nghị
            rec = ("MUA" if "MUA" in answer[:400].upper() else
                   "BÁN" if "BÁN" in answer[:400].upper() else "GIỮ")
            st.markdown(
                f"<div class='ai-badge ai-{rec}'>"
                f"{'🟢' if rec=='MUA' else '🔴' if rec=='BÁN' else '🟡'} "
                f"{ai_sym} — Khuyến nghị: <b>{rec}</b></div>",
                unsafe_allow_html=True)

            # Kết quả AI
            st.markdown(answer)

            st.markdown("<hr class='div-line'>", unsafe_allow_html=True)

            # Biểu đồ + dữ liệu
            with st.expander("📈 Xem biểu đồ kỹ thuật", expanded=True):
                st.plotly_chart(make_main_chart(df_ai, ai_sym, PARAMS),
                                width="stretch",
                                config={"displayModeBar": False})
            with st.expander("📄 Dữ liệu đã gửi cho AI"):
                st.code(ctx, language="markdown")

            # Download
            dl1, dl2 = st.columns(2)
            rpt = f"# Phân tích AI: {ai_sym}\nNgày: {date.today()}\n\n{answer}\n\n---\n\n{ctx}"
            dl1.download_button("⬇️ Tải báo cáo (.md)",
                                rpt.encode("utf-8"),
                                f"AI_{ai_sym}_{date.today()}.md", "text/markdown",
                                width="stretch")
            dl2.download_button("⬇️ Tải dữ liệu (.csv)",
                                df_ai.to_csv(index=False).encode("utf-8-sig"),
                                f"data_{ai_sym}_{date.today()}.csv", "text/csv",
                                width="stretch")

    # ── UI: Quét danh mục ──
    else:
        st.markdown("<hr class='div-line'>", unsafe_allow_html=True)

        wl_syms = [w["symbol"] for w in load_json(WATCHLIST_FILE, [])]
        sc1, sc2, sc3 = st.columns([4, 2, 2])
        with sc1:
            st.markdown("<div class='shdr'>📋 Danh mục cần quét</div>",
                        unsafe_allow_html=True)
            raw_scan = st.text_input("Danh sách mã",
                value=", ".join(wl_syms) if wl_syms else "FPT, VCB, TCB, HPG, MWG",
                placeholder="VD: FPT, VCB, TCB, HPG…")
            scan_syms = [s.strip().upper() for s in raw_scan.split(",") if s.strip()]
            if scan_syms:
                st.caption(f"**{len(scan_syms)} mã:** {', '.join(scan_syms)}")
        with sc2:
            st.markdown("<div class='shdr'>⏱ Khung đầu tư</div>", unsafe_allow_html=True)
            horizon = st.selectbox("Khung TG",
                ["Ngắn hạn (1–4 tuần)",
                 "Trung hạn (1–6 tháng)",
                 "Dài hạn (> 6 tháng)"], index=1,
                label_visibility="collapsed")
        with sc3:
            st.markdown("<div class='shdr'>⚖️ Khẩu vị rủi ro</div>", unsafe_allow_html=True)
            risk = st.selectbox("Rủi ro",
                ["🛡️ Thấp", "⚖️ Trung bình", "🚀 Cao"], index=1,
                label_visibility="collapsed")

        st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)
        run_scan = st.button(
            f"🔭 Quét & phân tích {len(scan_syms)} mã bằng AI",
            type="primary", width="stretch")

        if run_scan and scan_syms:
            summaries = []
            prog = st.progress(0, text="Đang tải dữ liệu…")
            for i, sym in enumerate(scan_syms):
                prog.progress((i+1) / len(scan_syms), text=f"Đang tải {sym}…")
                d = get_history(sym, str(start_date), str(end_date), source, interval)
                if d.empty: continue
                d = add_indicators(d, PARAMS)
                summaries.append((sym, _md_context(d, sym, None)))
            prog.empty()

            if not summaries:
                st.warning("⚠️ Không tải được dữ liệu nào.")
                st.stop()

            prompt = _prompt_scan(summaries, horizon, risk)
            with st.spinner(f"🤖 Owl Alpha đang phân tích {len(summaries)} mã…"):
                answer = call_openrouter(prompt)

            st.markdown("<hr class='div-line'>", unsafe_allow_html=True)
            st.markdown(f"### 🔭 Kết quả quét: {', '.join(s for s, _ in summaries)}")
            st.markdown(answer)

            st.markdown("<hr class='div-line'>", unsafe_allow_html=True)
            rpt = f"# Quét danh mục AI\nNgày: {date.today()}\nMã: {', '.join(s for s,_ in summaries)}\n\n{answer}"
            st.download_button("⬇️ Tải báo cáo (.md)",
                               rpt.encode("utf-8"),
                               f"AI_scan_{date.today()}.md", "text/markdown",
                               width="stretch")
