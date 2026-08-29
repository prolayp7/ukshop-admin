export type MediaMetadata = {
  originalName?: string;
  mimeType?: string;
  size?: number;
};

export type MediaItem = {
  id: number;
  uuid: string;
  ownerType: string;
  ownerId: number;
  collection: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  metadata: MediaMetadata | null;
  createdAt: string;
};

export type MediaMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  collections: string[];
  ownerTypes: string[];
};

export function mediaFileUrl(path: string) {
  return `/api/media/file?path=${encodeURIComponent(path)}`;
}

export function formatFileSize(bytes?: number) {
  if (!bytes || bytes < 1) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
