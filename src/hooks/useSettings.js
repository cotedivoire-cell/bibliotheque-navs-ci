/**
 * useSettings — Charge les paramètres dynamiques depuis la table `settings`
 * Fournit les valeurs par défaut si la table n'est pas accessible.
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULTS = {
  subscription_fee_default:  5000,
  single_borrow_fee_default: 500,
  standard_borrow_duration:  14,
}

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase.from('settings').select('key, value').then(({ data }) => {
      if (data && data.length > 0) {
        const s = { ...DEFAULTS }
        data.forEach(row => {
          const num = Number(row.value)
          s[row.key] = isNaN(num) ? row.value : num
        })
        setSettings(s)
      }
      setLoading(false)
    })
  }, [])

  return { settings, loading }
}
