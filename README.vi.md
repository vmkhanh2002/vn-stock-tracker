# VN Stock Tracker

**Tiếng Việt** | [English](README.md)

Nền tảng phân tích chứng khoán Việt Nam tích hợp AI, được xây dựng trên mô hình **Next.js 16 + FastAPI + vnstock**.  
Mỗi người dùng tự quản lý API keys cá nhân — không nghẽn băng thông, không lưu cứng keys hệ thống.

**Live Demo:** https://vn-stock-tracker-swart.vercel.app

---

## Tính năng nổi bật

| Phân hệ | Mô tả |
|---|---|
| **Tra cứu mã** | Biểu đồ nến OHLCV, đường MA10/20/50, Bollinger Bands, tự động phân tích và đưa ra tín hiệu kỹ thuật |
| **Bảng giá thời gian thực** | Theo dõi nhiều mã cùng lúc + so sánh tỷ suất sinh lời tích lũy |
| **Bộ lọc cổ phiếu** | Quét và lọc cổ phiếu trên toàn thị trường dựa trên các chỉ số FA (P/E, P/B, ROE, ROA) và biến động giá/khối lượng thời gian thực |
| **AI Advisor** | AI phân tích chuyên sâu cả TA + FA dựa trên khung thời gian đầu tư (ngắn/trung/dài hạn) và khẩu vị rủi ro |
| **Phân tích cơ bản (FA)** | EPS, P/E, P/B, ROE, ROA, Nợ/Vốn chủ sở hữu, tăng trưởng doanh thu/lợi nhuận YoY |
| **Giao dịch khối ngoại** | Khối lượng và giá trị mua/bán ròng của phiên gần nhất |
| **Watchlist & Cảnh báo** | Quản lý danh sách theo dõi và cài đặt cảnh báo giá tự động gửi email |
| **So sánh cổ phiếu** | Biểu đồ tương tác so sánh tỷ suất sinh lời tích lũy giữa các mã |
| **Admin Panel** | Quản trị người dùng và kiểm tra lịch sử sử dụng AI |

---

## Kiến trúc hệ thống

```
Trình duyệt người dùng
    │
    ▼
Next.js 16 (Vercel)          ← Frontend + API Routes
    ├── /api/ai/analyze       ← Gọi OpenRouter AI
    ├── /api/trpc/[trpc]      ← tRPC: cài đặt người dùng, watchlist, alerts
    └── /api/py/*             ← Proxy sang FastAPI

FastAPI (Vercel Serverless)   ← Tầng dữ liệu Python
    ├── /stock                ← Lấy giá nến OHLCV, screener
    ├── /indicators           ← RSI, MACD, Bollinger, ADX...
    └── /ai-context           ← Xây dựng ngữ cảnh Markdown cho AI

PostgreSQL (Prisma)           ← Lưu trữ người dùng, cài đặt, logs
Turso SQLite (Edge Cache)     ← Cache dữ liệu Screener & Ratios trên Edge
OpenRouter API                ← Gateway kết nối LLM (key người dùng)
Thư viện vnstock              ← Thu thập dữ liệu chứng khoán VN (key người dùng)
```

---

## Cấu hình theo người dùng

