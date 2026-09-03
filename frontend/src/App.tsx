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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const categories = [
  { name: 'Spice & pantry', detail: 'Harvested close to home', icon: Leaf },
  { name: 'Home & craft', detail: 'Made by skilled hands', icon: Sparkles },
  { name: 'Handloom & wear', detail: 'Small-batch textiles', icon: ShoppingBag },
  { name: 'Wellness', detail: 'Naturally considered', icon: Heart },
];

const products = [
  {
    name: 'Ceylon cinnamon pantry set',
    maker: 'Serendib Spice House · Matale',
    price: 'LKR 3,450',
    accent: 'bg-[#d56c2f]',
    mark: 'CS',
  },
  {
    name: 'Hand-thrown clay tea set',
    maker: 'Mihikatha Studio · Kegalle',
    price: 'LKR 5,900',
    accent: 'bg-[#a85136]',
    mark: 'CT',
  },
  {
    name: 'Natural coconut soap trio',
    maker: 'Sudu Pol · Kurunegala',
    price: 'LKR 1,850',
    accent: 'bg-[#9eaa75]',
    mark: 'NS',
  },
];

export default function App() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground">
        Discover goods made by Sri Lankan producers and growing local businesses.
      </div>

      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-5 px-5 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="Smart Lanka home">
            <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Leaf className="size-5" strokeWidth={2.4} />
            </span>
            <span className="text-lg font-extrabold tracking-[-0.04em]">Smart Lanka</span>
          </Link>

          <nav className="ml-4 hidden items-center gap-7 text-sm font-semibold lg:flex" aria-label="Primary navigation">
            <a className="transition-colors hover:text-primary" href="#featured">Shop</a>
            <a className="transition-colors hover:text-primary" href="#categories">Categories</a>
            <a className="transition-colors hover:text-primary" href="#for-producers">For producers</a>
          </nav>

          <form className="relative ml-auto hidden w-full max-w-sm md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 rounded-full border-border bg-muted/60 pl-10 pr-4 text-base md:text-sm"
              name="q"
              placeholder="Search local products"
              aria-label="Search local products"
            />
          </form>

          <Link
            className="hidden text-sm font-semibold sm:block"
            to={user ? dashboardPathFor(user) : '/login'}
          >
            {user ? 'My workspace' : 'Sign in'}
          </Link>
          <Button variant="outline" size="icon-lg" className="rounded-full" aria-label="Open shopping cart">
            <ShoppingBag />
          </Button>
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
              <a
                href="#featured"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f4c95d] px-6 text-base font-bold text-[#143f32] transition hover:bg-[#ffd978] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
              >
                Explore products <ArrowRight className="size-4" />
              </a>
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
          <a href="#featured" className="hidden items-center gap-2 text-sm font-bold text-primary sm:flex">
            View all categories <ArrowRight className="size-4" />
          </a>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map(({ name, detail, icon: Icon }) => (
            <a
              key={name}
              href="#featured"
              className="group rounded-[1.4rem] border border-border bg-card p-5 shadow-[0_10px_30px_rgba(20,63,50,0.06)] transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_16px_36px_rgba(20,63,50,0.10)]"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-accent text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-6 text-lg font-bold">{name}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
            </a>
          ))}
        </div>
      </section>

      <section id="featured" className="border-y border-border bg-muted/45">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Fresh from local makers</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">A first look at the marketplace</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Representative products for the first build slice. Live inventory, search and vendor data will follow from Neon.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {products.map((product) => (
              <article key={product.name} className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-sm">
                <div className={`${product.accent} grid aspect-[4/3] place-items-center text-white`}>
                  <span className="grid size-24 place-items-center rounded-full border border-white/40 bg-white/12 text-3xl font-black tracking-[-0.08em] backdrop-blur-sm">
                    {product.mark}
                  </span>
                </div>
                <div className="p-5">
                  <p className="text-sm leading-6 text-muted-foreground">{product.maker}</p>
                  <h3 className="mt-1 text-lg font-bold leading-6">{product.name}</h3>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="font-extrabold text-primary">{product.price}</span>
                    <Button variant="outline" size="icon" className="rounded-full" aria-label={`Save ${product.name} to wishlist`}>
                      <Heart />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
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
          <div className="flex items-center justify-center border-t border-[#143f32]/15 bg-[#143f32] p-8 lg:border-l lg:border-t-0">
              <Link
                to="/register?role=vendor"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-base font-bold text-[#143f32] transition hover:bg-[#f6f4ec] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
            >
              Become a vendor <ArrowRight className="size-4" />
              </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-[#103229] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span className="font-bold">Smart Lanka <span className="font-normal text-white/65">· A marketplace for Sri Lankan enterprise</span></span>
          <span className="text-white/60">Customer, vendor and administrator access is now available</span>
        </div>
      </footer>
    </main>
  );
}
