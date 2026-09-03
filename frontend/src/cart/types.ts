export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  unitPriceCents: number;
  currency: string;
  quantity: number;
  availableQuantity: number;
  vendorName: string;
  isAvailable: boolean;
  lineTotalCents: number;
};

export type Cart = {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  currency: string;
  canCheckout: boolean;
};
