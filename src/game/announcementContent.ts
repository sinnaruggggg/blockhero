const IMAGE_PREFIX = '[[image:';
const IMAGE_SUFFIX = ']]';

export interface ParsedAnnouncementContent {
  content: string;
  imageUrl: string | null;
}

export function parseAnnouncementContent(
  rawContent: string | null | undefined,
  fallbackImageUrl?: string | null,
): ParsedAnnouncementContent {
  const content = rawContent ?? '';
  const normalizedFallback = fallbackImageUrl?.trim() || null;

  if (normalizedFallback) {
    return {
      content,
      imageUrl: normalizedFallback,
    };
  }

  if (!content.startsWith(IMAGE_PREFIX)) {
    return {
      content,
      imageUrl: null,
    };
  }

  const endIndex = content.indexOf(IMAGE_SUFFIX);
  if (endIndex <= IMAGE_PREFIX.length) {
    return {
      content,
      imageUrl: null,
    };
  }

  const imageUrl = content.slice(IMAGE_PREFIX.length, endIndex).trim();
  const body = content.slice(endIndex + IMAGE_SUFFIX.length).replace(/^\s+/, '');

  return {
    content: body,
    imageUrl: imageUrl || null,
  };
}

export function buildAnnouncementContent(
  content: string,
  imageUrl?: string | null,
): string {
  const normalizedContent = content.trim();
  const normalizedImageUrl = imageUrl?.trim() || '';

  if (!normalizedImageUrl) {
    return normalizedContent;
  }

  return `${IMAGE_PREFIX}${normalizedImageUrl}${IMAGE_SUFFIX}\n${normalizedContent}`;
}
