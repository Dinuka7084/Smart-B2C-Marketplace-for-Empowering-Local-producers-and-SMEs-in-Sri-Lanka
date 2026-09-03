import { useEffect, useState, type SyntheticEvent } from 'react';
import { ArrowLeft, ArrowRight, Leaf, PackageOpen, Search, ShoppingBag } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { formatPrice, type CatalogProduct, type Category } from '@/catalog/types';
import { apiRequest } from '@/lib/api';

type CatalogResponse = {
  products: CatalogProduct[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [categories, setCategories] = useState<Category[]>([]);
  const [result, setResult] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const category = searchParams.get('category') ?? '';
  const sort = searchParams.get('sort') ?? 'newest';
  const page = Number(searchParams.get('page') ?? '1');

  useEffect(() => {
    apiRequest<{ categories: Category[] }>('/categories')
      .then((data) => setCategories(data.categories))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ page: String(page), pageSize: '12', sort });
    if (category) query.set('category', category);
    const q = searchParams.get('q');
    if (q) query.set('q', q);

    apiRequest<CatalogResponse>(`/products?${query}`)
      .then((data) => active && setResult(data))
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load the catalog.');
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [category, page, searchParams, sort]);

  const updateFilter = (key: string, value: string) => {
    setLoading(true);
    setError(null);
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  };

  const submitSearch = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateFilter('q', search.trim());
  };

  return (
    <main className="min-h-screen bg-muted/35">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-5 lg:px-8">
          <Link to="/" className="flex items-center gap-3 font-extrabold tracking-[-0.03em]">
            <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground"><Leaf className="size-5" /></span>
            Smart Lanka
          </Link>
          <Button className="ml-auto rounded-full" variant="outline" size="icon-lg" aria-label="Shopping cart" render={<Link to="/cart" />}><ShoppingBag /></Button>
        </div>
      </header>

      <section className="border-b bg-[#143f32] text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#f4c95d]">Local marketplace</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">Products made across Sri Lanka</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">Browse published listings from approved local producers and small businesses.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
        <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm md:grid-cols-[1fr_220px_190px]">
          <form onSubmit={submitSearch} className="flex gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" placeholder="Search products" aria-label="Search products" /></div>
            <Button type="submit">Search</Button>
          </form>
          <NativeSelect className="w-full" value={category} onChange={(event) => updateFilter('category', event.target.value)} aria-label="Filter by category">
            <NativeSelectOption value="">All categories</NativeSelectOption>
            {categories.map((item) => <NativeSelectOption key={item.id} value={item.slug}>{item.name}</NativeSelectOption>)}
          </NativeSelect>
          <NativeSelect className="w-full" value={sort} onChange={(event) => updateFilter('sort', event.target.value)} aria-label="Sort products">
            <NativeSelectOption value="newest">Newest first</NativeSelectOption>
            <NativeSelectOption value="price-asc">Price: low to high</NativeSelectOption>
            <NativeSelectOption value="price-desc">Price: high to low</NativeSelectOption>
          </NativeSelect>
        </div>

        <div className="mt-8 flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-extrabold tracking-[-0.035em]">Catalog</h2>
          {result && <p className="text-sm text-muted-foreground">{result.pagination.total} products</p>}
        </div>

        {error ? (
          <Alert variant="destructive" className="mt-5"><AlertTitle>Catalog unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
        ) : loading ? (
          <div className="mt-5 flex min-h-72 items-center justify-center gap-3 rounded-2xl border bg-card text-muted-foreground"><Spinner /> Loading products…</div>
        ) : !result?.products.length ? (
          <div className="mt-5 grid min-h-72 place-items-center rounded-2xl border border-dashed bg-card p-8 text-center"><div><PackageOpen className="mx-auto size-10 text-primary" /><h3 className="mt-4 text-lg font-extrabold">No products found</h3><p className="mt-2 text-sm text-muted-foreground">Try another search or category.</p></div></div>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {result.products.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <Link to={`/products/${product.slug}`} className="block aspect-[4/3] bg-accent">
                  {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-3xl font-black text-primary/45">{product.name.slice(0, 2).toUpperCase()}</div>}
                </Link>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2"><Badge variant="outline">{product.category.name}</Badge><span className="text-xs text-muted-foreground">{product.availableQuantity > 0 ? `${product.availableQuantity} available` : 'Out of stock'}</span></div>
                  <h3 className="mt-3 line-clamp-2 text-lg font-extrabold leading-6"><Link to={`/products/${product.slug}`} className="hover:text-primary">{product.name}</Link></h3>
                  <p className="mt-1 text-sm text-muted-foreground">{product.vendor.businessName}</p>
                  <p className="mt-5 font-extrabold text-primary">{formatPrice(product.priceCents, product.currency)}</p>
                </div>
              </article>
            ))}
          </div>
        )}

        {result && result.pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button variant="outline" disabled={page <= 1} onClick={() => updateFilter('page', String(page - 1))}><ArrowLeft /> Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {result.pagination.totalPages}</span>
            <Button variant="outline" disabled={page >= result.pagination.totalPages} onClick={() => updateFilter('page', String(page + 1))}>Next <ArrowRight /></Button>
          </div>
        )}
      </div>
    </main>
  );
}
