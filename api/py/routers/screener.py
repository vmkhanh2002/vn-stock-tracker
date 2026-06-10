import os
import json
import time
import tempfile
import httpx
import pandas as pd
import numpy as np
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

from vnstock import Listing, Trading, Finance

router = APIRouter()


# Helper function to get Turso Pipeline URL
def get_turso_pipeline_url() -> Optional[str]:
    db_url = os.environ.get("TURSO_DATABASE_URL")
    if not db_url:
        return None
    if db_url.startswith("libsql://"):
        db_url = db_url.replace("libsql://", "https://")
    if not db_url.endswith("/v2/pipeline"):
        db_url = db_url.rstrip("/") + "/v2/pipeline"
    return db_url


# Helper function to get cache from Turso
def get_screener_cache_from_turso(group: str) -> Optional[List[dict]]:
    db_url = get_turso_pipeline_url()
    auth_token = os.environ.get("TURSO_AUTH_TOKEN")
    if not db_url or not auth_token:
        return None

    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "requests": [
            {
                "type": "execute",
                "stmt": {
                    "sql": 'SELECT "data", "updated_at" FROM screener_cache WHERE "group" = ?;',
                    "args": [{"type": "text", "value": group.upper()}],
                },
            },
            {"type": "close"},
        ]
    }

    try:
        with httpx.Client() as client:
            resp = client.post(db_url, json=payload, headers=headers, timeout=5.0)
            if resp.status_code == 200:
                res_json = resp.json()
                results = res_json.get("results", [])
                if results and results[0].get("type") == "ok":
                    exec_res = results[0]["response"]["result"]
                    rows = exec_res.get("rows", [])
                    if rows:
                        row = rows[0]
                        data_str = row[0]["value"]
                        updated_at = int(row[1]["value"])

                        # Validate TTL
                        if time.time() - updated_at < CACHE_TTL:
                            return json.loads(data_str)
    except BaseException as e:
        # Fail silently
        print(f"Error reading from Turso cache: {e}")
    return None


# Helper function to save cache to Turso
def save_screener_cache_to_turso(group: str, data: List[dict]) -> bool:
    db_url = get_turso_pipeline_url()
    auth_token = os.environ.get("TURSO_AUTH_TOKEN")
    if not db_url or not auth_token:
        return False

    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json",
    }
    data_str = json.dumps(data, ensure_ascii=False)
    updated_at = int(time.time())

    payload = {
        "requests": [
            {
                "type": "execute",
                "stmt": {
                    "sql": 'INSERT OR REPLACE INTO screener_cache ("group", "data", "updated_at") VALUES (?, ?, ?);',
                    "args": [
                        {"type": "text", "value": group.upper()},
                        {"type": "text", "value": data_str},
                        {"type": "integer", "value": str(updated_at)},
                    ],
                },
            },
            {"type": "close"},
        ]
    }

    try:
        with httpx.Client() as client:
            resp = client.post(db_url, json=payload, headers=headers, timeout=5.0)
            return resp.status_code == 200
    except BaseException as e:
        print(f"Error saving to Turso cache: {e}")
        return False


class ScreenerRequest(BaseModel):
    group: str = "VN30"  # VN30, HNX30, VN100, VNMidCap, VNSmallCap, HOSE, HNX, UPCOM
    peMin: Optional[float] = None
    peMax: Optional[float] = None
    pbMin: Optional[float] = None
    pbMax: Optional[float] = None
    roeMin: Optional[float] = None
    roaMin: Optional[float] = None
    pctChangeMin: Optional[float] = None
    pctChangeMax: Optional[float] = None
    volumeMin: Optional[float] = None


# Cấu hình cache
CACHE_DIR = os.path.join(tempfile.gettempdir(), "vnstock_screener_cache")
CACHE_TTL = 43200  # 12 giờ (giây)

os.makedirs(CACHE_DIR, exist_ok=True)


def get_cache_path(group: str) -> str:
    return os.path.join(CACHE_DIR, f"screener_{group.upper()}.json")


