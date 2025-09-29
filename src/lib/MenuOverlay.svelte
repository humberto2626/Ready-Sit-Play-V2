<script>
  let { show, onClose, onUndo, onToggleInstructions, onOpenGameReview } = $props();
</script>

{#if show}
  <div class="menu-overlay" onclick={onClose}>
    <div class="menu-content" onclick={(e) => e.stopPropagation()}>
      <div class="menu-header">
        <h3>Menu</h3>
        <button class="close-menu-btn" onclick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      
      <div class="menu-buttons">
        <button class="menu-action-btn" onclick={() => { onUndo(); onClose(); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 7v6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Undo Last Action
        </button>
        
        <button class="menu-action-btn" onclick={() => { onToggleInstructions(); onClose(); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Instructions
        </button>
        
        <button class="menu-action-btn" onclick={() => { onOpenGameReview(); onClose(); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="23 7 16 12 23 17 23 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
          </svg>
          Review Game Videos
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(5px);
  }

  .menu-content {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
    border-radius: 20px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }

  .menu-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    padding-bottom: 1rem;
  }

  .menu-header h3 {
    margin: 0;
    font-size: 1.5rem;
    color: white;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
  }

  .close-menu-btn {
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 50%;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-menu-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.1);
  }

  .menu-buttons {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .menu-action-btn {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.2);
    padding: 1rem 1.5rem;
    border-radius: 12px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    backdrop-filter: blur(10px);
  }

  .menu-action-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  }

  .menu-action-btn svg {
    flex-shrink: 0;
  }

  @media (max-width: 600px) {
    .menu-content {
      padding: 1.5rem;
      margin: 1rem;
    }

    .menu-action-btn {
      padding: 0.875rem 1.25rem;
      font-size: 0.95rem;
    }
  }
</style>