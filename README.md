# 📈 VN Stock Tracker

Ứng dụng tra cứu giá cổ phiếu Việt Nam theo ngày giao dịch, sử dụng **vnstock** — thư viện Python mã nguồn mở kết nối API của VCI (Viet Capital Securities) và TCBS (Techcombank Securities).

## Tính năng

| Module | Nội dung |
|---|---|
| **Tra cứu 1 mã** | OHLCV theo ngày, biểu đồ nến, MA10/MA20/MA50, Bollinger Bands, tín hiệu kỹ thuật tự động |
| **Bảng giá nhiều mã** | Giá thời gian thực nhiều mã cùng lúc + so sánh tỷ suất tích lũy |
| **Bộ lọc cổ phiếu** | Screener toàn bộ HOSE/HNX/UPCOM, lọc theo vùng giá |

## Cài đặt

```bash
# 1. Tạo môi trường ảo (khuyến nghị)
python -m venv venv
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows

# 2. Cài thư viện
pip install -r requirements.txt

# 3. Chạy app
streamlit run app.py
```

Truy cập: http://localhost:8501

## Nguồn dữ liệu

- **VCI** (mặc định): Viet Capital Securities — ổn định, nhanh
- **TCBS**: Techcombank Securities — dùng cho screener

Lịch sử giá → `vnstock` gọi API trực tiếp của các CTCK, **hoàn toàn miễn phí**.

## Kho mã nguồn liên quan (Source Repositories)

Dự án này tích hợp và hoạt động dựa trên ba nguồn mã nguồn được đặt trong thư mục `sources/`:
- **[sources/vnstock-agent-guide](file:///c:/Users/boyva/Downloads/vn-stock-tracker/sources/vnstock-agent-guide)**: Tài liệu và hướng dẫn xây dựng AI Agent phân tích tài chính.
- **[sources/vnstock](file:///c:/Users/boyva/Downloads/vn-stock-tracker/sources/vnstock)**: Thư viện cốt lõi `vnstock` (community version) để truy xuất dữ liệu giá và các chỉ số tài chính.
- **[sources/vnstock_ezchart](file:///c:/Users/boyva/Downloads/vn-stock-tracker/sources/vnstock_ezchart)**: Thư viện vẽ biểu đồ và hiển thị dữ liệu trực quan từ vnstock.

## Lưu ý

- Dữ liệu chỉ dùng cho mục đích nghiên cứu cá nhân
- Không phải lời khuyến nghị đầu tư

