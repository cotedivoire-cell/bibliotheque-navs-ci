/**
 * OfflineBanner — Bandeau d'état réseau
 * Affiché en haut de l'app admin quand hors-ligne ou lors d'une sync.
 */
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

function OfflineBanner({ isOnline, pendingCount, isSyncing }) {
  // En ligne et rien en attente → rien à afficher
  if (isOnline && pendingCount === 0 && !isSyncing) return null

  // En ligne, synchronisation en cours
  if (isOnline && isSyncing) {
    return (
      <div className="w-full bg-blue-50 border-b border-blue-200 px-4 py-2
                      flex items-center justify-center gap-2 text-blue-700 text-xs font-medium">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        Synchronisation en cours...
      </div>
    )
  }

  // En ligne, actions en attente de sync
  if (isOnline && pendingCount > 0) {
    return (
      <div className="w-full bg-green-50 border-b border-green-200 px-4 py-2
                      flex items-center justify-center gap-2 text-green-700 text-xs font-medium">
        <Wifi className="w-3.5 h-3.5" />
        Réseau rétabli — synchronisation de {pendingCount} action(s)...
      </div>
    )
  }

  // Hors-ligne
  return (
    <div className="w-full bg-amber-50 border-b border-amber-300 px-4 py-2
                    flex items-center justify-center gap-2 text-amber-800 text-xs font-medium">
      <WifiOff className="w-3.5 h-3.5" />
      Mode hors-ligne actif — Les données seront synchronisées au retour d'Internet
      {pendingCount > 0 && (
        <span className="ml-1 bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-full text-xs">
          {pendingCount} en attente
        </span>
      )}
    </div>
  )
}

export default OfflineBanner
