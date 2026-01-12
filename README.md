# Proxy Manager - Chrome Extension

Tiện ích Chrome đơn giản để quản lý proxy cho mục đích cá nhân.

## Features

- ✅ Manage proxy list (HTTP/SOCKS5)
- ✅ Add/Edit/Delete proxy configurations
- ✅ Authentication support (username/password)
- ✅ Quick switch between proxies
- ✅ Direct mode (disable proxy)
- ✅ Store data with chrome.storage.local
- ✅ Auto restore proxy on Chrome startup

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the project folder
5. The extension will appear in the toolbar

## File Structure

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

## Usage

1. **Add proxy**: Fill in the form and click "Save"
2. **Activate proxy**: Click ▶ next to the proxy you want to use
3. **Edit**: Click ✎ to edit configuration
4. **Delete**: Click ✕ to remove proxy
5. **Direct Mode**: Click "Direct Mode" to disable proxy

## Notes

- Uses `chrome.proxy.settings.set` to change Chrome-level proxy settings
- Requires `declarativeNetRequest` permission to modify User-Agent when spoofing is enabled
- Proxy is automatically restored when Chrome restarts
- Data is stored locally in the browser

## Intended Use

Personal and legal use only. Do not use to bypass restrictions or policies.

## Images
<img width="1415" height="1086" alt="Screenshot 2025-12-02 at 01 49 37" src="https://github.com/user-attachments/assets/99a34a7f-a41e-45b4-bc24-883f30844a49" />
<img width="1415" height="1086" alt="Screenshot 2025-12-02 at 01 50 15" src="https://github.com/user-attachments/assets/b262c5e1-4d91-45f2-803c-4243af60894a" />
<img width="1415" height="1086" alt="Screenshot 2025-12-02 at 01 50 26" src="https://github.com/user-attachments/assets/c4d8dd32-d490-450a-a5cb-d3aaf8e903a3" />
<img width="1415" height="1086" alt="Screenshot 2025-12-02 at 01 51 01" src="https://github.com/user-attachments/assets/78b2b9a5-82ca-40aa-8434-205c0201f959" />
