<script>
  import { onMount } from 'svelte';
  import { getVideosByGameId, createBlobURL, revokeBlobURL } from './indexedDBStore.js';
  import { downloadVideo, generateVideoFilename, compileVideos, formatBytes, copyToClipboard } from './videoUtils.js';
  import { getVideosWithUrls } from './videoUploadService.js';
  import { getVideoPublicUrl, getThumbnailPublicUrl } from './videoStorage.js';

  let { gameId, onClose } = $props();

  let videos = $state([]);
  let loading = $state(true);
  let selectedVideos = $state(new Set());
  let isCompiling = $state(false);
  let compilationProgress = $state(0);

  onMount(async () => {
    await loadVideos();
  });

  async function loadVideos() {
    try {
      loading = true;

      const cloudVideos = await getVideosWithUrls(gameId);
      console.log('Cloud videos found:', cloudVideos.length);

      const localVideos = await getVideosByGameId(gameId);
      console.log('Local videos found:', localVideos.length);

      const videoMap = new Map();

      cloudVideos.forEach(cloudVideo => {
        if (cloudVideo.video_url) {
          videoMap.set(cloudVideo.card_id + '_' + cloudVideo.player_id, {
            id: cloudVideo.id,
            gameId: cloudVideo.game_id,
            playerId: cloudVideo.player_id,
            playerName: cloudVideo.card_label,
            cardId: cloudVideo.card_id,
            cardLabel: cloudVideo.card_label,
            cardCategory: cloudVideo.card_category,
            cardImage: null,
            success: cloudVideo.success,
            completionTime: cloudVideo.completion_time_seconds,
            timestamp: new Date(cloudVideo.created_at).getTime(),
            videoUrl: cloudVideo.video_url,
            thumbnailUrl: cloudVideo.thumbnail_url,
            videoBlob: null,
            thumbnailBlob: null,
            source: 'cloud',
            uploadStatus: cloudVideo.upload_status
          });
        }
      });

      localVideos.forEach(localVideo => {
        const key = localVideo.cardId + '_' + localVideo.playerId;
        if (!videoMap.has(key)) {
          videoMap.set(key, {
            ...localVideo,
            videoUrl: createBlobURL(localVideo.videoBlob),
            thumbnailUrl: localVideo.thumbnailBlob ? createBlobURL(localVideo.thumbnailBlob) : null,
            source: 'local',
            uploadStatus: 'local_only'
          });
        }
      });

      videos = Array.from(videoMap.values()).sort((a, b) => a.timestamp - b.timestamp);
      console.log('Total videos loaded:', videos.length);

      loading = false;
    } catch (error) {
      console.error('Error loading videos:', error);
      loading = false;
    }
  }

  async function handleDownloadVideo(video) {
    if (video.source === 'cloud' && video.videoUrl) {
      try {
        const response = await fetch(video.videoUrl);
        const blob = await response.blob();
        const filename = generateVideoFilename(
          video.playerName,
          video.cardLabel,
          video.success,
          video.timestamp
        );
        downloadVideo(blob, filename);
      } catch (error) {
        console.error('Error downloading cloud video:', error);
        alert('Failed to download video from cloud. Please try again.');
      }
    } else if (video.videoBlob) {
      const filename = generateVideoFilename(
        video.playerName,
        video.cardLabel,
        video.success,
        video.timestamp
      );
      downloadVideo(video.videoBlob, filename);
    } else {
      alert('Video not available for download.');
    }
  }

  function toggleVideoSelection(videoId) {
    if (selectedVideos.has(videoId)) {
      selectedVideos.delete(videoId);
    } else {
      selectedVideos.add(videoId);
    }
    selectedVideos = selectedVideos;
  }

  function selectAllVideos() {
    selectedVideos = new Set(videos.map(v => v.id));
  }

  function deselectAllVideos() {
    selectedVideos = new Set();
  }

  async function handleCompileVideos() {
    if (selectedVideos.size === 0) {
      alert('Please select at least one video to compile');
      return;
    }

    try {
      isCompiling = true;
      compilationProgress = 0;

      const selectedVideoData = videos.filter(v => selectedVideos.has(v.id));

      compilationProgress = 50;

      const compiledBlob = await compileVideos(selectedVideoData);

      compilationProgress = 100;

      const filename = `Game_Compilation_${new Date().toISOString().split('T')[0]}.webm`;
      downloadVideo(compiledBlob, filename);

      isCompiling = false;
      compilationProgress = 0;
    } catch (error) {
      console.error('Error compiling videos:', error);
      alert('Failed to compile videos. Please try again.');
      isCompiling = false;
      compilationProgress = 0;
    }
  }

  async function handleShare(videoId) {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    if (video.source === 'cloud' && video.videoUrl) {
      try {
        await copyToClipboard(video.videoUrl);
        alert('Video link copied to clipboard! You can now share this link.');
        return;
      } catch (error) {
        console.error('Error copying link:', error);
      }
    }

    if (navigator.share && video.videoBlob) {
      try {
        const filename = generateVideoFilename(
          video.playerName,
          video.cardLabel,
          video.success,
          video.timestamp
        );

        const file = new File([video.videoBlob], filename, { type: 'video/webm' });
        const shareData = {
          title: `${video.playerName} - ${video.cardLabel}`,
          text: `${video.success ? 'Success' : 'Failed'} in ${video.completionTime}s`,
          files: [file]
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
        } else {
          await handleCopyLink(video);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          await handleCopyLink(video);
        }
      }
    } else {
      await handleCopyLink(video);
    }
  }

  async function handleCopyLink(video) {
    if (video.videoUrl && video.source === 'cloud') {
      try {
        await copyToClipboard(video.videoUrl);
        alert('Video link copied to clipboard!');
      } catch (error) {
        console.error('Error copying link:', error);
        handleDownloadVideo(video);
      }
    } else {
      alert('This video is only available locally. Download it to share.');
      handleDownloadVideo(video);
    }
  }

  function handleCloseReview() {
    videos.forEach(video => {
      if (video.videoUrl) revokeBlobURL(video.videoUrl);
      if (video.thumbnailUrl) revokeBlobURL(video.thumbnailUrl);
    });
    onClose();
  }
