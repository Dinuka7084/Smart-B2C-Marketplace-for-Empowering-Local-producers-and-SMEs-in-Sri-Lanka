import type { CatalogProduct } from '@/catalog/types';

export type WishlistProduct = CatalogProduct & { savedAt: string };

export type NotificationItem = {
  id: string;
  type: 'order_confirmed' | 'order_status';
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};
