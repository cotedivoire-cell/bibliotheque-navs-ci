/**
 * whatsappTemplates.js — Templates de rappel WhatsApp
 * Ton fraternel et bienveillant — Bibliothèque-navs CI
 *
 * Usage :
 *   import { getWhatsAppMessage } from '../lib/whatsappTemplates'
 *   const msg = getWhatsAppMessage('reminder3', { name, title, dueDate, phone })
 *   const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
 */

/**
 * Formate une date en français
 */
const fdate = (d) => new Date(d).toLocaleDateString('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long'
})

/**
 * Templates par type de rappel
 */
export const TEMPLATES = {

  // ── J-3 : rappel anticipé ─────────────────────────────────
  reminder3: ({ name, title, dueDate }) =>
`Bonjour ${name} 🙏

Nous espérons que le livre *"${title}"* t'a été une vraie bénédiction !

Un petit rappel fraternel : il est attendu en retour le *${fdate(dueDate)}* (dans 3 jours). D'autres membres de notre communauté attendent peut-être de le découvrir à leur tour.

Que le Seigneur te bénisse abondamment !
— *La Bibliothèque des Navigateurs CI* 📖`,

  // ── J-1 : veille du retour ────────────────────────────────
  reminder1: ({ name, title, dueDate }) =>
`Bonjour ${name} 🌿

C'est avec toute notre fraternité que nous te rappelons que *"${title}"* doit être rendu *demain, ${fdate(dueDate)}*.

Nous comptons sur toi pour ramener ce trésor afin qu'il continue de bénir d'autres lecteurs. Merci pour ta fidélité à notre communauté !

À très bientôt,
— *La Bibliothèque des Navigateurs CI* 📖`,

  // ── J0 : jour du retour ───────────────────────────────────
  reminderToday: ({ name, title }) =>
`Bonjour ${name} 😊

*"${title}"* est attendu en retour aujourd'hui. Si tu peux passer à la bibliothèque dans la journée, ce serait formidable !

Si tu as besoin d'un peu plus de temps, n'hésite pas à en parler avec le gestionnaire — nous trouverons une solution ensemble 🤝

Que Dieu guide tes pas aujourd'hui !
— *La Bibliothèque des Navigateurs CI* 📖`,

  // ── J+1 : 1 jour de retard ────────────────────────────────
  overdue1: ({ name, title, daysLate }) =>
`Bonjour ${name} 🙏

Nous te contactons avec toute la bienveillance de notre communauté. Il semblerait que *"${title}"* était prévu en retour hier.

Pas d'inquiétude ! Tu peux le ramener dès que possible. Ce livre a encore de belles pages à offrir à d'autres frères et sœurs qui l'attendent.

Un simple passage à la bibliothèque suffira. Dieu bénisse ta journée !
— *La Bibliothèque des Navigateurs CI* 📖`,

  // ── J+3 : 3 jours de retard ──────────────────────────────
  overdue3: ({ name, title, daysLate }) =>
`Bonjour ${name},

Dans l'esprit de notre communauté, nous te rappelons avec affection que *"${title}"* est attendu depuis ${daysLate} jours.

Proverbes 3:27 nous invite à ne pas refuser de faire du bien quand il est en notre pouvoir de le faire. Ramener ce livre permettra à un autre membre d'en bénéficier 🌱

Merci de ta compréhension et que le Seigneur t'accompagne !
— *La Bibliothèque des Navigateurs CI* 📖`,

  // ── Confirmation de réservation ───────────────────────────
  reservationConfirmed: ({ name, title, expiresAt, pickupCode }) =>
`Bonjour ${name} ! 🎉

Ta réservation pour *"${title}"* est confirmée.

${pickupCode
  ? `🚚 *Code de retrait pour ton coursier : ${pickupCode}*\nPrésente ce code au comptoir pour valider l'emprunt.`
  : `📍 Tu peux venir récupérer ton livre à la bibliothèque.`
}

⏰ Ta réservation expire le *${fdate(expiresAt)}* (48h).

Que cette lecture te soit une bénédiction !
— *La Bibliothèque des Navigateurs CI* 📖`,
}

/**
 * Récupère un template et génère l'URL WhatsApp
 * @param {string} type - Clé du template
 * @param {object} data - { name, title, dueDate, phone, daysLate, pickupCode, expiresAt }
 * @returns {{ message: string, url: string }}
 */
export const getWhatsAppMessage = (type, data) => {
  const template = TEMPLATES[type]
  if (!template) return { message: '', url: '' }

  const message = template(data)
  const phone   = data.phone?.replace(/\D/g, '') // enlever les espaces et +
  const url     = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : null

  return { message, url }
}