def get_group_symbols(group: str) -> List[str]:
    l = Listing()
    group_upper = group.strip().upper()

    # 1. Nếu là rổ sàn HOSE/HNX/UPCOM
    if group_upper in ["HOSE", "HNX", "UPCOM"]:
        try:
            df = l.symbols_by_exchange(group_upper)
            if df is not None and not df.empty:
                # Lấy tối đa 150 mã có thông tin để tránh rate limit lúc kéo FA
                # Sắp xếp theo giá tham chiếu giảm dần để lấy các mã lớn trước
                if "re" in df.columns:
                    df = df.sort_values(by="re", ascending=False)
                symbols = df["symbol"].tolist()
                return symbols[:150]
        except BaseException:
            pass

    # 2. Nếu là rổ chỉ số VN30/HNX30/VN100/VNMidCap...
    try:
        # symbols_by_group trả về pandas Series chứa danh sách mã
        res = l.symbols_by_group(group_upper)
        if res is not None and not res.empty:
            return res.tolist()
    except BaseException:
        pass

    # Fallback nếu lỗi hoặc rổ lạ
    try:
        df = l.symbols_by_group("VN30")
        if df is not None and not df.empty:
            return df.tolist()
    except BaseException:
        pass

    return ["FPT", "HPG", "SSI", "VCB", "VIC", "VNM", "MSN", "MWG", "TCB", "VHM"]


def fetch_one_ratio(sym: str):
    """Kéo dữ liệu tài chính (FA) cho 1 mã"""
    try:
        fin = Finance(symbol=sym, source="KBS")
        df_ratio = fin.ratio(period="year")
        if df_ratio is not None and not df_ratio.empty:
            period_cols = [
                c
                for c in df_ratio.columns
                if c
                not in ["item", "item_id", "item_en", "unit", "levels", "row_number"]
            ]
            year_cols = sorted(
                [c for c in period_cols if any(char.isdigit() for char in c)],
                reverse=True,
            )
            if year_cols:
                latest_p = year_cols[0]

                # Trích xuất an toàn các chỉ số
                def get_val(item_id):
                    row = df_ratio[df_ratio["item_id"] == item_id]
                    if not row.empty:
                        val = row[latest_p].iloc[0]
                        if val is not None and not pd.isna(val):
                            try:
                                return float(val)
                            except:
                                return None
                    return None

                return sym, {
                    "organ_name": str(
                        df_ratio.get("organ_name", pd.Series([""])).iloc[0] or ""
                    ),
                    "pe": get_val("pe_ratio"),
                    "pb": get_val("pb_ratio"),
                    "roe": get_val("roe"),
                    "roa": get_val("roa"),
                    "debt_to_equity": get_val("debt_to_equity"),
                    "debt_to_assets": get_val("debt_to_assets"),
                    "rev_growth": get_val("net_revenue"),
                    "profit_growth": get_val(
                        "profit_after_tax_for_shareholders_of_the_parent_company"
                    ),
                }
    except BaseException:
        pass
    return sym, None


def clean_nan(val):
    if isinstance(val, list):
        return [clean_nan(x) for x in val]
    if isinstance(val, dict):
        return {k: clean_nan(v) for k, v in val.items()}
    if isinstance(val, (float, np.floating)):
        if np.isnan(val) or np.isinf(val):
            return None
    elif val is None or pd.isna(val):
        return None
    return val


def ensure_schema(data_list: List[dict]) -> List[dict]:
    defaults = {
        "symbol": "",
        "organ_name": "",
        "price": 0.0,
        "pct_change": 0.0,
        "volume": 0.0,
        "foreign_buy": 0.0,
        "foreign_sell": 0.0,
        "foreign_net": 0.0,
        "exchange": "",
        "pe": None,
        "pb": None,
        "roe": None,
        "roa": None,
        "debt_to_equity": None,
        "debt_to_assets": None,
        "rev_growth": None,
        "profit_growth": None,
    }
    res = []
    for item in data_list:
        new_item = defaults.copy()
        new_item.update(item)
        res.append(new_item)
    return res


