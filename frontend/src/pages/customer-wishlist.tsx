import { useEffect, useState } from 'react';
import { AlertCircle, Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from 'react-router';

import { formatPrice } from '@/catalog/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { WishlistProduct } from '@/engagement/types';
import { apiRequest } from '@/lib/api';

export function CustomerWishlistView() {
  const [items, setItems] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<{ items: WishlistProduct[] }>('/wishlist')
      .then((data) => { if (active) setItems(data.items); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Could not load your wishlist.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const remove = async (productId: string) => {
    setActionId(productId);
    setError(null);
    try {
      await apiRequest(`/wishlist/items/${productId}`, { method: 'DELETE' });
      setItems((current) => current.filter((item) => item.id !== productId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove this product.');
    } finally {
      setActionId(null);
    }
  };

  const addToCart = async (product: WishlistProduct) => {
    setActionId(product.id);
    setError(null);
    try {
      await apiRequest('/cart/items', { method: 'POST', body: JSON.stringify({ productId: product.id, quantity: 1 }) });
      await apiRequest(`/wishlist/items/${product.id}`, { method: 'DELETE' });
      setItems((current) => current.filter((item) => item.id !== product.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not move this product to your cart.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Saved products</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">Your wishlist</h2><p className="mt-2 text-muted-foreground">Keep local favourites close and move them to your cart when ready.</p></div>
      {error && <Alert variant="destructive" className="mb-5"><AlertCircle /><AlertTitle>Wishlist action failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {loading ? <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border bg-card text-muted-foreground"><Spinner /> Loading saved products…</div> : items.length === 0 ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed bg-card p-8 text-center"><div><Heart className="mx-auto size-10 text-primary" /><h3 className="mt-4 text-lg font-extrabold">Your wishlist is empty</h3><p className="mt-2 text-sm text-muted-foreground">Save products you want to revisit.</p><Button className="mt-5" render={<Link to="/products" />}>Browse products</Button></div></div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((product) => <article key={product.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm"><Link to={`/products/${product.slug}`} className="block aspect-[4/3] bg-accent">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-3xl font-black text-primary/45">{product.name.slice(0, 2).toUpperCase()}</div>}</Link><div className="p-5"><div className="flex items-center justify-between gap-2"><Badge variant="outline">{product.category.name}</Badge><span className="text-xs text-muted-foreground">{product.availableQuantity > 0 ? `${product.availableQuantity} available` : 'Out of stock'}</span></div><h3 className="mt-3 line-clamp-2 text-lg font-extrabold"><Link to={`/products/${product.slug}`} className="hover:text-primary">{product.name}</Link></h3><p className="mt-1 text-sm text-muted-foreground">{product.vendor.businessName}</p><p className="mt-4 font-extrabold text-primary">{formatPrice(product.priceCents, product.currency)}</p><div className="mt-5 flex gap-2"><Button className="flex-1" disabled={actionId === product.id || product.availableQuantity < 1} onClick={() => void addToCart(product)}>{actionId === product.id ? <Spinner /> : <ShoppingBag />} Add to cart</Button><Button variant="outline" size="icon" aria-label={`Remove ${product.name} from wishlist`} disabled={actionId === product.id} onClick={() => void remove(product.id)}><Trash2 /></Button></div></div></article>)}
        </div>
      )}
    </div>
  );
}
