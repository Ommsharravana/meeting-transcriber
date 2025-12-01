'use client';

import { Transcript } from '@/types/transcription';

const DB_NAME = 'meeting-transcriber';
const DB_VERSION = 1;
const STORE_NAME = 'transcripts';

interface TranscriptRecord {
  id: string;
  transcript: Transcript;
  createdAt: string; // ISO string for IndexedDB compatibility
  updatedAt: string;
}

/**
 * Open the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create transcripts store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('fileName', 'transcript.fileName', { unique: false });
      }
    };
  });
}

/**
 * Save a transcript to IndexedDB
 */
export async function saveTranscript(transcript: Transcript): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const record: TranscriptRecord = {
      id: transcript.id,
      transcript: {
        ...transcript,
        // Convert Date to ISO string for storage
        createdAt: transcript.createdAt instanceof Date
          ? transcript.createdAt
          : new Date(transcript.createdAt),
      },
      createdAt: new Date(transcript.createdAt).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const request = store.put(record);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to save transcript'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get all transcripts from IndexedDB, sorted by createdAt descending
 */
export async function getAllTranscripts(): Promise<Transcript[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('createdAt');

    const request = index.openCursor(null, 'prev'); // Descending order
    const transcripts: Transcript[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const record = cursor.value as TranscriptRecord;
        transcripts.push({
          ...record.transcript,
          createdAt: new Date(record.transcript.createdAt),
        });
        cursor.continue();
      } else {
        resolve(transcripts);
      }
    };

    request.onerror = () => {
      reject(new Error('Failed to get transcripts'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get a single transcript by ID
 */
export async function getTranscript(id: string): Promise<Transcript | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const record = request.result as TranscriptRecord | undefined;
      if (record) {
        resolve({
          ...record.transcript,
          createdAt: new Date(record.transcript.createdAt),
        });
      } else {
        resolve(null);
      }
    };

    request.onerror = () => {
      reject(new Error('Failed to get transcript'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Delete a transcript by ID
 */
export async function deleteTranscript(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to delete transcript'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Delete all transcripts
 */
export async function clearAllTranscripts(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to clear transcripts'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get transcript count
 */
export async function getTranscriptCount(): Promise<number> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to count transcripts'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}
