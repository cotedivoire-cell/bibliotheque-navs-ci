import { useEffect, useState } from 'react'
import { Save, Settings } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'

const FIELDS = [
  {
    key:         'subscription_fee_default',
    label:       'Montant adhésion annuelle',
    unit:        'FCFA',
    type:        'number',
    description: 'Frais payés une fois par an pour un accès illimité aux livres.',
  },
  {
    key:         'single_borrow_fee_default',
    label:       'Montant prêt à l\'unité',
    unit:        'FCFA',
    type:        'number',
    description: 'Frais perçus par livre à chaque emprunt (membres "À l\'unité").',
  },
  {
    key:         'standard_borrow_duration',
    label:       'Durée maximale de prêt',
    unit:        'jours',
    type:        'number',
    description: 'Nombre de jours par défaut avant la date de retour attendue.',
  },
]

function SettingsPage() {
  const [values,  setValues]  = useState({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState('')
  const [error,   setError]   = useState('')

  useEffect(() => { loadSettings() }, [])

  const loadSettings = async () => {
    const { data } = await supabase.from('settings').select('key, value')
    if (data) {
      const v = {}
      data.forEach(row => { v[row.key] = row.value })
      setValues(v)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccess('')
    setError('')

    const updates = FIELDS.map(f => ({
      key:        f.key,
      value:      String(values[f.key] || '0'),
      updated_at: new Date().toISOString(),
    }))

    const { error: err } = await supabase
      .from('settings')
      .upsert(updates, { onConflict: 'key' })

    if (err) setError("Erreur lors de la sauvegarde.")
    else setSuccess("Paramètres enregistrés avec succès.")
    setSaving(false)
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-green-700" />
          <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        </div>
        <p className="text-slate-400 text-sm mt-1">
          Configuration dynamique de la bibliothèque. Les modifications s'appliquent immédiatement.
        </p>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Chargement...</p>
      ) : (
        <div className="max-w-2xl space-y-6">

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {FIELDS.map(field => (
            <div key={field.key} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <label className="block text-sm font-semibold text-slate-900 mb-1">
                {field.label}
              </label>
              <p className="text-xs text-slate-400 mb-4">{field.description}</p>
              <div className="flex items-center gap-3">
                <input
                  type={field.type}
                  min="0"
                  value={values[field.key] || ''}
                  onChange={e => setValues(p => ({ ...p, [field.key]: e.target.value }))}
                  className="flex-1 border border-slate-200 px-4 py-2.5 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 rounded-xl"
                />
                <span className="text-slate-500 font-medium text-sm flex-shrink-0">{field.unit}</span>
              </div>
              <div className="mt-3 bg-slate-50 rounded-xl px-4 py-2.5">
                <p className="text-xs text-slate-500">
                  Valeur actuelle en base :{' '}
                  <span className="font-bold text-slate-700">
                    {values[field.key] || '—'} {field.unit}
                  </span>
                </p>
              </div>
            </div>
          ))}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </button>
        </div>
      )}
    </AdminLayout>
  )
}

export default SettingsPage
