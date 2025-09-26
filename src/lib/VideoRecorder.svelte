<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  
  let { activeCardImage } = $props();

  let videoStream = $state(null);
  let mediaRecorder = $state(null);
  let recordedChunks = $state([]);
  let recordingStatus = $state('idle'); // 'idle', 'recording', 'recorded'
  let recordedVideoUrl = $state('');
  let countdown = $state(30);
  let countdownInterval = $state(null);
  let facingMode = $state('environment'); // Default to back camera
  let liveVideoElement = $state(null);
  let recordedVideoElement = $state(null);

  // Effect to handle video element setup when it becomes available
  $effect(() => {
    if (recordingStatus === 'recording' && videoStream && liveVideoElement) {
      console.log('Live video element found:', liveVideoElement);
      console.log('Live video element initial state:', {
        tagName: liveVideoElement.tagName,
        readyState: liveVideoElement.readyState,
        networkState: liveVideoElement.networkState,
        currentSrc: liveVideoElement.currentSrc,
        srcObject: liveVideoElement.srcObject
      });
      
      liveVideoElement.srcObject = videoStream;
      console.log('Live video element srcObject set:', liveVideoElement.srcObject);
      console.log('Live video element after srcObject assignment:', {
        readyState: liveVideoElement.readyState,
        networkState: liveVideoElement.networkState,
        videoWidth: liveVideoElement.videoWidth,
        videoHeight: liveVideoElement.videoHeight
      });
      
      console.log('Live video element dimensions:', {
        width: liveVideoElement.offsetWidth,
        height: liveVideoElement.offsetHeight,
        clientWidth: liveVideoElement.clientWidth,
        clientHeight: liveVideoElement.clientHeight,
        scrollWidth: liveVideoElement.scrollWidth,
        scrollHeight: liveVideoElement.scrollHeight
      });
      
      // Add event listeners for debugging
      liveVideoElement.addEventListener('loadstart', () => console.log('Video: loadstart event'));
      liveVideoElement.addEventListener('loadedmetadata', () => {
        console.log('Video: loadedmetadata event');
        console.log('Video metadata:', {
          videoWidth: liveVideoElement.videoWidth,
          videoHeight: liveVideoElement.videoHeight,
          duration: liveVideoElement.duration
        });
      });
      liveVideoElement.addEventListener('loadeddata', () => console.log('Video: loadeddata event'));
      liveVideoElement.addEventListener('canplay', () => console.log('Video: canplay event'));
      liveVideoElement.addEventListener('canplaythrough', () => console.log('Video: canplaythrough event'));
      liveVideoElement.addEventListener('playing', () => console.log('Video: playing event'));
      liveVideoElement.addEventListener('error', (e) => {
        console.error('Video: error event', e);
        console.error('Video error details:', {
          error: liveVideoElement.error,
          code: liveVideoElement.error?.code,
          message: liveVideoElement.error?.message
        });
      });
      
      // Explicitly try to play the video
      (async () => {
        try {
          console.log('Attempting to play video...');
          await liveVideoElement.play();
          console.log('Live video play() succeeded');
          console.log('Video state after play():', {
            paused: liveVideoElement.paused,
            ended: liveVideoElement.ended,
            readyState: liveVideoElement.readyState,
            currentTime: liveVideoElement.currentTime
          });
        } catch (playError) {
          console.error('Live video play() failed:', playError);
          console.error('Play error details:', playError.name, playError.message);
          console.error('Video element state during play error:', {
            readyState: liveVideoElement.readyState,
            networkState: liveVideoElement.networkState,
            error: liveVideoElement.error
          });
        }
      })();
    }
  });

  async function selectCamera() {
    // Toggle between front and back camera
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    console.log('Camera switched to:', facingMode === 'user' ? 'Front' : 'Back');
    
    // If currently recording, restart with new camera
    if (recordingStatus === 'recording') {
      // Stop current recording
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      
      // Stop current stream
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
      }
      
      // Explicitly clear the video element's srcObject
      if (liveVideoElement) {
        liveVideoElement.srcObject = null;
      }
      
      // Reset state and start new recording
      recordedChunks = [];
      
      // Start recording with new camera
      await startRecording();
    }
  }

  async function startRecording() {
    try {
      console.log('Starting recording process...');
      console.log('Requested facingMode:', facingMode);
      
      // Request camera and microphone access
      videoStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode }, 
        audio: true 
      });
      console.log('Video stream obtained:', videoStream);
      console.log('Video tracks:', videoStream.getVideoTracks());
      console.log('Audio tracks:', videoStream.getAudioTracks());
      
      // Set recording status to render the video element in DOM
      recordingStatus = 'recording';
      
      // Check if tracks are active
      const videoTracks = videoStream.getVideoTracks();
      const audioTracks = videoStream.getAudioTracks();
      console.log('Video track details:', videoTracks.map(track => ({
        id: track.id,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        readyState: track.readyState,
        muted: track.muted
      })));
      console.log('Audio track details:', audioTracks.map(track => ({
        id: track.id,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        readyState: track.readyState,
        muted: track.muted
      })));

      // Determine best supported MIME type for better mobile compatibility
      let mimeType = '';
      const supportedTypes = [
        'video/mp4',
        'video/webm;codecs=h264',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      console.log('Selected MIME type:', mimeType);
      
      // Set up MediaRecorder with optimal MIME type
      mediaRecorder = mimeType 
        ? new MediaRecorder(videoStream, { mimeType })
        : new MediaRecorder(videoStream);
        
      console.log('MediaRecorder created with state:', mediaRecorder.state);
      recordedChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available, chunk size:', event.data.size);
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Recording stopped, total chunks:', recordedChunks.length);
        console.log('Total data size:', recordedChunks.reduce((sum, chunk) => sum + chunk.size, 0));
        
        const blobType = mimeType || 'video/webm';
        const blob = new Blob(recordedChunks, { type: blobType });
        console.log('Blob created:', blob.size, 'bytes, type:', blob.type);
        
        recordedVideoUrl = URL.createObjectURL(blob);
        console.log('Video URL created:', recordedVideoUrl);
        recordingStatus = 'recorded';
        
        // Stop all tracks
        if (videoStream) {
          videoStream.getTracks().forEach(track => track.stop());
          videoStream = null;
        }
      };

      // Start recording
      mediaRecorder.start();
      console.log('Recording started, status:', recordingStatus);
      countdown = 30;

      // Start countdown
      countdownInterval = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          stopRecording();
        }
      }, 1000);

    } catch (error) {
      console.error('Error accessing camera:', error);
      console.error('Error details:', error.name, error.message);
      alert('Unable to access camera. Please make sure you have granted camera permissions.');
    }
  }

  function stopRecording() {
    console.log('Stopping recording...');
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      console.log('MediaRecorder stopped');
    }
    
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  async function resetRecording() {
    console.log('Resetting recording...');
    
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      recordedVideoUrl = '';
    }
    
    // Stop video stream if it exists
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
    }
    
    recordedChunks = [];
    countdown = 30;
    recordingStatus = 'idle';
    
    // Don't automatically start recording - let user decide
  }

  function handleVideoCompleted() {
    console.log('Video completed, dispatching event...');
    dispatch('videoAction', {
      url: recordedVideoUrl,
      status: 'completed',
      cardImage: activeCardImage
    });
    resetRecording();
  }

  function handleVideoFailed() {
    console.log('Video failed, dispatching event...');
    dispatch('videoAction', {
      url: recordedVideoUrl,
      status: 'failed'
    });
    resetRecording();
  }

  onDestroy(() => {
    // Clean up resources
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
  });
