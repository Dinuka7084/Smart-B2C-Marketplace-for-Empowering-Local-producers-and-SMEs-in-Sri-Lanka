import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Heart,
  Leaf,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
} from 'lucide-react';
import { Link } from 'react-router';

import { useAuth } from '@/auth/auth-context';
import { dashboardPathFor } from '@/auth/paths';
import { BrandMark } from '@/components/brand-logo';
import { CartDrawer } from '@/components/cart-drawer';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice, type CatalogProduct } from '@/catalog/types';
import { apiRequest } from '@/lib/api';

const categories = [
  { name: 'Spice & pantry', slug: 'spice-pantry', detail: 'Harvested close to home', icon: Leaf },
  { name: 'Home & craft', slug: 'home-craft', detail: 'Made by skilled hands', icon: Sparkles },
  { name: 'Handloom & wear', slug: 'handloom-wear', detail: 'Small-batch textiles', icon: ShoppingBag },
  { name: 'Wellness', slug: 'wellness', detail: 'Naturally considered', icon: Heart },
];

export default function App() {
  const { user } = useAuth();
  const [featuredProducts, setFeaturedProducts] = useState<CatalogProduct[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState(false);

  useEffect(() => {
    let active = true;

    apiRequest<{ products: CatalogProduct[] }>('/products?page=1&pageSize=3&sort=newest')
      .then((data) => {
        if (active) setFeaturedProducts(data.products);
      })
      .catch(() => {
        if (active) setFeaturedError(true);
      })
      .finally(() => {
        if (active) setFeaturedLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background text-foreground outline-none">
      <div className="bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground">
        Discover goods made by Sri Lankan producers and growing local businesses.
      </div>

      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-5 px-5 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="Smart Lanka home">
            <BrandMark markClassName="size-10" textClassName="text-lg" />
          </Link>

          <nav className="ml-4 hidden items-center gap-7 text-sm font-semibold lg:flex" aria-label="Primary navigation">
            <Link className="transition-colors hover:text-primary" to="/products">Shop</Link>
            <a className="transition-colors hover:text-primary" href="#categories">Categories</a>
            <a className="transition-colors hover:text-primary" href="#for-producers">For producers</a>
          </nav>

          <form action="/products" method="get" className="relative ml-auto hidden w-full max-w-sm md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 rounded-full border-border bg-muted/60 pl-10 pr-4 text-base md:text-sm"
              name="q"
              placeholder="Search local products"
              aria-label="Search local products"
            />
          </form>

          <ThemeToggle className="rounded-full size-10" />

          <Link
            className="hidden text-sm font-semibold sm:block"
            to={user ? dashboardPathFor(user) : '/login'}
          >
            {user ? 'My workspace' : 'Sign in'}
          </Link>
          <CartDrawer />
        </div>
      </header>

      <section id="top" className="mx-auto max-w-7xl px-5 pb-10 pt-6 lg:px-8 lg:pb-16 lg:pt-10">
        <div className="relative isolate min-h-[590px] overflow-hidden rounded-[2rem] bg-[#143f32] text-white shadow-[0_24px_70px_rgba(16,52,41,0.18)] lg:min-h-[620px]">
          <img
            src="/marketplace-hero.png"
            alt="Sri Lankan basketry, clayware, spices, textiles, soap and tropical produce arranged by an artisan"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-[64%_center] opacity-75 lg:object-center lg:opacity-95"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,43,33,0.98)_0%,rgba(9,43,33,0.87)_38%,rgba(9,43,33,0.15)_72%,rgba(9,43,33,0.08)_100%)]" />
          <div className="relative flex min-h-[590px] max-w-2xl flex-col justify-center px-7 py-16 sm:px-12 lg:min-h-[620px] lg:px-16">
            <span className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
              <Sparkles className="size-4 text-[#f4c95d]" />
              From local hands to your home
            </span>
            <h1 className="max-w-xl text-5xl font-extrabold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Made here.
              <span className="block text-[#f4c95d]">Chosen with care.</span>
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-white/82">
              Shop food, craft, homeware and everyday goods directly from Sri Lankan producers and independent businesses.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/products"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f4c95d] px-6 text-base font-bold text-[#143f32] transition hover:bg-[#ffd978] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
              >
                Explore products <ArrowRight className="size-4" />
              </Link>
              <a
                href="#for-producers"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 bg-white/10 px-6 text-base font-bold text-white backdrop-blur-sm transition hover:bg-white/18 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
              >
                Sell on Smart Lanka
              </a>
            </div>
            <div className="mt-12 grid max-w-lg grid-cols-1 gap-3 text-sm text-white/86 sm:grid-cols-3">
              <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#f4c95d]" /> Verified sellers</span>
              <span className="flex items-center gap-2"><PackageCheck className="size-4 text-[#f4c95d]" /> Order tracking</span>
              <span className="flex items-center gap-2"><Store className="size-4 text-[#f4c95d]" /> Local businesses</span>
            </div>
          </div>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-16">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Browse your way</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">Find something made nearby</h2>
          </div>
          <Link to="/products" className="hidden items-center gap-2 text-sm font-bold text-primary sm:flex">
            View all categories <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map(({ name, slug, detail, icon: Icon }) => (
            <Link
              key={name}
              to={`/products?category=${slug}`}
              className="group rounded-[1.4rem] border border-border bg-card p-5 shadow-[0_10px_30px_rgba(20,63,50,0.06)] transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_16px_36px_rgba(20,63,50,0.10)]"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-accent text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-6 text-lg font-bold">{name}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="featured" className="border-y border-border bg-muted/45">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Fresh from local makers</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">Newest in the marketplace</h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                Recently published products from approved Sri Lankan vendors.
              </p>
            </div>
            <Button render={<Link to="/products" />}>Browse live catalog <ArrowRight /></Button>
          </div>
          {featuredLoading ? (
            <div className="grid gap-5 md:grid-cols-3" aria-label="Loading newest products">
              {[0, 1, 2].map((item) => (
                <div key={item} className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-sm">
                  <Skeleton className="aspect-[4/3] rounded-none" />
                  <div className="space-y-3 p-5"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-6 w-4/5" /><Skeleton className="h-5 w-1/3" /></div>
                </div>
              ))}
            </div>
          ) : featuredError ? (
            <output className="block rounded-[1.5rem] border border-dashed bg-card p-8 text-center">
              <p className="font-bold">The newest products could not be loaded.</p>
              <p className="mt-2 text-sm text-muted-foreground">Open the catalogue to try again.</p>
            </output>
          ) : featuredProducts.length === 0 ? (
            <output className="block rounded-[1.5rem] border border-dashed bg-card p-8 text-center">
              <p className="font-bold">No published products yet</p>
              <p className="mt-2 text-sm text-muted-foreground">New vendor listings will appear here after approval.</p>
            </output>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {featuredProducts.map((product) => (
                <article key={product.id} className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-sm">
                  <Link to={`/products/${product.slug}`} className="block aspect-[4/3] overflow-hidden bg-accent">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]" />
                    ) : (
                      <span className="grid h-full place-items-center text-4xl font-black text-primary/45">{product.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </Link>
                  <div className="p-5">
                    <p className="text-sm leading-6 text-muted-foreground">{product.vendor.businessName} · {product.category.name}</p>
                    <h3 className="mt-1 text-lg font-bold leading-6"><Link to={`/products/${product.slug}`} className="transition-colors hover:text-primary">{product.name}</Link></h3>
                    <div className="mt-5 flex items-end justify-between gap-3">
                      <div>
                        <p className="font-extrabold text-primary">{formatPrice(product.priceCents, product.currency)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{product.availableQuantity > 0 ? `${product.availableQuantity} available` : 'Out of stock'}</p>
                      </div>
                      <Button variant="outline" size="icon" className="rounded-full" aria-label={`View ${product.name}`} render={<Link to={`/products/${product.slug}`} />}>
                        <ArrowRight />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="for-producers" className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="grid overflow-hidden rounded-[2rem] bg-[#f0bd45] lg:grid-cols-[1.35fr_0.65fr]">
          <div className="p-8 sm:p-12 lg:p-14">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#143f32]">Built for small business</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-[-0.04em] text-[#143f32] sm:text-4xl">
              Your craft deserves a wider market.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#143f32]/78">
              Manage products, stock and orders in one place, understand what is selling, and grow with practical marketplace tools.
            </p>
          </div>
          <div className="relative isolate flex min-h-64 items-center justify-center overflow-hidden border-t border-[#143f32]/15 bg-[#143f32] p-8 lg:min-h-0 lg:border-l lg:border-t-0">
            <img
              src="/vendor-craft-banner.png"
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 -z-10 bg-[#143f32]/50" aria-hidden="true" />
              <Link
                to="/register?role=vendor"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-base font-bold text-[#143f32] shadow-lg transition hover:bg-[#f6f4ec] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
              >
                Become a vendor <ArrowRight className="size-4" />
              </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#103229] text-white">
        <div className="mx-auto max-w-7xl px-5 pb-8 pt-12 lg:px-8 lg:pt-16">
          <div className="grid gap-10 border-b border-white/12 pb-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.9fr] lg:gap-12">
            <div className="max-w-sm">
              <Link to="/" aria-label="Smart Lanka home">
                <BrandMark markClassName="size-12" textClassName="text-xl text-white" />
              </Link>
              <p className="mt-5 text-sm leading-7 text-white/65">
                A local marketplace connecting Sri Lankan producers and growing businesses with customers who value goods made close to home.
              </p>
            </div>

            <nav aria-label="Marketplace footer navigation">
              <h2 className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#f4c95d]">Marketplace</h2>
              <ul className="mt-4 grid gap-3 text-sm text-white/70">
                <li><Link className="transition-colors hover:text-white" to="/products">Shop all products</Link></li>
                <li><a className="transition-colors hover:text-white" href="#categories">Browse categories</a></li>
                <li><a className="transition-colors hover:text-white" href="#featured">Newest products</a></li>
                <li><Link className="transition-colors hover:text-white" to="/cart">Shopping cart</Link></li>
              </ul>
            </nav>

            <nav aria-label="Seller footer navigation">
              <h2 className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#f4c95d]">For sellers</h2>
              <ul className="mt-4 grid gap-3 text-sm text-white/70">
                <li><a className="transition-colors hover:text-white" href="#for-producers">Seller benefits</a></li>
                <li><Link className="transition-colors hover:text-white" to="/register?role=vendor">Become a vendor</Link></li>
                <li><Link className="transition-colors hover:text-white" to="/login">Vendor sign in</Link></li>
              </ul>
            </nav>

            <nav aria-label="Account footer navigation">
              <h2 className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#f4c95d]">Your account</h2>
              <ul className="mt-4 grid gap-3 text-sm text-white/70">
                {user ? (
                  <>
                    <li><Link className="transition-colors hover:text-white" to={dashboardPathFor(user)}>My workspace</Link></li>
                    {user.role === 'customer' && <li><Link className="transition-colors hover:text-white" to="/account/orders">My orders</Link></li>}
                    {user.role === 'customer' && <li><Link className="transition-colors hover:text-white" to="/account/complaints">Support & complaints</Link></li>}
                  </>
                ) : (
                  <>
                    <li><Link className="transition-colors hover:text-white" to="/login">Sign in</Link></li>
                    <li><Link className="transition-colors hover:text-white" to="/register">Create customer account</Link></li>
                  </>
                )}
              </ul>
            </nav>
          </div>

          <div className="flex flex-col gap-3 pt-7 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Smart Lanka. Supporting Sri Lankan enterprise.</p>
            <p>Customer, vendor and administrator access available.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
