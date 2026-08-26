/**
 * Image URL normalization and Google Photos / Google Drive handler
 */

export const normalizeImageUrl = (url: string | undefined | null): string => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // If already base64 or blob
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Check if it's a Google Drive link
  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com/file')) {
    let fileId = '';
    const matchD = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchD && matchD[1]) {
      fileId = matchD[1];
    } else if (matchId && matchId[1]) {
      fileId = matchId[1];
    }

    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  // If already a direct lh3.googleusercontent.com or drive thumbnail
  if (trimmed.includes('lh3.googleusercontent.com') || trimmed.includes('googleusercontent.com/d/')) {
    return trimmed;
  }

  return trimmed;
};

/**
 * Checks if the user pasted a Google Photos web sharing album/page link (which is an HTML page, not a direct image URL)
 */
export const isGooglePhotosSharePage = (url: string | undefined | null): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  return (
    trimmed.includes('photos.app.goo.gl') ||
    trimmed.includes('photos.google.com/share') ||
    trimmed.includes('photos.google.com/album') ||
    trimmed.includes('photos.google.com/u/') ||
    trimmed.includes('photos.google.com/photo')
  );
};
