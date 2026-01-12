// Background service worker for Proxy Manager

// Store credentials for authentication
let currentCredentials = null
let currentProxyName = null

// Maximum number of logs to store
const MAX_LOGS = 100

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
  } else if (message.action === 'getLogs') {
    getLogs().then(logs => sendResponse({ logs }))
    return true // Keep message channel open for async response
  } else if (message.action === 'clearLogs') {
    clearLogs()
    sendResponse({ success: true })
  } else if (message.action === 'testConnection') {
    testConnection(message.proxy).then(result => sendResponse(result))
    return true // Keep message channel open for async response
  }
  return true
})

// Set proxy configuration
async function setProxy(proxy) {
  const { type, host, port, username, password, bypassList, name } = proxy

  currentProxyName = name || `${type}://${host}:${port}`

  // Check for SOCKS5 with authentication - NOT supported by Chrome
  if (type === 'socks5' && (username && password)) {
    await addLog('error', `SOCKS5 proxy "${currentProxyName}" has username/password, but Chrome does NOT support SOCKS5 authentication. The connection will likely fail.`, host, port)
    await addLog('warning', `Try: 1) Use SOCKS5 without auth, 2) Use HTTP proxy with auth, or 3) Try SOCKS4 if your proxy supports it.`, host, port)
  }

  // Check for SOCKS4 with authentication - also NOT supported
  if (type === 'socks4' && (username && password)) {
    await addLog('error', `SOCKS4 proxy "${currentProxyName}" has username/password, but Chrome does NOT support SOCKS4 authentication.`, host, port)
    await addLog('warning', `SOCKS4 only works without authentication. Please remove credentials or use HTTP proxy.`, host, port)
  }

  // Store credentials for authentication (only works for HTTP proxies)
  if (username && password) {
    if (type === 'http') {
      currentCredentials = { username, password }
    } else {
      currentCredentials = null
    }
  } else {
    currentCredentials = null
  }

  // Default bypass list if not provided
  const defaultBypass = ['localhost', '127.0.0.1']
  const finalBypassList = bypassList && bypassList.length > 0 ? bypassList : defaultBypass

  // Map proxy type to Chrome scheme
  let scheme
  if (type === 'socks5') {
    scheme = 'socks5'
  } else if (type === 'socks4') {
    scheme = 'socks4'
  } else {
    scheme = 'http'
  }

  const config = {
    mode: 'fixed_servers',
    rules: {
      singleProxy: {
        scheme: scheme,
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

    const hasAuth = username && password && type === 'http'
    await addLog('success', `Proxy activated: ${type.toUpperCase()} ${host}:${port}${hasAuth ? ' (with authentication)' : ''}`, host, port)
    console.log(`Proxy set: ${type}://${host}:${port}`)
  } catch (error) {
    await addLog('error', `Failed to set proxy: ${error.message}`, host, port)
    console.error('Failed to set proxy:', error)
  }
}

// Clear proxy (direct mode)
async function clearProxy() {
  const previousProxy = currentProxyName
  currentCredentials = null
  currentProxyName = null

  try {
    await chrome.proxy.settings.clear({ scope: 'regular' })
    // Set inactive icon (default)
    await setIcon(false)
    await addLog('info', `Switched to Direct mode${previousProxy ? ` (was: ${previousProxy})` : ''}`, null, null)
    console.log('Proxy cleared - Direct mode')
  } catch (error) {
    await addLog('error', `Failed to clear proxy: ${error.message}`, null, null)
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
  async (details, callback) => {
    if (currentCredentials) {
      await addLog('info', `Proxy authentication request received for ${details.challenger?.host || 'proxy'}`, null, null)
      callback({
        authCredentials: {
          username: currentCredentials.username,
          password: currentCredentials.password,
        },
      })
    } else {
      await addLog('error', `Proxy authentication required but no credentials stored. The proxy may require a username and password.`, null, null)
      callback({ cancel: false })
    }
  },
  { urls: ['<all_urls>'] },
  ['asyncBlocking']
)

// Listen for proxy errors
chrome.proxy.onProxyError.addListener(async details => {
  const error = details.error
  const host = details.borderColor

  // Provide helpful troubleshooting for common SOCKS errors
  let troubleshooting = ''

  if (error === 'ERR_SOCKS_CONNECTION_FAILED') {
    troubleshooting = `
Troubleshooting:
• Check if the SOCKS proxy server is running
• Verify the host and port are correct
• Try SOCKS4 instead of SOCKS5 (or vice versa)
• Ensure no firewall is blocking the connection
• Remove username/password if SOCKS proxy doesn't need auth
• Test with: curl --socks5 host:port https://www.google.com`
  } else if (error === 'ERR_PROXY_AUTH_REQUESTED') {
    troubleshooting = `
The proxy requires authentication but:
• SOCKS4/SOCKS5 proxies don't support auth in Chrome
• Use HTTP proxy type for authentication support
• Or use a SOCKS proxy without authentication`
  } else if (error === 'ERR_PROXY_CONNECTION_FAILED') {
    troubleshooting = `
Connection to proxy failed:
• Check if proxy server is running
• Verify host and port are correct
• Check network/firewall settings`
  } else if (error === 'ERR_PROXY_CERTIFICATE_INVALID') {
    troubleshooting = `
Proxy certificate issue:
• The proxy is using an invalid SSL certificate
• This is common with self-signed certificates`
  }

  const errorMessage = `Proxy error: ${error}${troubleshooting}`
  await addLog('error', errorMessage, host, null)
  console.error('Proxy error:', details)
})

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

// ============== Connection Test Function ==============

// Test a proxy connection with detailed diagnostics
async function testConnection(proxy) {
  const { type, host, port, username, password, name } = proxy
  const proxyName = name || `${type}://${host}:${port}`

  const results = {
    success: false,
    proxy: proxyName,
    type,
    host,
    port,
    hasAuth: !!(username && password),
    diagnostics: [],
  }

  // Helper to add diagnostic messages
  const addDiagnostic = (level, message) => {
    results.diagnostics.push({ level, message })
  }

  // Pre-flight checks
  addDiagnostic('info', `Starting connection test for ${type.toUpperCase()} ${host}:${port}`)

  // Validate host
  if (!host || host.trim() === '') {
    addDiagnostic('error', 'Host is empty or invalid')
    await addLog('error', `Connection test failed: Invalid host`, host, port)
    return results
  }

  // Validate port
  const portNum = parseInt(port, 10)
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    addDiagnostic('error', `Port ${port} is invalid (must be 1-65535)`)
    await addLog('error', `Connection test failed: Invalid port ${port}`, host, port)
    return results
  }

  // Check for SOCKS with auth
  if ((type === 'socks4' || type === 'socks5') && (username && password)) {
    addDiagnostic('error', `${type.toUpperCase()} proxy has credentials but Chrome does NOT support SOCKS authentication`)
    addDiagnostic('warning', 'Remove username/password or use HTTP proxy type')
    await addLog('error', `Connection test failed: ${type.toUpperCase()} with auth is not supported`, host, port)
    return results
  }

  // Get current proxy state to restore later
  const currentSettings = await chrome.proxy.settings.get({ incognito: false })

  try {
    // Map proxy type to Chrome scheme
    let scheme
    if (type === 'socks5') {
      scheme = 'socks5'
    } else if (type === 'socks4') {
      scheme = 'socks4'
    } else {
      scheme = 'http'
    }

    const config = {
      mode: 'fixed_servers',
      rules: {
        singleProxy: {
          scheme: scheme,
          host: host,
          port: portNum,
        },
      },
    }

    addDiagnostic('info', `Setting proxy configuration...`)
    await chrome.proxy.settings.set({
      value: config,
      scope: 'regular',
    })

    // Store credentials temporarily if HTTP
    if (type === 'http' && username && password) {
      currentCredentials = { username, password }
    } else {
      currentCredentials = null
    }

    // Wait for proxy to be applied
    await new Promise(resolve => setTimeout(resolve, 500))

    addDiagnostic('info', 'Proxy configuration applied, testing connectivity...')

    // Test with multiple endpoints
    const testUrls = [
      'https://www.google.com/generate_204',
      'https://www.gstatic.com/generate_204',
      'https://connectivitycheck.gstatic.com/generate_204',
      'https://www.cloudflare.com/cdn-cgi/trace',
    ]

    let lastError = null
    let success = false

    for (const url of testUrls) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(url, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok || response.status === 204 || response.status === 404) {
          success = true
          addDiagnostic('success', `Successfully connected via ${url}`)
          break
        }
      } catch (e) {
        lastError = e
        addDiagnostic('warning', `Failed to connect to ${url}: ${e.message}`)
        continue
      }
    }

    if (success) {
      results.success = true
      addDiagnostic('success', `✅ Connection test PASSED! Proxy ${host}:${port} is working.`)
      await addLog('success', `Connection test PASSED for ${type.toUpperCase()} ${host}:${port}`, host, port)
    } else {
      addDiagnostic('error', `❌ Connection test FAILED. All test URLs failed.`)
      addDiagnostic('info', 'Common issues:')
      addDiagnostic('info', '• Proxy server is not running')
      addDiagnostic('info', '• Wrong host or port number')
      addDiagnostic('info', '• Firewall blocking the connection')
      addDiagnostic('info', `• Try switching between SOCKS4 and SOCKS5`)
      if (type === 'socks5') {
        addDiagnostic('info', '• Your "SOCKS5" proxy might actually be SOCKS4')
      }
      await addLog('error', `Connection test FAILED for ${type.toUpperCase()} ${host}:${port} - ${lastError?.message || 'Unknown error'}`, host, port)
    }
  } catch (error) {
    addDiagnostic('error', `Exception during test: ${error.message}`)
    await addLog('error', `Connection test error: ${error.message}`, host, port)
  } finally {
    // Restore original proxy settings
    try {
      if (currentSettings.value && currentSettings.value.mode === 'fixed_servers') {
        await chrome.proxy.settings.set({
          value: currentSettings.value,
          scope: currentSettings.level === 'incognito_persistent' ? 'incognito_persistent' : 'regular',
        })
        addDiagnostic('info', 'Restored original proxy settings')
      } else {
        await chrome.proxy.settings.clear({ scope: 'regular' })
        addDiagnostic('info', 'Cleared test proxy (restored direct mode)')
      }

      // Clear test credentials
      if (type !== 'http') {
        currentCredentials = null
      }

      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (e) {
      addDiagnostic('warning', `Failed to restore proxy: ${e.message}`)
    }
  }

  return results
}

// ============== Logging Functions ==============

// Log levels: 'error', 'warning', 'info', 'success'
async function addLog(level, message, host, port) {
  try {
    const data = await chrome.storage.local.get(['connectionLogs'])
    const logs = data.connectionLogs || []

    const newLog = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      level,
      message,
      host,
      port,
    }

    logs.unshift(newLog) // Add to beginning

    // Keep only the most recent logs
    if (logs.length > MAX_LOGS) {
      logs.length = MAX_LOGS
    }

    await chrome.storage.local.set({ connectionLogs: logs })
  } catch (error) {
    console.error('Failed to add log:', error)
  }
}

async function getLogs() {
  try {
    const data = await chrome.storage.local.get(['connectionLogs'])
    return data.connectionLogs || []
  } catch (error) {
    console.error('Failed to get logs:', error)
    return []
  }
}

async function clearLogs() {
  try {
    await chrome.storage.local.set({ connectionLogs: [] })
  } catch (error) {
    console.error('Failed to clear logs:', error)
  }
}
