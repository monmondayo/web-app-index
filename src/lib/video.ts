const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Extract a video ID only from supported YouTube URL formats. */
export function getYouTubeVideoId(value?: string | null): string | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    let videoId: string | null = null;

    if (hostname === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] || null;
    } else if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(hostname)) {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v');
      } else {
        videoId = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1] || null;
      }
    }

    return videoId && YOUTUBE_VIDEO_ID.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

export function normalizeYouTubeUrl(value?: string | null): string | null {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

export function getYouTubeEmbedUrl(value?: string | null): string | null {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0` : null;
}
