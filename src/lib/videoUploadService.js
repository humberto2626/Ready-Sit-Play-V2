import { uploadVideoToStorage, uploadThumbnailToStorage } from './videoStorage.js';
import { saveVideo as saveVideoToIndexedDB } from './indexedDBStore.js';
import { supabase } from './supabase.js';

/**
 * Upload queue for managing multiple video uploads
 */
class VideoUploadQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  add(uploadTask) {
    this.queue.push(uploadTask);
    if (!this.processing) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const task = this.queue.shift();

    try {
      await task.execute();
    } catch (error) {
      console.error('Upload task failed:', error);
      if (task.onError) {
        task.onError(error);
      }
    }

    setTimeout(() => this.processQueue(), 100);
  }
}

const uploadQueue = new VideoUploadQueue();

/**
 * Save and upload video with full metadata
 * @param {Object} videoData - Complete video data
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Video record with URLs
 */
export async function saveAndUploadVideo(videoData, options = {}) {
  const {
    uploadToCloud = true,
    onProgress = null,
    priority = 'normal'
  } = options;

  try {
    const indexedDBId = await saveVideoToIndexedDB(videoData);
    console.log('Video saved to IndexedDB with ID:', indexedDBId);

    if (!uploadToCloud) {
      return {
        id: indexedDBId,
        uploadStatus: 'local_only',
        videoUrl: null,
        thumbnailUrl: null
      };
    }

    const uploadTask = {
      execute: async () => {
        try {
          if (onProgress) onProgress({ status: 'uploading', progress: 0 });

          const videoResult = await uploadVideoToStorage(
            videoData.videoBlob,
            {
              gameId: videoData.gameId,
              playerName: videoData.playerName,
              cardLabel: videoData.cardLabel
            },
            (progress) => {
              if (onProgress) onProgress({ status: 'uploading', progress: progress * 0.8 });
            }
          );

          let thumbnailResult = null;
          if (videoData.thumbnailBlob) {
            try {
              thumbnailResult = await uploadThumbnailToStorage(
                videoData.thumbnailBlob,
                videoResult.path
              );
              if (onProgress) onProgress({ status: 'uploading', progress: 90 });
            } catch (thumbError) {
              console.error('Thumbnail upload failed, continuing without it:', thumbError);
            }
          }

          const actionId = await updateGameActionWithUrls({
            gameId: videoData.gameId,
            playerId: videoData.playerId,
            cardId: videoData.cardId,
            videoUrl: videoResult.url,
            videoStoragePath: videoResult.path,
            videoSize: videoResult.size,
            thumbnailUrl: thumbnailResult?.url,
            thumbnailStoragePath: thumbnailResult?.path,
            uploadStatus: 'completed'
          });

          if (onProgress) onProgress({ status: 'completed', progress: 100 });

          return {
            id: actionId || indexedDBId,
            uploadStatus: 'completed',
            videoUrl: videoResult.url,
            thumbnailUrl: thumbnailResult?.url,
            videoStoragePath: videoResult.path
          };

        } catch (uploadError) {
          console.error('Video upload failed:', uploadError);

          await updateGameActionUploadStatus({
            gameId: videoData.gameId,
            playerId: videoData.playerId,
            cardId: videoData.cardId,
            uploadStatus: 'failed',
            uploadError: uploadError.message
          });

          if (onProgress) onProgress({ status: 'failed', error: uploadError.message });

          throw uploadError;
        }
      },
      onError: (error) => {
        console.error('Upload queue task failed:', error);
      }
    };

    if (priority === 'high') {
      uploadQueue.queue.unshift(uploadTask);
    } else {
      uploadQueue.add(uploadTask);
    }

    return {
      id: indexedDBId,
      uploadStatus: 'pending',
      videoUrl: null,
      thumbnailUrl: null
    };

  } catch (error) {
    console.error('Error in saveAndUploadVideo:', error);
    throw error;
  }
}

/**
 * Update game action with video URLs after successful upload
 */
async function updateGameActionWithUrls(data) {
  try {
    const { data: existingAction, error: findError } = await supabase
      .from('game_actions')
      .select('id')
      .eq('game_id', data.gameId)
      .eq('player_id', data.playerId)
      .eq('card_id', data.cardId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) {
      console.error('Error finding game action:', findError);
      return null;
    }

    if (!existingAction) {
      console.warn('No game action found to update with video URLs');
      return null;
    }

    const { error: updateError } = await supabase
      .from('game_actions')
      .update({
        video_url: data.videoUrl,
        video_storage_path: data.videoStoragePath,
        video_size: data.videoSize,
        thumbnail_url: data.thumbnailUrl,
        thumbnail_storage_path: data.thumbnailStoragePath,
        upload_status: data.uploadStatus
      })
      .eq('id', existingAction.id);

    if (updateError) {
      console.error('Error updating game action:', updateError);
      return null;
    }

    return existingAction.id;
  } catch (error) {
    console.error('Error in updateGameActionWithUrls:', error);
    return null;
  }
}

/**
 * Update upload status for a game action
 */
async function updateGameActionUploadStatus(data) {
  try {
    const { data: existingAction, error: findError } = await supabase
      .from('game_actions')
      .select('id')
      .eq('game_id', data.gameId)
      .eq('player_id', data.playerId)
      .eq('card_id', data.cardId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError || !existingAction) {
      return;
    }

    await supabase
      .from('game_actions')
      .update({
        upload_status: data.uploadStatus,
        upload_error: data.uploadError
      })
      .eq('id', existingAction.id);

  } catch (error) {
    console.error('Error updating upload status:', error);
  }
}

/**
 * Retry failed video uploads
 * @param {string} gameId - Game ID to retry uploads for
 */
export async function retryFailedUploads(gameId) {
  try {
    const { data: failedActions, error } = await supabase
      .from('game_actions')
      .select('*')
      .eq('game_id', gameId)
      .eq('upload_status', 'failed')
      .eq('video_recorded', true);

    if (error || !failedActions || failedActions.length === 0) {
      return [];
    }

    console.log(`Retrying ${failedActions.length} failed uploads`);

    return failedActions;
  } catch (error) {
    console.error('Error in retryFailedUploads:', error);
    return [];
  }
}

/**
 * Get videos by game ID with cloud URLs
 * @param {string} gameId - Game ID
 * @returns {Promise<Array>} Videos with URLs
 */
export async function getVideosWithUrls(gameId) {
  try {
    const { data: actions, error } = await supabase
      .from('game_actions')
      .select('*')
      .eq('game_id', gameId)
      .eq('video_recorded', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching videos:', error);
      return [];
    }

    return actions || [];
  } catch (error) {
    console.error('Error in getVideosWithUrls:', error);
    return [];
  }
}

/**
 * Check network connectivity
 * @returns {boolean} Whether online
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Estimate upload time
 * @param {number} fileSize - File size in bytes
 * @returns {number} Estimated time in seconds
 */
export function estimateUploadTime(fileSize) {
  const averageSpeedMbps = 10;
  const bytesPerSecond = (averageSpeedMbps * 1024 * 1024) / 8;
  return Math.ceil(fileSize / bytesPerSecond);
}