</script>

<div class="game-review-overlay">
  <div class="game-review-content">
    <div class="review-header">
      <h2>Game Review</h2>
      <button class="close-btn" onclick={handleCloseReview}>✕</button>
    </div>

    {#if loading}
      <div class="loading-state">
        <p>Loading videos...</p>
      </div>
    {:else if videos.length === 0}
      <div class="empty-state">
        <p>No videos recorded during this game.</p>
      </div>
    {:else}
      <div class="toolbar">
        <div class="selection-controls">
          <button class="toolbar-btn" onclick={selectAllVideos}>Select All</button>
          <button class="toolbar-btn" onclick={deselectAllVideos}>Clear Selection</button>
          <span class="selection-count">{selectedVideos.size} selected</span>
        </div>
        <button
          class="compile-btn"
          onclick={handleCompileVideos}
          disabled={selectedVideos.size === 0 || isCompiling}
        >
          {isCompiling ? `Compiling... ${compilationProgress}%` : 'Compile Selected'}
        </button>
      </div>

      <div class="videos-grid">
        {#each videos as video (video.id)}
          <div class="video-card" class:selected={selectedVideos.has(video.id)}>
            <div class="video-checkbox">
              <input
                type="checkbox"
                checked={selectedVideos.has(video.id)}
                onchange={() => toggleVideoSelection(video.id)}
              />
            </div>

            <div class="video-main-content">
              <div class="card-preview-left">
                {#if video.cardImage}
                  <img src={video.cardImage} alt={video.cardLabel} class="card-image-left" />
                {/if}
              </div>

              <div class="video-right-section">
                <div class="video-thumbnail-container">
                  {#if video.thumbnailUrl}
                    <img src={video.thumbnailUrl} alt="Video thumbnail" class="video-thumbnail" />
                    <div class="play-overlay">▶</div>
                  {:else}
                    <div class="video-placeholder">No Thumbnail</div>
                  {/if}
                </div>

                <div class="video-info">
                  <div class="player-name">{video.playerName}</div>
                  <div class="card-name">{video.cardLabel}</div>
                  <div class="video-stats">
                    <span class="status" class:success={video.success} class:failed={!video.success}>
                      {video.success ? '✓ Success' : '✗ Failed'}
                    </span>
                    <span class="duration">{video.completionTime}s</span>
                  </div>
                  {#if video.source === 'cloud'}
                    <div class="cloud-badge" title="Stored in cloud - can be shared">☁️ Cloud</div>
                  {:else if video.uploadStatus === 'local_only'}
                    <div class="local-badge" title="Local only - download to share">📱 Local</div>
                  {/if}
                </div>

                <div class="video-actions">
                  <button class="action-btn download-btn" onclick={() => handleDownloadVideo(video)} title="Download">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                  </button>
                  <button class="action-btn share-btn" onclick={() => handleShare(video.id)} title="Share">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                      <polyline points="16 6 12 2 8 6"></polyline>
                      <line x1="12" y1="2" x2="12" y2="15"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <dialog id="video-modal-{video.id}" class="video-modal">
              <div class="modal-content">
                <button class="modal-close" onclick={(e) => e.target.closest('dialog').close()}>✕</button>
                <video src={video.videoUrl} controls playsinline class="fullsize-video"></video>
                <div class="modal-info">
                  <h3>{video.playerName} - {video.cardLabel}</h3>
                  <p class="modal-stats">
                    {video.success ? 'Completed' : 'Failed'} in {video.completionTime}s
                  </p>
                </div>
              </div>
            </dialog>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .game-review-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 1rem;
    box-sizing: border-box;
  }

  .game-review-content {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    color: white;
    padding: 2rem;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    max-width: 1200px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    overflow: hidden;
  }

  .review-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }

  h2 {
    font-size: 2rem;
    margin: 0;
    color: white;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: white;
    width: 40px;
    height: 40px;
    cursor: pointer;
    font-size: 1.5rem;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    opacity: 0.7;
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    flex-shrink: 0;
  }

  .selection-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .toolbar-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .toolbar-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .selection-count {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    margin-left: 0.5rem;
  }

  .compile-btn {
    background: linear-gradient(45deg, #3b82f6, #2563eb);
    border: none;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s ease;
  }

  .compile-btn:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .compile-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .videos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
    overflow-y: auto;
    padding-right: 10px;
  }

  .video-card {
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1rem;
    transition: all 0.2s ease;
    position: relative;
  }

  .video-card:hover {
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }

  .video-card.selected {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
  }

  .video-checkbox {
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    z-index: 10;
  }

  .video-checkbox input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }

  .video-main-content {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .card-preview-left {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .card-image-left {
    height: 120px;
    width: auto;
    object-fit: contain;
    border-radius: 4px;
  }

  .video-right-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .video-thumbnail-container {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: 8px;
    overflow: hidden;
    background: #000;
  }

  .video-thumbnail {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .play-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 3rem;
    color: white;
    opacity: 0.8;
    pointer-events: none;
  }

  .video-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem;
  }

  .video-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .player-name {
    font-weight: bold;
    font-size: 1.1rem;
  }

  .card-name {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
  }

  .video-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
  }

  .status {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .status.success {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }

  .status.failed {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .duration {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.85rem;
  }

  .cloud-badge,
  .local-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 8px;
    font-size: 0.75rem;
    margin-top: 0.5rem;
    font-weight: 500;
  }

  .cloud-badge {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
  }

  .local-badge {
    background: rgba(251, 191, 36, 0.2);
    color: #fbbf24;
  }

  .video-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-start;
  }

  .action-btn {
    padding: 0.6rem;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .action-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }

  .action-btn svg {
    display: block;
  }

  .video-modal {
    max-width: 90vw;
    max-height: 90vh;
    background: #000;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 0;
  }

  .video-modal::backdrop {
    background: rgba(0, 0, 0, 0.9);
  }

  .modal-content {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .modal-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.5rem;
    z-index: 10;
  }

  .fullsize-video {
    width: 100%;
    max-height: 70vh;
    border-radius: 8px;
  }

  .modal-info {
    color: white;
    text-align: center;
  }

  .modal-info h3 {
    margin: 0 0 0.5rem 0;
  }

  .modal-stats {
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
  }

  .loading-state,
  .empty-state {
    text-align: center;
    padding: 3rem;
    color: rgba(255, 255, 255, 0.7);
  }

  @media (max-width: 768px) {
    .game-review-content {
      padding: 1rem;
    }

    .videos-grid {
      grid-template-columns: 1fr;
    }

    .toolbar {
      flex-direction: column;
      gap: 1rem;
    }

    .selection-controls {
      width: 100%;
      justify-content: space-between;
    }

    .compile-btn {
      width: 100%;
    }
  }
</style>
