/**
 * syncEngine.js — Moteur de synchronisation
 * Déclenché automatiquement au retour du réseau.
 * Dépile la file d'attente et exécute les requêtes Supabase.
 */
import { getQueue, dequeue } from './offlineQueue'
import { supabase } from './supabase'

export const syncQueue = async () => {
  const queue = await getQueue()
  if (queue.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0

  for (const action of queue) {
    try {
      switch (action.type) {

        case 'CREATE_BORROWING': {
          const { borrowingData, bookId, newAvailableCopies } = action.data

          // Insérer l'emprunt (sans l'id temporaire local)
          const { id: _localId, ...cleanBorrowing } = borrowingData
          await supabase.from('borrowings').insert([cleanBorrowing])

          // Mettre à jour les exemplaires disponibles
          await supabase
            .from('books')
            .update({ available_copies: newAvailableCopies })
            .eq('id', bookId)

          break
        }

        case 'RETURN_BOOK': {
          const { borrowingId, bookId, returnedAt, newAvailableCopies } = action.data

          // Valider le retour
          await supabase
            .from('borrowings')
            .update({ status: 'retourné', returned_at: returnedAt })
            .eq('id', borrowingId)

          // Restituer l'exemplaire
          await supabase
            .from('books')
            .update({ available_copies: newAvailableCopies })
            .eq('id', bookId)

          break
        }

        default:
          console.warn('Action inconnue dans la queue :', action.type)
      }

      await dequeue(action.id)
      synced++

    } catch (err) {
      console.error(`Échec sync action #${action.id}:`, err)
      failed++
    }
  }

  return { synced, failed }
}
