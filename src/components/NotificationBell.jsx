import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function NotificationBell({ userId }) {
  const [notifs,    setNotifs]    = useState([])
  const [showPanel, setShowPanel] = useState(false)
  const [loading,   setLoading]   = useState(false)

  /* ── Fetch des notifications dès que userId est disponible ── */
  useEffect(() => {
    if (!userId) return

    const fetchNotifs = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('notifications')
        .select('id, message, is_read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!error && data) setNotifs(data)
      setLoading(false)
    }

    fetchNotifs()
  }, [userId])

  const unread = notifs.filter(n => !n.is_read).length

  const handleOpen = async () => {
    const opening = !showPanel
    setShowPanel(opening)

    /* Marquer comme lus à l'ouverture */
    if (opening && unread > 0) {
      const ids = notifs.filter(n => !n.is_read).map(n => n.id)
      await supabase.from('notifications').update({ is_read: true }).in('id', ids)
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    }
  }

  return (
    <div className="relative">

      {/* ── Bouton cloche ── */}
      <button
        onClick={handleOpen}
        style={{
          position: 'relative', padding: '6px', borderRadius: '10px',
          background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af',
        }}
      >
        <Bell style={{ width: '16px', height: '16px' }} strokeWidth={1.5} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '4px', right: '4px',
            width: '8px', height: '8px', background: '#ef4444',
            borderRadius: '50%', display: 'block',
          }} />
        )}
      </button>

      {/* ── Panel notifications ── */}
      {showPanel && (
        <>
          {/* Overlay pour fermer */}
          <div
            onClick={() => setShowPanel(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          />

          <div className="absolute right-0 mt-2 w-80 z-50 origin-top-right bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.12)' }}>
            {/* Header panel */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Notifications
                {unread === 0 && notifs.length > 0 && (
                  <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: '6px', color: '#9ca3af' }}>
                    tout lu
                  </span>
                )}
              </p>
              <button onClick={() => setShowPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: '2px' }}>
                <X style={{ width: '14px', height: '14px' }} strokeWidth={1.5} />
              </button>
            </div>

            {/* Liste */}
            <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: '#9ca3af' }}>Chargement...</p>
                </div>
              ) : notifs.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <Bell style={{ width: '24px', height: '24px', color: '#e5e7eb', margin: '0 auto 8px' }} strokeWidth={1} />
                  <p style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 300 }}>Aucune notification</p>
                </div>
              ) : (
                notifs.map((n, i) => (
                  <div key={n.id} style={{
                    padding: '12px 16px',
                    borderBottom: i < notifs.length - 1 ? '1px solid #f9fafb' : 'none',
                    background: n.is_read ? '#fff' : '#f0fdf4',
                  }}>
                    <p style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5, margin: 0 }}>
                      {n.message}
                    </p>
                    <p style={{ fontSize: '11px', color: '#d1d5db', marginTop: '4px', marginBottom: 0 }}>
                      {new Date(n.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
