import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Boxes, Check, History, Pencil, TriangleAlert } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { InventoryMovement, InventoryProduct } from '@/inventory/types';
import { apiRequest } from '@/lib/api';

type Adjustment = { productId: string; availableQuantity: string; lowStockThreshold: string; note: string };

export function VendorInventoryView() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [adjustment, setAdjustment] = useState<Adjustment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const dateFormat = useMemo(() => new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeStyle: 'short' }), []);
  const fetchInventory = useCallback(() => apiRequest<{ inventory: InventoryProduct[]; movements: InventoryMovement[] }>('/vendor/inventory'), []);

  useEffect(() => {
    let active = true;
    fetchInventory().then((data) => { if (active) { setProducts(data.inventory); setMovements(data.movements); } }).catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Could not load inventory.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchInventory]);

  const submit = async () => {
    if (!adjustment) return;
    const product = products.find((item) => item.productId === adjustment.productId);
    if (!product) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      await apiRequest(`/vendor/products/${product.productId}/inventory`, { method: 'PATCH', body: JSON.stringify({ availableQuantity: Number(adjustment.availableQuantity), lowStockThreshold: Number(adjustment.lowStockThreshold), ...(adjustment.note.trim() ? { note: adjustment.note.trim() } : {}) }) });
      const data = await fetchInventory();
      setProducts(data.inventory); setMovements(data.movements); setAdjustment(null);
      setNotice(`${product.name} inventory was updated.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Inventory could not be updated.'); }
    finally { setSaving(false); }
  };

  const lowStockCount = products.filter((product) => product.availableQuantity <= product.lowStockThreshold).length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Stock operations</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">Inventory</h2><p className="mt-2 text-muted-foreground">Adjust quantities, set warning thresholds, and review every stock movement.</p></div>
      {error && <Alert variant="destructive" className="mb-5"><AlertCircle /><AlertTitle>Inventory action failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {notice && <Alert className="mb-5"><Check /><AlertTitle>Inventory saved</AlertTitle><AlertDescription>{notice}</AlertDescription></Alert>}
      <div className="mb-5 grid gap-4 sm:grid-cols-3"><article className="rounded-2xl border bg-card p-5 shadow-sm"><p className="text-sm font-bold text-muted-foreground">Products tracked</p><p className="mt-2 text-3xl font-extrabold">{products.length}</p></article><article className="rounded-2xl border bg-card p-5 shadow-sm"><p className="text-sm font-bold text-muted-foreground">Units available</p><p className="mt-2 text-3xl font-extrabold">{products.reduce((total, product) => total + product.availableQuantity, 0)}</p></article><article className={`rounded-2xl border p-5 shadow-sm ${lowStockCount > 0 ? 'border-amber-300 bg-amber-50' : 'bg-card'}`}><p className="text-sm font-bold text-muted-foreground">Low-stock alerts</p><p className="mt-2 text-3xl font-extrabold">{lowStockCount}</p></article></div>
      {loading ? <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border bg-card text-muted-foreground"><Spinner /> Loading inventory…</div> : products.length === 0 ? <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed bg-card text-center"><div><Boxes className="mx-auto size-10 text-primary" /><h3 className="mt-3 font-extrabold">No products to track</h3></div></div> : <div className="grid gap-4">{products.map((product) => <article key={product.productId} className={`rounded-2xl border bg-card p-5 shadow-sm ${product.availableQuantity <= product.lowStockThreshold ? 'border-amber-300' : ''}`}>{adjustment?.productId === product.productId ? <div className="grid gap-4 sm:grid-cols-3"><label htmlFor={`quantity-${product.productId}`} className="grid gap-2 text-sm font-bold">Available quantity<Input id={`quantity-${product.productId}`} type="number" min="0" step="1" value={adjustment.availableQuantity} onChange={(event) => setAdjustment((current) => current ? { ...current, availableQuantity: event.target.value } : null)} /></label><label htmlFor={`threshold-${product.productId}`} className="grid gap-2 text-sm font-bold">Low-stock threshold<Input id={`threshold-${product.productId}`} type="number" min="0" step="1" value={adjustment.lowStockThreshold} onChange={(event) => setAdjustment((current) => current ? { ...current, lowStockThreshold: event.target.value } : null)} /></label><label htmlFor={`note-${product.productId}`} className="grid gap-2 text-sm font-bold">Adjustment note<Input id={`note-${product.productId}`} value={adjustment.note} maxLength={500} placeholder="e.g. New delivery received" onChange={(event) => setAdjustment((current) => current ? { ...current, note: event.target.value } : null)} /></label><div className="flex justify-end gap-2 sm:col-span-3"><Button variant="ghost" onClick={() => setAdjustment(null)}>Cancel</Button><Button disabled={saving || adjustment.availableQuantity === '' || adjustment.lowStockThreshold === '' || (adjustment.note.length > 0 && adjustment.note.trim().length < 3)} onClick={() => void submit()}>{saving && <Spinner />} Save inventory</Button></div></div> : <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4">{product.imageUrl ? <img src={product.imageUrl} alt="" className="size-14 rounded-xl object-cover" /> : <span className="grid size-14 place-items-center rounded-xl bg-accent font-black text-primary/40">{product.name.slice(0, 2).toUpperCase()}</span>}<div><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold">{product.name}</h3><Badge variant="outline">{product.status}</Badge>{product.availableQuantity <= product.lowStockThreshold && <Badge className="border-amber-300 bg-amber-50 text-amber-800" variant="outline"><TriangleAlert /> Low stock</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">SKU {product.sku} · Warning at {product.lowStockThreshold} units</p></div></div><div className="flex items-center justify-between gap-5 sm:justify-end"><div className="text-right"><p className="text-2xl font-extrabold">{product.availableQuantity}</p><p className="text-xs text-muted-foreground">available</p></div><Button variant="outline" onClick={() => setAdjustment({ productId: product.productId, availableQuantity: String(product.availableQuantity), lowStockThreshold: String(product.lowStockThreshold), note: '' })}><Pencil /> Adjust</Button></div></div>}</article>)}</div>}
      <section className="mt-7 overflow-hidden rounded-2xl border bg-card shadow-sm"><div className="border-b p-5"><div className="flex items-center gap-3"><History className="size-5 text-primary" /><div><h3 className="font-extrabold">Movement history</h3><p className="text-sm text-muted-foreground">Latest 100 stock events</p></div></div></div>{movements.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No stock movements recorded yet.</div> : <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Type</TableHead><TableHead>Change</TableHead><TableHead>Balance</TableHead><TableHead>Note</TableHead></TableRow></TableHeader><TableBody>{movements.map((movement) => <TableRow key={movement.id}><TableCell className="whitespace-nowrap text-xs">{dateFormat.format(new Date(movement.createdAt))}</TableCell><TableCell className="font-bold">{movement.productName}</TableCell><TableCell><Badge variant="outline">{movement.type}</Badge></TableCell><TableCell className={movement.quantityDelta > 0 ? 'font-bold text-primary' : 'font-bold text-destructive'}>{movement.quantityDelta > 0 ? '+' : ''}{movement.quantityDelta}</TableCell><TableCell>{movement.quantityBefore} → {movement.quantityAfter}</TableCell><TableCell className="max-w-64 text-sm text-muted-foreground">{movement.note || '—'}</TableCell></TableRow>)}</TableBody></Table>}</section>
    </div>
  );
}
