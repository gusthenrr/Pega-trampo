/**
 * authChannel.ts
 * Cross-tab session invalidation using BroadcastChannel + localStorage fallback.
 * NO JWT is stored in any browser storage — only an opaque timestamp event.
 */

const CHANNEL_NAME = 'pegaTrampo_auth'
const STORAGE_KEY = 'auth:event'

let _channel: BroadcastChannel | null = null
let _storageHandler: ((e: StorageEvent) => void) | null = null
let _selfTriggered = false

/**
 * Broadcast that the session changed (login or logout).
 * Call this BEFORE redirecting so other tabs receive the message.
 */
export function broadcastSessionChanged(): void {
    _selfTriggered = true

    // Primary: BroadcastChannel
    try {
        const ch = new BroadcastChannel(CHANNEL_NAME)
        ch.postMessage({ type: 'SESSION_CHANGED', ts: Date.now() })
        // Close after a small delay to ensure delivery
        setTimeout(() => ch.close(), 300)
    } catch {
        // BroadcastChannel not supported — fall through to fallback
    }

    // Fallback: localStorage event (fires in OTHER tabs only)
    try {
        localStorage.setItem(STORAGE_KEY, Date.now().toString())
    } catch {
        // Private/incognito mode may block localStorage
    }

    // Reset flag after a tick so subsequent events from other tabs are not ignored
    setTimeout(() => { _selfTriggered = false }, 500)
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
            if (_selfTriggered) return
            if (event.data?.type === 'SESSION_CHANGED') {
                onInvalidate()
            }
        }
    } catch {
        // Not supported
    }

    // Fallback: storage event
    _storageHandler = (event: StorageEvent) => {
        if (_selfTriggered) return
        if (event.key === STORAGE_KEY && event.newValue) {
            onInvalidate()
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
