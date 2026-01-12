# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Proxy Manager** is a Chrome Browser Extension (Manifest V3) for managing multiple HTTP/SOCKS5 proxies with User-Agent spoofing capabilities. Despite the directory name, this is NOT a Node.js application - it's a vanilla JavaScript browser extension with no build process.

## Loading the Extension

There is no build step. Load the extension directly in Chrome:

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this directory

Changes to `manifest.json`, `background.js`, or `popup.js` require clicking the refresh button on the extension card at `chrome://extensions/`.

## Architecture

The extension follows a classic Chrome Extension pattern with two main components communicating via the Chrome Messaging API:

### Background Service Worker (`background.js`)

Persistent background process that handles all Chrome API interactions:
- **Proxy Management**: Uses `chrome.proxy.settings.set()` to configure browser-level proxy
- **Authentication**: Stores credentials in memory (`currentCredentials`) and handles `chrome.webRequest.onAuthRequired`
- **User-Agent Spoofing**: Uses `chrome.declarativeNetRequest.updateDynamicRules()` to modify User-Agent headers
- **State Persistence**: Listens for `onStartup`/`onInstalled` to restore active proxy and User-Agent
- **Icon Generation**: Creates dynamic status icons using OffscreenCanvas API (green = proxy active, gray = direct mode)

### Popup UI (`popup.html`, `popup.js`, `popup.css`)

User interface for proxy management:
- Proxy list with add/edit/delete/activate actions
- Ping testing using Google connectivity endpoints
- User-Agent selection panel with 10 predefined browser signatures
- Single form handles both adding and editing proxies

### Message Flow

```
User Action (Popup)
    ↓
chrome.runtime.sendMessage()
    ↓
Background Service Worker
    ↓
Chrome API (proxy/storage/declarativeNetRequest/webRequest)
```

### Key State

Stored in `chrome.storage.local`:
- `proxies[]`: Array of proxy configuration objects
- `activeProxyId`: ID of currently active proxy (null = direct mode)
- `currentUA`: Currently active User-Agent string

Stored in memory (background.js only):
- `currentCredentials`: Proxy username/password for authentication (cleared on restart)

## Important Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension config, permissions, background service worker declaration |
| `background.js` | Core business logic - proxy settings, auth, User-Agent rules |
| `popup.js` | UI logic, event handling, ping testing, form management |
| `popup.html` | UI structure (360px popup width) |
| `popup.css` | Dark theme styling with CSS custom properties |

## Permissions Required

- `proxy`: Set browser-level proxy configuration
- `storage`: Persist proxy list and state
- `webRequest` + `webRequestAuthProvider`: Handle proxy authentication
- `declarativeNetRequest`: Modify User-Agent headers
- `<all_urls>`: Required for proxy and User-Agent modification

## Testing Proxies

The ping functionality (`checkProxyPing()` in popup.js) works by:
1. Temporarily activating the proxy being tested
2. Fetching from Google connectivity check endpoints
3. Measuring response time
4. Restoring the original proxy state

Tests run sequentially to avoid proxy switching conflicts.

## Proxy Credentials

Proxy credentials (username/password) are stored in memory only and cleared when:
- Extension restarts
- Direct mode is activated
- A different proxy is activated

They are never persisted to `chrome.storage.local` for security reasons.

## User-Agent Implementation

User-Agent spoofing uses `chrome.declarativeNetRequest.updateDynamicRules()` with rule ID `1`. When setting a new UA:
1. Remove existing rule (if any)
2. Add new rule with `modifyHeaders` action for all request types
