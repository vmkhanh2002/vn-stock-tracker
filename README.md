# 📈 VN Stock Tracker

Nền tảng phân tích cổ phiếu Việt Nam tích hợp AI, xây dựng bằng **Next.js 16 + FastAPI + vnstock**.  
Mỗi user tự quản lý API key cá nhân — không bottleneck, không hardcode.

🌐 **Live:** https://vn-stock-tracker-swart.vercel.app

---

## ✨ Tính năng

| Module | Nội dung |
|---|---|
| **Tra cứu 1 mã** | OHLCV, biểu đồ nến, MA10/20/50, Bollinger Bands, tín hiệu kỹ thuật tự động |
| **Bảng giá thời gian thực** | Nhiều mã cùng lúc + so sánh tỷ suất tích lũy |
| **AI Khuyến nghị** | GPT phân tích TA + FA theo khung đầu tư (ngắn/trung/dài hạn) |
| **Chỉ số cơ bản (FA)** | EPS, P/E, P/B, ROE, ROA, Debt/Equity, tăng trưởng YoY |
| **Dòng tiền khối ngoại** | Mua/bán ròng theo phiên gần nhất |
| **Watchlist & Alert** | Danh sách theo dõi, cảnh báo giá qua email |
| **So sánh nhiều mã** | Biểu đồ tỷ suất sinh lời tích lũy |
| **Admin Panel** | Quản lý user, xem AI usage logs |

---

## 🏗 Kiến trúc

```
User Browser
    │
    ▼
Next.js 16 (Vercel)          ← Frontend + API Routes
    ├── /api/ai/analyze       ← Gọi OpenRouter AI
    ├── /api/trpc/[trpc]      ← tRPC: user settings, watchlist, alert
    └── /api/py/*             ← Proxy đến FastAPI

FastAPI (Vercel Serverless)   ← Python data layer
    ├── /stock                ← Giá OHLCV, screener
    ├── /indicators           ← RSI, MACD, Bollinger, ADX...
    └── /ai-context           ← Build markdown context cho AI

PostgreSQL (Prisma)           ← User data, settings, logs
OpenRouter API                ← LLM gateway (user key)
vnstock library               ← Dữ liệu thị trường VN (user key)
```

---

## 🔑 Cấu hình per-user (không hardcode)

| Setting | Mô tả |
|---|---|
| **OpenRouter API Key** | Key cá nhân để gọi AI model — lấy tại [openrouter.ai](https://openrouter.ai) |
| **OpenRouter Model** | Tên model tuỳ chọn (ví dụ: `openrouter/owl-alpha`, `google/gemini-2.5-pro`) |
| **Vnstock API Key** | Key cá nhân vnstock — lấy tại [vnstocks.com](https://vnstocks.com) (miễn phí) |
| **AI System Prompt** | Tuỳ chỉnh vai trò AI. Để trống = dùng prompt mặc định. Hỗ trợ `{horizon}` và `{risk}` |
| **Nguồn dữ liệu** | VCI hoặc KBS |
| **Khung thời gian** | 1D / 1W / 1M |

> ⚠️ **Vnstock API Key là bắt buộc** — mọi request không có key sẽ bị từ chối (401).

---

## 🤖 AI System Prompt

Prompt AI được load theo thứ tự ưu tiên:

1. **Custom prompt** của user (nhập trong Settings)
2. **Fallback:** `lib/default-system-prompt.txt`

Prompt hỗ trợ placeholder động:
- `{horizon}` — khung đầu tư (ngắn hạn / trung hạn / dài hạn)
- `{risk}` — khẩu vị rủi ro (thấp / trung bình / cao)

**Quy tắc phân tích theo khung đầu tư:**
- **Ngắn hạn (1-5 phiên):** 70% TA (RSI, MACD, Bollinger, Stochastic, ADX) + 30% FA
- **Trung/Dài hạn (>3 tháng):** Ưu tiên FA sâu (ROE, P/E, tăng trưởng YoY, đòn bẩy)

---

## 🚀 Cài đặt local

```bash
# 1. Clone
git clone https://github.com/vmkhanh2002/vn-stock-tracker.git
cd vn-stock-tracker

# 2. Node dependencies
npm install

# 3. Python dependencies
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt

# 4. Tạo .env.local từ example
cp .env.example .env.local
# → Điền DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL

# 5. Sync database schema
npx prisma db push

# 6. Chạy dev server
npm run dev
```

Truy cập: http://localhost:3000

---

## 🗄 Database (khi host local)

Dự án dùng **PostgreSQL** qua Prisma ORM. Có 3 lựa chọn:

| Option | Mô tả | Phù hợp |
|---|---|---|
| **PostgreSQL local** | Cài PostgreSQL trên máy | Dev offline |
| **[Neon](https://neon.tech)** | Serverless Postgres, free tier 0.5GB | Dev + staging |
| **[Supabase](https://supabase.com)** | Postgres + UI quản lý, free tier | Dev + staging |

**Connection string mẫu trong `.env.local`:**
```bash
# Local PostgreSQL
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/vnstock_tracker"

# Neon
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Supabase
DATABASE_URL="postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres"
```

Sau khi có `DATABASE_URL`, chạy:
```bash
npx prisma db push   # tạo bảng theo schema
```

---

## 🌍 Environment Variables

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | Secret key cho NextAuth session |
| `NEXTAUTH_URL` | ✅ | URL public của app (vd: https://...) |

> `VNSTOCK_API_KEY` và `OPENROUTER_API_KEY` **không** set ở cấp hệ thống — mỗi user tự nhập trong Settings.

---

## 📚 Nguồn dữ liệu

| Nguồn | Mô tả |
|---|---|
| **VCI** | Viet Capital Securities — ổn định, nhanh, mặc định |
| **KBS** | Korea Investment & Securities — dùng cho FA ratios |

---

## 📁 Kho mã nguồn liên quan

Dự án tham khảo và tích hợp từ ba nguồn (lưu local tại `sources/`, không commit):

| Repo | Mô tả |
|---|---|
| [vnstock-agent-guide](https://github.com/vnstock-hq/vnstock-agent-guide) | Tài liệu xây dựng AI Agent phân tích tài chính |
| [vnstock](https://github.com/thinh-vu/vnstock) | Thư viện cốt lõi truy xuất dữ liệu thị trường VN |
| [vnstock_ezchart](https://github.com/vnstock-hq/vnstock_ezchart) | Thư viện biểu đồ trực quan từ vnstock |

---

## ⚠️ Lưu ý

- Dữ liệu chỉ dùng cho mục đích nghiên cứu cá nhân
- Không phải lời khuyến nghị đầu tư
- AI phân tích dựa trên dữ liệu lịch sử — không đảm bảo kết quả trong tương lai
