'use client'

import { useEffect } from 'react'
import { installSessionWatcher, cleanupSessionWatcher } from '../lib/authChannel'

/**
 * Mounts a global listener for cross-tab session changes.
 */
export default function SessionWatcher() {
    useEffect(() => {
        const handleSessionEvent = (type: 'LOGIN' | 'LOGOUT') => {
            if (type === 'LOGIN') {
                // Keep current tab stable; server-backed auth is already source of truth.
                return
            }

            if (typeof window !== 'undefined') {
                sessionStorage.clear()
            }
            window.location.href = '/?reason=session_changed'
        }

        installSessionWatcher(handleSessionEvent)

        return () => {
            cleanupSessionWatcher()
        }
    }, [])

    return null
}
