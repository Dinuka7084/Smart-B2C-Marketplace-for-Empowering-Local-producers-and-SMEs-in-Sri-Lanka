import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  ImagePlus,
  Link as LinkIcon,
  PackagePlus,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import { useAuth } from '@/auth/auth-context';
import { type Category, formatPrice, type VendorProduct } from '@/catalog/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

const emptyForm: ProductForm = {
  name: '',
  slug: '',
  sku: '',
  categoryId: '',
  description: '',
  priceLkr: '',
  status: 'draft',
  stock: '0',
  lowStockThreshold: '5',
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function VendorProductsView() {
  const { user } = useAuth();
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [stocks, setStocks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // AI assistant states
  const [descriptionBrief, setDescriptionBrief] = useState('');
  const [descriptionTone, setDescriptionTone] = useState<'warm' | 'professional' | 'traditional'>('warm');
  const [generating, setGenerating] = useState(false);

  // New product photo states
  const [createImageMode, setCreateImageMode] = useState<'upload' | 'url'>('upload');
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState<string | null>(null);
  const [createImageUrl, setCreateImageUrl] = useState('');

  // Manage existing product photo modal
  const [photoModalProduct, setPhotoModalProduct] = useState<VendorProduct | null>(null);
  const [modalMode, setModalMode] = useState<'upload' | 'url'>('upload');
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [modalFilePreview, setModalFilePreview] = useState<string | null>(null);
  const [modalUrl, setModalUrl] = useState('');
  const [modalUploading, setModalUploading] = useState(false);

  const loadProducts = useCallback(async () => {
    const data = await apiRequest<{ products: VendorProduct[] }>('/vendor/products');
    setProducts(data.products);
    setStocks(
      Object.fromEntries(data.products.map((product) => [product.id, String(product.availableQuantity)])),
    );
  }, []);

  useEffect(() => {
    if (user?.vendorApprovalStatus !== 'approved') return;
    const timeoutId = window.setTimeout(() => {
      Promise.all([
        loadProducts(),
        apiRequest<{ categories: Category[] }>('/categories').then((data) => {
          setCategories(data.categories);
          setForm((current) => ({
            ...current,
            categoryId: current.categoryId || data.categories[0]?.id || '',
          }));
        }),
      ])
        .catch((caught: unknown) =>
          setError(caught instanceof Error ? caught.message : 'Could not load your products.'),
        )
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadProducts, user?.vendorApprovalStatus]);

  const setField = <K extends keyof ProductForm>(field: K, value: ProductForm[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  const handleCreateFileChange = (file: File | undefined) => {
    if (!file) {
      setCreateImageFile(null);
      setCreateImagePreview(null);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Product image must be 10 MB or smaller.');
      return;
    }
    setCreateImageFile(file);
    setCreateImagePreview(URL.createObjectURL(file));
  };

  const createProduct = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        priceLkr: Number(form.priceLkr),
        stock: Number(form.stock),
        lowStockThreshold: Number(form.lowStockThreshold),
      };

      if (createImageMode === 'url' && createImageUrl.trim()) {
        payload.imageUrl = createImageUrl.trim();
      }

      const result = await apiRequest<{ product: { id: string } }>('/vendor/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // If a local image file was selected, upload it immediately
      if (createImageMode === 'upload' && createImageFile) {
        const body = new FormData();
        body.append('file', createImageFile);
        await apiRequest(`/vendor/products/${result.product.id}/image-upload`, {
          method: 'POST',
          body,
        });
      }

      setForm({ ...emptyForm, categoryId: categories[0]?.id || '' });
      setCreateImageFile(null);
      setCreateImagePreview(null);
      setCreateImageUrl('');
      await loadProducts();
      setMessage('Product created successfully.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The product could not be created.');
    } finally {
      setSaving(false);
    }
  };

  const generateDescription = async () => {
    const categoryName = categories.find((category) => category.id === form.categoryId)?.name;
    if (!form.name.trim() || !categoryName || descriptionBrief.trim().length < 10) {
      setError('Add a product name, category, and at least 10 characters of key product details first.');
      return;
    }
    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      const result = await apiRequest<{ draft: { description: string; model: string } }>(
        '/vendor/ai/product-description',
        {
          method: 'POST',
          body: JSON.stringify({
            productName: form.name,
            categoryName,
            keyFeatures: descriptionBrief,
            tone: descriptionTone,
          }),
        },
      );
      setField('description', result.draft.description);
      setMessage('AI draft added. Review and edit it before creating the product.');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The AI draft could not be generated. You can continue writing manually.',
      );
    } finally {
      setGenerating(false);
    }
  };

  const updateStock = async (product: VendorProduct) => {
    setUpdatingId(product.id);
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/vendor/products/${product.id}/inventory`, {
        method: 'PATCH',
        body: JSON.stringify({
          availableQuantity: Number(stocks[product.id]),
          lowStockThreshold: product.lowStockThreshold,
        }),
      });
      await loadProducts();
      setMessage(`Stock updated for ${product.name}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Stock could not be updated.');
    } finally {
      setUpdatingId(null);
    }
  };

  const openPhotoModal = (product: VendorProduct) => {
    setPhotoModalProduct(product);
    setModalMode('upload');
    setModalFile(null);
    setModalFilePreview(null);
    setModalUrl(product.imageUrl ?? '');
    setError(null);
  };

  const handleModalFileChange = (file: File | undefined) => {
    if (!file) {
      setModalFile(null);
      setModalFilePreview(null);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Product image must be 10 MB or smaller.');
      return;
    }
    setModalFile(file);
    setModalFilePreview(URL.createObjectURL(file));
  };

  const saveModalFileUpload = async () => {
    if (!photoModalProduct || !modalFile) return;
    setModalUploading(true);
    setError(null);
    setMessage(null);
    try {
      const body = new FormData();
      body.append('file', modalFile);
      await apiRequest(`/vendor/products/${photoModalProduct.id}/image-upload`, {
        method: 'POST',
        body,
      });
      await loadProducts();
      setPhotoModalProduct(null);
      setMessage(`Photo updated for ${photoModalProduct.name}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The photo could not be uploaded.');
    } finally {
      setModalUploading(false);
    }
  };

  const saveModalUrl = async () => {
    if (!photoModalProduct) return;
    const url = modalUrl.trim();
    if (!url) {
      setError('Enter a valid image URL.');
      return;
    }
    setModalUploading(true);
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/vendor/products/${photoModalProduct.id}/image`, {
        method: 'PATCH',
        body: JSON.stringify({ imageUrl: url }),
      });
      await loadProducts();
      setPhotoModalProduct(null);
      setMessage(`Image URL saved for ${photoModalProduct.name}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The image URL could not be saved.');
    } finally {
      setModalUploading(false);
    }
  };

  const removeModalPhoto = async () => {
    if (!photoModalProduct) return;
    setModalUploading(true);
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/vendor/products/${photoModalProduct.id}/image`, {
        method: 'PATCH',
        body: JSON.stringify({ imageUrl: null }),
      });
      await loadProducts();
      setPhotoModalProduct(null);
      setMessage(`Photo removed from ${photoModalProduct.name}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The photo could not be removed.');
    } finally {
      setModalUploading(false);
    }
  };

  if (user?.vendorApprovalStatus !== 'approved') {
    return (
      <Alert>
        <AlertCircle />
        <AlertTitle>Product tools are locked</AlertTitle>
        <AlertDescription>
          Your vendor application must be approved before you can manage products.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Catalog management</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">Products and stock</h2>
        <p className="mt-2 text-muted-foreground">
          Create listings with photos, publish them to the marketplace, and keep inventory current.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-5">
          <AlertCircle />
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert className="mb-5">
          <Check />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Add Product Section */}
      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <PackagePlus className="size-5" />
          </span>
          <div>
            <h3 className="font-extrabold">Add a product</h3>
            <p className="text-sm text-muted-foreground">You can save a draft or publish immediately.</p>
          </div>
        </div>

        <form onSubmit={createProduct} className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="product-name">Product name</Label>
            <Input
              id="product-name"
              required
              minLength={3}
              value={form.name}
              onChange={(e) => {
                setField('name', e.target.value);
                if (!form.slug) setField('slug', slugify(e.target.value));
              }}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-slug">Product URL slug</Label>
            <Input
              id="product-slug"
              required
              minLength={3}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              value={form.slug}
              onChange={(e) => setField('slug', slugify(e.target.value))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-sku">SKU (Stock Keeping Unit)</Label>
            <Input
              id="product-sku"
              required
              minLength={2}
              value={form.sku}
              onChange={(e) => setField('sku', e.target.value.toUpperCase())}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-category">Category</Label>
            <NativeSelect
              id="product-category"
              className="w-full"
              required
              value={form.categoryId}
              onChange={(e) => setField('categoryId', e.target.value)}
            >
              <NativeSelectOption value="" disabled>
                Choose a category
              </NativeSelectOption>
              {categories.map((category) => (
                <NativeSelectOption key={category.id} value={category.id}>
                  {category.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-price">Price (LKR)</Label>
            <Input
              id="product-price"
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.priceLkr}
              onChange={(e) => setField('priceLkr', e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-status">Status</Label>
            <NativeSelect
              id="product-status"
              className="w-full"
              value={form.status}
              onChange={(e) => setField('status', e.target.value as ProductForm['status'])}
            >
              <NativeSelectOption value="draft">Draft</NativeSelectOption>
              <NativeSelectOption value="published">Published</NativeSelectOption>
            </NativeSelect>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-stock">Available stock</Label>
            <Input
              id="product-stock"
              required
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(e) => setField('stock', e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="low-stock">Low-stock warning</Label>
            <Input
              id="low-stock"
              required
              type="number"
              min="0"
              step="1"
              value={form.lowStockThreshold}
              onChange={(e) => setField('lowStockThreshold', e.target.value)}
            />
          </div>

          {/* Product Photo section */}
          <div className="rounded-xl border bg-muted/20 p-4 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <ImagePlus className="size-4" />
                </span>
                <div>
                  <p className="font-bold text-sm">Product photo (optional)</p>
                  <p className="text-xs text-muted-foreground">
                    Upload an image file directly from your computer or provide a web link.
                  </p>
                </div>
              </div>

              <div className="inline-flex rounded-lg border bg-muted p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  className={`rounded-md px-3 py-1.5 transition-colors ${
                    createImageMode === 'upload'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setCreateImageMode('upload')}
                >
                  <Upload className="mr-1 inline-block size-3.5" /> Upload file
                </button>
                <button
                  type="button"
                  className={`rounded-md px-3 py-1.5 transition-colors ${
                    createImageMode === 'url'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setCreateImageMode('url')}
                >
                  <LinkIcon className="mr-1 inline-block size-3.5" /> Image URL
                </button>
              </div>
            </div>

            {createImageMode === 'upload' ? (
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                {createImagePreview ? (
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border bg-background shadow-xs">
                    <img src={createImagePreview} alt="Preview" className="size-full object-cover" />
                    <button
                      type="button"
                      aria-label="Remove photo"
                      className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-black/75 text-white transition-opacity hover:bg-black"
                      onClick={() => {
                        setCreateImageFile(null);
                        setCreateImagePreview(null);
                      }}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ) : (
                  <div className="grid size-20 shrink-0 place-items-center rounded-xl border border-dashed bg-muted/40 text-muted-foreground">
                    <ImagePlus className="size-6 text-muted-foreground/60" />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleCreateFileChange(e.target.files?.[0])}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Accepted formats: JPG, PNG, WebP (max 10 MB). Stored locally on the server.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                {createImageUrl.trim() ? (
                  <div className="size-20 shrink-0 overflow-hidden rounded-xl border bg-background shadow-xs">
                    <img
                      src={createImageUrl}
                      alt="Preview"
                      className="size-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="grid size-20 shrink-0 place-items-center rounded-xl border border-dashed bg-muted/40 text-muted-foreground">
                    <LinkIcon className="size-6 text-muted-foreground/60" />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    placeholder="https://example.com/item.jpg"
                    value={createImageUrl}
                    onChange={(e) => setCreateImageUrl(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Paste any public image link (e.g. from your website, Unsplash, etc.).
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* AI description assistant */}
          <div className="grid gap-4 rounded-xl border bg-muted/35 p-4 md:col-span-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <div>
                <p className="font-bold">AI description assistant</p>
                <p className="text-sm text-muted-foreground">Optional—your final description always remains editable.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_12rem_auto]">
              <div className="grid gap-2">
                <Label htmlFor="description-brief">Key features, materials, or origin</Label>
                <Input
                  id="description-brief"
                  minLength={10}
                  maxLength={1000}
                  placeholder="Example: Handwoven cotton, made in Kandy, reusable…"
                  value={descriptionBrief}
                  onChange={(e) => setDescriptionBrief(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description-tone">Writing tone</Label>
                <NativeSelect
                  id="description-tone"
                  className="w-full"
                  value={descriptionTone}
                  onChange={(e) => setDescriptionTone(e.target.value as typeof descriptionTone)}
                >
                  <NativeSelectOption value="warm">Warm</NativeSelectOption>
                  <NativeSelectOption value="professional">Professional</NativeSelectOption>
                  <NativeSelectOption value="traditional">Traditional</NativeSelectOption>
                </NativeSelect>
              </div>
              <Button
                type="button"
                className="self-end"
                variant="outline"
                disabled={generating || descriptionBrief.trim().length < 10 || !form.name || !form.categoryId}
                onClick={() => void generateDescription()}
              >
                {generating ? <Spinner /> : <Sparkles />} Draft with Groq
              </Button>
            </div>
          </div>

          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="product-description">Description</Label>
            <textarea
              id="product-description"
              required
              minLength={20}
              maxLength={5000}
              rows={5}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <p className="text-xs text-muted-foreground">Check all claims for accuracy before publishing.</p>
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={saving || categories.length === 0}>
              {saving ? <Spinner /> : <PackagePlus />} Create product
            </Button>
          </div>
        </form>
      </section>

      {/* Catalog Table Section */}
      <section className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-5 sm:p-6">
          <h3 className="font-extrabold">Your catalog</h3>
          <p className="mt-1 text-sm text-muted-foreground">{products.length} products</p>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-3 text-muted-foreground">
            <Spinner /> Loading products…
          </div>
        ) : products.length === 0 ? (
          <div className="grid min-h-48 place-items-center p-8 text-center text-sm text-muted-foreground">
            Your first product will appear here.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Product photo</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  {/* Product Details & Thumbnail */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="group relative size-12 shrink-0 overflow-hidden rounded-lg bg-accent text-left transition-transform hover:scale-105"
                        onClick={() => openPhotoModal(product)}
                        title="Click to manage photo"
                      >
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" className="size-full object-cover" />
                        ) : (
                          <span className="grid size-full place-items-center font-black text-primary/45">
                            {product.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <Camera className="size-4 text-white" />
                        </span>
                      </button>
                      <div>
                        <div className="font-bold">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.sku} · {product.categoryName}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell>
                    <Badge variant="outline" className={product.status === 'published' ? 'text-primary' : ''}>
                      {product.status}
                    </Badge>
                  </TableCell>

                  {/* Price */}
                  <TableCell>{formatPrice(product.priceCents, product.currency)}</TableCell>

                  {/* Stock inline edit */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        className="w-20"
                        type="number"
                        min="0"
                        step="1"
                        aria-label={`Stock for ${product.name}`}
                        value={stocks[product.id] ?? ''}
                        onChange={(e) =>
                          setStocks((current) => ({ ...current, [product.id]: e.target.value }))
                        }
                      />
                      <Button
                        size="icon-sm"
                        variant="outline"
                        title="Save stock"
                        disabled={updatingId === product.id}
                        onClick={() => void updateStock(product)}
                      >
                        {updatingId === product.id ? <Spinner /> : <RefreshCw className="size-3.5" />}
                      </Button>
                    </div>
                  </TableCell>

                  {/* Photo Management Column */}
                  <TableCell>
                    <Button
                      size="sm"
                      variant={product.imageUrl ? 'outline' : 'secondary'}
                      className="gap-1.5"
                      onClick={() => openPhotoModal(product)}
                    >
                      {product.imageUrl ? (
                        <>
                          <Camera className="size-3.5 text-primary" /> Change photo
                        </>
                      ) : (
                        <>
                          <ImagePlus className="size-3.5 text-primary" /> Add photo
                        </>
                      )}
                    </Button>
                  </TableCell>

                  {/* Actions Column */}
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openPhotoModal(product)}
                    >
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Photo Management Modal Dialog */}
      <Dialog
        open={photoModalProduct !== null}
        onOpenChange={(open) => {
          if (!open && !modalUploading) setPhotoModalProduct(null);
        }}
      >
        <DialogContent className="w-full sm:max-w-lg overflow-hidden">
          <DialogHeader>
            <DialogTitle>Manage product photo</DialogTitle>
            <DialogDescription>
              {photoModalProduct ? `Update or remove the photo for "${photoModalProduct.name}".` : ''}
            </DialogDescription>
          </DialogHeader>

          {photoModalProduct && (
            <div className="grid gap-4 py-2 w-full min-w-0">
              {/* Current photo display */}
              <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3 min-w-0 w-full overflow-hidden">
                <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-accent">
                  {photoModalProduct.imageUrl ? (
                    <img src={photoModalProduct.imageUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center font-black text-primary/45">
                      {photoModalProduct.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Current photo</p>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                      {photoModalProduct.imageUrl?.includes('/uploads/') ? 'Local upload' : photoModalProduct.imageUrl ? 'External URL' : 'None'}
                    </Badge>
                  </div>
                  <p
                    className="truncate text-xs text-muted-foreground mt-1 font-mono"
                    title={photoModalProduct.imageUrl ?? ''}
                  >
                    {photoModalProduct.imageUrl ? photoModalProduct.imageUrl.split('/').pop() : 'No photo assigned yet.'}
                  </p>
                </div>
                {photoModalProduct.imageUrl && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="shrink-0 text-destructive hover:bg-destructive/10"
                    disabled={modalUploading}
                    onClick={() => void removeModalPhoto()}
                    title="Remove photo"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>

              {/* Mode Selector */}
              <div className="grid grid-cols-2 w-full rounded-lg border bg-muted p-1 text-xs font-semibold">
                <button
                  type="button"
                  className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 px-3 text-center transition-colors ${
                    modalMode === 'upload'
                      ? 'bg-background text-foreground shadow-xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setModalMode('upload')}
                >
                  <Upload className="size-3.5" /> Upload file
                </button>
                <button
                  type="button"
                  className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 px-3 text-center transition-colors ${
                    modalMode === 'url'
                      ? 'bg-background text-foreground shadow-xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setModalMode('url')}
                >
                  <LinkIcon className="size-3.5" /> Image URL
                </button>
              </div>

              {/* Mode: Upload new file */}
              {modalMode === 'upload' && (
                <div className="grid gap-3 w-full min-w-0">
                  {modalFilePreview && (
                    <div className="relative mx-auto size-28 shrink-0 overflow-hidden rounded-xl border bg-background shadow-xs">
                      <img src={modalFilePreview} alt="Selected preview" className="size-full object-cover" />
                      <button
                        type="button"
                        aria-label="Deselect photo"
                        className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-black/75 text-white hover:bg-black"
                        onClick={() => {
                          setModalFile(null);
                          setModalFilePreview(null);
                        }}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  )}
                  <Input
                    type="file"
                    className="w-full text-xs"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleModalFileChange(e.target.files?.[0])}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload JPG, PNG, or WebP up to 10 MB. Image will be saved on the server.
                  </p>
                </div>
              )}

              {/* Mode: Direct URL */}
              {modalMode === 'url' && (
                <div className="grid gap-3 w-full min-w-0">
                  {modalUrl.trim() && (
                    <div className="mx-auto size-28 shrink-0 overflow-hidden rounded-xl border bg-background shadow-xs">
                      <img
                        src={modalUrl}
                        alt="URL preview"
                        className="size-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <Input
                    placeholder="https://images.example.com/product.jpg"
                    className="w-full text-xs"
                    value={modalUrl}
                    onChange={(e) => setModalUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste any public image URL (from web hosts, CDNs, or direct links).
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-2 flex flex-row items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={modalUploading}
              onClick={() => setPhotoModalProduct(null)}
            >
              Cancel
            </Button>
            {modalMode === 'upload' ? (
              <Button
                size="sm"
                disabled={modalUploading || !modalFile}
                onClick={() => void saveModalFileUpload()}
              >
                {modalUploading ? <Spinner /> : <Upload className="size-4" />} Upload photo
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={modalUploading || !modalUrl.trim()}
                onClick={() => void saveModalUrl()}
              >
                {modalUploading ? <Spinner /> : <Check className="size-4" />} Save URL
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
