<script>
  import { onMount } from 'svelte';
  import { getStorageEstimate, clearAllData } from './indexedDBStore.js';
  import { formatBytes } from './videoUtils.js';

  let storageInfo = $state(null);
  let showWarning = $state(false);
  let showDetails = $state(false);

  onMount(async () => {
    await updateStorageInfo();
    const interval = setInterval(updateStorageInfo, 30000);
    return () => clearInterval(interval);
  });

  async function updateStorageInfo() {
    const info = await getStorageEstimate();
    if (info) {
      storageInfo = info;
      showWarning = info.percentUsed > 75;
    }
  }

  async function handleClearData() {
    if (confirm('Are you sure you want to clear all stored videos and game data? This action cannot be undone.')) {
      try {
        await clearAllData();
        await updateStorageInfo();
        alert('All data cleared successfully!');
      } catch (error) {
        console.error('Error clearing data:', error);
        alert('Failed to clear data. Please try again.');
      }
    }
  }

  function toggleDetails() {
    showDetails = !showDetails;
  }
</script>

{#if showWarning && storageInfo}
  <div class="storage-warning" class:critical={storageInfo.percentUsed > 90}>
    <div class="warning-content">
      <div class="warning-icon">
        {storageInfo.percentUsed > 90 ? '⚠️' : 'ℹ️'}
      </div>
      <div class="warning-text">
        <strong>Storage {storageInfo.percentUsed > 90 ? 'Critical' : 'Warning'}</strong>
        <p>You're using {storageInfo.percentUsed.toFixed(1)}% of available storage</p>
      </div>
      <button class="details-btn" onclick={toggleDetails}>
        {showDetails ? '▼' : '▶'}
      </button>
    </div>

    {#if showDetails}
      <div class="details-panel">
        <div class="storage-stats">
          <div class="stat-row">
            <span>Used:</span>
            <span>{formatBytes(storageInfo.usage)}</span>
          </div>
          <div class="stat-row">
            <span>Available:</span>
            <span>{formatBytes(storageInfo.quota)}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: {storageInfo.percentUsed}%"></div>
          </div>
        </div>

        <div class="actions">
          <button class="clear-btn" onclick={handleClearData}>
            Clear All Data
          </button>
          <p class="warning-note">
            💡 Tip: Download important videos before clearing
          </p>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .storage-warning {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    color: #000;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    max-width: 350px;
    z-index: 9999;
    animation: slideIn 0.3s ease-out;
  }

  .storage-warning.critical {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
  }

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .warning-content {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
  }

  .warning-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .warning-text {
    flex: 1;
  }

  .warning-text strong {
    display: block;
    font-size: 1.1rem;
    margin-bottom: 0.25rem;
  }

  .warning-text p {
    margin: 0;
    font-size: 0.9rem;
    opacity: 0.9;
  }

  .details-btn {
    background: rgba(0, 0, 0, 0.2);
    border: none;
    color: inherit;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  .details-btn:hover {
    background: rgba(0, 0, 0, 0.3);
  }

  .details-panel {
    border-top: 1px solid rgba(0, 0, 0, 0.2);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .storage-stats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
  }

  .stat-row span:first-child {
    font-weight: 600;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    overflow: hidden;
    margin-top: 0.5rem;
  }

  .progress-fill {
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    transition: width 0.3s ease;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .clear-btn {
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(0, 0, 0, 0.4);
    color: inherit;
    padding: 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s ease;
  }

  .clear-btn:hover {
    background: rgba(0, 0, 0, 0.5);
    transform: scale(1.02);
  }

  .warning-note {
    margin: 0;
    font-size: 0.85rem;
    opacity: 0.8;
    text-align: center;
  }

  @media (max-width: 768px) {
    .storage-warning {
      bottom: 10px;
      right: 10px;
      left: 10px;
      max-width: none;
    }
  }
</style>
