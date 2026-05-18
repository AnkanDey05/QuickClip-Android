/**
 * Extractor registry and factory
 * Manages multiple extractors and selects the appropriate one
 */

import { VideoExtractor, VideoInfo } from "../../types";
import { ExtractionError } from "../../utils/errorHandler";
import { YtDlpExtractor } from "./YtDlpExtractor";
import { YouTubeExtractor } from "./YouTubeExtractor";
import { InstagramExtractor } from "./InstagramExtractor";
import { FacebookExtractor } from "./FacebookExtractor";

class ExtractorRegistry {
  private extractors: VideoExtractor[] = [];

  constructor() {
    // Order matters - try yt-dlp first (if configured), then specific extractors as fallbacks
    this.extractors = [
      new YtDlpExtractor(),
      new YouTubeExtractor(),
      new InstagramExtractor(),
      new FacebookExtractor(),
    ];
  }

  /**
   * Find the appropriate extractor for a URL
   */
  private findExtractor(url: string): VideoExtractor | null {
    for (const extractor of this.extractors) {
      try {
        if (extractor.canHandle(url)) {
          return extractor;
        }
      } catch (error) {
        // Skip extractors that throw errors during canHandle check
        continue;
      }
    }
    return null;
  }

  /**
   * Extract video information from URL
   * Tries extractors in order, falls back to next on error
   */
  async extract(url: string): Promise<VideoInfo> {
    const errors: Error[] = [];

    for (const extractor of this.extractors) {
      try {
        if (extractor.canHandle(url)) {
          return await extractor.extract(url);
        }
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
        // Try next extractor
        continue;
      }
    }

    // If we get here, no extractor worked
    const errorMessages = errors.map((e) => e.message).join("; ");
    throw new ExtractionError(
      `Could not extract video information. Tried extractors but all failed: ${errorMessages}`
    );
  }

  /**
   * Get all available extractors
   */
  getExtractors(): VideoExtractor[] {
    return [...this.extractors];
  }

  /**
   * Add a new extractor to the registry
   */
  addExtractor(extractor: VideoExtractor, priority = false): void {
    if (priority) {
      this.extractors.unshift(extractor);
    } else {
      this.extractors.push(extractor);
    }
  }

  /**
   * Remove an extractor from the registry
   */
  removeExtractor(extractorType: Function): void {
    this.extractors = this.extractors.filter(
      (e) => !(e instanceof extractorType)
    );
  }
}

// Export singleton instance
export const extractorRegistry = new ExtractorRegistry();

/**
 * Helper function to extract video info
 */
export async function extractVideoInfo(url: string): Promise<VideoInfo> {
  return extractorRegistry.extract(url);
}

export default extractorRegistry;
