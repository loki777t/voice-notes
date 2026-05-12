import { openDB } from 'idb';

const DB_NAME = 'voice-notes-db';
const DB_VERSION = 1;
const STORE = 'notes';

let dbPromise;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

export async function putNote(note) {
  const db = await getDb();
  await db.put(STORE, note);
}

export async function deleteNote(id) {
  const db = await getDb();
  await db.delete(STORE, id);
}

export async function clearNotes() {
  const db = await getDb();
  await db.clear(STORE);
}

export async function listNotes() {
  const db = await getDb();
  const notes = await db.getAll(STORE);
  notes.sort((a, b) => b.createdAt - a.createdAt);
  return notes;
}

