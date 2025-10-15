const DB_NAME = 'ReadySitPlayDB';
const DB_VERSION = 2;
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
      const oldVersion = event.oldVersion;

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

      // Migration for version 2: Add mimeType to existing videos
      if (oldVersion < 2 && db.objectStoreNames.contains(VIDEO_STORE)) {
        // Migration will be handled by migrateExistingVideos function after DB is opened
        console.log('Database upgraded to version 2 - mimeType field will be added to existing videos');
      }
    };
  });
}

export async function saveVideo(videoData) {
  try {
    if (!videoData.videoBlob) {
      throw new Error('Video blob is required');
    }

    if (!(videoData.videoBlob instanceof Blob)) {
      throw new Error('Invalid video blob: not a Blob instance');
    }

    if (videoData.videoBlob.size === 0) {
      throw new Error('Invalid video blob: size is 0');
    }

    console.log('Saving video to IndexedDB:', {
      blobSize: videoData.videoBlob.size,
      blobType: videoData.videoBlob.type,
      mimeType: videoData.mimeType,
      hasThumbnail: !!videoData.thumbnailBlob
    });

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
      thumbnailBlob: videoData.thumbnailBlob || null,
      mimeType: videoData.mimeType || videoData.videoBlob.type || 'video/webm',
      success: videoData.success,
      completionTime: videoData.completionTime,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(video);
      request.onsuccess = () => {
        console.log('Video saved successfully with ID:', request.result);
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('IndexedDB save error:', request.error);
        reject(request.error);
      };
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
      request.onsuccess = () => {
        const videos = request.result;
        console.log(`Retrieved ${videos.length} videos for game ${gameId}`);

        const validatedVideos = videos.map(video => {
          if (!video.videoBlob) {
            console.warn('Video missing videoBlob:', video.id);
          } else if (video.videoBlob.size === 0) {
            console.warn('Video has empty blob:', video.id);
          }
          return video;
        });

        resolve(validatedVideos);
      };
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
  if (!blob) {
    console.error('Cannot create URL: blob is null or undefined');
    return null;
  }

  if (!(blob instanceof Blob)) {
    console.error('Cannot create URL: not a Blob instance');
    return null;
  }

  if (blob.size === 0) {
    console.warn('Creating URL for empty blob');
  }

  try {
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error creating blob URL:', error);
    return null;
  }
}

export function revokeBlobURL(url) {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

export async function migrateExistingVideos() {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([VIDEO_STORE], 'readwrite');
    const store = transaction.objectStore(VIDEO_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const videos = request.result;
        let updateCount = 0;

        videos.forEach(video => {
          if (!video.mimeType) {
            video.mimeType = 'video/webm';
            store.put(video);
            updateCount++;
          }
        });

        console.log(`Migrated ${updateCount} videos with default mimeType`);
        resolve(updateCount);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error migrating existing videos:', error);
    return 0;
  }
}
