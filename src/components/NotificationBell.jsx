import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function NotificationBell({ userId }) {
  const [notifs,     setNotifs]     = useState([])
  const [showPanel,  setShowPanel]  = useState(false)

  useEffect(() => {
    if (!userId) return
    supabase.from('notifications')
      .select('id, message, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(15)
      .then(({ data }) => setNotifs(data || []))
  }, [userId])

  const handleOpen = async () => {
    setShowPanel(v => !v)
    const unread = notifs.filter(n => !n.is_read).map(n => n.id)
    if (unread.length > 0) {
      await supabase.from('notifications').update({ is_read: true }).in('id', unread)
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    }
  }

  const unread = notifs.filter(n => !n.is_read).length

  return (
    <div className="relative">
      <button onClick={handleOpen}
        className="relative p-1.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-xl transition-colors">
        <Bell className="w-4 h-4" strokeWidth={1.5} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full block" />
        )}
      </button>

      {showPanel && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Notifications</p>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-6 h-6 text-gray-200 mx-auto mb-2" strokeWidth={1} />
                  <p className="text-xs text-gray-400 font-light">Aucune notification</p>
                </div>
              ) : notifs.map((n, i) => (
                <div key={n.id}
                  className={"px-4 py-3 " + (i < notifs.length - 1 ? "border-b border-gray-50 " : "") + (n.is_read ? "" : "bg-green-50")}>
                  <p className="text-xs text-gray-700 leading-relaxed">{n.message}</p>
                  <p className="text-xs text-gray-300 mt-1">
                    {new Date(n.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
