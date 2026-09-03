export type InventoryProduct = {
  productId: string;
  name: string;
  sku: string;
  status: 'draft' | 'published' | 'archived';
  imageUrl: string | null;
  availableQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  updatedAt: string;
};

export type InventoryMovement = {
  id: string;
  productId: string;
  productName: string;
  type: 'initial' | 'restock' | 'adjustment' | 'sale';
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  note: string | null;
  createdAt: string;
};

export type VendorMetrics = {
  publishedProducts: number;
  ordersToFulfil: number;
  lowStock: number;
  deliveredRevenueCents: number;
  currency: string;
};
