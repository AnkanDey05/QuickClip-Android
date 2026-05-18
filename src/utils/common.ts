/**
 * Common utility functions
 */

export function generateId(): string {
  // RN-safe unique ID (no crypto.randomUUID needed)
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function formatSpeed(mbps: number): string {
  if (mbps < 1) {
    return `${(mbps * 1024).toFixed(0)} KB/s`;
  }
  return `${mbps.toFixed(1)} MB/s`;
}

export function calculateETA(
  bytesRemaining: number,
  speedMBps: number
): number {
  if (speedMBps === 0) return 0;
  const bytes = bytesRemaining;
  const bytesPerSecond = speedMBps * 1024 * 1024;
  return Math.ceil(bytes / bytesPerSecond);
}

export function sanitizeFilename(filename: string): string {
  // Remove invalid characters and trim
  return filename
    .replace(/[<>:"/\\|?*]/g, "_") // Replace invalid characters
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/_{2,}/g, "_") // Replace multiple underscores with single
    .slice(0, 200); // Limit length
}

export function getFileExtension(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const lastDot = pathname.lastIndexOf(".");
    if (lastDot > -1) {
      return pathname.substring(lastDot + 1).split("?")[0];
    }
  } catch (e) {
    // ignore
  }
  return "mp4"; // default extension
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
