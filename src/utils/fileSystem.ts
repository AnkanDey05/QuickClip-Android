/**
 * File system utilities
 */

import RNFS from "react-native-fs";
import { Platform } from "react-native";
import { StorageError } from "./errorHandler";

// Download directory for videos
export const DOWNLOAD_DIR = `${RNFS.DocumentDirectoryPath}/DownloaderApp`;
export const MOVIES_DIR = `${RNFS.DocumentDirectoryPath}/Movies/DownloaderApp`;

// Using DocumentDirectory for all files as it's more reliable across Android versions
export const STORAGE_DIR = DOWNLOAD_DIR;

export async function ensureDownloadDirectory(): Promise<void> {
  try {
    const exists = await RNFS.exists(STORAGE_DIR);
    if (!exists) {
      await RNFS.mkdir(STORAGE_DIR, { NSURLIsExcludedFromBackupKey: true });
    }
  } catch (error) {
    throw new StorageError(
      `Failed to create download directory: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function getPlatformDirectory(platform: string): Promise<string> {
  const dir = `${STORAGE_DIR}/${platform}`;
  try {
    const exists = await RNFS.exists(dir);
    if (!exists) {
      await RNFS.mkdir(dir);
    }
  } catch (error) {
    throw new StorageError(
      `Failed to create platform directory: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
  return dir;
}

export async function getFileSize(filePath: string): Promise<number> {
  try {
    const exists = await RNFS.exists(filePath);
    if (!exists) {
      return 0;
    }

    const stat = await RNFS.stat(filePath);
    return stat.size;
  } catch (error) {
    throw new StorageError(
      `Failed to get file size: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    const exists = await RNFS.exists(filePath);
    if (exists) {
      await RNFS.unlink(filePath);
    }
  } catch (error) {
    throw new StorageError(
      `Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    return await RNFS.exists(filePath);
  } catch {
    return false;
  }
}

export async function readDirectory(dirPath: string): Promise<string[]> {
  try {
    return await RNFS.readDir(dirPath);
  } catch (error) {
    throw new StorageError(
      `Failed to read directory: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function getAvailableSpace(): Promise<number> {
  try {
    const info = await RNFS.getAllExternalFilesDirs();
    // For now, return a large number as we don't have direct space check
    // In production, use a library like react-native-device-info for this
    return 1024 * 1024 * 1024; // 1GB default
  } catch {
    return 1024 * 1024 * 1024; // 1GB default on error
  }
}

export async function moveFile(
  sourcePath: string,
  destinationPath: string
): Promise<void> {
  try {
    await RNFS.copyFile(sourcePath, destinationPath);
    await RNFS.unlink(sourcePath);
  } catch (error) {
    throw new StorageError(
      `Failed to move file: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
