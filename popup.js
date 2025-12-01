// DOM Elements
const proxyList = document.getElementById('proxy-list')
const proxyForm = document.getElementById('proxy-form')
const formTitle = document.getElementById('form-title')
const btnDirect = document.getElementById('btn-direct')
const btnCancel = document.getElementById('btn-cancel')
const btnAdd = document.getElementById('btn-add')
const btnPing = document.getElementById('btn-ping')
const formSection = document.getElementById('form-section')
const statusEl = document.getElementById('status')

// User-Agent elements
const btnUA = document.getElementById('btn-ua')
const uaPanel = document.getElementById('ua-panel')
const uaList = document.getElementById('ua-list')
const uaCurrent = document.getElementById('ua-current')
const btnUAClose = document.getElementById('btn-ua-close')
const btnUAReset = document.getElementById('btn-ua-reset')

// Form inputs
const editIdInput = document.getElementById('edit-id')
const nameInput = document.getElementById('proxy-name')
const typeInput = document.getElementById('proxy-type')
const hostInput = document.getElementById('proxy-host')
const portInput = document.getElementById('proxy-port')
const usernameInput = document.getElementById('proxy-username')
const passwordInput = document.getElementById('proxy-password')
const bypassInput = document.getElementById('proxy-bypass')

// State
let proxies = []
let activeProxyId = null
let pingResults = {} // Store ping results { proxyId: { ping: number | null, status: 'checking' | 'done' | 'error' } }
let currentUA = null // Current User-Agent

