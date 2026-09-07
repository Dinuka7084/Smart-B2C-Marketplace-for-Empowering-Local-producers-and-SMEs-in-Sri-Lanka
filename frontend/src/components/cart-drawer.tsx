import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, PackageOpen, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router';

import { useAuth } from '@/auth/auth-context';
import type { Cart } from '@/cart/types';
import { formatPrice } from '@/catalog/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { apiRequest } from '@/lib/api';
import { cn } from '@/lib/utils';

const CART_UPDATED_EVENT = 'smart-lanka:cart-updated';

export const notifyCartUpdated = () => {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
};

export function CartDrawer({ className }: { className?: string }) {
  const { user, status } = useAuth();
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    if (user?.role !== 'customer') return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ cart: Cart }>('/cart');
      setCart(data.cart);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your cart.');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    const refresh = () => void fetchCart();
    window.addEventListener(CART_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CART_UPDATED_EVENT, refresh);
  }, [fetchCart]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && user?.role === 'customer') void fetchCart();
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            className={cn('relative rounded-full', className)}
            aria-label={cart?.itemCount ? `Open cart with ${cart.itemCount} items` : 'Open shopping cart'}
          />
        }
      >
        <ShoppingBag />
        <span className="hidden xl:inline">Cart</span>
        {Boolean(cart?.itemCount) && (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.6875rem] font-extrabold leading-5 text-primary-foreground">
            {cart!.itemCount > 99 ? '99+' : cart!.itemCount}
          </span>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="border-b px-5 py-5 pr-14">
          <SheetTitle className="flex items-center gap-2 text-xl font-extrabold">
            <ShoppingBag className="size-5 text-primary" /> Your cart
          </SheetTitle>
          <SheetDescription>
            {cart?.itemCount ? `${cart.itemCount} ${cart.itemCount === 1 ? 'item' : 'items'} ready to review` : 'Review products before checkout'}
          </SheetDescription>
        </SheetHeader>

        {status === 'loading' || loading ? (
          <div className="flex flex-1 items-center justify-center gap-3 text-muted-foreground"><Spinner /> Loading your cart…</div>
        ) : !user ? (
          <div className="grid flex-1 place-items-center p-6 text-center">
            <div><ShoppingBag className="mx-auto size-10 text-primary" /><h2 className="mt-4 text-lg font-extrabold">Sign in to use your cart</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Customer accounts can save products and continue to checkout.</p><Button className="mt-5" render={<Link to="/login" />}>Sign in <ArrowRight /></Button></div>
          </div>
        ) : user.role !== 'customer' ? (
          <div className="grid flex-1 place-items-center p-6 text-center">
            <div><ShoppingBag className="mx-auto size-10 text-primary" /><h2 className="mt-4 text-lg font-extrabold">Customer cart</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Shopping carts are available when signed in with a customer account.</p></div>
          </div>
        ) : error ? (
          <div className="flex-1 p-5"><Alert variant="destructive"><AlertCircle /><AlertTitle>Cart unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert><Button className="mt-4" variant="outline" onClick={() => void fetchCart()}>Try again</Button></div>
        ) : !cart?.items.length ? (
          <div className="grid flex-1 place-items-center p-6 text-center">
            <div><PackageOpen className="mx-auto size-10 text-primary" /><h2 className="mt-4 text-lg font-extrabold">Your cart is empty</h2><p className="mt-2 text-sm text-muted-foreground">Add a local product to begin your order.</p><Button className="mt-5" render={<Link to="/products" />}>Browse products <ArrowRight /></Button></div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5">
              {cart.items.map((item) => (
                <article key={item.productId} className="flex gap-4 border-b py-5 last:border-b-0">
                  <Link to={`/products/${item.slug}`} className="size-20 shrink-0 overflow-hidden rounded-xl bg-accent">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-xl font-black text-primary/45">{item.name.slice(0, 2).toUpperCase()}</span>}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-muted-foreground">{item.vendorName}</p>
                    <h2 className="mt-1 line-clamp-2 font-extrabold"><Link to={`/products/${item.slug}`} className="hover:text-primary">{item.name}</Link></h2>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">Qty {item.quantity}</span><strong>{formatPrice(item.lineTotalCents, item.currency)}</strong></div>
                    {!item.isAvailable && <p className="mt-2 text-xs font-semibold text-destructive">Quantity exceeds current stock</p>}
                  </div>
                </article>
              ))}
            </div>

            <SheetFooter className="border-t bg-background p-5">
              <div className="mb-2 flex items-baseline justify-between gap-4"><span className="font-bold">Subtotal</span><strong className="text-xl text-primary">{formatPrice(cart.subtotalCents, cart.currency)}</strong></div>
              {cart.canCheckout ? <Button size="lg" render={<Link to="/checkout" />}>Continue to checkout <ArrowRight /></Button> : <Button size="lg" disabled>Resolve stock issues to continue</Button>}
              <Button variant="outline" render={<Link to="/cart" />}>View full cart</Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
