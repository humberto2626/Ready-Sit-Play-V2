<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let recordingStatus = 'idle'; // 'idle', 'recording', 'recorded'
  export let countdown = 30;
  export let facingMode = 'environment';

  function handleStartRecording() {
    dispatch('startRecording');
  }

  function handleStopRecording() {
    dispatch('stopRecording');
  }

  function handleSelectCamera() {
    dispatch('selectCamera');
  }

  function handleVideoCompleted() {
    dispatch('videoAction', { status: 'completed' });
  }

  function handleVideoFailed() {
    dispatch('videoAction', { status: 'failed' });
  }

  function handleShowInstructions() {
    dispatch('showInstructions');
  }

  function handleUndo() {
    dispatch('undo');
  }
</script>

<div class="control-panel">
  <!-- Instructions and Undo buttons always visible -->
  <button class="control-btn instructions-btn" on:click={handleShowInstructions}>
    <img src="/Info.svg" alt="Instructions" />
  </button>
  
  <button class="control-btn undo-btn" on:click={handleUndo}>
    <img src="/Undo.svg" alt="Undo" />
  </button>

  <!-- Recording controls based on status -->
  {#if recordingStatus === 'idle'}
    <button class="control-btn record-btn" on:click={handleStartRecording}>
      <img src="/Rec.svg" alt="Record" />
    </button>
  {:else if recordingStatus === 'recording'}
    <button class="control-btn camera-switch-btn" on:click={handleSelectCamera}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 3l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M20 7H4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 21l-4-4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    
    <div class="countdown-display">
      {countdown}s
    </div>
    
    <button class="control-btn stop-btn-container" on:click={handleStopRecording}>
      <div class="stop-btn-circle">
        <div class="stop-btn-square"></div>
      </div>
    </button>
  {:else if recordingStatus === 'recorded'}
    <button class="control-btn action-completed-btn" on:click={handleVideoCompleted}>
      ✓
    </button>
    
    <button class="control-btn action-failed-btn" on:click={handleVideoFailed}>
      ✗
    </button>
  {/if}
</div>

<style>
  .control-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.7);
    padding: 1rem 0.5rem;
    border-radius: 15px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    min-width: 80px;
  }

  .control-btn {
    width: 60px;
    height: 60px;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.25s;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 500;
    font-size: 1.2rem;
  }

  .instructions-btn {
    background-color: #646cff;
    color: white;
  }

  .instructions-btn:hover:not(:disabled) {
    background-color: #535bf2;
    transform: translateY(-2px);
  }

  .undo-btn {
    background-color: #ff6b6b;
    color: white;
  }

  .undo-btn:hover:not(:disabled) {
    background-color: #ff5252;
    transform: translateY(-2px);
  }

  .record-btn {
    background: linear-gradient(45deg, #ff6b35, #ff3535);
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
  }

  .record-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(255, 107, 53, 0.4);
  }

  .camera-switch-btn {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.5);
  }

  .camera-switch-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.8);
    transform: scale(1.05);
  }

  .camera-switch-btn svg {
    width: 24px;
    height: 24px;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  }

  .countdown-display {
    font-size: 1.5rem;
    font-weight: bold;
    color: white;
    text-align: center;
    min-width: 60px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }

  .stop-btn-container {
    background: transparent;
    padding: 0;
  }

  .stop-btn-container:hover {
    transform: scale(1.05);
  }

  .stop-btn-circle {
    width: 44px;
    height: 44px;
    background: #ff4444;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(255, 68, 68, 0.4);
  }

  .stop-btn-square {
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 2px;
  }

  .action-completed-btn {
    background: #22c55e;
    color: white;
  }

  .action-completed-btn:hover {
    background: #16a34a;
    transform: scale(1.05);
  }

  .action-failed-btn {
    background: #ef4444;
    color: white;
  }

  .action-failed-btn:hover {
    background: #dc2626;
    transform: scale(1.05);
  }

  .control-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 768px) {
    .control-panel {
      flex-direction: row;
      justify-content: center;
      flex-wrap: wrap;
      padding: 0.75rem;
      gap: 0.75rem;
      min-width: auto;
      width: 100%;
    }

    .control-btn {
      width: 50px;
      height: 50px;
    }

    .countdown-display {
      font-size: 1.2rem;
      min-width: 50px;
    }

    .stop-btn-circle {
      width: 38px;
      height: 38px;
    }

    .stop-btn-square {
      width: 14px;
      height: 14px;
    }
  }
</style>