/**
 * yt-dlp extractor - primary extractor supporting 1000+ platforms
 * Requires native module integration for executing yt-dlp binary
 */

import { VideoExtractor, VideoInfo, VideoFormat } from "../../types";
import { ExtractionError } from "../../utils/errorHandler";

export class YtDlpExtractor implements VideoExtractor {
  canHandle(url: string): boolean {
    // yt-dlp can handle almost any URL
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  async extract(url: string): Promise<VideoInfo> {
    try {
      // TODO: Integrate with native yt-dlp module when available
      // For now, throw error indicating this needs native setup
      throw new ExtractionError(
        "Could not extract video info. Make sure the URL is supported by yt-dlp and try again."
      );

      // Expected implementation when native module is ready:
      // const jsonOutput = await this.executeYtDlp(url);
      // return this.parseYtDlpOutput(jsonOutput);
    } catch (error) {
      throw new ExtractionError(
        `Failed to extract with yt-dlp: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Execute yt-dlp binary and get JSON output
   * This will be implemented when native module is set up
   */
  private async executeYtDlp(url: string): Promise<string> {
    // TODO: Call native module to execute:
    // yt-dlp --dump-json --no-warnings {url}
    throw new Error("Native yt-dlp module not configured");
  }

  /**
   * Parse yt-dlp JSON output into VideoInfo format
   */
  private parseYtDlpOutput(jsonOutput: string): VideoInfo {
    const data = JSON.parse(jsonOutput);

    const formats: VideoFormat[] = (data.formats || [])
      .filter(
        (f: Record<string, unknown>) =>
          f.vcodec !== "none" || f.acodec !== "none"
      )
      .slice(0, 10) // Limit to top 10 formats
      .map((f: Record<string, unknown>, index: number) => ({
        id: `format_${index}`,
        quality: `${f.height || "audio"}p`,
        url: f.url as string,
        filesize: f.filesize as number | undefined,
        hasAudio: f.acodec !== "none",
        hasVideo: f.vcodec !== "none",
        codec: f.vcodec as string | undefined,
        fps: f.fps as number | undefined,
        audioCodec: f.acodec as string | undefined,
        bitrate: f.tbr as number | undefined,
      }));

    return {
      id: data.id as string,
      title: (data.title as string) || "Unknown",
      thumbnail: (data.thumbnail as string) || "",
      duration: (data.duration as number) || 0,
      formats,
      platform: this.detectPlatform(data.extractor as string),
      url: data.webpage_url as string,
      uploader: (data.uploader as string) || "Unknown",
      uploadDate: data.upload_date as string | undefined,
      viewCount: data.view_count as number | undefined,
    };
  }

  private detectPlatform(extractor: string): string {
    const platform = extractor?.toLowerCase() || "generic";
    if (platform.includes("youtube")) return "youtube";
    if (platform.includes("instagram")) return "instagram";
    if (platform.includes("facebook")) return "facebook";
    if (platform.includes("tiktok")) return "tiktok";
    if (platform.includes("twitter") || platform.includes("x.com"))
      return "twitter";
    return platform;
  }
}
