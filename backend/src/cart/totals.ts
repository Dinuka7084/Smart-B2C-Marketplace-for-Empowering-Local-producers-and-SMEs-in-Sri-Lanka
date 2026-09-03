type CartTotalItem = {
  quantity: number;
  lineTotalCents: number;
  isAvailable: boolean;
};

export const calculateCartTotals = (items: CartTotalItem[]) => ({
  itemCount: items.reduce((total, item) => total + item.quantity, 0),
  subtotalCents: items.reduce(
    (total, item) => total + item.lineTotalCents,
    0,
  ),
  canCheckout: items.length > 0 && items.every((item) => item.isAvailable),
});
