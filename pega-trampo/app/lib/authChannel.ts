/**
 * authChannel.ts
 * Cross-tab session invalidation using BroadcastChannel + localStorage fallback.
 * NO JWT is stored in any browser storage — only an opaque timestamp event.
 */

const CHANNEL_NAME = 'pegaTrampo_auth'
const STORAGE_KEY = 'auth:event'

type SessionEventType = 'LOGIN' | 'LOGOUT'

type SessionEventPayload = {
    type: SessionEventType
    tabId: string
    nonce: string
    ts: number
}

// Generate a random ID for THIS specific browser tab
const TAB_ID = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2) + Date.now().toString(36)

let _channel: BroadcastChannel | null = null
let _storageHandler: ((e: StorageEvent) => void) | null = null
const _seenEvents = new Set<string>()

const nextNonce = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`

const parsePayload = (raw: unknown): SessionEventPayload | null => {
    try {
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (!data || typeof data !== 'object') return null
        const typed = data as Partial<SessionEventPayload>
        if (!typed.tabId || !typed.type || !typed.nonce) return null
        if (typed.type !== 'LOGIN' && typed.type !== 'LOGOUT') return null
        return {
            type: typed.type,
            tabId: typed.tabId,
            nonce: typed.nonce,
            ts: typed.ts ?? Date.now(),
        }
    } catch {
        return null
    }
}

/**
 * Broadcast that the session changed (login or logout).
 * Call this BEFORE redirecting so other tabs receive the message.
 */
export function broadcastSessionChanged(type: SessionEventType): void {
    const payload: SessionEventPayload = {
        type,
        tabId: TAB_ID,
        nonce: nextNonce(),
        ts: Date.now(),
    }
    const serialized = JSON.stringify(payload)

    // Primary: BroadcastChannel
    try {
        const ch = new BroadcastChannel(CHANNEL_NAME)
        // Send as string to avoid cloning issues across different browsers
        ch.postMessage(serialized)
        // Close after a small delay to ensure delivery
        setTimeout(() => ch.close(), 300)
    } catch {
        // BroadcastChannel not supported — fall through to fallback
    }

    // Fallback: localStorage event (fires in OTHER tabs only)
    try {
        localStorage.setItem(STORAGE_KEY, serialized)
    } catch {
        // Private/incognito mode may block localStorage
    }
}

/**
 * Install a watcher that calls `onInvalidate` when another tab changes session.
 * Should be called once (e.g. in a top-level useEffect).
 */
export function installSessionWatcher(onSessionEvent: (type: SessionEventType) => void): void {
    // Primary: BroadcastChannel
    try {
        _channel = new BroadcastChannel(CHANNEL_NAME)
        _channel.onmessage = (event) => {
            const data = parsePayload(event.data)
            if (!data) return
            if (data.tabId === TAB_ID) return
            if (_seenEvents.has(data.nonce)) return
            _seenEvents.add(data.nonce)
            onSessionEvent(data.type)
        }
    } catch {
        // Not supported
    }

    // Fallback: storage event
    _storageHandler = (event: StorageEvent) => {
        if (event.key === STORAGE_KEY && event.newValue) {
            const data = parsePayload(event.newValue)
            if (!data) return
            if (data.tabId === TAB_ID) return
            if (_seenEvents.has(data.nonce)) return
            _seenEvents.add(data.nonce)
            onSessionEvent(data.type)
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
