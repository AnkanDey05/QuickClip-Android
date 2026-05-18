/**
 * Validation and error handling utilities
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractionError";
  }
}

export class DownloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DownloadError";
  }
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

export function validateUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred";
}

export function isNetworkError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return (
    message.includes("network") ||
    message.includes("Network") ||
    message.includes("ENOTFOUND") ||
    message.includes("ECONNREFUSED") ||
    message.includes("timeout")
  );
}

export function isPermissionError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return (
    message.includes("permission") ||
    message.includes("Permission") ||
    message.includes("EACCES")
  );
}

export function isStorageError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return (
    message.includes("storage") ||
    message.includes("Storage") ||
    message.includes("ENOSPC") ||
    message.includes("No space")
  );
}
