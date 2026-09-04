import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { AlertCircle, Check, ImagePlus, PackagePlus, RefreshCw, Sparkles } from 'lucide-react';

import { useAuth } from '@/auth/auth-context';
import { type Category, formatPrice, type VendorProduct } from '@/catalog/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiRequest } from '@/lib/api';

type ProductForm = {
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  description: string;
  priceLkr: string;
  status: 'draft' | 'published';
  stock: string;
  lowStockThreshold: string;
};

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  publicId: string;
  signature: string;
};

type CloudinaryUploadResult = {
  secure_url?: string;
  public_id?: string;
  error?: { message?: string };
};

const emptyForm: ProductForm = {
  name: '', slug: '', sku: '', categoryId: '', description: '', priceLkr: '',
  status: 'draft', stock: '0', lowStockThreshold: '5',
};

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function VendorProductsView() {
  const { user } = useAuth();
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [stocks, setStocks] = useState<Record<string, string>>({});
  const [imageFiles, setImageFiles] = useState<Record<string, File | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [descriptionBrief, setDescriptionBrief] = useState('');
  const [descriptionTone, setDescriptionTone] = useState<'warm' | 'professional' | 'traditional'>('warm');
  const [generating, setGenerating] = useState(false);

  const loadProducts = useCallback(async () => {
    const data = await apiRequest<{ products: VendorProduct[] }>('/vendor/products');
    setProducts(data.products);
    setStocks(Object.fromEntries(data.products.map((product) => [product.id, String(product.availableQuantity)])));
  }, []);

  useEffect(() => {
    if (user?.vendorApprovalStatus !== 'approved') return;
    const timeoutId = window.setTimeout(() => {
      Promise.all([
        loadProducts(),
        apiRequest<{ categories: Category[] }>('/categories').then((data) => {
          setCategories(data.categories);
          setForm((current) => ({ ...current, categoryId: current.categoryId || data.categories[0]?.id || '' }));
        }),
      ]).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load your products.')).finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadProducts, user?.vendorApprovalStatus]);

  const setField = <K extends keyof ProductForm>(field: K, value: ProductForm[K]) => setForm((current) => ({ ...current, [field]: value }));

  const createProduct = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true); setError(null); setMessage(null);
    try {
      await apiRequest('/vendor/products', {
        method: 'POST',
        body: JSON.stringify({ ...form, priceLkr: Number(form.priceLkr), stock: Number(form.stock), lowStockThreshold: Number(form.lowStockThreshold) }),
      });
      setForm({ ...emptyForm, categoryId: categories[0]?.id || '' });
      await loadProducts();
      setMessage('Product created successfully.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The product could not be created.');
    } finally { setSaving(false); }
  };

  const generateDescription = async () => {
    const categoryName = categories.find((category) => category.id === form.categoryId)?.name;
    if (!form.name.trim() || !categoryName || descriptionBrief.trim().length < 10) {
      setError('Add a product name, category, and at least 10 characters of key product details first.');
      return;
    }
    setGenerating(true); setError(null); setMessage(null);
    try {
      const result = await apiRequest<{ draft: { description: string; model: string } }>('/vendor/ai/product-description', {
        method: 'POST',
        body: JSON.stringify({ productName: form.name, categoryName, keyFeatures: descriptionBrief, tone: descriptionTone }),
      });
      setField('description', result.draft.description);
      setMessage('AI draft added. Review and edit it before creating the product.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The AI draft could not be generated. You can continue writing manually.');
    } finally { setGenerating(false); }
  };

  const updateStock = async (product: VendorProduct) => {
    setUpdatingId(product.id); setError(null); setMessage(null);
    try {
      await apiRequest(`/vendor/products/${product.id}/inventory`, {
        method: 'PATCH',
        body: JSON.stringify({ availableQuantity: Number(stocks[product.id]), lowStockThreshold: product.lowStockThreshold }),
      });
      await loadProducts();
      setMessage(`Stock updated for ${product.name}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Stock could not be updated.');
    } finally { setUpdatingId(null); }
  };

  const uploadImage = async (product: VendorProduct) => {
    const file = imageFiles[product.id];
    if (!file) { setError('Choose a JPG, PNG, or WebP image first.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Choose a JPG, PNG, or WebP image.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Product images must be 10 MB or smaller.'); return; }

    setUploadingId(product.id); setError(null); setMessage(null);
    try {
      const signed = await apiRequest<{ upload: UploadSignature }>(`/vendor/products/${product.id}/image-upload-signature`, { method: 'POST' });
      const body = new FormData();
      body.append('file', file);
      body.append('api_key', signed.upload.apiKey);
      body.append('timestamp', String(signed.upload.timestamp));
      body.append('folder', signed.upload.folder);
      body.append('public_id', signed.upload.publicId);
      body.append('signature', signed.upload.signature);

      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.upload.cloudName)}/image/upload`, { method: 'POST', body });
      const uploaded = await uploadResponse.json() as CloudinaryUploadResult;
      if (!uploadResponse.ok || !uploaded.secure_url || !uploaded.public_id) {
        throw new Error(uploaded.error?.message ?? 'Cloudinary could not upload the image.');
      }

      await apiRequest(`/vendor/products/${product.id}/image`, {
        method: 'PATCH',
        body: JSON.stringify({ imageUrl: uploaded.secure_url, imagePublicId: uploaded.public_id }),
      });
      setImageFiles((current) => ({ ...current, [product.id]: undefined }));
      await loadProducts();
      setMessage(`Image updated for ${product.name}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The image could not be uploaded.');
    } finally { setUploadingId(null); }
  };

  if (user?.vendorApprovalStatus !== 'approved') {
    return <Alert><AlertCircle /><AlertTitle>Product tools are locked</AlertTitle><AlertDescription>Your vendor application must be approved before you can manage products.</AlertDescription></Alert>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Catalog management</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">Products and stock</h2><p className="mt-2 text-muted-foreground">Create listings, publish them to the marketplace, and keep inventory current.</p></div>

      {error && <Alert variant="destructive" className="mb-5"><AlertCircle /><AlertTitle>Action failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {message && <Alert className="mb-5"><Check /><AlertTitle>Saved</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}

      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><PackagePlus className="size-5" /></span><div><h3 className="font-extrabold">Add a product</h3><p className="text-sm text-muted-foreground">You can save a draft or publish immediately.</p></div></div>
        <form onSubmit={createProduct} className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="grid gap-2"><Label htmlFor="product-name">Product name</Label><Input id="product-name" required minLength={3} value={form.name} onChange={(e) => { setField('name', e.target.value); if (!form.slug) setField('slug', slugify(e.target.value)); }} /></div>
          <div className="grid gap-2"><Label htmlFor="product-slug">Product URL slug</Label><Input id="product-slug" required minLength={3} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(e) => setField('slug', slugify(e.target.value))} /></div>
          <div className="grid gap-2"><Label htmlFor="product-sku">SKU</Label><Input id="product-sku" required minLength={2} value={form.sku} onChange={(e) => setField('sku', e.target.value.toUpperCase())} /></div>
          <div className="grid gap-2"><Label htmlFor="product-category">Category</Label><NativeSelect id="product-category" className="w-full" required value={form.categoryId} onChange={(e) => setField('categoryId', e.target.value)}><NativeSelectOption value="" disabled>Choose a category</NativeSelectOption>{categories.map((category) => <NativeSelectOption key={category.id} value={category.id}>{category.name}</NativeSelectOption>)}</NativeSelect></div>
          <div className="grid gap-2"><Label htmlFor="product-price">Price (LKR)</Label><Input id="product-price" required type="number" min="0.01" step="0.01" value={form.priceLkr} onChange={(e) => setField('priceLkr', e.target.value)} /></div>
          <div className="grid gap-2"><Label htmlFor="product-status">Status</Label><NativeSelect id="product-status" className="w-full" value={form.status} onChange={(e) => setField('status', e.target.value as ProductForm['status'])}><NativeSelectOption value="draft">Draft</NativeSelectOption><NativeSelectOption value="published">Published</NativeSelectOption></NativeSelect></div>
          <div className="grid gap-2"><Label htmlFor="product-stock">Available stock</Label><Input id="product-stock" required type="number" min="0" step="1" value={form.stock} onChange={(e) => setField('stock', e.target.value)} /></div>
          <div className="grid gap-2"><Label htmlFor="low-stock">Low-stock warning</Label><Input id="low-stock" required type="number" min="0" step="1" value={form.lowStockThreshold} onChange={(e) => setField('lowStockThreshold', e.target.value)} /></div>
          <div className="grid gap-4 rounded-xl border bg-muted/35 p-4 md:col-span-2"><div className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /><div><p className="font-bold">AI description assistant</p><p className="text-sm text-muted-foreground">Optional—your final description always remains editable.</p></div></div><div className="grid gap-3 md:grid-cols-[1fr_12rem_auto]"><div className="grid gap-2"><Label htmlFor="description-brief">Key features, materials, or origin</Label><Input id="description-brief" minLength={10} maxLength={1000} placeholder="Example: Handwoven cotton, made in Kandy, reusable…" value={descriptionBrief} onChange={(e) => setDescriptionBrief(e.target.value)} /></div><div className="grid gap-2"><Label htmlFor="description-tone">Writing tone</Label><NativeSelect id="description-tone" className="w-full" value={descriptionTone} onChange={(e) => setDescriptionTone(e.target.value as typeof descriptionTone)}><NativeSelectOption value="warm">Warm</NativeSelectOption><NativeSelectOption value="professional">Professional</NativeSelectOption><NativeSelectOption value="traditional">Traditional</NativeSelectOption></NativeSelect></div><Button type="button" className="self-end" variant="outline" disabled={generating || descriptionBrief.trim().length < 10 || !form.name || !form.categoryId} onClick={() => void generateDescription()}>{generating ? <Spinner /> : <Sparkles />} Draft with Groq</Button></div></div>
          <div className="grid gap-2 md:col-span-2"><Label htmlFor="product-description">Description</Label><textarea id="product-description" required minLength={20} maxLength={5000} rows={5} value={form.description} onChange={(e) => setField('description', e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" /><p className="text-xs text-muted-foreground">Check all claims for accuracy before publishing.</p></div>
          <div className="md:col-span-2"><Button type="submit" disabled={saving || categories.length === 0}>{saving ? <Spinner /> : <PackagePlus />} Create product</Button></div>
        </form>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-5 sm:p-6"><h3 className="font-extrabold">Your catalog</h3><p className="mt-1 text-sm text-muted-foreground">{products.length} products</p></div>
        {loading ? <div className="flex min-h-48 items-center justify-center gap-3 text-muted-foreground"><Spinner /> Loading products…</div> : products.length === 0 ? <div className="grid min-h-48 place-items-center p-8 text-center text-sm text-muted-foreground">Your first product will appear here.</div> : (
          <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Status</TableHead><TableHead>Price</TableHead><TableHead>Stock</TableHead><TableHead>Product image</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{products.map((product) => <TableRow key={product.id}><TableCell><div className="flex items-center gap-3">{product.imageUrl ? <img src={product.imageUrl} alt="" className="size-12 rounded-lg object-cover" /> : <span className="grid size-12 place-items-center rounded-lg bg-accent font-black text-primary/45">{product.name.slice(0, 2).toUpperCase()}</span>}<div><div className="font-bold">{product.name}</div><div className="text-xs text-muted-foreground">{product.sku} · {product.categoryName}</div></div></div></TableCell><TableCell><Badge variant="outline" className={product.status === 'published' ? 'text-primary' : ''}>{product.status}</Badge></TableCell><TableCell>{formatPrice(product.priceCents, product.currency)}</TableCell><TableCell><Input className="w-24" type="number" min="0" step="1" aria-label={`Stock for ${product.name}`} value={stocks[product.id] ?? ''} onChange={(e) => setStocks((current) => ({ ...current, [product.id]: e.target.value }))} /></TableCell><TableCell><Input className="w-56" type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Image for ${product.name}`} onChange={(e) => setImageFiles((current) => ({ ...current, [product.id]: e.target.files?.[0] }))} /></TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" disabled={updatingId === product.id} onClick={() => void updateStock(product)}>{updatingId === product.id ? <Spinner /> : <RefreshCw />} Stock</Button><Button size="sm" disabled={uploadingId === product.id || !imageFiles[product.id]} onClick={() => void uploadImage(product)}>{uploadingId === product.id ? <Spinner /> : <ImagePlus />} Image</Button></div></TableCell></TableRow>)}</TableBody></Table>
        )}
      </section>
    </div>
  );
}
