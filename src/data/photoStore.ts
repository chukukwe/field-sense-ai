const DATABASE_NAME = 'fieldvoice-local';
const STORE_NAME = 'scan-photos';
const DATABASE_VERSION = 1;

function openPhotoDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local photo storage.'));
  });
}

export async function saveScanPhoto(id: string, photo: Blob): Promise<void> {
  const database = await openPhotoDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(photo, id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not save the photo.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Photo storage was interrupted.'));
    });
  } finally {
    database.close();
  }
}

export async function getScanPhoto(id: string): Promise<Blob | undefined> {
  const database = await openPhotoDatabase();
  try {
    return await new Promise<Blob | undefined>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result as Blob | undefined);
      request.onerror = () => reject(request.error ?? new Error('Could not read the saved photo.'));
    });
  } finally {
    database.close();
  }
}

export async function deleteScanPhoto(id: string): Promise<void> {
  const database = await openPhotoDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not remove the saved photo.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Photo removal was interrupted.'));
    });
  } finally {
    database.close();
  }
}
