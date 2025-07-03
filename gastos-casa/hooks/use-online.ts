'use client'

import { useState, useEffect } from 'react'

interface UseOnlineReturn {
  isOnline: boolean
  isOffline: boolean
  wasOffline: boolean
}

export function useOnline(): UseOnlineReturn {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    // Set initial state - only on client side
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine)
    }

    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        // Trigger reconnection logic
        window.dispatchEvent(new CustomEvent('app:reconnected'))
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      // Trigger offline logic
      window.dispatchEvent(new CustomEvent('app:offline'))
    }

    // Listen for online/offline events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Periodic connection check (every 30 seconds when offline)
    let intervalId: NodeJS.Timeout

    if (!isOnline) {
      intervalId = setInterval(async () => {
        try {
          // Try to fetch a small resource to check connectivity
          const response = await fetch('/api/health', {
            method: 'HEAD',
            cache: 'no-cache'
          })
          if (response.ok && !isOnline) {
            handleOnline()
          }
        } catch {
          // Still offline
        }
      }, 30000)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [isOnline, wasOffline])

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline
  }
}