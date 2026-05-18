/**
 * yt-dlp Native Bridge
 * Communicates with the Kotlin YtDlpModule to extract video info
 * and download videos using yt-dlp running natively on the device.
 */

import { NativeModules, NativeEventEmitter } from 'react-native';
import { VideoInfo, VideoFormat } from '../../types';

const { YtDlpModule } = NativeModules;
const eventEmitter = new NativeEventEmitter(YtDlpModule);

export interface DownloadProgressEvent {
  taskId: string;
  progress: number;
  eta: number;
  line: string;
}

/**
 * Extract video information from a URL using yt-dlp
 */
export const extractVideoInfo = async (url: string): Promise<VideoInfo> => {
  try {
    const info = await YtDlpModule.getVideoInfo(url);

    let formats: VideoFormat[] = [];
    const duration = info.duration || 0;

    // Use real format data from Kotlin if available
    const nativeFormats = info.formats;
    if (nativeFormats && nativeFormats.length > 0) {
      formats = nativeFormats.map((fmt: any, index: number) => {
        const height = fmt.height || 0;
        const hasVideo = fmt.hasVideo === true;
        const hasAudio = fmt.hasAudio === true;
        const ext = fmt.ext || 'mp4';
        const vcodec = fmt.vcodec || '';
        const acodec = fmt.acodec || '';
        const fps = fmt.fps || 0;
        const filesize = fmt.filesize || 0;
        let filesizeApprox = fmt.filesizeApprox || 0;
        const tbr = fmt.tbr || 0;

        // Estimate file size from bitrate × duration when no size data
        if (filesize === 0 && filesizeApprox === 0 && tbr > 0 && duration > 0) {
          // tbr is kbps → bytes = (kbps * 1000 / 8) * seconds
          filesizeApprox = Math.round((tbr * 1000 / 8) * duration);
        }

        // Build quality label
        let quality: string;
        let formatSelector: string;

        if (hasVideo && height > 0) {
          quality = `${height}p`;
          // Use yt-dlp format selector that targets this resolution
          formatSelector = `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`;
        } else {
          quality = 'Audio Only (MP3)';
          formatSelector = 'bestaudio/best';
        }

        // Clean up codec name for display
        const codecDisplay = hasVideo
          ? (vcodec.startsWith('avc') ? 'H.264' : vcodec.startsWith('vp') ? vcodec.toUpperCase() : vcodec.startsWith('av01') ? 'AV1' : vcodec.split('.')[0])
          : (acodec.startsWith('mp4a') ? 'AAC' : acodec.startsWith('opus') ? 'Opus' : acodec.split('.')[0]);

        return {
          id: hasVideo ? `video-${height}p` : `audio-${index}`,
          quality,
          url: formatSelector,
          filesize: filesize > 0 ? filesize : undefined,
          filesizeApprox: filesizeApprox > 0 ? filesizeApprox : undefined,
          ext: ext.toUpperCase(),
          hasAudio,
          hasVideo,
          codec: codecDisplay,
          fps: fps > 0 ? Math.round(fps) : undefined,
          bitrate: tbr > 0 ? Math.round(tbr) : undefined,
        };
      });
    }

    // Fallback: if no real formats came back, use curated defaults
    if (formats.length === 0) {
      formats = [
        {
          id: 'best-1080', quality: '1080p',
          url: 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]',
          hasAudio: true, hasVideo: true, ext: 'MP4',
        },
        {
          id: 'best-720', quality: '720p',
          url: 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]',
          hasAudio: true, hasVideo: true, ext: 'MP4',
        },
        {
          id: 'best-480', quality: '480p',
          url: 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480]',
          hasAudio: true, hasVideo: true, ext: 'MP4',
        },
        {
          id: 'best-360', quality: '360p',
          url: 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360]',
          hasAudio: true, hasVideo: true, ext: 'MP4',
        },
        {
          id: 'audio-only', quality: 'Audio Only (MP3)',
          url: 'bestaudio/best',
          hasAudio: true, hasVideo: false, ext: 'MP3',
        },
      ];
    }

    return {
      id: info.id || Math.random().toString(36).substring(7),
      title: info.title || 'Unknown Video',
      thumbnail: info.thumbnail || '',
      duration: info.duration || 0,
      formats: formats,
      uploader: info.uploader || undefined,
      platform: detectPlatform(url),
      url: url,
    };
  } catch (error: any) {
    console.error('yt-dlp extraction error:', error);
    let msg = error.message || 'Failed to extract video info';
    // Strip yt-dlp warnings to show only the actual error
    if (msg.includes('ERROR:')) {
      msg = msg.substring(msg.lastIndexOf('ERROR:') + 7).trim();
    }
    if (msg.includes('not granting access') || msg.includes('login') || msg.includes('cookies')) {
      msg = 'This content requires authentication. Private or restricted content cannot be downloaded.';
    }
    throw new Error(msg);
  }
};

