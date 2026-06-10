# Threat Model: VN Stock Tracker

This document details the security threat model for the VN Stock Tracker application, built using the **STRIDE** methodology.

---

## 1. System Architecture Diagram

```
[ User Browser ]
       │
       │ (HTTPS / TLS)
       ▼
[ Next.js Frontend & API Routes (Vercel) ] <───> [ PostgreSQL (Prisma) ]
       │                                       [ Turso SQLite (Edge Cache) ]
       ├── (Internal HTTP Proxy) ──> [ FastAPI (Vercel Serverless) ]
       ├── (HTTPS) ─────────────────> [ OpenRouter LLM API ]
       └── (HTTPS) ─────────────────> [ vnstock Market API ]
```

---

## 2. STRIDE Threat Analysis

### **S**poofing (Mạo danh)
- **Threat**: Attackers could spoof HTTP requests to access settings, watchlists, or usage logs of other users.
- **Mitigation**:
  - NextAuth sessions are securely encrypted via JWT and cookies with `httpOnly`, `secure`, and `sameSite: lax` flags.
  - All tRPC API endpoints enforce session verification.

### **T**ampering (Can thiệp dữ liệu)
- **Threat**: Tampering with Docker containers, or injecting malicious code into the application build.
- **Mitigation**:
  - Docker images are signed using **Cosign** during CI/CD to prevent tampering in transit.
  - Multi-stage Docker builds copy only necessary runtime dependencies, leaving builder tools behind.

### **R**epudiation (Chối bỏ trách nhiệm)
- **Threat**: A user runs malicious analysis queries or consumes huge amounts of AI API credits, and denies the action.
- **Mitigation**:
  - Access logs and AI usage logs are written to PostgreSQL using Prisma, with timestamps and user-IDs.
  - System logs are aggregated on Vercel/Docker logs for audit trails.

### **I**nformation Disclosure (Lộ lọt thông tin)
- **Threat**: Leakage of personal `VNSTOCK_API_KEY` or `OPENROUTER_API_KEY`.
- **Mitigation**:
  - **Zero-Secret Design**: Keys are *not* stored on the server environment. Users supply their keys through the client-side Settings panel.
  - Keys are sent via custom headers (`X-Vnstock-Api-Key`, `Authorization`) or encrypted cookies, and are never logged by the application.
  - Git history is scanned via `gitleaks` on pre-commit and CI to catch hardcoded secrets.

### **D**enial of Service (Từ chối dịch vụ)
- **Threat**: Overloading the FastAPI data layer, database connections, or exhausting free API tiers.
- **Mitigation**:
  - Streamlit caching and Turso SQLite Edge cache are utilized to save redundant lookups.
  - Non-root FastAPI runner handles connections concurrently without holding database locks open.

### **E**levation of Privilege (Leo thang đặc quyền)
- **Threat**: Container escape or database injection by exploiting FastAPI or Next.js vulnerabilities.
- **Mitigation**:
  - Docker containers run as a non-root user (`nextjs` UID 1001 for web, `appuser` UID 10001 for API).
  - Prisma ORM prevents SQL Injection through automatically parameterized query builders.
