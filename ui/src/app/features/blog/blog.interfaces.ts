// ui/src/app/features/blog/blog.interfaces.ts
// === ADDED: shared BlogPost shape to replace `any` across blog feature ===
export interface BlogPost {
  id: string;
  slug: string;
  titleUa: string;
  titleEn: string;
  excerptUa?: string;
  excerptEn?: string;
  contentUa: string;
  contentEn: string;
  category?: string;
  images?: string[];
  coverImage?: string;
  videoUrl?: string;
  publishedAt?: string | null;
  createdAt: string;
  isFeatured?: boolean;
}