// Predefined User-Agents (2024 latest versions)
const USER_AGENTS = [
  {
    name: 'Chrome 120 (Windows)',
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  {
    name: 'Chrome 120 (Mac)',
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  {
    name: 'Firefox 121 (Windows)',
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  },
  {
    name: 'Firefox 121 (Mac)',
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
  },
  {
    name: 'Safari 17 (Mac)',
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  },
  {
    name: 'Edge 120 (Windows)',
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  },
  {
    name: 'Chrome (Android)',
    value: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
  },
  {
    name: 'Safari (iPhone)',
    value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  },
  {
    name: 'Samsung Browser',
    value: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
  },
  {
    name: 'Googlebot',
    value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  },
]

// Initialize
document.addEventListener('DOMContentLoaded', init)

async function init() {
  await loadData()
  renderProxyList()
  updateStatus()
  renderUAList()
  updateUADisplay()
}

// Load data from storage
async function loadData() {
  const data = await chrome.storage.local.get(['proxies', 'activeProxyId', 'currentUA'])
  proxies = data.proxies || []
  activeProxyId = data.activeProxyId || null
  currentUA = data.currentUA || null
}

// Save data to storage
async function saveData() {
  await chrome.storage.local.set({ proxies, activeProxyId })
}

// Render proxy list
function renderProxyList() {
  if (proxies.length === 0) {
    proxyList.innerHTML = '<div class="empty-state">No proxies added yet</div>'
    return
  }

  proxyList.innerHTML = proxies
    .map(
      proxy => `
    <div class="proxy-item ${proxy.id === activeProxyId ? 'active' : ''}" data-id="${proxy.id}">
      <div class="proxy-info">
        <div class="proxy-name-row">
          <span class="proxy-name">${escapeHtml(proxy.name)}</span>
          ${renderPingBadge(proxy.id)}
        </div>
        <div class="proxy-details">${escapeHtml(proxy.host)}:${proxy.port}</div>
      </div>
      <span class="proxy-type">${proxy.type}</span>
      <div class="proxy-actions">
        <button class="btn-icon btn-activate ${proxy.id === activeProxyId ? 'active' : ''}" 
                data-action="activate" data-id="${proxy.id}" title="Activate">
          ${proxy.id === activeProxyId ? '✓' : '▶'}
        </button>
        <button class="btn-icon btn-edit" data-action="edit" data-id="${proxy.id}" title="Edit">✎</button>
        <button class="btn-icon btn-delete" data-action="delete" data-id="${proxy.id}" title="Delete">✕</button>
      </div>
    </div>
  `
    )
    .join('')

  // Update direct button state
  btnDirect.classList.toggle('active', activeProxyId === null)
}

// Update status display
function updateStatus() {
  if (activeProxyId === null) {
    statusEl.textContent = 'Direct'
    statusEl.className = 'status status-off'
  } else {
    const proxy = proxies.find(p => p.id === activeProxyId)
    if (proxy) {
      statusEl.textContent = proxy.name
      statusEl.className = 'status status-on'
    }
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Form submit handler
proxyForm.addEventListener('submit', async e => {
  e.preventDefault()

  const bypassList = bypassInput.value
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0)

  const proxyData = {
    id: editIdInput.value || generateId(),
    name: nameInput.value.trim(),
    type: typeInput.value,
    host: hostInput.value.trim(),
    port: parseInt(portInput.value, 10),
    username: usernameInput.value.trim(),
    password: passwordInput.value,
    bypassList: bypassList,
  }

  if (editIdInput.value) {
    // Update existing proxy
    const index = proxies.findIndex(p => p.id === editIdInput.value)
    if (index !== -1) {
      proxies[index] = proxyData
    }
  } else {
    // Add new proxy
    proxies.push(proxyData)
  }

  await saveData()

  // If editing active proxy, re-apply settings
  if (proxyData.id === activeProxyId) {
    await activateProxy(proxyData.id)
  }

  resetForm()
  renderProxyList()
})

// Reset form and hide
function resetForm() {
  editIdInput.value = ''
  proxyForm.reset()
  formTitle.textContent = 'Add New Proxy'
  hideForm()
}

// Show form
function showForm() {
  formSection.style.display = 'block'
  btnAdd.style.display = 'none'
  nameInput.focus()
}

// Hide form
function hideForm() {
  formSection.style.display = 'none'
  btnAdd.style.display = 'block'
}

// Add button click
btnAdd.addEventListener('click', () => {
  resetForm()
  showForm()
})

// Cancel edit
btnCancel.addEventListener('click', resetForm)

// Direct mode button
btnDirect.addEventListener('click', async () => {
  activeProxyId = null
  await saveData()
  await chrome.runtime.sendMessage({ action: 'clearProxy' })
  renderProxyList()
  updateStatus()
})

// Proxy list click handler
proxyList.addEventListener('click', async e => {
  const button = e.target.closest('[data-action]')
  if (!button) return

  const action = button.dataset.action
  const id = button.dataset.id

  switch (action) {
    case 'activate':
      await activateProxy(id)
      break
    case 'edit':
      editProxy(id)
      break
    case 'delete':
      await deleteProxy(id)
      break
  }
})

// Activate proxy
async function activateProxy(id) {
  const proxy = proxies.find(p => p.id === id)
  if (!proxy) return

  activeProxyId = id
  await saveData()

  await chrome.runtime.sendMessage({
    action: 'setProxy',
    proxy: proxy,
  })

  renderProxyList()
  updateStatus()
}

// Edit proxy
function editProxy(id) {
  const proxy = proxies.find(p => p.id === id)
  if (!proxy) return

  editIdInput.value = proxy.id
  nameInput.value = proxy.name
  typeInput.value = proxy.type
  hostInput.value = proxy.host
  portInput.value = proxy.port
  usernameInput.value = proxy.username || ''
  passwordInput.value = proxy.password || ''
  bypassInput.value = (proxy.bypassList || []).join('\n')

  formTitle.textContent = 'Edit Proxy'
  showForm()
}

// Render ping badge for a proxy
function renderPingBadge(proxyId) {
  const result = pingResults[proxyId]
  if (!result) return ''

  if (result.status === 'checking') {
    return '<span class="proxy-ping ping-checking">...</span>'
  }

  if (result.status === 'error') {
    return '<span class="proxy-ping ping-error">Error</span>'
  }

  const ping = result.ping
  let pingClass = 'ping-good'
  if (ping > 500) pingClass = 'ping-bad'
  else if (ping > 200) pingClass = 'ping-medium'

  return `<span class="proxy-ping ${pingClass}">${ping}ms</span>`
}

// Check ping for all proxies
async function checkAllPings() {
  if (proxies.length === 0) return

  btnPing.disabled = true
  btnPing.classList.add('pinging')
  btnPing.textContent = '⚡ Checking...'

  // Set all to checking state
  proxies.forEach(proxy => {
    pingResults[proxy.id] = { ping: null, status: 'checking' }
  })
  renderProxyList()

  // Check ping for each proxy sequentially (to avoid proxy switching conflicts)
  for (const proxy of proxies) {
    await checkProxyPing(proxy)
    renderProxyList() // Update UI after each check
  }

  // Restore original proxy state at the end
  if (activeProxyId) {
    const activeProxy = proxies.find(p => p.id === activeProxyId)
    if (activeProxy) {
      await chrome.runtime.sendMessage({
        action: 'setProxy',
        proxy: activeProxy,
      })
    }
  } else {
    await chrome.runtime.sendMessage({ action: 'clearProxy' })
  }

  btnPing.disabled = false
  btnPing.classList.remove('pinging')
  btnPing.textContent = '⚡ Check Ping'
}

// Check ping for a single proxy
async function checkProxyPing(proxy) {
  const testUrls = ['https://www.google.com/generate_204', 'https://www.gstatic.com/generate_204', 'https://connectivitycheck.gstatic.com/generate_204']

  try {
    // First, temporarily activate this proxy
    await chrome.runtime.sendMessage({
      action: 'setProxy',
      proxy: proxy,
    })

    // Wait a bit for proxy to be set
    await new Promise(resolve => setTimeout(resolve, 100))

    // Try to measure response time
    let bestPing = Infinity

    for (const url of testUrls) {
      try {
        const startTime = performance.now()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        await fetch(url, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        const endTime = performance.now()
        const ping = Math.round(endTime - startTime)

        if (ping < bestPing) bestPing = ping
        break // Success, no need to try other URLs
      } catch (e) {
        continue // Try next URL
      }
    }

    if (bestPing === Infinity) {
      pingResults[proxy.id] = { ping: null, status: 'error' }
    } else {
      pingResults[proxy.id] = { ping: bestPing, status: 'done' }
    }
  } catch (error) {
    pingResults[proxy.id] = { ping: null, status: 'error' }
  }
}

// Ping button click handler
btnPing.addEventListener('click', checkAllPings)

// Delete proxy
async function deleteProxy(id) {
  if (!confirm('Delete this proxy?')) return

  proxies = proxies.filter(p => p.id !== id)

  // If deleting active proxy, switch to direct
  if (activeProxyId === id) {
    activeProxyId = null
    await chrome.runtime.sendMessage({ action: 'clearProxy' })
  }

  await saveData()
  renderProxyList()
  updateStatus()

  // Reset form if editing deleted proxy
  if (editIdInput.value === id) {
    resetForm()
  }
}

// ============== User-Agent Functions ==============

// Render User-Agent list
function renderUAList() {
  uaList.innerHTML = USER_AGENTS.map(
    ua => `
    <div class="ua-item ${currentUA === ua.value ? 'active' : ''}" data-ua="${escapeHtml(ua.value)}">
      <div class="ua-item-name">${escapeHtml(ua.name)}</div>
      <div class="ua-item-value">${escapeHtml(ua.value)}</div>
    </div>
  `
  ).join('')
}

// Update UA display
function updateUADisplay() {
  if (currentUA) {
    const ua = USER_AGENTS.find(u => u.value === currentUA)
    uaCurrent.textContent = ua ? ua.name : 'Custom'
    btnUA.classList.add('active')
  } else {
    uaCurrent.textContent = 'Default (Browser)'
    btnUA.classList.remove('active')
  }
}

// Toggle UA panel
function toggleUAPanel() {
  const isVisible = uaPanel.style.display !== 'none'
  uaPanel.style.display = isVisible ? 'none' : 'block'
}

// Set User-Agent
async function setUserAgent(ua) {
  currentUA = ua
  await chrome.storage.local.set({ currentUA })
  await chrome.runtime.sendMessage({ action: 'setUserAgent', userAgent: ua })
  renderUAList()
  updateUADisplay()
}

// Reset User-Agent
async function resetUserAgent() {
  currentUA = null
  await chrome.storage.local.set({ currentUA: null })
  await chrome.runtime.sendMessage({ action: 'clearUserAgent' })
  renderUAList()
  updateUADisplay()
}

// UA Button click
btnUA.addEventListener('click', toggleUAPanel)

// UA Close button
btnUAClose.addEventListener('click', () => {
  uaPanel.style.display = 'none'
})

// UA Reset button
btnUAReset.addEventListener('click', resetUserAgent)

// UA List click handler
uaList.addEventListener('click', e => {
  const item = e.target.closest('.ua-item')
  if (!item) return
  const ua = item.dataset.ua
  setUserAgent(ua)
})
