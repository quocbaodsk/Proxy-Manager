// Background service worker for Proxy Manager

// Store credentials for authentication
let currentCredentials = null

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'setProxy') {
    setProxy(message.proxy)
    sendResponse({ success: true })
  } else if (message.action === 'clearProxy') {
    clearProxy()
    sendResponse({ success: true })
  } else if (message.action === 'setUserAgent') {
    setUserAgent(message.userAgent)
    sendResponse({ success: true })
  } else if (message.action === 'clearUserAgent') {
    clearUserAgent()
    sendResponse({ success: true })
  }
  return true
})

// Set proxy configuration
async function setProxy(proxy) {
  const { type, host, port, username, password, bypassList } = proxy

  // Store credentials for authentication
  if (username && password) {
    currentCredentials = { username, password }
  } else {
    currentCredentials = null
  }

  // Default bypass list if not provided
  const defaultBypass = ['localhost', '127.0.0.1']
  const finalBypassList = bypassList && bypassList.length > 0 ? bypassList : defaultBypass

  const config = {
    mode: 'fixed_servers',
    rules: {
      singleProxy: {
        scheme: type === 'socks5' ? 'socks5' : 'http',
        host: host,
        port: port,
      },
      bypassList: finalBypassList,
    },
  }

  try {
    await chrome.proxy.settings.set({
      value: config,
      scope: 'regular',
    })
    // Set active icon (green)
    await setIcon(true)
    console.log(`Proxy set: ${type}://${host}:${port}`)
  } catch (error) {
    console.error('Failed to set proxy:', error)
  }
}

// Clear proxy (direct mode)
async function clearProxy() {
  currentCredentials = null

  try {
    await chrome.proxy.settings.clear({ scope: 'regular' })
    // Set inactive icon (default)
    await setIcon(false)
    console.log('Proxy cleared - Direct mode')
  } catch (error) {
    console.error('Failed to clear proxy:', error)
  }
}

// Set extension icon based on proxy state
async function setIcon(isActive) {
  const color = isActive ? '#22c55e' : '#666666'

  // Create icon using OffscreenCanvas
  const sizes = [16, 32, 48, 128]
  const imageData = {}

  for (const size of sizes) {
    const canvas = new OffscreenCanvas(size, size)
    const ctx = canvas.getContext('2d')

    // Draw circle
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    // Draw inner circle (lighter)
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 3, 0, Math.PI * 2)
    ctx.fillStyle = isActive ? '#4ade80' : '#888888'
    ctx.fill()

    imageData[size] = ctx.getImageData(0, 0, size, size)
  }

  try {
    await chrome.action.setIcon({ imageData })
  } catch (error) {
    console.error('Failed to set icon:', error)
  }
}

// Handle proxy authentication
chrome.webRequest.onAuthRequired.addListener(
  (details, callback) => {
    if (currentCredentials) {
      callback({
        authCredentials: {
          username: currentCredentials.username,
          password: currentCredentials.password,
        },
      })
    } else {
      callback({ cancel: false })
    }
  },
  { urls: ['<all_urls>'] },
  ['asyncBlocking']
)

// Initialize on startup - restore previous proxy state
chrome.runtime.onStartup.addListener(async () => {
  await restoreProxyState()
})

// Also restore when extension is installed/updated
chrome.runtime.onInstalled.addListener(async () => {
  await restoreProxyState()
})

// Restore proxy state from storage
async function restoreProxyState() {
  try {
    const data = await chrome.storage.local.get(['proxies', 'activeProxyId', 'currentUA'])
    const proxies = data.proxies || []
    const activeProxyId = data.activeProxyId
    const currentUA = data.currentUA

    if (activeProxyId) {
      const activeProxy = proxies.find(p => p.id === activeProxyId)
      if (activeProxy) {
        await setProxy(activeProxy)
        console.log('Restored proxy:', activeProxy.name)
      }
    } else {
      await clearProxy()
    }

    // Restore User-Agent
    if (currentUA) {
      await setUserAgent(currentUA)
      console.log('Restored User-Agent')
    }
  } catch (error) {
    console.error('Failed to restore proxy state:', error)
  }
}

// ============== User-Agent Functions ==============

const UA_RULE_ID = 1

// Set User-Agent using declarativeNetRequest
async function setUserAgent(userAgent) {
  try {
    // Remove existing rule first
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [UA_RULE_ID],
    })

    // Add new rule to modify User-Agent header
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [
        {
          id: UA_RULE_ID,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [
              {
                header: 'User-Agent',
                operation: 'set',
                value: userAgent,
              },
            ],
          },
          condition: {
            urlFilter: '*',
            resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'media', 'websocket', 'other'],
          },
        },
      ],
    })

    console.log('User-Agent set:', userAgent.substring(0, 50) + '...')
  } catch (error) {
    console.error('Failed to set User-Agent:', error)
  }
}

// Clear User-Agent (restore to default)
async function clearUserAgent() {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [UA_RULE_ID],
    })
    console.log('User-Agent cleared - using default')
  } catch (error) {
    console.error('Failed to clear User-Agent:', error)
  }
}
