import type { MediaItem } from "@/lib/media";

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type CatalogOption = { id: number; title: string; slug: string };
export type ProductVariantSummary = { id: number; price: string; salePrice: string | null; stockQty: number; lowStockThreshold: number; isDefault: boolean; status: string };
export type ProductListItem = {
  id: number; uuid: string; title: string; slug: string; sku: string | null; mpn: string | null;
  status: ProductStatus; isFeatured: boolean; category: CatalogOption; brand: CatalogOption | null;
  taxRate: { id: number; title: string; ratePercent: string } | null;
  variants: ProductVariantSummary[]; _count: { variants: number }; featuredMedia: MediaItem | null;
  inventory: { stockQty: number; lowStock: boolean; outOfStock: boolean }; createdAt: string; updatedAt: string;
};
export type ProductListMeta = { page: number; perPage: number; total: number; totalPages: number };
