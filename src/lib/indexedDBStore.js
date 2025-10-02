const DB_NAME = 'ReadySitPlayDB';
const DB_VERSION = 1;
const VIDEO_STORE = 'videos';
const GAME_STORE = 'games';

let dbInstance = null;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(VIDEO_STORE)) {
        const videoStore = db.createObjectStore(VIDEO_STORE, { keyPath: 'id', autoIncrement: true });
        videoStore.createIndex('gameId', 'gameId', { unique: false });
        videoStore.createIndex('timestamp', 'timestamp', { unique: false });
        videoStore.createIndex('playerId', 'playerId', { unique: false });
      }

      if (!db.objectStoreNames.contains(GAME_STORE)) {
        const gameStore = db.createObjectStore(GAME_STORE, { keyPath: 'id', autoIncrement: true });
        gameStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

export async function saveVideo(videoData) {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([VIDEO_STORE], 'readwrite');
    const store = transaction.objectStore(VIDEO_STORE);

    const video = {
      gameId: videoData.gameId,
      playerId: videoData.playerId,
      playerName: videoData.playerName,
      cardId: videoData.cardId,
      cardLabel: videoData.cardLabel,
      cardCategory: videoData.cardCategory,
      cardImage: videoData.cardImage,
      videoBlob: videoData.videoBlob,
      thumbnailBlob: videoData.thumbnailBlob,
      success: videoData.success,
      completionTime: videoData.completionTime,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(video);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error saving video to IndexedDB:', error);
    throw error;
  }
}

export async function getVideosByGameId(gameId) {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([VIDEO_STORE], 'readonly');
    const store = transaction.objectStore(VIDEO_STORE);
    const index = store.index('gameId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(gameId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting videos from IndexedDB:', error);
    return [];
  }
}

export async function getAllVideos() {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([VIDEO_STORE], 'readonly');
    const store = transaction.objectStore(VIDEO_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting all videos from IndexedDB:', error);
    return [];
  }
}

export async function deleteVideo(videoId) {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([VIDEO_STORE], 'readwrite');
    const store = transaction.objectStore(VIDEO_STORE);

    return new Promise((resolve, reject) => {
      const request = store.delete(videoId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error deleting video from IndexedDB:', error);
    throw error;
  }
}

export async function clearAllData() {
  try {
    const db = await openDatabase();

    const videoTransaction = db.transaction([VIDEO_STORE], 'readwrite');
    const videoStore = videoTransaction.objectStore(VIDEO_STORE);
    await new Promise((resolve, reject) => {
      const request = videoStore.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    const gameTransaction = db.transaction([GAME_STORE], 'readwrite');
    const gameStore = gameTransaction.objectStore(GAME_STORE);
    await new Promise((resolve, reject) => {
      const request = gameStore.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('All IndexedDB data cleared');
  } catch (error) {
    console.error('Error clearing IndexedDB data:', error);
    throw error;
  }
}

export async function getStorageEstimate() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        percentUsed: (estimate.usage / estimate.quota) * 100
      };
    } catch (error) {
      console.error('Error getting storage estimate:', error);
      return null;
    }
  }
  return null;
}

export function createBlobURL(blob) {
  return URL.createObjectURL(blob);
}

export function revokeBlobURL(url) {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
