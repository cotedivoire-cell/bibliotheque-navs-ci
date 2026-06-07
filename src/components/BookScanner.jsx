import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Camera, AlertCircle, CheckCircle } from 'lucide-react'

/**
 * BookScanner — Composant de scan caméra
 * Corrigé : utilise hasScanned ref pour éviter les doubles callbacks
 * et vérifie isScanning avant stop()
 */
function BookScanner({ title, onResult, onClose }) {
  const scannerRef = useRef(null)
  const hasScanned = useRef(false)  // empêche les doubles callbacks
  const [error,    setError]    = useState('')
  const [started,  setStarted]  = useState(false)
  const [detected, setDetected] = useState(false)

  useEffect(() => {
    const scanner = new Html5Qrcode('navs-qr-scanner')
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      {
        fps:    10,
        qrbox: { width: 250, height: 160 },
      },
      (decodedText) => {
        // ── Premier scan uniquement ──
        if (hasScanned.current) return
        hasScanned.current = true
        setDetected(true)
        // Laisser le cleanup gérer l'arrêt de la caméra
        // via le onClose → on appelle onResult directement
        onResult(decodedText.trim())
      },
      () => {} // erreurs de scan ignorées (scan continu normal)
    )
    .then(() => setStarted(true))
    .catch(() => setError("Impossible d'accéder à la caméra. Vérifiez les permissions du navigateur."))

    // Nettoyage à la fermeture du composant
    return () => {
      try {
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop().catch(() => {})
        }
      } catch {}
    }
  }, [])

  const handleClose = () => {
    try {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    } catch {}
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">

      {/* En-tête */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-green-400" />
          <span className="text-white font-semibold text-sm">{title}</span>
        </div>
        <button onClick={handleClose}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Zone vidéo */}
      <div className="flex-1 relative overflow-hidden">
        <div id="navs-qr-scanner" className="w-full h-full" />

        {/* Spinner initialisation */}
        {!started && !error && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/70 text-sm">Initialisation de la caméra...</p>
          </div>
        )}

        {/* Confirmation scan réussi */}
        {detected && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3">
            <CheckCircle className="w-12 h-12 text-green-400" />
            <p className="text-white font-semibold">Code détecté !</p>
            <p className="text-white/60 text-sm">Recherche en cours...</p>
          </div>
        )}
      </div>

      {/* Erreur */}
      {error && (
        <div className="mx-4 mb-4 bg-red-900/80 border border-red-500 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-200 text-sm">{error}</p>
            <button onClick={handleClose} className="text-red-400 text-xs mt-1 underline">Fermer</button>
          </div>
        </div>
      )}

      {/* Aide */}
      {!error && !detected && (
        <div className="px-4 py-4 bg-black/80 text-center">
          <p className="text-white/60 text-xs leading-relaxed">
            Pointez la caméra vers le code-barres ISBN (dos du livre) ou le QR code
          </p>
        </div>
      )}
    </div>
  )
}

export default BookScanner
