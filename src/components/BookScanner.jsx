import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Camera, AlertCircle } from 'lucide-react'

/**
 * BookScanner — Composant de scan caméra PWA
 * Détecte : codes-barres ISBN (EAN-13, EAN-8, CODE-128) + QR codes
 *
 * Props :
 *   title    : string — titre affiché en haut du scanner
 *   onResult : (decodedText: string) => void — appelé au premier scan réussi
 *   onClose  : () => void — fermer le scanner
 */
function BookScanner({ title, onResult, onClose }) {
  const scannerRef = useRef(null)
  const [error,   setError]   = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const scannerId = 'navs-qr-scanner'
    const scanner   = new Html5Qrcode(scannerId)
    scannerRef.current = scanner

    const start = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },  // caméra arrière sur mobile
          {
            fps:    10,
            qrbox: { width: 260, height: 180 },
          },
          (decodedText) => {
            // Premier scan réussi → arrêt + callback
            scanner.stop().then(() => {
              onResult(decodedText.trim())
            }).catch(() => {
              onResult(decodedText.trim())
            })
          },
          () => {} // erreurs de scan ignorées (scan continu)
        )
        setStarted(true)
      } catch (err) {
        setError(
          err.message?.includes('permission')
            ? "Accès à la caméra refusé. Vérifiez les permissions du navigateur."
            : "Impossible d'accéder à la caméra. Essayez de recharger la page."
        )
      }
    }

    start()

    // Nettoyage à la fermeture
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/70 safe-top">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-green-400" />
          <span className="text-white font-semibold text-sm">{title}</span>
        </div>
        <button onClick={handleClose}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Zone de scan ── */}
      <div className="flex-1 relative flex items-center justify-center">
        <div id="navs-qr-scanner" className="w-full max-w-sm" />

        {/* Overlay viseur si pas encore démarré */}
        {!started && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/70 text-sm">Initialisation de la caméra...</p>
          </div>
        )}
      </div>

      {/* ── Erreur ── */}
      {error && (
        <div className="mx-4 mb-4 bg-red-900/80 border border-red-500 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-200 text-sm font-medium">{error}</p>
            <button onClick={handleClose}
              className="text-red-400 text-xs mt-1 underline">
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ── Aide ── */}
      {!error && (
        <div className="px-4 py-4 bg-black/70 text-center">
          <p className="text-white/60 text-xs leading-relaxed">
            Pointez la caméra vers le code-barres ISBN (dos du livre) ou le QR code collé sur la couverture
          </p>
        </div>
      )}
    </div>
  )
}

export default BookScanner
