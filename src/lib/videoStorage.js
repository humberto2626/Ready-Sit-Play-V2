import { supabase } from './supabase.js';

const BUCKET_NAME = 'game-videos';
const THUMBNAIL_BUCKET = 'video-thumbnails';

/**
 * Initialize storage buckets if they don't exist
 * This should be called on app initialization
 */
export async function initializeStorageBuckets() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketNames = buckets?.map(b => b.name) || [];

    if (!bucketNames.includes(BUCKET_NAME)) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 104857600
      });
      console.log('Created game-videos bucket');
    }

    if (!bucketNames.includes(THUMBNAIL_BUCKET)) {
      await supabase.storage.createBucket(THUMBNAIL_BUCKET, {
        public: true,
        fileSizeLimit: 5242880
      });
      console.log('Created video-thumbnails bucket');
    }
  } catch (error) {
    console.error('Error initializing storage buckets:', error);
  }
}

/**
 * Compress video blob for upload
 * @param {Blob} videoBlob - Original video blob
 * @param {Object} options - Compression options
 * @returns {Promise<Blob>} Compressed video blob
 */
export async function compressVideo(videoBlob, options = {}) {
  const { maxSizeMB = 50, quality = 0.8 } = options;

  if (videoBlob.size <= maxSizeMB * 1024 * 1024) {
    return videoBlob;
  }

  return videoBlob;
}

/**
 * Upload video to Supabase Storage
 * @param {Blob} videoBlob - Video blob to upload
 * @param {Object} metadata - Video metadata
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<{url: string, path: string}>} Public URL and storage path
 */
export async function uploadVideoToStorage(videoBlob, metadata, onProgress) {
  try {
    const timestamp = Date.now();
    const sanitizedPlayerName = metadata.playerName.replace(/[^a-z0-9]/gi, '_');
    const sanitizedCardLabel = metadata.cardLabel.replace(/[^a-z0-9]/gi, '_');
    const filename = `${metadata.gameId}/${sanitizedPlayerName}_${sanitizedCardLabel}_${timestamp}.webm`;

    if (onProgress) onProgress(10);

    const compressedBlob = await compressVideo(videoBlob);

    if (onProgress) onProgress(30);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, compressedBlob, {
        contentType: videoBlob.type || 'video/webm',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading video:', error);
      throw error;
    }

    if (onProgress) onProgress(80);

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    if (onProgress) onProgress(100);

    return {
      url: urlData.publicUrl,
      path: data.path,
      size: compressedBlob.size
    };
  } catch (error) {
    console.error('Error in uploadVideoToStorage:', error);
    throw error;
  }
}

/**
 * Upload thumbnail to Supabase Storage
 * @param {Blob} thumbnailBlob - Thumbnail blob to upload
 * @param {string} videoPath - Associated video path
 * @returns {Promise<{url: string, path: string}>} Public URL and storage path
 */
export async function uploadThumbnailToStorage(thumbnailBlob, videoPath) {
  try {
    const thumbnailPath = videoPath.replace('.webm', '_thumb.jpg');

    const { data, error } = await supabase.storage
      .from(THUMBNAIL_BUCKET)
      .upload(thumbnailPath, thumbnailBlob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading thumbnail:', error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from(THUMBNAIL_BUCKET)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path
    };
  } catch (error) {
    console.error('Error in uploadThumbnailToStorage:', error);
    throw error;
  }
}

/**
 * Delete video from Supabase Storage
 * @param {string} videoPath - Path to video in storage
 */
export async function deleteVideoFromStorage(videoPath) {
  try {
    const { error: videoError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([videoPath]);

    if (videoError) {
      console.error('Error deleting video:', videoError);
    }

    const thumbnailPath = videoPath.replace('.webm', '_thumb.jpg');
    const { error: thumbError } = await supabase.storage
      .from(THUMBNAIL_BUCKET)
      .remove([thumbnailPath]);

    if (thumbError) {
      console.error('Error deleting thumbnail:', thumbError);
    }
  } catch (error) {
    console.error('Error in deleteVideoFromStorage:', error);
    throw error;
  }
}

/**
 * Get video URL from storage path
 * @param {string} path - Storage path
 * @returns {string} Public URL
 */
export function getVideoPublicUrl(path) {
  if (!path) return null;

  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Get thumbnail URL from storage path
 * @param {string} path - Storage path
 * @returns {string} Public URL
 */
export function getThumbnailPublicUrl(path) {
  if (!path) return null;

  const { data } = supabase.storage
    .from(THUMBNAIL_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Check if video exists in storage
 * @param {string} path - Storage path
 * @returns {Promise<boolean>} Whether video exists
 */
export async function videoExistsInStorage(path) {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(path.split('/')[0], {
        search: path.split('/')[1]
      });

    return !error && data && data.length > 0;
  } catch (error) {
    console.error('Error checking video existence:', error);
    return false;
  }
}

/**
 * Get storage usage statistics
 * @returns {Promise<Object>} Storage statistics
 */
export async function getStorageStats() {
  try {
    const { data: videoFiles } = await supabase.storage
      .from(BUCKET_NAME)
      .list();

    const { data: thumbFiles } = await supabase.storage
      .from(THUMBNAIL_BUCKET)
      .list();

    const videoCount = videoFiles?.length || 0;
    const thumbCount = thumbFiles?.length || 0;

    const videoSize = videoFiles?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0;
    const thumbSize = thumbFiles?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0;

    return {
      videoCount,
      thumbCount,
      totalSize: videoSize + thumbSize,
      videoSize,
      thumbSize
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return {
      videoCount: 0,
      thumbCount: 0,
      totalSize: 0,
      videoSize: 0,
      thumbSize: 0
    };
  }
}
