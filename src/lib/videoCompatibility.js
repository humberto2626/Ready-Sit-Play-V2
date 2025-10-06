export function detectBrowser() {
  const userAgent = navigator.userAgent;

  return {
    isIOS: /iPad|iPhone|iPod/.test(userAgent),
    isSafari: /^((?!chrome|android).)*safari/i.test(userAgent),
    isChrome: /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor),
    isFirefox: /Firefox/.test(userAgent),
    isAndroid: /Android/.test(userAgent),
    isMobile: /Mobile|Android|iPhone|iPad|iPod/.test(userAgent)
  };
}

export function getSupportedVideoCodecs() {
  const browserInfo = detectBrowser();
  const supportedCodecs = [];

  const testTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264',
    'video/webm',
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/ogg;codecs=theora'
  ];

  testTypes.forEach(type => {
    if (MediaRecorder.isTypeSupported(type)) {
      supportedCodecs.push(type);
    }
  });

  return {
    browserInfo,
    supportedCodecs,
    recommendedCodec: getRecommendedCodec(browserInfo, supportedCodecs)
  };
}

function getRecommendedCodec(browserInfo, supportedCodecs) {
  if (browserInfo.isIOS || browserInfo.isSafari) {
    const mp4Codecs = supportedCodecs.filter(c => c.includes('mp4'));
    if (mp4Codecs.length > 0) return mp4Codecs[0];
  }

  if (browserInfo.isChrome || browserInfo.isFirefox) {
    const vp9Codec = supportedCodecs.find(c => c.includes('vp9'));
    if (vp9Codec) return vp9Codec;

    const vp8Codec = supportedCodecs.find(c => c.includes('vp8'));
    if (vp8Codec) return vp8Codec;
  }

  if (supportedCodecs.length > 0) {
    return supportedCodecs[0];
  }

  return 'video/webm';
}

export function getOptimalRecordingSettings() {
  const browserInfo = detectBrowser();
  const { recommendedCodec } = getSupportedVideoCodecs();

  const baseSettings = {
    mimeType: recommendedCodec,
    videoBitsPerSecond: 2500000,
    audioBitsPerSecond: 128000
  };

  if (browserInfo.isIOS || browserInfo.isSafari) {
    baseSettings.videoBitsPerSecond = 2000000;
  }

  if (browserInfo.isMobile) {
    baseSettings.videoBitsPerSecond = Math.min(baseSettings.videoBitsPerSecond, 2000000);
  }

  return baseSettings;
}

export function canShareFiles() {
  if (!navigator.share) {
    return false;
  }

  if (!navigator.canShare) {
    return true;
  }

  try {
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    return navigator.canShare({ files: [testFile] });
  } catch (error) {
    return false;
  }
}

export function getShareCompatibleMimeType(mimeType) {
  const browserInfo = detectBrowser();

  if (browserInfo.isIOS && mimeType.includes('webm')) {
    return 'video/mp4';
  }

  return mimeType;
}

export function validateVideoBlob(blob) {
  if (!blob || !(blob instanceof Blob)) {
    return { valid: false, error: 'Invalid blob object' };
  }

  if (blob.size === 0) {
    return { valid: false, error: 'Empty video file' };
  }

  if (blob.size > 500 * 1024 * 1024) {
    return { valid: false, error: 'Video file too large (>500MB)' };
  }

  const validTypes = ['video/webm', 'video/mp4', 'video/ogg', 'video/quicktime'];
  const isValidType = validTypes.some(type => blob.type.includes(type.split('/')[1]));

  if (!isValidType && blob.type !== '') {
    return { valid: false, error: `Unsupported video type: ${blob.type}` };
  }

  return { valid: true };
}

export async function checkVideoPlayback(videoBlob) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;

    const url = URL.createObjectURL(videoBlob);
    video.src = url;

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve({
        canPlay: false,
        error: 'Video load timeout',
        duration: 0
      });
    }, 5000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve({
        canPlay: true,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      });
    };

    video.onerror = (error) => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve({
        canPlay: false,
        error: video.error?.message || 'Unknown video error',
        duration: 0
      });
    };
  });
}
