import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Archive, Eye, EyeOff, PackageSearch, RotateCcw, Search } from 'lucide-react';
import { Link } from 'react-router';

import { formatPrice } from '@/catalog/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { apiRequest, type VendorApprovalStatus } from '@/lib/api';

type ProductStatus = 'draft' | 'published' | 'archived';
type ManagedProduct = { id: string; name: string; slug: string; sku: string; status: ProductStatus; priceCents: number; currency: string; imageUrl: string | null; categoryName: string; categoryActive: boolean; vendorName: string; vendorApprovalStatus: VendorApprovalStatus; availableQuantity: number; updatedAt: string };

export function AdminProductsView() {
  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [query, setQuery] = useState('');
  const [archiving, setArchiving] = useState<ManagedProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchProducts = useCallback(() => apiRequest<{ products: ManagedProduct[] }>('/admin/products'), []);

  useEffect(() => {
    let active = true;
    fetchProducts().then((data) => { if (active) setProducts(data.products); }).catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Could not load products.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchProducts]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return products;
    return products.filter((product) => `${product.name} ${product.sku} ${product.vendorName} ${product.categoryName} ${product.status}`.toLowerCase().includes(value));
  }, [products, query]);

  const updateStatus = async (product: ManagedProduct, status: ProductStatus) => {
    setActionId(product.id); setError(null);
    try {
      await apiRequest(`/admin/products/${product.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setProducts((current) => current.map((record) => record.id === product.id ? { ...record, status } : record));
      setArchiving(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not update this product.'); }
    finally { setActionId(null); }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Marketplace safety</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">Products</h2><p className="mt-2 text-muted-foreground">Review every vendor listing and control its marketplace visibility.</p></div>
      {error && <Alert variant="destructive" className="mb-5"><AlertCircle /><AlertTitle>Product action failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="relative max-w-lg"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, SKU, vendor or category" aria-label="Search products" /></div>
      {loading ? <div className="mt-5 flex min-h-64 items-center justify-center gap-3 rounded-2xl border bg-card text-muted-foreground"><Spinner /> Loading products…</div> : filtered.length === 0 ? <div className="mt-5 grid min-h-52 place-items-center rounded-2xl border border-dashed bg-card text-center"><div><PackageSearch className="mx-auto size-9 text-primary" /><p className="mt-3 font-bold">No matching products</p></div></div> : <div className="mt-5 grid gap-4">{filtered.map((product) => <article key={product.id} className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm lg:flex-row lg:items-center"><div className="size-20 shrink-0 overflow-hidden rounded-xl bg-accent">{product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center font-black text-primary/40">{product.name.slice(0, 2).toUpperCase()}</span>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold">{product.name}</h3><Badge variant={product.status === 'archived' ? 'destructive' : 'outline'}>{product.status}</Badge>{(!product.categoryActive || product.vendorApprovalStatus !== 'approved') && <Badge variant="destructive">Publication blocked</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{product.vendorName} · {product.categoryName} · SKU {product.sku}</p><p className="mt-2 font-bold text-primary">{formatPrice(product.priceCents, product.currency)} <span className="font-normal text-muted-foreground">· {product.availableQuantity} available</span></p></div><div className="flex flex-wrap gap-2 lg:justify-end">{product.status === 'published' && <Button variant="outline" disabled={actionId === product.id} onClick={() => void updateStatus(product, 'draft')}><EyeOff /> Unpublish</Button>}{product.status === 'draft' && <Button disabled={actionId === product.id} onClick={() => void updateStatus(product, 'published')}>{actionId === product.id ? <Spinner /> : <Eye />} Publish</Button>}{product.status === 'archived' ? <Button variant="outline" disabled={actionId === product.id} onClick={() => void updateStatus(product, 'draft')}><RotateCcw /> Restore as draft</Button> : <Button variant="outline" disabled={actionId === product.id} onClick={() => setArchiving(product)}><Archive /> Archive</Button>}{product.status === 'published' && <Button variant="ghost" render={<Link to={`/products/${product.slug}`} />}>View</Button>}</div></article>)}</div>}
      <AlertDialog open={Boolean(archiving)} onOpenChange={(open) => { if (!open) setArchiving(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Archive {archiving?.name}?</AlertDialogTitle><AlertDialogDescription>The listing will disappear from the marketplace and the vendor will need to return it to draft before publishing again.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep product</AlertDialogCancel><Button variant="destructive" disabled={!archiving || actionId === archiving.id} onClick={() => archiving && void updateStatus(archiving, 'archived')}>{archiving && actionId === archiving.id && <Spinner />} Archive product</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
