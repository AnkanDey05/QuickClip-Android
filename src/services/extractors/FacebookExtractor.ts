/**
 * Facebook video extractor (fallback implementation)
 */

import { VideoExtractor, VideoInfo } from "../../types";
import { ExtractionError } from "../../utils/errorHandler";

export class FacebookExtractor implements VideoExtractor {
  canHandle(url: string): boolean {
    return /facebook\.com|fb\.watch/.test(url.toLowerCase());
  }

  async extract(url: string): Promise<VideoInfo> {
    try {
      // Extract video ID from URL
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new ExtractionError(
          "Could not extract video ID from Facebook URL"
        );
      }

      // In a real implementation, this would fetch from Facebook's API or Graph API
      return {
        id: videoId,
        title: "Facebook Video",
        thumbnail: "",
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
        platform: "facebook",
        url: url,
        uploader: "Unknown",
      };
    } catch (error) {
      throw new ExtractionError(
        `Failed to extract Facebook video: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private extractVideoId(url: string): string | null {
    // Facebook watch URL
    if (url.includes("fb.watch")) {
      const match = url.match(/fb\.watch\/([a-zA-Z0-9]+)/);
      return match ? match[1] : null;
    }

    // Facebook video URL pattern
    const patterns = [
      /\/video\.php\?v=([0-9]+)/,
      /\/videos\/([0-9]+)/,
      /\/watch\/\?v=([0-9]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Fallback: use entire URL as ID
    return url.substring(url.lastIndexOf("/") + 1, url.length).split("?")[0];
  }
}
