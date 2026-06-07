/**
 * useOnlineStatus — Hook de détection réseau
 * Retourne { isOnline, pendingCount }
 * Déclenche la synchronisation automatiquement au retour d'Internet.
 */
import { useState, useEffect, useCallback } from 'react'
import { getPendingCount } from '../lib/offlineQueue'
import { syncQueue } from '../lib/syncEngine'

export function useOnlineStatus(onSyncComplete) {
  const [isOnline,     setIsOnline]     = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing,    setIsSyncing]    = useState(false)

  // Rafraîchir le nombre d'actions en attente
  const refreshPending = useCallback(async () => {
    const count = await getPendingCount()
    setPendingCount(count)
  }, [])

  // Synchronisation au retour du réseau
  const handleOnline = useCallback(async () => {
    setIsOnline(true)
    const count = await getPendingCount()
    if (count === 0) return

    setIsSyncing(true)
    const result = await syncQueue()
    setIsSyncing(false)
    setPendingCount(0)

    if (onSyncComplete) onSyncComplete(result)
  }, [onSyncComplete])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
  }, [])

  useEffect(() => {
    // Vérifier le compteur au démarrage
    refreshPending()

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline, refreshPending])

  return { isOnline, pendingCount, isSyncing, refreshPending }
}
