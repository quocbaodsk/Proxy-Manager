# Proxy Manager - Chrome Extension

Tiện ích Chrome đơn giản để quản lý proxy cho mục đích cá nhân.

## Tính năng

- ✅ Quản lý danh sách proxy (HTTP/SOCKS5)
- ✅ Thêm/Xóa/Chỉnh sửa cấu hình proxy
- ✅ Hỗ trợ authentication (username/password)
- ✅ Chuyển đổi nhanh giữa các proxy
- ✅ Direct Mode - tắt proxy
- ✅ Lưu trữ dữ liệu với chrome.storage.local
- ✅ Tự động khôi phục proxy khi khởi động Chrome

## Cài đặt

1. Mở Chrome và truy cập `chrome://extensions/`
2. Bật **Developer mode** (góc trên bên phải)
3. Click **Load unpacked**
4. Chọn thư mục `proxy-change`
5. Extension sẽ xuất hiện trên thanh công cụ

## Cấu trúc file

```
proxy-change/
├── manifest.json      # Manifest V3 configuration
├── popup.html         # Popup UI
├── popup.css          # Styling
├── popup.js           # Popup logic
├── background.js      # Service worker
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Sử dụng

1. **Thêm proxy**: Điền thông tin vào form và nhấn "Save"
2. **Kích hoạt proxy**: Nhấn nút ▶ bên cạnh proxy muốn sử dụng
3. **Chỉnh sửa**: Nhấn nút ✎ để sửa cấu hình
4. **Xóa**: Nhấn nút ✕ để xóa proxy
5. **Direct Mode**: Nhấn "Direct Mode" để tắt proxy

## Lưu ý

- Extension sử dụng `chrome.proxy.settings.set` để thay đổi proxy ở cấp Chrome
- Proxy được khôi phục tự động khi khởi động lại Chrome
- Dữ liệu được lưu cục bộ trong trình duyệt

## Mục đích sử dụng

Công cụ cá nhân, hợp pháp, không dùng để vượt giới hạn hay lách chặn.

## Images
<img width="1415" height="1086" alt="Screenshot 2025-12-02 at 01 49 37" src="https://github.com/user-attachments/assets/99a34a7f-a41e-45b4-bc24-883f30844a49" />
<img width="1415" height="1086" alt="Screenshot 2025-12-02 at 01 50 15" src="https://github.com/user-attachments/assets/b262c5e1-4d91-45f2-803c-4243af60894a" />
<img width="1415" height="1086" alt="Screenshot 2025-12-02 at 01 50 26" src="https://github.com/user-attachments/assets/c4d8dd32-d490-450a-a5cb-d3aaf8e903a3" />
<img width="1415" height="1086" alt="Screenshot 2025-12-02 at 01 51 01" src="https://github.com/user-attachments/assets/78b2b9a5-82ca-40aa-8434-205c0201f959" />
