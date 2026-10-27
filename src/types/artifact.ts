export interface ArtifactItem {
  id: string;
  title: string;
  description: string;
  tags: string[];
  link?: string | null;
  showLiveLink?: boolean;
  date?: string | null;
  showDate?: boolean;
  order?: number | null;
  featured?: boolean;
  hidden?: boolean;
  previewImage?: string;
  metrics?: string;
  mediaType?: 'image' | 'video' | 'document';
  videoUrl?: string;
  galleryImages?: string[];
  body?: string;
}
