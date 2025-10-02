<script>
  import { onMount } from 'svelte';
  import { getVideosByGameId, createBlobURL, revokeBlobURL } from './indexedDBStore.js';
  import { downloadVideo, generateVideoFilename, compileVideos, formatBytes, copyToClipboard } from './videoUtils.js';

  let { gameId, onClose } = $props();

  let videos = $state([]);
  let loading = $state(true);
  let selectedVideos = $state(new Set());
  let isCompiling = $state(false);
  let compilationProgress = $state(0);
  let showShareModal = $state(false);
  let shareVideoId = $state(null);

  onMount(async () => {
    await loadVideos();
  });

  async function loadVideos() {
    try {
      loading = true;
      const videoData = await getVideosByGameId(gameId);

      videos = videoData.map(video => ({
        ...video,
        videoUrl: createBlobURL(video.videoBlob),
        thumbnailUrl: video.thumbnailBlob ? createBlobURL(video.thumbnailBlob) : null
      }));

      loading = false;
    } catch (error) {
      console.error('Error loading videos:', error);
      loading = false;
    }
  }

  function handleDownloadVideo(video) {
    const filename = generateVideoFilename(
      video.playerName,
      video.cardLabel,
      video.success,
      video.timestamp
    );
    downloadVideo(video.videoBlob, filename);
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

  function handleShare(videoId) {
    shareVideoId = videoId;
    showShareModal = true;
  }

  function closeShareModal() {
    showShareModal = false;
    shareVideoId = null;
  }

  async function copyShareLink() {
    const shareLink = `${window.location.origin}/video/${shareVideoId}`;
    try {
      await copyToClipboard(shareLink);
      alert('Link copied to clipboard!');
      closeShareModal();
    } catch (error) {
      console.error('Error copying link:', error);
      alert('Failed to copy link');
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
            </div>

            <div class="card-preview">
              {#if video.cardImage}
                <img src={video.cardImage} alt={video.cardLabel} class="card-image" />
              {/if}
            </div>

            <div class="video-actions">
              <button class="action-btn view-btn" onclick={() => {
                const modal = document.getElementById(`video-modal-${video.id}`);
                if (modal) modal.showModal();
              }}>
                View
              </button>
              <button class="action-btn download-btn" onclick={() => handleDownloadVideo(video)}>
                Download
              </button>
              <button class="action-btn share-btn" onclick={() => handleShare(video.id)}>
                Share
              </button>
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

    {#if showShareModal}
      <div class="share-modal-overlay" onclick={closeShareModal}>
        <div class="share-modal" onclick={(e) => e.stopPropagation()}>
          <h3>Share Video</h3>
          <p>Copy the link below to share this video:</p>
          <div class="share-options">
            <button class="share-option-btn" onclick={copyShareLink}>
              📋 Copy Link
            </button>
            <button class="share-option-btn" onclick={() => {
              const video = videos.find(v => v.id === shareVideoId);
              if (video) handleDownloadVideo(video);
              closeShareModal();
            }}>
              💾 Download & Share
            </button>
          </div>
          <button class="cancel-btn" onclick={closeShareModal}>Cancel</button>
        </div>
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
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.5rem;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
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
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
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

  .card-preview {
    display: flex;
    justify-content: center;
    padding: 0.5rem 0;
  }

  .card-image {
    height: 80px;
    width: auto;
    object-fit: contain;
    border-radius: 4px;
  }

  .video-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    flex: 1;
    padding: 0.5rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .view-btn {
    background: #3b82f6;
    color: white;
  }

  .view-btn:hover {
    background: #2563eb;
  }

  .download-btn {
    background: #22c55e;
    color: white;
  }

  .download-btn:hover {
    background: #16a34a;
  }

  .share-btn {
    background: #a855f7;
    color: white;
  }

  .share-btn:hover {
    background: #9333ea;
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

  .share-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
  }

  .share-modal {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    padding: 2rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    max-width: 400px;
    width: 90%;
    text-align: center;
  }

  .share-modal h3 {
    margin: 0 0 1rem 0;
    color: white;
  }

  .share-modal p {
    color: rgba(255, 255, 255, 0.8);
    margin: 0 0 1.5rem 0;
  }

  .share-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .share-option-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  .share-option-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.02);
  }

  .cancel-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 0.5rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
  }

  .cancel-btn:hover {
    background: rgba(255, 255, 255, 0.1);
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
