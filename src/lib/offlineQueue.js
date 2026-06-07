/**
 * offlineQueue.js — Gestion de la file d'attente hors-ligne
 * via IndexedDB (bibliothèque idb)
 *
 * Stores :
 *   queue          → actions en attente de sync (borrowings + returns)
 *   cache_books    → cache local des livres
 *   cache_members  → cache local des membres
 *   cache_borrowings → cache local des emprunts actifs
 */
import { openDB } from 'idb'

const DB_NAME    = 'navs-offline'
const DB_VERSION = 1

const getDB = () => openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('queue')) {
      db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true })
    }
    if (!db.objectStoreNames.contains('cache_books')) {
      db.createObjectStore('cache_books', { keyPath: 'id' })
    }
    if (!db.objectStoreNames.contains('cache_members')) {
      db.createObjectStore('cache_members', { keyPath: 'id' })
    }
    if (!db.objectStoreNames.contains('cache_borrowings')) {
      db.createObjectStore('cache_borrowings', { keyPath: 'id' })
    }
  }
})

// ── File d'attente ─────────────────────────────────────────────
export const enqueue = async (action) => {
  const db = await getDB()
  return db.add('queue', { ...action, createdAt: Date.now(), status: 'pending' })
}

export const getQueue = async () => {
  const db = await getDB()
  return db.getAll('queue')
}

export const dequeue = async (id) => {
  const db = await getDB()
  return db.delete('queue', id)
}

export const getPendingCount = async () => {
  const db = await getDB()
  return db.count('queue')
}

// ── Cache livres ───────────────────────────────────────────────
export const cacheBooks = async (books) => {
  const db = await getDB()
  const tx = db.transaction('cache_books', 'readwrite')
  await tx.store.clear()
  await Promise.all(books.map(b => tx.store.put(b)))
  await tx.done
}

export const getCachedBooks = async () => {
  const db = await getDB()
  return db.getAll('cache_books')
}

export const updateCachedBook = async (bookId, updates) => {
  const db = await getDB()
  const book = await db.get('cache_books', bookId)
  if (book) await db.put('cache_books', { ...book, ...updates })
}

// ── Cache membres ──────────────────────────────────────────────
export const cacheMembers = async (members) => {
  const db = await getDB()
  const tx = db.transaction('cache_members', 'readwrite')
  await tx.store.clear()
  await Promise.all(members.map(m => tx.store.put(m)))
  await tx.done
}

export const getCachedMembers = async () => {
  const db = await getDB()
  return db.getAll('cache_members')
}

// ── Cache emprunts ─────────────────────────────────────────────
export const cacheBorrowings = async (borrowings) => {
  const db = await getDB()
  const tx = db.transaction('cache_borrowings', 'readwrite')
  await tx.store.clear()
  await Promise.all(borrowings.map(b => tx.store.put(b)))
  await tx.done
}

export const getCachedBorrowings = async () => {
  const db = await getDB()
  return db.getAll('cache_borrowings')
}

export const putCachedBorrowing = async (borrowing) => {
  const db = await getDB()
  return db.put('cache_borrowings', borrowing)
}

export const updateCachedBorrowing = async (id, updates) => {
  const db = await getDB()
  const b = await db.get('cache_borrowings', id)
  if (b) await db.put('cache_borrowings', { ...b, ...updates })
}
