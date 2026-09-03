import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Leaf, PackageCheck, ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from 'react-router';

import type { Cart } from '@/cart/types';
import { formatPrice } from '@/catalog/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { apiRequest } from '@/lib/api';

export function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<{ cart: Cart }>('/cart')
      .then((data) => active && setCart(data.cart))
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load your cart.');
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const updateQuantity = async (productId: string, quantity: number) => {
    setUpdatingId(productId); setError(null);
    try {
      const data = await apiRequest<{ cart: Cart }>(`/cart/items/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      setCart(data.cart);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Quantity could not be updated.');
    } finally { setUpdatingId(null); }
  };

  const removeItem = async (productId: string) => {
    setUpdatingId(productId); setError(null);
    try {
      const data = await apiRequest<{ cart: Cart }>(`/cart/items/${productId}`, { method: 'DELETE' });
      setCart(data.cart);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Item could not be removed.');
    } finally { setUpdatingId(null); }
  };

  return (
    <main className="min-h-screen bg-muted/35">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-5 lg:px-8">
          <Link to="/" className="flex items-center gap-3 font-extrabold tracking-[-0.03em]"><span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground"><Leaf className="size-5" /></span>Smart Lanka</Link>
          <Button className="ml-auto" variant="outline" render={<Link to="/account" />}>My account</Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
        <Button variant="ghost" render={<Link to="/products" />}><ArrowLeft /> Continue shopping</Button>
        <div className="mt-5"><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Your basket</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-0.045em]">Shopping cart</h1></div>

        {error && <Alert variant="destructive" className="mt-6"><AlertCircle /><AlertTitle>Cart could not be updated</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

        {loading ? (
          <div className="mt-6 flex min-h-80 items-center justify-center gap-3 rounded-3xl border bg-card text-muted-foreground"><Spinner /> Loading your cart…</div>
        ) : !cart?.items.length ? (
          <div className="mt-6 grid min-h-80 place-items-center rounded-3xl border border-dashed bg-card p-8 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><ShoppingBag className="size-7" /></span><h2 className="mt-5 text-xl font-extrabold">Your cart is empty</h2><p className="mt-2 text-muted-foreground">Add a local product to start your order.</p><Button className="mt-6" render={<Link to="/products" />}>Browse products</Button></div></div>
        ) : (
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
            <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
              {cart.items.map((item) => (
                <article key={item.productId} className="grid gap-5 border-b p-5 last:border-b-0 sm:grid-cols-[7rem_1fr_auto] sm:p-6">
                  <Link to={`/products/${item.slug}`} className="aspect-square overflow-hidden rounded-2xl bg-accent">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-2xl font-black text-primary/40">{item.name.slice(0, 2).toUpperCase()}</span>}
                  </Link>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{item.vendorName}</p>
                    <h2 className="mt-1 text-lg font-extrabold"><Link to={`/products/${item.slug}`} className="hover:text-primary">{item.name}</Link></h2>
                    <p className="mt-2 font-bold text-primary">{formatPrice(item.unitPriceCents, item.currency)}</p>
                    {!item.isAvailable && <p className="mt-2 text-sm font-semibold text-destructive">Only {item.availableQuantity} currently available. Reduce the quantity before checkout.</p>}
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-sm font-semibold">Quantity
                        <NativeSelect value={String(item.quantity)} disabled={updatingId === item.productId || item.availableQuantity < 1} onChange={(event) => void updateQuantity(item.productId, Number(event.target.value))}>
                          {Array.from({ length: Math.min(100, Math.max(item.availableQuantity, item.quantity)) }, (_, index) => index + 1).map((quantity) => <NativeSelectOption key={quantity} value={quantity}>{quantity}</NativeSelectOption>)}
                        </NativeSelect>
                      </label>
                      {updatingId === item.productId && <Spinner />}
                      <AlertDialog>
                        <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}><Trash2 /> Remove</AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Remove this product?</AlertDialogTitle><AlertDialogDescription>{item.name} will be removed from your cart.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Keep item</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => void removeItem(item.productId)}>Remove</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <p className="font-extrabold sm:text-right">{formatPrice(item.lineTotalCents, item.currency)}</p>
                </article>
              ))}
            </section>

            <aside className="rounded-3xl border bg-card p-6 shadow-sm lg:sticky lg:top-6">
              <h2 className="text-xl font-extrabold">Order summary</h2>
              <dl className="mt-6 grid gap-4 border-b pb-5 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Items</dt><dd>{cart.itemCount}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Delivery</dt><dd>Calculated at checkout</dd></div></dl>
              <div className="mt-5 flex items-baseline justify-between gap-4"><span className="font-bold">Subtotal</span><strong className="text-2xl text-primary">{formatPrice(cart.subtotalCents, cart.currency)}</strong></div>
              {cart.canCheckout && <p className="mt-4 flex items-center gap-2 text-sm text-primary"><PackageCheck className="size-4" /> Stock checked and available</p>}
              <Button className="mt-6 w-full" size="lg" disabled>Simulated checkout comes next</Button>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
