/**
 * Storage Service - Handles file management and gallery integration
 */

import { RNFS } from "react-native-fs";
import { StorageError } from "../../utils/errorHandler";
import { LibraryVideo } from "../../types";
import {
  deleteFile,
  fileExists,
  getFileSize,
  STORAGE_DIR,
} from "../../utils/fileSystem";

export class StorageService {
  /**
   * Save file metadata to local storage
   */
  async saveFileMetadata(
    filePath: string,
    videoInfo: Record<string, unknown>
  ): Promise<void> {
    try {
      const metadataPath = `${filePath}.json`;
      const metadata = JSON.stringify(videoInfo);
      await RNFS.writeFile(metadataPath, metadata, "utf8");
    } catch (error) {
      throw new StorageError(
        `Failed to save file metadata: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath: string): Promise<Record<string, unknown>> {
    try {
      const metadataPath = `${filePath}.json`;
      const exists = await fileExists(metadataPath);
      if (!exists) {
        return {};
      }

      const content = await RNFS.readFile(metadataPath, "utf8");
      return JSON.parse(content);
    } catch (error) {
      // Return empty object if metadata doesn't exist or fails to parse
      return {};
    }
  }

  /**
   * Get all downloaded videos as LibraryVideo items
   */
  async getAllDownloadedVideos(): Promise<LibraryVideo[]> {
    try {
      const videos: LibraryVideo[] = [];

      // Read directory structure
      const dirs = await RNFS.readDir(STORAGE_DIR);

      for (const dir of dirs) {
        if (dir.isDirectory()) {
          const platform = dir.name;
          const files = await RNFS.readDir(dir.path);

          for (const file of files) {
            if (file.name.endsWith(".mp4") || file.name.endsWith(".mkv")) {
              const fileSize = await getFileSize(file.path);
              const metadata = await this.getFileMetadata(file.path);

              videos.push({
                id: file.name,
                title:
                  (metadata.title as string) || file.name.replace(/\.[^.]+$/, ""),
                thumbnail: (metadata.thumbnail as string) || "",
                filePath: file.path,
                duration: (metadata.duration as number) || 0,
                fileSize,
                addedDate: file.mtime || Date.now(),
                platform,
                uploader: (metadata.uploader as string) || "Unknown",
              });
            }
          }
        }
      }

      return videos;
    } catch (error) {
      throw new StorageError(
        `Failed to get downloaded videos: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Delete a video file
   */
  async deleteVideo(filePath: string): Promise<void> {
    try {
      await deleteFile(filePath);

      // Also delete metadata file if it exists
      const metadataPath = `${filePath}.json`;
      if (await fileExists(metadataPath)) {
        await deleteFile(metadataPath);
      }
    } catch (error) {
      throw new StorageError(
        `Failed to delete video: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Move file to another location (for organization/transfers)
   */
  async moveVideo(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await RNFS.copyFile(sourcePath, destinationPath);
      await deleteFile(sourcePath);

      // Move metadata if it exists
      const sourceMetadata = `${sourcePath}.json`;
      const destMetadata = `${destinationPath}.json`;
      if (await fileExists(sourceMetadata)) {
        await RNFS.copyFile(sourceMetadata, destMetadata);
        await deleteFile(sourceMetadata);
      }
    } catch (error) {
      throw new StorageError(
        `Failed to move video: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalVideos: number;
    totalSize: number;
  }> {
    try {
      const videos = await this.getAllDownloadedVideos();
      const totalSize = videos.reduce((sum, video) => sum + video.fileSize, 0);

      return {
        totalVideos: videos.length,
        totalSize,
      };
    } catch (error) {
      throw new StorageError(
        `Failed to get storage stats: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Clear old downloads (older than specified days)
   */
  async clearOldDownloads(daysOld: number): Promise<number> {
    try {
      const videos = await this.getAllDownloadedVideos();
      const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const video of videos) {
        if (video.addedDate < cutoffTime) {
          await this.deleteVideo(video.filePath);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      throw new StorageError(
        `Failed to clear old downloads: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();

export default storageService;
