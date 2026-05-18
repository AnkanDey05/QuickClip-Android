/**
 * Instagram video extractor (fallback implementation)
 * Note: This is a basic implementation. Instagram has anti-scraping measures.
 */

import { VideoExtractor, VideoInfo } from "../../types";
import { ExtractionError } from "../../utils/errorHandler";

export class InstagramExtractor implements VideoExtractor {
  canHandle(url: string): boolean {
    return /instagram\.com|insta\.?gram/.test(url.toLowerCase());
  }

  async extract(url: string): Promise<VideoInfo> {
    try {
      // Extract post ID
      const postId = this.extractPostId(url);
      if (!postId) {
        throw new ExtractionError(
          "Could not extract post ID from Instagram URL"
        );
      }

      // In a real implementation, this would fetch from Instagram's API or use a proxy service
      // Instagram has strong anti-scraping measures, so yt-dlp is recommended for production
      return {
        id: postId,
        title: "Instagram Post",
        thumbnail: `https://www.instagram.com/p/${postId}/media/?size=l`,
        duration: 0,
        formats: [
          {
            id: "best",
            quality: "Best",
            url: url,
            hasAudio: true,
            hasVideo: true,
          },
        ],
        platform: "instagram",
        url: url,
        uploader: "Unknown",
      };
    } catch (error) {
      throw new ExtractionError(
        `Failed to extract Instagram video: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private extractPostId(url: string): string | null {
    const patterns = [
      /\/p\/([a-zA-Z0-9_-]+)\//,
      /\/reel\/([a-zA-Z0-9_-]+)\//,
      /\/tv\/([a-zA-Z0-9_-]+)\//,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }
}
