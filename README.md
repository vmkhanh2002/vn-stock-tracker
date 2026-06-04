# VN Stock Tracker

[Tiếng Việt](README.vi.md) | **English**

A Vietnamese stock analysis platform integrated with AI, built using **Next.js 16 + FastAPI + vnstock**.  
Each user manages their own personal API keys — no bandwidth bottlenecks, no hardcoded keys.

**Live Demo:** https://vn-stock-tracker-swart.vercel.app

---

## Features

| Module | Description |
|---|---|
| **Stock Lookup** | OHLCV candlesticks, MA10/20/50, Bollinger Bands, automatic technical analysis signals |
| **Real-time Price Board** | View multiple symbols simultaneously + compare cumulative returns |
| **Stock Screener** | Scan & filter stocks across the VN market using FA metrics (P/E, P/B, ROE, ROA) and real-time price change/volume |
| **AI Advisor** | AI recommendations analyzing both TA + FA based on investment horizon (short/medium/long-term) and risk appetite |
| **Fundamental Analysis (FA)** | EPS, P/E, P/B, ROE, ROA, Debt/Equity, YoY growth |
| **Foreign Investment Flow** | Net buy/sell volume and value of the latest session |
| **Watchlist & Alerts** | Watchlist management and price alerts sent via email |
| **Stock Comparison** | Interactive cumulative return comparison chart |
| **Admin Panel** | User management and AI usage logs audit |

---

## Architecture

```
User Browser
    │
    ▼
Next.js 16 (Vercel)          ← Frontend + API Routes
    ├── /api/ai/analyze       ← Call OpenRouter AI
    ├── /api/trpc/[trpc]      ← tRPC: user settings, watchlist, alerts
    └── /api/py/*             ← Proxy to FastAPI

FastAPI (Vercel Serverless)   ← Python data layer
    ├── /stock                ← OHLCV prices, screener
    ├── /indicators           ← RSI, MACD, Bollinger, ADX...
    └── /ai-context           ← Build markdown context cho AI

PostgreSQL (Prisma)           ← User data, settings, logs
Turso SQLite (Edge Cache)     ← Cloud cache for Screener & Ratios data
OpenRouter API                ← LLM gateway (user key)
vnstock library               ← VN market data retrieval (user key)
```

---

## Per-user Configuration

| Setting | Description |
|---|---|
| **OpenRouter API Key** | Personal key to call AI models — obtain at [openrouter.ai](https://openrouter.ai) |
| **OpenRouter Model** | Custom model name (e.g., `openrouter/owl-alpha`, `google/gemini-2.5-pro`) |
| **Vnstock API Key** | Personal vnstock API key — obtain at [vnstocks.com](https://vnstocks.com) (free tier) |
| **AI System Prompt** | Customize AI behavior. Leave blank to use system default. Supports `{horizon}` and `{risk}` placeholders |
| **Default Data Source** | VCI or KBS |
| **Default Interval** | 1D / 1W / 1M |

> **Vnstock API Key is required** — all requests without a key will be rejected (401).

---

## AI System Prompt

The system loads the AI system prompt in the following order:

1. **Custom prompt** entered by the user (configured in Settings)
2. **Fallback:** `lib/default-system-prompt.txt`

The prompt supports dynamic placeholders:
- `{horizon}` — investment horizon (short-term / medium-term / long-term)
- `{risk}` — risk appetite (low / medium / high)

**Analysis Rules by Horizon:**
- **Short-term (1-5 sessions):** 70% TA (RSI, MACD, Bollinger, Stochastic, ADX) + 30% FA (avoid penny stock trap)
- **Medium/Long-term (>3 months):** Prioritize deep FA (ROE, P/E, YoY growth, leverage)

---

## Self-hosting with Docker (Recommended)

The easiest way to run the platform on your local machine or VPS — no need to install Node, Python, or PostgreSQL manually.

### Docker Services

```
docker-compose.yml
├── db        (PostgreSQL 16)      — port 5432
├── api       (FastAPI / uvicorn)  — port 8000
├── web       (Next.js standalone) — port 3000
└── migrate   (prisma db push)     — runs once at startup
```

### Setup Instructions

**Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or Docker Engine (Linux)

```bash
# 1. Clone the repository
git clone https://github.com/vmkhanh2002/vn-stock-tracker.git
cd vn-stock-tracker

# 2. Create env file
cp .env.docker .env.docker.local
# → Open .env.docker.local and modify POSTGRES_PASSWORD and NEXTAUTH_SECRET

# 3. Build and run
docker compose --env-file .env.docker.local up -d --build

# 4. Check status
docker compose ps
```

Access the app at: **http://localhost:3000**

> **Note on automated build:** The build process is fully self-contained. You do not need to run `npm install` or `pip install` on your local host. The `migrate` service uses the builder container to run prisma migration automatically.

### Running Later (No rebuild needed)

```bash
docker compose --env-file .env.docker.local up -d
```

### Stop / Clean Up

```bash
docker compose down          # stop, keep DB data
docker compose down -v       # stop + delete DB data volumes
```

### View Logs

```bash
docker compose logs -f web   # Next.js logs
docker compose logs -f api   # FastAPI logs
docker compose logs -f db    # PostgreSQL logs
```

### Update to Latest Version

```bash
git pull
docker compose --env-file .env.docker.local up -d --build
```

---

## Local Development (No Docker)

```bash
# 1. Clone the repository
git clone https://github.com/vmkhanh2002/vn-stock-tracker.git
cd vn-stock-tracker

# 2. Install Node dependencies
npm install

# 3. Install Python dependencies
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r api/py/requirements.txt

# 4. Create .env.local from example
cp .env.example .env.local
# → Fill in DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL

# 5. Sync database schema
npx prisma db push

# 6. Start dev server
npm run dev
```

Access: http://localhost:3000

---

## Database

The project uses **PostgreSQL** via Prisma ORM. You can choose from:

| Option | Description | Best for |
|---|---|---|
| **Local PostgreSQL** | Install PostgreSQL locally on your machine | Offline dev |
| **[Neon](https://neon.tech)** | Serverless Postgres, free tier 0.5GB | Dev + staging |
| **[Supabase](https://supabase.com)** | Managed Postgres + Web Console | Dev + staging |

**Connection string formats in `.env.local`:**
```bash
# Local PostgreSQL
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/vnstock_tracker"

# Neon
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Supabase
DATABASE_URL="postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres"
```

Sync the database schema:
```bash
npx prisma db push
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | Secret key for NextAuth session |
| `NEXTAUTH_URL` | ✅ | Public URL of the app (e.g. https://...) |
| `TURSO_DATABASE_URL` | ❌ (Optional) | Connection URL for Turso DB (`libsql://...`) for Edge Cache storage. Fallback to `/tmp` local files if blank. |
| `TURSO_AUTH_TOKEN` | ❌ (Optional) | JWT Auth Token for Turso connection authentication. |

> `VNSTOCK_API_KEY` and `OPENROUTER_API_KEY` are **not** configured at the system level. Each user enters them in their personal Settings panel.

---

## Data Sources

| Source | Description |
|---|---|
| **VCI** | Viet Capital Securities — fast, stable, set as default |
| **KBS** | Korea Investment & Securities — used for FA financial ratios |

---

## Disclaimers

- Market data is for personal research and educational purposes only.
- None of the AI analysis or content represents investment recommendations.
- AI analysis is based on historical data — future returns are not guaranteed.
