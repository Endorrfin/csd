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

// CHANGED: i18n key for a post category; null for values outside the known set (shown raw)
const CATEGORY_KEYS: Record<string, string> = {
  news: 'BLOG.CATEGORIES.NEWS',
  story: 'BLOG.CATEGORIES.STORY',
  update: 'BLOG.CATEGORIES.UPDATE',
};

export function categoryKey(category: string | null | undefined): string | null {
  return (category && CATEGORY_KEYS[category.toLowerCase()]) || null;
}
