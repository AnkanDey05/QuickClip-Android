/**
 * Download Manager - Handles downloading videos with pause/resume capability
 */

import { DownloadItem, VideoFormat, VideoInfo } from "../../types";
import {
  formatBytes,
  formatSpeed,
  calculateETA,
  generateId,
  sanitizeFilename,
} from "../../utils/common";
import { DownloadError } from "../../utils/errorHandler";
import { ensureDownloadDirectory, getPlatformDirectory } from "../../utils/fileSystem";
import RNFS from "react-native-fs";

interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;
  speed: number;
  eta: number;
}

interface DownloadManagerConfig {
  maxConcurrentDownloads?: number;
  chunkSize?: number;
  timeout?: number;
}

export class DownloadManager {
  private config: Required<DownloadManagerConfig>;
  private activeDownloads: Map<string, AbortController> = new Map();

  constructor(config: DownloadManagerConfig = {}) {
    this.config = {
      maxConcurrentDownloads: config.maxConcurrentDownloads || 2,
      chunkSize: config.chunkSize || 1024 * 1024, // 1MB chunks
      timeout: config.timeout || 30000, // 30 seconds
    };
  }

  /**
   * Create a new download item
   */
  async createDownloadItem(
    videoInfo: VideoInfo,
    selectedFormat: VideoFormat,
    videoId?: string
  ): Promise<DownloadItem> {
    await ensureDownloadDirectory();

    const id = generateId();
    const fileName = sanitizeFilename(`${videoInfo.title}.mp4`);

    const platformDir = await getPlatformDirectory(videoInfo.platform);
    const filePath = `${platformDir}/${fileName}`;

    return {
      id,
      videoId: videoId || videoInfo.id,
      videoInfo,
      selectedFormat,
      status: "pending",
      progress: 0,
      bytesDownloaded: 0,
      totalBytes: selectedFormat.filesize || 0,
      speed: 0,
      eta: 0,
      fileName,
      filePath,
      startTime: Date.now(),
      retryCount: 0,
    };
  }

  /**
   * Start downloading a video
   */
  async startDownload(
    downloadItem: DownloadItem,
    onProgress: (progress: DownloadProgress) => void
  ): Promise<void> {
    const controller = new AbortController();
    this.activeDownloads.set(downloadItem.id, controller);

    try {
      const startTime = Date.now();
      let startBytes = downloadItem.bytesDownloaded;

      await this.downloadFile(
        downloadItem.selectedFormat.url,
        downloadItem.filePath!,
        (bytesDownloaded, totalBytes) => {
          const elapsed = (Date.now() - startTime) / 1000; // in seconds
          const bytesDiff = bytesDownloaded - startBytes;
          const speed = elapsed > 0 ? bytesDiff / elapsed / (1024 * 1024) : 0; // MB/s
          const eta = calculateETA(totalBytes - bytesDownloaded, speed);
          const progress =
            totalBytes > 0 ? (bytesDownloaded / totalBytes) * 100 : 0;

          onProgress({
            bytesDownloaded,
            totalBytes,
            speed,
            eta,
          });
        },
        controller.signal
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new DownloadError("Download was cancelled");
      }
      throw error;
    } finally {
      this.activeDownloads.delete(downloadItem.id);
    }
  }

  /**
   * Download a file from URL to local path
   */
  private async downloadFile(
    url: string,
    filePath: string,
    onProgress: (bytesDownloaded: number, totalBytes: number) => void,
    abortSignal: AbortSignal
  ): Promise<void> {
    try {
      // Create directory if it doesn't exist
      const dirPath = filePath.substring(0, filePath.lastIndexOf("/"));
      const exists = await RNFS.exists(dirPath);
      if (!exists) {
        await RNFS.mkdir(dirPath);
      }

      // Start download using RNFS
      let totalBytes = 0;
      let bytesDownloaded = 0;

      const downloadSpec = {
        fromUrl: url,
        toFile: filePath,
        begin: (res: Record<string, unknown>) => {
          totalBytes = (res.contentLength as number) || 0;
          onProgress(0, totalBytes);
        },
        progress: (res: Record<string, unknown>) => {
          bytesDownloaded = (res.bytesWritten as number) || 0;
          onProgress(bytesDownloaded, totalBytes);
        },
      };

      const downloadResult = RNFS.downloadFile(downloadSpec);

      // Monitor abort signal
      const abortPromise = new Promise<void>((_, reject) => {
        abortSignal.addEventListener("abort", () => {
          downloadResult.jobId && RNFS.stopDownload(downloadResult.jobId);
          reject(new Error("Download aborted"));
        });
      });

      const result = await Promise.race([
        downloadResult.promise,
        abortPromise,
      ]);

      if (result && result !== 200) {
        throw new DownloadError(
          `Download failed with status code: ${result}`
        );
      }
    } catch (error) {
      throw new DownloadError(
        `Failed to download file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Pause a download
   */
  pauseDownload(downloadId: string): void {
    const controller = this.activeDownloads.get(downloadId);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(downloadId);
    }
  }

  /**
   * Resume a paused download
   */
  async resumeDownload(
    downloadItem: DownloadItem,
    onProgress: (progress: DownloadProgress) => void
  ): Promise<void> {
    // For simplicity, restart the download from where it was paused
    // In production, implement proper resume with HTTP Range headers
    await this.startDownload(downloadItem, onProgress);
  }

  /**
   * Cancel a download
   */
  cancelDownload(downloadId: string): void {
    const controller = this.activeDownloads.get(downloadId);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(downloadId);
    }
  }

  /**
   * Get all active downloads
   */
  getActiveDownloads(): string[] {
    return Array.from(this.activeDownloads.keys());
  }

  /**
   * Check if a download is active
   */
  isDownloadActive(downloadId: string): boolean {
    return this.activeDownloads.has(downloadId);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.activeDownloads.forEach((controller) => {
      controller.abort();
    });
    this.activeDownloads.clear();
  }
}

// Export singleton instance
export const downloadManager = new DownloadManager();

export default downloadManager;