def get_base_data(group: str) -> List[dict]:
    # 1. Thử đọc từ cache của Turso Cloud trước
    turso_cache = get_screener_cache_from_turso(group)
    if turso_cache is not None:
        return ensure_schema(clean_nan(turso_cache))

    # 2. Fallback: Đọc từ cache tệp cục bộ /tmp
    cache_path = get_cache_path(group)
    now = time.time()

    if os.path.exists(cache_path):
        try:
            mtime = os.path.getmtime(cache_path)
            if now - mtime < CACHE_TTL:
                with open(cache_path, "r", encoding="utf-8") as f:
                    return ensure_schema(clean_nan(json.load(f)))
        except BaseException:
            pass

    # Lấy danh sách mã mới
    symbols = get_group_symbols(group)
    if not symbols:
        return []

    fa_data = {}

    # Kéo song song tỉ số tài chính
    # Vì rate limit, giới hạn số thread và sử dụng delay nhẹ nếu số mã lớn
    max_workers = 10 if len(symbols) <= 50 else 5
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Nếu danh sách lớn, chèn delay nhỏ để tránh rate limit
        if len(symbols) > 50:
            futures = []
            for i, sym in enumerate(symbols):
                futures.append(executor.submit(fetch_one_ratio, sym))
                if i % 10 == 0:
                    time.sleep(0.5)
            results = [f.result() for f in futures]
        else:
            results = list(executor.map(fetch_one_ratio, symbols))

    for sym, data in results:
        if data:
            fa_data[sym] = data

    # Lấy thông tin giá realtime hàng loạt qua price_board (chỉ tốn 1 request)
    realtime_data = {}
    try:
        t = Trading()
        # price_board hỗ trợ truyền list
        df_board = t.price_board(symbols_list=symbols)
        if df_board is not None and not df_board.empty:
            for _, r in df_board.iterrows():
                sym = r.get("symbol")
                if not sym:
                    continue

                # Trích xuất thông tin
                close_price = r.get("close_price") or r.get("reference_price")
                pct_chg = r.get("percent_change") or 0.0
                vol = r.get("volume_accumulated") or 0.0
                foreign_buy = r.get("foreign_buy_volume") or 0.0
                foreign_sell = r.get("foreign_sell_volume") or 0.0

                realtime_data[sym] = {
                    "price": float(close_price) if close_price else 0.0,
                    "pct_change": float(pct_chg),
                    "volume": float(vol),
                    "foreign_buy": float(foreign_buy),
                    "foreign_sell": float(foreign_sell),
                    "foreign_net": float(foreign_buy - foreign_sell),
                    "exchange": str(r.get("exchange", "")),
                }
    except BaseException:
        pass

    # Gộp dữ liệu
    merged = []
    for sym in symbols:
        # Dữ liệu mặc định
        item = {
            "symbol": sym,
            "organ_name": "",
            "price": 0.0,
            "pct_change": 0.0,
            "volume": 0.0,
            "foreign_buy": 0.0,
            "foreign_sell": 0.0,
            "foreign_net": 0.0,
            "exchange": "",
            "pe": None,
            "pb": None,
            "roe": None,
            "roa": None,
            "debt_to_equity": None,
            "debt_to_assets": None,
            "rev_growth": None,
            "profit_growth": None,
        }

        # Điền FA
        if sym in fa_data:
            item.update(fa_data[sym])

        # Điền Realtime
        if sym in realtime_data:
            item.update(realtime_data[sym])

        merged.append(item)

    cleaned_merged = clean_nan(merged)

    # Ghi vào cache Turso Cloud
    save_screener_cache_to_turso(group, cleaned_merged)

    # Ghi vào cache tệp cục bộ làm dự phòng
    try:
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(cleaned_merged, f, ensure_ascii=False, indent=2)
    except BaseException:
        pass

    return cleaned_merged


@router.post("")
def run_screener(req: ScreenerRequest):
    data = get_base_data(req.group)
    if not data:
        return []

    filtered = []
    for r in data:
        # 1. Lọc PE
        pe = r.get("pe")
        if req.peMin is not None and (pe is None or pe < req.peMin):
            continue
        if req.peMax is not None and (pe is None or pe > req.peMax):
            continue

        # 2. Lọc PB
        pb = r.get("pb")
        if req.pbMin is not None and (pb is None or pb < req.pbMin):
            continue
        if req.pbMax is not None and (pb is None or pb > req.pbMax):
            continue

        # 3. Lọc ROE
        roe = r.get("roe")
        if req.roeMin is not None and (roe is None or roe < req.roeMin):
            continue

        # 4. Lọc ROA
        roa = r.get("roa")
        if req.roaMin is not None and (roa is None or roa < req.roaMin):
            continue

        # 5. Lọc % thay đổi giá
        pct_change = r.get("pct_change", 0.0) or 0.0
        if req.pctChangeMin is not None and pct_change < req.pctChangeMin:
            continue
        if req.pctChangeMax is not None and pct_change > req.pctChangeMax:
            continue

        # 6. Lọc khối lượng
        volume = r.get("volume", 0.0) or 0.0
        if req.volumeMin is not None and volume < req.volumeMin:
            continue

        filtered.append(r)

    return filtered
