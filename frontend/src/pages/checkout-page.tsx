import { useEffect, useState, type SyntheticEvent } from 'react';
import { ArrowLeft, CheckCircle2, CreditCard, MapPin, PackageCheck } from 'lucide-react';
import { Link } from 'react-router';

import type { Cart } from '@/cart/types';
import { formatPrice } from '@/catalog/types';
import type { Address, OrderSummary } from '@/checkout/types';
import { BrandMark } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { apiRequest } from '@/lib/api';

const districts = ['Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'];
const deliveryFeeCents = 35_000;

type AddressForm = {
  label: string; recipientName: string; phone: string; line1: string;
  line2: string; city: string; district: string; postalCode: string;
};

const emptyAddress: AddressForm = { label: 'Home', recipientName: '', phone: '', line1: '', line2: '', city: '', district: 'Colombo', postalCode: '' };

export function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddress);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest<{ cart: Cart }>('/cart'),
      apiRequest<{ addresses: Address[] }>('/addresses'),
    ]).then(([cartData, addressData]) => {
      if (!active) return;
      setCart(cartData.cart);
      setAddresses(addressData.addresses);
      const preferred = addressData.addresses.find((address) => address.isDefault) ?? addressData.addresses[0];
      setSelectedAddressId(preferred?.id ?? '');
      setShowAddressForm(addressData.addresses.length === 0);
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof Error ? caught.message : 'Checkout could not be loaded.');
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const setAddressField = <K extends keyof AddressForm>(field: K, value: AddressForm[K]) => setAddressForm((current) => ({ ...current, [field]: value }));

  const saveAddress = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault(); setSavingAddress(true); setError(null);
    try {
      const data = await apiRequest<{ address: Address }>('/addresses', {
        method: 'POST',
        body: JSON.stringify({ ...addressForm, isDefault: addresses.length === 0 }),
      });
      setAddresses((current) => [data.address, ...current]);
      setSelectedAddressId(data.address.id);
      setAddressForm(emptyAddress);
      setShowAddressForm(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Address could not be saved.');
    } finally { setSavingAddress(false); }
  };

  const placeOrder = async () => {
    if (!selectedAddressId) { setError('Choose or add a delivery address.'); return; }
    setPlacingOrder(true); setError(null);
    try {
      const data = await apiRequest<{ order: OrderSummary }>('/checkout', {
        method: 'POST',
        body: JSON.stringify({ addressId: selectedAddressId, paymentMethod: 'simulated', idempotencyKey }),
      });
      setOrder(data.order);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your order could not be placed.');
      setIdempotencyKey(crypto.randomUUID());
    } finally { setPlacingOrder(false); }
  };

  if (order) {
    return (
      <main id="main-content" tabIndex={-1} className="grid min-h-screen place-items-center bg-muted/35 px-5 py-10 outline-none">
        <section className="w-full max-w-2xl rounded-3xl border bg-card p-8 text-center shadow-sm sm:p-12">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary"><CheckCircle2 className="size-9" /></span>
          <Badge className="mt-6" variant="outline">Payment successful</Badge>
          <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.045em]">Order confirmed</h1>
          <p className="mt-3 text-muted-foreground">Reference <strong className="text-foreground">{order.reference}</strong></p>
          <p className="mt-5 text-3xl font-extrabold text-primary">{formatPrice(order.totalCents, order.currency)}</p>
          <p className="mx-auto mt-4 max-w-lg leading-7 text-muted-foreground">Your simulated payment is complete. {order.vendors.length} vendor {order.vendors.length === 1 ? 'order has' : 'orders have'} been created for fulfilment.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3"><Button render={<Link to="/account/orders" />}>View orders</Button><Button variant="outline" render={<Link to="/products" />}>Continue shopping</Button></div>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-muted/35 outline-none">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-20 max-w-7xl items-center px-5 lg:px-8">
          <Link to="/" aria-label="Smart Lanka home">
            <BrandMark markClassName="size-10" textClassName="tracking-[-0.03em]" />
          </Link>
          <div className="ml-auto">
            <ThemeToggle className="size-10 rounded-full" />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
        <Button variant="ghost" render={<Link to="/cart" />}><ArrowLeft /> Back to cart</Button>
        <div className="mt-5"><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Secure academic flow</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-0.045em]">Checkout</h1></div>
        {error && <Alert variant="destructive" className="mt-6"><AlertTitle>Checkout needs attention</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        {loading ? <div className="mt-6 flex min-h-80 items-center justify-center gap-3 rounded-3xl border bg-card text-muted-foreground"><Spinner /> Loading checkout…</div> : !cart?.items.length ? <div className="mt-6 grid min-h-80 place-items-center rounded-3xl border border-dashed bg-card p-8 text-center"><div><h2 className="text-xl font-extrabold">Your cart is empty</h2><Button className="mt-5" render={<Link to="/products" />}>Browse products</Button></div></div> : (
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
            <div className="grid gap-6">
              <section className="rounded-3xl border bg-card p-6 shadow-sm"><div className="flex items-center justify-between gap-4"><div><h2 className="flex items-center gap-2 text-xl font-extrabold"><MapPin className="size-5 text-primary" /> Delivery address</h2><p className="mt-1 text-sm text-muted-foreground">Choose where this order should be delivered.</p></div>{addresses.length > 0 && <Button variant="outline" onClick={() => setShowAddressForm((current) => !current)}>{showAddressForm ? 'Cancel' : 'Add address'}</Button>}</div>
                {addresses.length > 0 && <div className="mt-5 grid gap-3 sm:grid-cols-2">{addresses.map((address) => <label key={address.id} aria-label={`Deliver to ${address.label}: ${address.line1}, ${address.city}`} className={`cursor-pointer rounded-2xl border p-4 transition ${selectedAddressId === address.id ? 'border-primary bg-primary/5 ring-2 ring-primary/15' : 'hover:border-primary/40'}`}><div className="flex items-start gap-3"><input type="radio" name="address" value={address.id} checked={selectedAddressId === address.id} onChange={() => setSelectedAddressId(address.id)} className="mt-1 accent-primary" /><span><strong>{address.label}</strong>{address.isDefault && <Badge variant="outline" className="ml-2">Default</Badge>}<span className="mt-2 block text-sm leading-6 text-muted-foreground">{address.recipientName}<br />{address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />{address.city}, {address.district}{address.postalCode ? ` ${address.postalCode}` : ''}<br />{address.phone}</span></span></div></label>)}</div>}
                {showAddressForm && <form onSubmit={saveAddress} className="mt-6 grid gap-4 border-t pt-6 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="address-label">Label</Label><Input id="address-label" required value={addressForm.label} onChange={(e) => setAddressField('label', e.target.value)} /></div><div className="grid gap-2"><Label htmlFor="recipient">Recipient name</Label><Input id="recipient" required minLength={3} value={addressForm.recipientName} onChange={(e) => setAddressField('recipientName', e.target.value)} /></div><div className="grid gap-2"><Label htmlFor="address-phone">Phone</Label><Input id="address-phone" required type="tel" value={addressForm.phone} onChange={(e) => setAddressField('phone', e.target.value)} /></div><div className="grid gap-2"><Label htmlFor="line1">Address line 1</Label><Input id="line1" required minLength={5} value={addressForm.line1} onChange={(e) => setAddressField('line1', e.target.value)} /></div><div className="grid gap-2"><Label htmlFor="line2">Address line 2</Label><Input id="line2" value={addressForm.line2} onChange={(e) => setAddressField('line2', e.target.value)} /></div><div className="grid gap-2"><Label htmlFor="city">City</Label><Input id="city" required value={addressForm.city} onChange={(e) => setAddressField('city', e.target.value)} /></div><div className="grid gap-2"><Label htmlFor="district">District</Label><NativeSelect id="district" className="w-full" value={addressForm.district} onChange={(e) => setAddressField('district', e.target.value)}>{districts.map((district) => <NativeSelectOption key={district} value={district}>{district}</NativeSelectOption>)}</NativeSelect></div><div className="grid gap-2"><Label htmlFor="postal-code">Postal code</Label><Input id="postal-code" value={addressForm.postalCode} onChange={(e) => setAddressField('postalCode', e.target.value)} /></div><div className="sm:col-span-2"><Button type="submit" disabled={savingAddress}>{savingAddress ? <Spinner /> : <MapPin />} Save address</Button></div></form>}
              </section>
              <section className="rounded-3xl border bg-card p-6 shadow-sm"><h2 className="flex items-center gap-2 text-xl font-extrabold"><CreditCard className="size-5 text-primary" /> Payment</h2><div className="mt-5 rounded-2xl border border-primary bg-primary/5 p-5"><div className="flex items-start gap-3"><input type="radio" aria-label="Simulated academic payment" checked readOnly className="mt-1 accent-primary" /><div><strong>Simulated academic payment</strong><p className="mt-1 text-sm leading-6 text-muted-foreground">No real card or money is used. A successful payment record is created for demonstrating the complete ordering workflow.</p></div></div></div></section>
            </div>
            <aside className="rounded-3xl border bg-card p-6 shadow-sm lg:sticky lg:top-6"><h2 className="text-xl font-extrabold">Order summary</h2><div className="mt-5 grid gap-3">{cart.items.map((item) => <div key={item.productId} className="flex justify-between gap-4 text-sm"><span className="text-muted-foreground">{item.name} × {item.quantity}</span><span>{formatPrice(item.lineTotalCents, item.currency)}</span></div>)}</div><dl className="mt-5 grid gap-3 border-t pt-5 text-sm"><div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatPrice(cart.subtotalCents, cart.currency)}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd>{formatPrice(deliveryFeeCents, cart.currency)}</dd></div><div className="flex justify-between border-t pt-4 text-base font-extrabold"><dt>Total</dt><dd className="text-primary">{formatPrice(cart.subtotalCents + deliveryFeeCents, cart.currency)}</dd></div></dl><Button className="mt-6 w-full" size="lg" disabled={placingOrder || !selectedAddressId || !cart.canCheckout} onClick={() => void placeOrder()}>{placingOrder ? <Spinner /> : <PackageCheck />} Place simulated order</Button><p className="mt-3 text-center text-xs leading-5 text-muted-foreground">Stock is checked again atomically before confirmation.</p></aside>
          </div>
        )}
      </div>
    </main>
  );
}