/**
 * Download a video using yt-dlp natively
 */
export const downloadVideo = async (
  taskId: string,
  url: string,
  outputPath: string,
  formatId: string | undefined,
  isAudio: boolean,
  onProgress?: (event: DownloadProgressEvent) => void
): Promise<{ exitCode: number; output: string }> => {
  let subscription: any;
  if (onProgress) {
    subscription = eventEmitter.addListener('onDownloadProgress', (event: DownloadProgressEvent) => {
      if (event.taskId === taskId) {
        onProgress(event);
      }
    });
  }

  try {
    const result = await YtDlpModule.download(taskId, url, outputPath, formatId || null, isAudio);
    return result;
  } finally {
    if (subscription) {
      subscription.remove();
    }
  }
};

/**
 * Download a specific section/clip of a video using yt-dlp
 */
export const downloadVideoSection = async (
  taskId: string,
  url: string,
  outputPath: string,
  formatId: string | undefined,
  isAudio: boolean,
  startSec: number,
  endSec: number,
  onProgress?: (event: DownloadProgressEvent) => void
): Promise<{ exitCode: number; output: string }> => {
  let subscription: any;
  if (onProgress) {
    subscription = eventEmitter.addListener('onDownloadProgress', (event: DownloadProgressEvent) => {
      if (event.taskId === taskId) {
        onProgress(event);
      }
    });
  }

  try {
    const result = await YtDlpModule.downloadSection(
      taskId, url, outputPath, formatId || null, isAudio, startSec, endSec
    );
    return result;
  } finally {
    if (subscription) {
      subscription.remove();
    }
  }
};

/**
 * Cancel an active native download
 */
export const cancelDownloadNative = async (taskId: string): Promise<boolean> => {
  try {
    return await YtDlpModule.cancelDownload(taskId);
  } catch (error) {
    console.warn('Failed to cancel native download:', error);
    return false;
  }
};

/**
 * Open a file using the system's app chooser (video player, audio player, etc.)
 */
export const openFileNative = async (filePath: string): Promise<boolean> => {
  try {
    console.log('[File] Opening file:', filePath);
    return await YtDlpModule.openFile(filePath);
  } catch (error: any) {
    console.warn('[File] Failed to open file:', error.message);
    throw error;
  }
};

/**
 * Share a file using the system's share sheet
 */
export const shareFileNative = async (filePath: string, title: string): Promise<boolean> => {
  try {
    console.log('[File] Sharing file:', filePath);
    return await YtDlpModule.shareFile(filePath, title);
  } catch (error: any) {
    console.warn('[File] Failed to share file:', error.message);
    throw error;
  }
};

/**
 * Update yt-dlp to the latest version
 */
export const updateYtDlp = async (): Promise<string> => {
  return await YtDlpModule.updateYtDlp();
};

const detectPlatform = (url: string): string => {
  if (/youtu\.?be/.test(url)) return 'youtube';
  if (/instagram\.com/.test(url)) return 'instagram';
  if (/facebook\.com/.test(url)) return 'facebook';
  if (/tiktok\.com/.test(url)) return 'tiktok';
  if (/twitter\.com/.test(url) || /x\.com/.test(url)) return 'twitter';
  if (/reddit\.com/.test(url)) return 'reddit';
  if (/pinterest\.com/.test(url)) return 'pinterest';
  if (/vimeo\.com/.test(url)) return 'vimeo';
  if (/dailymotion\.com/.test(url)) return 'dailymotion';
  if (/soundcloud\.com/.test(url)) return 'soundcloud';
  return 'unknown';
};
