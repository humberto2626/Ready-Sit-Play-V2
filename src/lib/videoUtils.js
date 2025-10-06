export async function generateVideoThumbnail(videoBlob) {
  return new Promise((resolve, reject) => {
    const videoElement = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    videoElement.preload = 'metadata';
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.crossOrigin = 'anonymous';

    const videoURL = URL.createObjectURL(videoBlob);
    videoElement.src = videoURL;

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(videoURL);
      reject(new Error('Thumbnail generation timeout'));
    }, 10000);

    videoElement.onloadedmetadata = () => {
      const seekTime = Math.min(1, videoElement.duration * 0.1);
      videoElement.currentTime = seekTime;
    };

    videoElement.onseeked = () => {
      clearTimeout(timeout);

      const maxDimension = 640;
      let width = videoElement.videoWidth;
      let height = videoElement.videoHeight;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(videoElement, 0, 0, width, height);

      canvas.toBlob((thumbnailBlob) => {
        URL.revokeObjectURL(videoURL);

        if (thumbnailBlob) {
          resolve(thumbnailBlob);
        } else {
          reject(new Error('Failed to generate thumbnail'));
        }
      }, 'image/jpeg', 0.8);
    };

    videoElement.onerror = (error) => {
      clearTimeout(timeout);
      URL.revokeObjectURL(videoURL);
      reject(error);
    };
  });
}

export function downloadVideo(videoBlob, filename) {
  const url = URL.createObjectURL(videoBlob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function generateVideoFilename(playerName, cardLabel, success, timestamp, mimeType = 'video/webm') {
  const date = new Date(timestamp);
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
  const status = success ? 'Success' : 'Failed';

  const sanitize = (str) => str.replace(/[^a-z0-9]/gi, '_');

  // Determine file extension based on MIME type
  let extension = 'webm';
  if (mimeType.includes('mp4')) {
    extension = 'mp4';
  } else if (mimeType.includes('webm')) {
    extension = 'webm';
  }

  return `${sanitize(playerName)}_${sanitize(cardLabel)}_${status}_${dateStr}_${timeStr}.${extension}`;
}

export async function compileVideos(videoBlobs, options = {}) {
  const {
    width = 1280,
    height = 720,
    fps = 30,
    transitionDuration = 0.5
  } = options;

  if (!videoBlobs || videoBlobs.length === 0) {
    throw new Error('No videos to compile');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });

  const stream = canvas.captureStream(fps);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  const supportedTypes = isIOS || isSafari
    ? [
        'video/mp4',
        'video/mp4;codecs=avc1',
        'video/webm'
      ]
    : [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm'
      ];

  let selectedMimeType = 'video/webm';
  for (const type of supportedTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      selectedMimeType = type;
      break;
    }
  }

  console.log('Compilation using MIME type:', selectedMimeType);

  const recorderOptions = {
    mimeType: selectedMimeType,
    videoBitsPerSecond: 3000000
  };

  let mediaRecorder;
  try {
    mediaRecorder = new MediaRecorder(stream, recorderOptions);
  } catch (error) {
    console.warn('Failed with preferred options, using defaults:', error);
    mediaRecorder = new MediaRecorder(stream);
    selectedMimeType = mediaRecorder.mimeType || 'video/webm';
  }

  const chunks = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Video compilation timeout'));
    }, 300000);

    mediaRecorder.onstop = () => {
      clearTimeout(timeout);
      const compiledBlob = new Blob(chunks, { type: selectedMimeType });
      resolve(compiledBlob);
    };

    mediaRecorder.onerror = (error) => {
      clearTimeout(timeout);
      reject(error);
    };

    mediaRecorder.start(1000);

    const videoElements = [];
    const urlsToRevoke = [];

    const promises = videoBlobs.map((blob) => {
      return new Promise((resolveVideo, rejectVideo) => {
        const video = document.createElement('video');
        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';

        const url = URL.createObjectURL(blob.videoBlob);
        urlsToRevoke.push(url);
        video.src = url;

        const loadTimeout = setTimeout(() => {
          rejectVideo(new Error('Video load timeout'));
        }, 10000);

        video.onloadedmetadata = () => {
          clearTimeout(loadTimeout);
          videoElements.push({
            video,
            metadata: blob
          });
          resolveVideo();
        };

        video.onerror = (error) => {
          clearTimeout(loadTimeout);
          rejectVideo(error);
        };
      });
    });

    Promise.all(promises).then(async () => {
      for (let i = 0; i < videoElements.length; i++) {
        const { video, metadata } = videoElements[i];

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(metadata.playerName, canvas.width / 2, 100);
        ctx.font = '36px Arial';
        ctx.fillText(metadata.cardLabel, canvas.width / 2, 160);

        await new Promise(resolve => setTimeout(resolve, transitionDuration * 1000));

        video.currentTime = 0;

        try {
          await video.play();
        } catch (error) {
          console.error('Failed to play video during compilation:', error);
        }

        let lastFrameTime = performance.now();
        const frameDelay = 1000 / fps;

        const playVideo = () => {
          if (video.ended || video.paused) {
            return;
          }

          const now = performance.now();
          if (now - lastFrameTime >= frameDelay) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            lastFrameTime = now;
          }
          requestAnimationFrame(playVideo);
        };

        playVideo();

        await new Promise(resolve => {
          video.onended = resolve;
          setTimeout(resolve, (video.duration + 1) * 1000);
        });

        video.pause();
      }

      urlsToRevoke.forEach(url => URL.revokeObjectURL(url));
      mediaRecorder.stop();
    }).catch((error) => {
      clearTimeout(timeout);
      urlsToRevoke.forEach(url => URL.revokeObjectURL(url));
      reject(error);
    });
  });
}

export function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return Promise.resolve();
    } catch (error) {
      document.body.removeChild(textArea);
      return Promise.reject(error);
    }
  }
}