</script>

<div class="video-recorder">
  {#if recordingStatus === 'idle'}
    <button class="record-btn" on:click={startRecording}>
     <img src="/public/Rec.svg" alt="Rec" />
    </button>
  {:else if recordingStatus === 'recording'}
    <div class="recording-container" class:fullscreen-recording={recordingStatus === 'recording'}>
      <video 
        bind:this={liveVideoElement}
        autoplay 
        muted 
        playsinline
        class="live-video"
      ></video>
      <div class="recording-controls">
        <div class="camera-selection">
          <button class="camera-switch-btn" on:click={selectCamera}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 3l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M20 7H4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M8 21l-4-4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="countdown-display">
          {countdown}s
        </div>
        <button class="stop-btn-container" on:click={stopRecording}>
          <div class="stop-btn-circle">
            <div class="stop-btn-square"></div>
          </div>
        </button>
      </div>
    </div>
  {:else if recordingStatus === 'recorded'}
    <div class="recorded-container fullscreen-recording">
      <video 
        bind:this={recordedVideoElement}
        src={recordedVideoUrl}
        controls
        playsinline
        class="recorded-video"
      ></video>
      <div class="recorded-controls">
        <button class="action-completed-btn" on:click={handleVideoCompleted}>
          ✓
        </button>
        <button class="action-failed-btn" on:click={handleVideoFailed}>
          ✗
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .camera-switch-btn {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.5);
    padding: 0.5rem;
    border-radius: 50%;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
  }

  .camera-switch-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.8);
    color: white;
    transform: scale(1.05);
  }

  .camera-switch-btn svg {
    width: 24px;
    height: 24px;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  }

  .record-btn {
    position: absolute;
    top: 100px;
    left: calc(50% + 130px);
    width: 40px;
    height: 40px;
    background: linear-gradient(45deg, #ff6b35, #ff3535);
    color: #ffffff;
    border: none;
    padding: 0;
    font-size: 0.9rem;
    font-weight: bold;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .record-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(255, 107, 53, 0.4);
  }

  .recording-container, .recorded-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .live-video, .recorded-video {
    width: 100%;
    height: auto;
    max-width: 100%;
    max-height: 70vh;
    min-height: 200px;
    border-radius: 8px;
    border: 2px solid #333;
    object-fit: contain;
    background-color: #000;
  }

  .recording-controls, .recorded-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .recording-container, .recorded-container {
    width: 100%;
    max-width: 500px;
  }

  .fullscreen-recording {
    position: fixed !important;
    top: 0;
    left: 0;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 9999;
    background-color: black;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 0 !important;
    border: none !important;
    border-radius: 0 !important;
    max-width: none !important;
    gap: 0;
  }

  .fullscreen-recording .live-video {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    object-fit: cover;
    border-radius: 0 !important;
    border: none !important;
    background-color: black;
  }

  .fullscreen-recording .recording-controls {
    position: absolute;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: center;
    justify-content: space-around; /* Adjust for spacing */
    background-color: rgba(0, 0, 0, 0.7);
    padding: 1rem 0.5rem;
    border-radius: 15px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .fullscreen-recording .camera-selection {
    margin: 0;
  }

  .fullscreen-recording .camera-switch-btn {
    width: 40px;
    height: 40px;
    padding: 0.5rem;
  }

  .fullscreen-recording .camera-switch-btn svg {
    width: 20px;
    height: 20px;
  }

  .fullscreen-recording .countdown-display {
    font-size: 2rem; /* Make it larger in fullscreen */
    min-width: 60px; /* Ensure consistent width */
  }

  .fullscreen-recording .stop-btn-circle {
    width: 40px;
    height: 40px;
    box-shadow: 0 3px 12px rgba(255, 68, 68, 0.5);
  }

  .fullscreen-recording .stop-btn-square {
    width: 14px;
    height: 14px;
  }

  .fullscreen-recording .recorded-video {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    object-fit: cover;
    border-radius: 0 !important;
    border: none !important;
    background-color: black;
  }

  .fullscreen-recording .recorded-controls {
    position: absolute;
    top: 75%;
   display: flex;
    flex-direction: row;
    gap: 1rem;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.7);
    padding: 1rem 0.5rem;
    border-radius: 15px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .fullscreen-recording .action-completed-btn,
  .fullscreen-recording .action-failed-btn {
    width: 60px;
    height: 60px;
    font-size: 1.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .fullscreen-recording .action-completed-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(34, 197, 94, 0.4);
  }

  .fullscreen-recording .action-failed-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
  }

  .stop-btn-container {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: transform 0.2s ease;
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
    border: none;
    padding: 0.75rem;
    border-radius: 50%;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
  }

  .action-completed-btn:hover {
    background: #16a34a;
    transform: scale(1.05);
  }

  .action-failed-btn {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.75rem;
    border-radius: 50%;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
  }

  .action-failed-btn:hover {
    background: #dc2626;
    transform: scale(1.05);
  }

  @media (max-width: 800px) {
    .video-recorder {
      padding: 0.75rem;
    }

    .live-video, .recorded-video {
      max-height: 60vh;
      min-height: 150px;
    }

    .recording-controls, .recorded-controls {
      flex-direction: column;
      gap: 0.5rem;
    }
  }

  @media (orientation: landscape) and (max-width: 800px) {
    .live-video, .recorded-video {
      max-height: 50vh;
      max-width: 80vw;
    }
    
    .recording-container, .recorded-container {
      max-width: 80vw;
    }
  }

  @media (orientation: portrait) and (max-width: 800px) {
    .live-video, .recorded-video {
      max-height: 40vh;
      max-width: 90vw;
    }
    
    .recording-container, .recorded-container {
      max-width: 90vw;
    }
  }
</style>