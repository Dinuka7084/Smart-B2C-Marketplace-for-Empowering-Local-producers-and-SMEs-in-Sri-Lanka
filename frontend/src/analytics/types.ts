export type VendorAnalytics = {
  period: { days: number; from: string; to: string };
  summary: {
    deliveredOrders: number;
    revenueCents: number;
    averageOrderCents: number;
    unitsSold: number;
    currency: string;
  };
  daily: Array<{ date: string; orders: number; revenueCents: number }>;
  orderStatuses: Array<{ status: string; count: number }>;
  topProducts: Array<{
    productId: string | null;
    productName: string;
    units: number;
    revenueCents: number;
  }>;
};
