export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  category: { name: string; slug: string };
  vendor: { businessName: string; storeSlug: string };
  availableQuantity: number;
  publishedAt: string | null;
};

export type VendorProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  priceCents: number;
  currency: string;
  status: 'draft' | 'published' | 'archived';
  imageUrl: string | null;
  categoryId: string;
  categoryName: string;
  availableQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  updatedAt: string;
};

export const formatPrice = (priceCents: number, currency = 'LKR') =>
  new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(priceCents / 100);
