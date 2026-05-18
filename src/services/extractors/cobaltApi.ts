import axios from 'axios';
import { VideoInfo, VideoFormat } from '../../types';

// Public community instances (ordered by uptime)
const COBALT_INSTANCES = [
  'https://cobalt-api.meowing.de',
  'https://cobalt-backend.canine.tools',
  'https://capi.3kh0.net',
  'https://downloadapi.stuff.solutions',
];

let currentInstanceIndex = 0;

const getApiUrl = () => COBALT_INSTANCES[currentInstanceIndex];

const rotateInstance = () => {
  currentInstanceIndex = (currentInstanceIndex + 1) % COBALT_INSTANCES.length;
  console.log(`Rotating to Cobalt instance: ${getApiUrl()}`);
};

export const extractVideoInfo = async (url: string): Promise<VideoInfo> => {
  let lastError: Error | null = null;

  // Try each instance until one works
  for (let attempt = 0; attempt < COBALT_INSTANCES.length; attempt++) {
    try {
      const apiUrl = getApiUrl();
      console.log(`Trying Cobalt instance: ${apiUrl}`);

      const response = await axios.post(
        apiUrl,
        {
          url: url,
          videoQuality: '1080',
          youtubeVideoCodec: 'h264',
          audioFormat: 'mp3',
          downloadMode: 'auto',
        },
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const data = response.data;

      if (data.status === 'error') {
        const errorMsg = data.error?.code || 'Unknown error';
        throw new Error(errorMsg);
      }

      const formats: VideoFormat[] = [];

      // Handle tunnel/redirect response — single direct download
      if (data.status === 'tunnel' || data.status === 'redirect') {
        formats.push({
          quality: '1080p (Best)',
          url: data.url,
          hasAudio: true,
          hasVideo: true,
          container: 'mp4',
        });

        // Also try to get other qualities
        const qualities = ['720', '480', '360'];
        for (const q of qualities) {
          try {
            const altResp = await axios.post(
              apiUrl,
              {
                url: url,
                videoQuality: q,
                youtubeVideoCodec: 'h264',
                audioFormat: 'mp3',
                downloadMode: 'auto',
              },
              {
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                },
                timeout: 10000,
              }
            );

            if (altResp.data.url && altResp.data.url !== data.url) {
              formats.push({
                quality: `${q}p`,
                url: altResp.data.url,
                hasAudio: true,
                hasVideo: true,
                container: 'mp4',
              });
            }
          } catch {
            // Skip if quality not available
          }
        }

        // Add audio-only option
        try {
          const audioResp = await axios.post(
            apiUrl,
            {
              url: url,
              downloadMode: 'audio',
              audioFormat: 'mp3',
            },
            {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            }
          );

          if (audioResp.data.url) {
            formats.push({
              quality: 'Audio Only (MP3)',
              url: audioResp.data.url,
              hasAudio: true,
              hasVideo: false,
              container: 'mp3',
            });
          }
        } catch {
          // Audio extraction not available
        }
      }

      // Handle picker response — multiple items (e.g., carousel posts)
      if (data.status === 'picker' && data.picker) {
        data.picker.forEach((item: any, index: number) => {
          formats.push({
            quality: item.type === 'photo' ? `Photo ${index + 1}` : `Video ${index + 1}`,
            url: item.url,
            hasAudio: item.type === 'video',
            hasVideo: item.type !== 'photo' ? true : false,
            container: item.type === 'photo' ? 'jpg' : 'mp4',
          });
        });
      }

      if (formats.length === 0) {
        throw new Error('No downloadable formats found for this URL.');
      }

      return {
        id: Math.random().toString(36).substring(7),
        title: data.filename || 'Downloaded Video',
        thumbnail: data.picker?.[0]?.thumb || `https://via.placeholder.com/480x270/1C1B1F/D0BCFF?text=${detectPlatform(url)}`,
        duration: 0,
        formats: formats,
        platform: detectPlatform(url),
      };
    } catch (error: any) {
      lastError = error;
      console.warn(`Instance ${getApiUrl()} failed:`, error.message);
      rotateInstance();
    }
  }

  throw new Error(
    lastError?.message || 'All Cobalt instances failed. Please try again later.'
  );
};

const detectPlatform = (url: string): string => {
  if (/youtu\.?be/.test(url)) return 'youtube';
  if (/instagram\.com/.test(url)) return 'instagram';
  if (/facebook\.com/.test(url)) return 'facebook';
  if (/tiktok\.com/.test(url)) return 'tiktok';
  if (/twitter\.com/.test(url) || /x\.com/.test(url)) return 'twitter';
  if (/reddit\.com/.test(url)) return 'reddit';
  if (/pinterest\.com/.test(url)) return 'pinterest';
  return 'unknown';
};
