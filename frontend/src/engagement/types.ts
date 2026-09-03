import type { CatalogProduct } from '@/catalog/types';

export type WishlistProduct = CatalogProduct & { savedAt: string };

export type NotificationItem = {
  id: string;
  type: 'order_confirmed' | 'order_status' | 'complaint_update';
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export type PublicReview = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  customerFirstName: string;
  customerLastName: string;
};

export type ReviewEligibility = {
  eligible: boolean;
  review: null | {
    id: string;
    rating: number;
    comment: string;
    status: 'pending' | 'published' | 'rejected';
  };
};

export type ComplaintStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';

export type CustomerComplaint = {
  id: string;
  checkoutOrderId: string;
  orderReference: string;
  subject: string;
  description: string;
  status: ComplaintStatus;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
};
