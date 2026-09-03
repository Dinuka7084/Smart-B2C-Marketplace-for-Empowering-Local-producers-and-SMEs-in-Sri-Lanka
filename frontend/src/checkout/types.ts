export type Address = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  district: string;
  postalCode: string | null;
  isDefault: boolean;
};

export type OrderListItem = {
  id: string;
  reference: string;
  status: 'confirmed' | 'cancelled';
  totalCents: number;
  currency: string;
  createdAt: string;
};

export type OrderItem = {
  id: string;
  vendorOrderId: string;
  productId: string | null;
  productName: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
};

export type FulfilmentStatus =
  | 'placed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type OrderStatusEvent = {
  id: string;
  vendorOrderId: string;
  previousStatus: FulfilmentStatus | null;
  nextStatus: FulfilmentStatus;
  note: string | null;
  createdAt: string;
};

export type VendorFulfilmentOrder = {
  id: string;
  reference: string;
  status: FulfilmentStatus;
  subtotalCents: number;
  currency: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  district: string;
  postalCode: string | null;
  createdAt: string;
  updatedAt: string;
  allowedNextStatuses: FulfilmentStatus[];
  items: OrderItem[];
};

export type OrderSummary = OrderListItem & {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  district: string;
  postalCode: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  vendors: Array<{
    id: string;
    status: FulfilmentStatus;
    subtotalCents: number;
    vendorName: string;
    items: OrderItem[];
    history: OrderStatusEvent[];
  }>;
};
