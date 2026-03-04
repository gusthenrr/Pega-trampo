/**
 * authChannel.ts
 * Cross-tab session invalidation using BroadcastChannel + localStorage fallback.
 * NO JWT is stored in any browser storage — only an opaque timestamp event.
 */

const CHANNEL_NAME = 'pegaTrampo_auth'
const STORAGE_KEY = 'auth:event'

// Generate a random ID for THIS specific browser tab
const TAB_ID = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2) + Date.now().toString(36)

let _channel: BroadcastChannel | null = null
let _storageHandler: ((e: StorageEvent) => void) | null = null

/**
 * Broadcast that the session changed (login or logout).
 * Call this BEFORE redirecting so other tabs receive the message.
 */
export function broadcastSessionChanged(): void {
    const payload = JSON.stringify({ tabId: TAB_ID, ts: Date.now() })

    // Primary: BroadcastChannel
    try {
        const ch = new BroadcastChannel(CHANNEL_NAME)
        // Send as string to avoid cloning issues across different browsers
        ch.postMessage(payload)
        // Close after a small delay to ensure delivery
        setTimeout(() => ch.close(), 300)
    } catch {
        // BroadcastChannel not supported — fall through to fallback
    }

    // Fallback: localStorage event (fires in OTHER tabs only)
    try {
        localStorage.setItem(STORAGE_KEY, payload)
    } catch {
        // Private/incognito mode may block localStorage
    }
}

/**
 * Install a watcher that calls `onInvalidate` when another tab changes session.
 * Should be called once (e.g. in a top-level useEffect).
 */
export function installSessionWatcher(onInvalidate: () => void): void {
    // Primary: BroadcastChannel
    try {
        _channel = new BroadcastChannel(CHANNEL_NAME)
        _channel.onmessage = (event) => {
            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
                // Ignore messages originating from THIS tab
                if (data?.tabId === TAB_ID) return
                if (data?.tabId) { // Check that it's actually our payload
                    onInvalidate()
                }
            } catch {
                // Ignore malformed messages
            }
        }
    } catch {
        // Not supported
    }

    // Fallback: storage event
    _storageHandler = (event: StorageEvent) => {
        if (event.key === STORAGE_KEY && event.newValue) {
            try {
                const data = JSON.parse(event.newValue)
                // Ignore messages originating from THIS tab
                if (data?.tabId === TAB_ID) return
                if (data?.tabId) {
                    onInvalidate()
                }
            } catch {
                // Ignore malformed messages
            }
        }
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('storage', _storageHandler)
    }
}

/**
 * Cleanup listeners. Call on unmount.
 */
export function cleanupSessionWatcher(): void {
    try {
        _channel?.close()
        _channel = null
    } catch { /* ignore */ }

    if (_storageHandler && typeof window !== 'undefined') {
        window.removeEventListener('storage', _storageHandler)
        _storageHandler = null
    }
}
