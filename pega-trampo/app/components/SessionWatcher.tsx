'use client'

import { useEffect } from 'react'
import { installSessionWatcher, cleanupSessionWatcher } from '../lib/authChannel'

/**
 * Mounts a global listener for cross-tab session changes.
 * When another tab logs in or out, this tab is immediately invalidated:
 *   - sessionStorage is cleared
 *   - user is redirected to the welcome page with a reason param
 */
export default function SessionWatcher() {
    useEffect(() => {
        const handleSessionInvalid = () => {
            // Clear any cached UI state
            if (typeof window !== 'undefined') {
                sessionStorage.clear()
            }

            // Redirect to login/welcome with reason
            window.location.href = '/?reason=session_changed'
        }

        installSessionWatcher(handleSessionInvalid)

        return () => {
            cleanupSessionWatcher()
        }
    }, [])

    return null
}
