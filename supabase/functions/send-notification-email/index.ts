import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY')  ?? ''
const ADMIN_EMAIL     = Deno.env.get('ADMIN_EMAIL')     ?? ''
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')    ?? 'https://ynqnwdinmhluiazqmeqh.supabase.co'
const SUPABASE_KEY    = Deno.env.get('SB_SERVICE_KEY') ?? ''
const FROM_EMAIL      = 'Bibliothèque-navs CI <onboarding@resend.dev>'
const APP_URL         = 'https://bibliotheque-navs-ci.vercel.app'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/* ── Style commun ── */
const wrap = (content: string) => `
  <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;background:#fff">
    <div style="border-bottom:3px solid #166534;padding-bottom:12px;margin-bottom:20px">
      <h1 style="color:#166534;font-size:16px;margin:0">Bibliothèque-navs CI</h1>
      <p style="color:#6b7280;font-size:11px;margin:4px 0 0">Notification automatique</p>
    </div>
    ${content}
  </div>`

const btn = (url: string, label: string) =>
  `<a href="${url}" style="display:inline-block;margin-top:16px;padding:10px 22px;background:#166534;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">${label} →</a>`

const row = (label: string, value: string) =>
  `<tr>
    <td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px">${label}</td>
    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111">${value}</td>
  </tr>`

/* ── Déterminer le type selon la table ── */
function getEventType(table: string): string {
  return { profiles: 'new_member', reservations: 'new_reservation', donations: 'new_donation', suggestions: 'new_suggestion' }[table] ?? ''
}

/* ── Templates ── */
async function buildEmail(type: string, data: Record<string, unknown>): Promise<{ subject: string; html: string } | null> {

  switch (type) {

    case 'new_member': {
      return {
        subject: '[Navs-Bibliothèque] Nouveau membre en attente de validation',
        html: wrap(`
          <h2 style="color:#166534;font-size:18px;margin:0 0 16px">Nouveau membre inscrit</h2>
          <table style="border-collapse:collapse;width:100%">
            ${row('Nom complet', String(data.full_name ?? '—'))}
            ${row('Téléphone', String(data.phone ?? '—'))}
            ${row('Formule', data.membership_type === 'annual' ? 'Abonnement annuel' : "À l'unité")}
            ${row('Statut', 'En attente d\'activation')}
          </table>
          <p style="font-size:13px;color:#374151;margin-top:16px">
            Rendez-vous dans l'espace admin pour activer ce compte après réception du paiement.
          </p>
          ${btn(APP_URL + '/admin/membres', 'Activer le compte')}
        `)
      }
    }

    case 'new_reservation': {
      // Récupérer les données enrichies
      const { data: resv } = await supabase
        .from('reservations')
        .select('pickup_type, pickup_code, created_at, profiles(full_name, phone), books(title, author)')
        .eq('id', data.id as string)
        .single()

      const memberName  = (resv?.profiles as Record<string,string>)?.full_name ?? '—'
      const memberPhone = (resv?.profiles as Record<string,string>)?.phone ?? '—'
      const bookTitle   = (resv?.books as Record<string,string>)?.title ?? '—'
      const bookAuthor  = (resv?.books as Record<string,string>)?.author ?? '—'
      const pickupType  = resv?.pickup_type === 'delivery' ? 'Coursier' : 'Retrait en personne'
      const pickupCode  = resv?.pickup_code
      const date        = resv?.created_at ? new Date(resv.created_at).toLocaleDateString('fr-FR') : '—'

      return {
        subject: `[Navs-Bibliothèque] Réservation — ${bookTitle}`,
        html: wrap(`
          <h2 style="color:#166534;font-size:18px;margin:0 0 16px">Nouvelle réservation</h2>
          <table style="border-collapse:collapse;width:100%">
            ${row('Livre', bookTitle)}
            ${row('Auteur', bookAuthor)}
            ${row('Membre', memberName)}
            ${row('Téléphone', memberPhone)}
            ${row('Mode de retrait', pickupType)}
            ${pickupCode ? row('Code de retrait', `<span style="font-size:18px;letter-spacing:4px;color:#166534">${pickupCode}</span>`) : ''}
            ${row('Date', date)}
          </table>
          ${btn(APP_URL + '/admin/reservations', 'Gérer les réservations')}
        `)
      }
    }

    case 'new_donation': {
      const isArgent = data.type === 'argent'
      return {
        subject: `[Navs-Bibliothèque] Nouveau don — ${isArgent ? data.amount + ' FCFA' : data.book_title}`,
        html: wrap(`
          <h2 style="color:#166534;font-size:18px;margin:0 0 16px">Nouveau don enregistré</h2>
          <table style="border-collapse:collapse;width:100%">
            ${row('Donateur', String(data.donor_name ?? 'Anonyme'))}
            ${data.donor_phone ? row('Téléphone', String(data.donor_phone)) : ''}
            ${row('Type', isArgent ? 'Don financier' : 'Don de livre')}
            ${isArgent ? row('Montant', `<span style="color:#166534;font-size:15px">${data.amount} FCFA</span>`) : ''}
            ${isArgent ? row('Paiement', String(data.payment_method ?? '—')) : ''}
            ${!isArgent ? row('Titre du livre', String(data.book_title ?? '—')) : ''}
            ${!isArgent ? row('Auteur', String(data.book_author ?? '—')) : ''}
            ${!isArgent ? row('État', String(data.book_condition ?? '—')) : ''}
            ${data.message ? row('Message', String(data.message)) : ''}
          </table>
          ${btn(APP_URL + '/admin/dons', 'Voir les dons')}
        `)
      }
    }

    case 'new_suggestion': {
      // Récupérer le nom du membre
      const { data: sug } = await supabase
        .from('suggestions')
        .select('title, author, profiles(full_name)')
        .eq('id', data.id as string)
        .single()

      const memberName = (sug?.profiles as Record<string,string>)?.full_name ?? '—'

      return {
        subject: `[Navs-Bibliothèque] Suggestion — ${data.title}`,
        html: wrap(`
          <h2 style="color:#166534;font-size:18px;margin:0 0 16px">Nouvelle suggestion de livre</h2>
          <table style="border-collapse:collapse;width:100%">
            ${row('Titre suggéré', String(data.title ?? '—'))}
            ${row('Auteur', String(data.author ?? '—'))}
            ${row('Suggéré par', memberName)}
          </table>
          ${btn(APP_URL + '/admin/suggestions', 'Voir les suggestions')}
        `)
      }
    }

    default: return null
  }
}

/* ── Handler principal ── */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const body = await req.json()

    let eventType: string
    let data: Record<string, unknown>

    if (body.record && body.table) {
      eventType = getEventType(body.table)
      data = body.record
    } else {
      eventType = body.type
      data = body.data
    }

    if (!eventType) return new Response('Unknown event', { status: 400 })

    const template = await buildEmail(eventType, data)
    if (!template) return new Response('No template', { status: 400 })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: template.subject,
        html: template.html,
      }),
    })

    const result = await res.json()
    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
})
