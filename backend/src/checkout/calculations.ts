export const SIMULATED_DELIVERY_FEE_CENTS = 35_000;

type CheckoutLine = {
  vendorId: string;
  unitPriceCents: number;
  quantity: number;
};

export const calculateCheckout = (lines: CheckoutLine[]) => {
  const vendorSubtotals = new Map<string, number>();
  for (const line of lines) {
    const lineTotal = line.unitPriceCents * line.quantity;
    vendorSubtotals.set(
      line.vendorId,
      (vendorSubtotals.get(line.vendorId) ?? 0) + lineTotal,
    );
  }
  const subtotalCents = [...vendorSubtotals.values()].reduce(
    (total, subtotal) => total + subtotal,
    0,
  );
  const deliveryFeeCents = lines.length > 0 ? SIMULATED_DELIVERY_FEE_CENTS : 0;

  return {
    vendorSubtotals,
    subtotalCents,
    deliveryFeeCents,
    totalCents: subtotalCents + deliveryFeeCents,
  };
};