| Cài đặt | Mô tả |
|---|---|
| **OpenRouter API Key** | Key cá nhân để gọi AI — đăng ký tại [openrouter.ai](https://openrouter.ai) |
| **Model OpenRouter** | Model tùy chỉnh (VD: `openrouter/owl-alpha`, `google/gemini-2.5-pro`) |
| **Vnstock API Key** | API Key cá nhân của vnstock — đăng ký miễn phí tại [vnstocks.com](https://vnstocks.com) |
| **AI System Prompt** | Tùy chỉnh hành vi của AI. Hỗ trợ các placeholder động `{horizon}` và `{risk}` |
| **Nguồn dữ liệu mặc định**| VCI hoặc KBS |
| **Khung thời gian mặc định**| 1D / 1W / 1M |

> **Vnstock API Key là bắt buộc** — tất cả các yêu cầu dữ liệu không có key sẽ bị từ chối (401).

---

## AI System Prompt

Hệ thống tải system prompt cho AI theo thứ tự ưu tiên:

1. **Prompt tùy chỉnh** do người dùng thiết lập (trong phần Cài đặt)
2. **Mặc định:** `lib/default-system-prompt.vi.txt` (hoặc `lib/default-system-prompt.txt` cho Tiếng Anh)

Hỗ trợ các placeholder động được điền tự động khi phân tích:
- `{horizon}` — khung thời gian đầu tư (ngắn hạn / trung hạn / dài hạn)
- `{risk}` — khẩu vị rủi ro (thấp / trung bình / cao)

**Quy tắc phân tích theo Khung thời gian:**
- **Ngắn hạn (1-5 phiên):** 70% TA (RSI, MACD, Bollinger, Stochastic, ADX) + 30% FA (tránh bẫy cổ phiếu rác)
- **Trung/Dài hạn (>3 tháng):** Ưu tiên FA chuyên sâu (ROE, P/E, tăng trưởng YoY, đòn bẩy tài chính)

---

## Tự chạy với Docker (Khuyên dùng)

Cách dễ nhất để chạy ứng dụng trên máy cá nhân hoặc VPS — không cần cài đặt Node, Python hay PostgreSQL thủ công.

### Các dịch vụ Docker

```
docker-compose.yml
├── db        (PostgreSQL 16)      — cổng 5432
├── api       (FastAPI / uvicorn)  — cổng 8000
├── web       (Next.js standalone) — cổng 3000
└── migrate   (prisma db push)     — chạy tự động khi khởi động
```

### Hướng dẫn cài đặt

**Yêu cầu:** Đã cài đặt [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) hoặc Docker Engine (Linux)

```bash
# 1. Tải repository về máy
git clone https://github.com/vmkhanh2002/vn-stock-tracker.git
cd vn-stock-tracker

# 2. Tạo file env cấu hình docker
cp .env.docker .env.docker.local
# → Mở file .env.docker.local để thay đổi POSTGRES_PASSWORD và NEXTAUTH_SECRET tùy ý

# 3. Build và khởi động các container
docker compose --env-file .env.docker.local up -d --build

# 4. Kiểm tra trạng thái hoạt động
docker compose ps
```

Truy cập ứng dụng tại: **http://localhost:3000**

> **Lưu ý về quá trình build tự động:** Toàn bộ quá trình build được đóng gói hoàn chỉnh. Bạn không cần chạy `npm install` hay `pip install` trên máy chủ của mình. Dịch vụ `migrate` sử dụng container builder để tự động đồng bộ prisma migration.

### Khởi động lại (Không cần build lại)

```bash
docker compose --env-file .env.docker.local up -d
```

### Dừng / Dọn dẹp dữ liệu

```bash
docker compose down          # dừng hệ thống, giữ lại dữ liệu DB
docker compose down -v       # dừng hệ thống + xóa sạch dữ liệu DB
```

### Xem logs hệ thống

```bash
docker compose logs -f web   # Next.js logs
docker compose logs -f api   # FastAPI logs
docker compose logs -f db    # PostgreSQL logs
```

### Cập nhật phiên bản mới nhất

```bash
git pull
docker compose --env-file .env.docker.local up -d --build
```

---

## Cài đặt thủ công (Không dùng Docker)

```bash
# 1. Tải repository về máy
git clone https://github.com/vmkhanh2002/vn-stock-tracker.git
cd vn-stock-tracker

# 2. Cài đặt các thư viện Node.js
npm install

# 3. Cài đặt môi trường ảo Python và thư viện
python -m venv venv
venv\Scripts\activate   # Trên Windows
pip install -r api/py/requirements.txt

# 4. Tạo file cấu hình .env.local
cp .env.example .env.local
# → Điền các thông tin DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL

# 5. Đồng bộ cấu trúc Database
npx prisma db push

# 6. Chạy máy chủ phát triển
npm run dev
```

Truy cập: http://localhost:3000

---

## Cơ sở dữ liệu

Dự án sử dụng **PostgreSQL** thông qua Prisma ORM. Bạn có thể cấu hình:

| Tùy chọn | Mô tả | Phù hợp cho |
|---|---|---|
| **Local PostgreSQL** | Cài đặt PostgreSQL ngay trên máy cá nhân | Phát triển offline |
| **[Neon](https://neon.tech)** | Serverless Postgres, gói miễn phí 0.5GB | Phát triển + thử nghiệm |
| **[Supabase](https://supabase.com)** | Managed Postgres kèm giao diện quản lý trực quan | Phát triển + thử nghiệm |

**Định dạng chuỗi kết nối trong `.env.local`:**
```bash
# Local PostgreSQL
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/vnstock_tracker"

# Neon
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Supabase
DATABASE_URL="postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres"
```

Đồng bộ cấu trúc DB:
```bash
npx prisma db push
```

---

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `DATABASE_URL` | ✅ | Chuỗi kết nối PostgreSQL |
| `NEXTAUTH_SECRET` | ✅ | Khóa bảo mật NextAuth session |
| `NEXTAUTH_URL` | ✅ | URL công khai của trang web (VD: https://...) |
| `TURSO_DATABASE_URL` | ❌ (Tùy chọn) | URL kết nối Turso DB (`libsql://...`) làm Edge Cache. Nếu để trống sẽ lưu cache tạm bằng file cục bộ tại `/tmp`. |
| `TURSO_AUTH_TOKEN` | ❌ (Tùy chọn) | JWT Auth Token để xác thực kết nối Turso DB. |

> `VNSTOCK_API_KEY` và `OPENROUTER_API_KEY` **không** cần khai báo trong biến môi trường hệ thống. Mỗi người dùng sẽ tự nhập trong màn hình Cài đặt của họ.

---

## Nguồn dữ liệu

| Nguồn | Mô tả |
|---|---|
| **VCI** | Công ty Chứng khoán Vietcap — nhanh, ổn định, được thiết lập làm mặc định |
| **KBS** | Công ty Chứng khoán KB Việt Nam — dùng để kéo các chỉ số tài chính doanh nghiệp |

---

## Tuyên bố miễn trừ trách nhiệm

- Dữ liệu thị trường chỉ phục vụ cho mục đích nghiên cứu cá nhân và học tập.
- Tất cả phân tích và nội dung phản hồi của AI không cấu thành lời khuyên đầu tư tài chính.
- Phân tích AI được xây dựng trên dữ liệu lịch sử — hiệu suất trong tương lai không được bảo đảm.
