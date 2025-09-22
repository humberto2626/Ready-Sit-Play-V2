<script>
  import { onMount, onDestroy } from 'svelte';

  let videoStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordingStatus = 'idle'; // 'idle', 'recording', 'recorded'
  let recordedVideoUrl = '';
  let countdown = 30;
  let countdownInterval = null;
  let facingMode = 'environment'; // Default to back camera
  let liveVideoElement = null;
  let recordedVideoElement = null;

  function selectCamera(mode) {
    facingMode = mode;
    console.log('Camera selected:', mode === 'user' ? 'Front' : 'Back');
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
      
      // Wait for the next tick to ensure DOM is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
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

      // Display live feed
      if (liveVideoElement) {
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
      } else {
        console.error('Live video element not found!');
        console.error('Available elements:', document.querySelectorAll('video'));
      }

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

  function resetRecording() {
    console.log('Resetting recording...');
    recordingStatus = 'idle';
    recordedVideoUrl = '';
    recordedChunks = [];
    countdown = 30;
    
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
  }

  function downloadVideo() {
    console.log('Downloading video:', recordedVideoUrl);
    if (recordedVideoUrl) {
      const a = document.createElement('a');
      a.href = recordedVideoUrl;
      a.download = `training-video-${new Date().toISOString().slice(0, 19)}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  async function shareVideo() {
    console.log('Attempting to share video...');
    
    if (!navigator.share) {
      alert('Sharing is not supported on this browser. You can download the video instead.');
      return;
    }

    if (!recordedChunks.length) {
      alert('No video to share. Please record a video first.');
      return;
    }

    try {
      // Determine the MIME type and file extension
      const mimeType = recordedChunks[0].type || 'video/mp4';
      const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
      
      // Create a File object from the recorded chunks
      const videoBlob = new Blob(recordedChunks, { type: mimeType });
      const videoFile = new File(
        [videoBlob], 
        `training-video-${new Date().toISOString().slice(0, 19)}.${extension}`, 
        { type: mimeType }
      );

      console.log('Sharing file:', videoFile.name, 'Size:', videoFile.size, 'Type:', videoFile.type);

      // Check if the browser supports sharing files
      if (navigator.canShare && !navigator.canShare({ files: [videoFile] })) {
        alert('Your browser supports sharing, but not video files. You can download the video instead.');
        return;
      }

      // Share the video file
      await navigator.share({
        title: 'Dog Training Video',
        text: 'Check out this dog training video from Ready, Sit, Play!',
        files: [videoFile]
      });

      console.log('Video shared successfully');
    } catch (error) {
      console.error('Error sharing video:', error);
      
      if (error.name === 'AbortError') {
        console.log('User cancelled the share');
      } else {
        alert('Failed to share video. You can download it instead.');
      }
    }
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
      Rec
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
          <div class="camera-buttons">
            <button 
              class="camera-btn {facingMode === 'user' ? 'active' : ''}"
              on:click={() => selectCamera('user')}
            >
              Front
            </button>
            <button 
              class="camera-btn {facingMode === 'environment' ? 'active' : ''}"
              on:click={() => selectCamera('environment')}
            >
              Back
            </button>
          </div>
        </div>
        <div class="countdown">{countdown}s</div>
        <button class="stop-btn" on:click={stopRecording}>
          Stop Recording
        </button>
      </div>
    </div>
  {:else if recordingStatus === 'recorded'}
    <div class="recorded-container">
      <video 
        bind:this={recordedVideoElement}
        src={recordedVideoUrl}
        controls
        playsinline
        class="recorded-video"
      ></video>
      <div class="recorded-controls">
        <button class="download-btn" on:click={downloadVideo}>
          Download Video
        </button>
        <button class="share-btn" on:click={shareVideo}>
          Share Video
        </button>
        <button class="reset-btn" on:click={resetRecording}>
          Record Again
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .video-recorder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
    padding: 1rem;
    border: 2px solid #646cff;
    border-radius: 12px;
    background-color: rgba(100, 108, 255, 0.1);
  }

  .camera-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .camera-btn {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.5);
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
  }

  .camera-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.8);
    color: white;
  }

  .camera-btn.active {
    background: rgba(100, 108, 255, 0.8);
    border-color: rgba(100, 108, 255, 1);
    color: white;
  }

  .record-btn {
    position: fixed;
    top: 80px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: linear-gradient(45deg, #ffd700, #ff6b35);
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
    object-fit: contain;
    border-radius: 0 !important;
    border: none !important;
    background-color: black;
  }

  .fullscreen-recording .recording-controls {
    position: absolute;
    bottom: 4rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.7);
    padding: 1rem 1.5rem;
    border-radius: 25px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .fullscreen-recording .camera-selection {
    margin-bottom: 0.5rem;
  }

  .fullscreen-recording .camera-btn {
    font-size: 0.9rem;
    padding: 0.4rem 0.8rem;
  }

  .fullscreen-recording .countdown {
    color: white !important;
    background: rgba(255, 107, 53, 0.8) !important;
    border: 2px solid rgba(255, 107, 53, 1) !important;
    font-size: 1.1rem;
    font-weight: bold;
  }

  .fullscreen-recording .stop-btn {
    background: rgba(255, 107, 107, 0.9) !important;
    color: white !important;
    font-size: 1rem;
    padding: 0.75rem 1.25rem;
    border-radius: 20px;
    border: 2px solid rgba(255, 107, 107, 1);
  }

  .fullscreen-recording .stop-btn:hover {
    background: rgba(255, 82, 82, 1) !important;
    transform: scale(1.05);
  }

  .countdown {
    font-size: 1.2rem;
    font-weight: bold;
    color: #ff6b35;
    background: rgba(255, 255, 255, 0.9);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    border: 2px solid #ff6b35;
  }

  .stop-btn, .download-btn, .reset-btn {
    background: #ff6b6b;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s ease;
  }

  .download-btn {
    background: #22c55e;
  }

  .share-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s ease;
  }

  .reset-btn {
    background: #646cff;
  }

  .stop-btn:hover {
    background: #ff5252;
  }

  .download-btn:hover {
    background: #16a34a;
  }

  .share-btn:hover {
    background: #2563eb;
  }

  .reset-btn:hover {
    background: #535bf2;
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