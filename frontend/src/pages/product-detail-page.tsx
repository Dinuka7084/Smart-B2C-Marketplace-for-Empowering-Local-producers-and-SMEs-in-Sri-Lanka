import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Heart, Leaf, PackageCheck, ShieldCheck, ShoppingBag, Star, Store } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { useAuth } from '@/auth/auth-context';
import { formatPrice, type CatalogProduct } from '@/catalog/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import type { PublicReview, ReviewEligibility } from '@/engagement/types';
import { apiRequest } from '@/lib/api';

export function ProductDetailPage() {
  const { slug } = useParams();
  const { user, status } = useAuth();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState<{ count: number; averageRating: number | null }>({ count: 0, averageRating: null });
  const [reviewEligibility, setReviewEligibility] = useState<ReviewEligibility | null>(null);
  const [reviewRating, setReviewRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    if (!slug) return;

    apiRequest<{ product: CatalogProduct }>(`/products/${encodeURIComponent(slug)}`)
      .then((data) => active && setProduct(data.product))
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load this product.');
      })
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    let active = true;
    if (!slug) return;
    apiRequest<{ reviews: PublicReview[]; summary: { count: number; averageRating: number | null } }>(`/products/${encodeURIComponent(slug)}/reviews`)
      .then((data) => { if (active) { setReviews(data.reviews); setReviewSummary(data.summary); } })
      .catch(() => undefined);
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    let active = true;
    if (!product || user?.role !== 'customer') return;
    apiRequest<{ saved: boolean }>(`/wishlist/items/${product.id}`)
      .then((data) => { if (active) setSaved(data.saved); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [product, user]);

  useEffect(() => {
    let active = true;
    if (!product || user?.role !== 'customer') return;
    apiRequest<ReviewEligibility>(`/reviews/eligibility/${product.id}`)
      .then((data) => { if (active) setReviewEligibility(data); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [product, user]);

  const addToCart = async () => {
    if (!product) return;
    setAdding(true); setActionError(null); setAdded(false);
    try {
      await apiRequest('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, quantity: Number(quantity) }),
      });
      setAdded(true);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'This product could not be added to your cart.');
    } finally { setAdding(false); }
  };

  const toggleWishlist = async () => {
    if (!product) return;
    setSaving(true); setActionError(null);
    try {
      await apiRequest(saved ? `/wishlist/items/${product.id}` : '/wishlist/items', saved
        ? { method: 'DELETE' }
        : { method: 'POST', body: JSON.stringify({ productId: product.id }) });
      setSaved((current) => !current);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Your wishlist could not be updated.');
    } finally { setSaving(false); }
  };

  const submitReview = async () => {
    if (!product) return;
    setReviewSubmitting(true); setActionError(null);
    try {
      const result = await apiRequest<{ review: { id: string; status: 'pending' } }>('/reviews', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, rating: Number(reviewRating), comment: reviewComment }),
      });
      setReviewEligibility({ eligible: false, review: { id: result.review.id, rating: Number(reviewRating), comment: reviewComment.trim(), status: result.review.status } });
      setReviewComment('');
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Your review could not be submitted.');
    } finally { setReviewSubmitting(false); }
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

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
        <Button variant="ghost" render={<Link to="/products" />}><ArrowLeft /> Back to products</Button>

        {loading ? (
          <div className="mt-6 flex min-h-[28rem] items-center justify-center gap-3 rounded-3xl border bg-card text-muted-foreground"><Spinner /> Loading product…</div>
        ) : error || !product ? (
          <Alert variant="destructive" className="mt-6"><AlertTitle>Product unavailable</AlertTitle><AlertDescription>{error ?? 'This product could not be found.'}</AlertDescription></Alert>
        ) : (
          <>
          <article className="mt-6 grid overflow-hidden rounded-3xl border bg-card shadow-sm lg:grid-cols-[1.08fr_0.92fr]">
            <div className="min-h-80 bg-accent lg:min-h-[38rem]">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full min-h-80 place-items-center text-6xl font-black tracking-[-0.08em] text-primary/35">{product.name.slice(0, 2).toUpperCase()}</div>
              )}
            </div>
            <div className="flex flex-col p-7 sm:p-10 lg:p-12">
              <Badge variant="outline" className="w-fit">{product.category.name}</Badge>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-[-0.045em]">{product.name}</h1>
              <p className="mt-4 text-3xl font-extrabold text-primary">{formatPrice(product.priceCents, product.currency)}</p>

              <div className="mt-7 grid gap-3 border-y py-6 text-sm">
                <div className="flex items-center gap-3"><Store className="size-5 text-primary" /><span>Sold by <strong>{product.vendor.businessName}</strong></span></div>
                <div className="flex items-center gap-3"><ShieldCheck className="size-5 text-primary" /><span>Approved Smart Lanka vendor</span></div>
                <div className="flex items-center gap-3"><PackageCheck className="size-5 text-primary" /><span>{product.availableQuantity > 0 ? `${product.availableQuantity} currently available` : 'Currently out of stock'}</span></div>
              </div>

              <div className="mt-7">
                <h2 className="text-lg font-extrabold">About this product</h2>
                <p className="mt-3 whitespace-pre-line text-base leading-7 text-muted-foreground">{product.description}</p>
              </div>

              <div className="mt-auto pt-9">
                {actionError && <Alert variant="destructive" className="mb-4"><AlertTitle>Action failed</AlertTitle><AlertDescription>{actionError}</AlertDescription></Alert>}
                {added && <Alert className="mb-4"><Check /><AlertTitle>Added to your cart</AlertTitle><AlertDescription><Link to="/cart" className="font-bold text-primary underline">View your cart</Link> or keep shopping.</AlertDescription></Alert>}
                {status === 'loading' ? (
                  <Button className="w-full" size="lg" disabled><Spinner /> Checking your account…</Button>
                ) : !user ? (
                  <Button className="w-full" size="lg" render={<Link to="/login" state={{ from: `/products/${product.slug}` }} />}><ShoppingBag /> Sign in to add to cart</Button>
                ) : user?.role === 'customer' ? (
                  <div className="grid gap-3">
                    <div className="flex gap-3">
                      <NativeSelect className="w-24" size="default" value={quantity} disabled={product.availableQuantity < 1} onChange={(event) => setQuantity(event.target.value)} aria-label="Quantity">
                        {Array.from({ length: Math.min(100, product.availableQuantity) }, (_, index) => index + 1).map((value) => <NativeSelectOption key={value} value={value}>{value}</NativeSelectOption>)}
                      </NativeSelect>
                      <Button className="flex-1" size="lg" disabled={adding || product.availableQuantity < 1} onClick={() => void addToCart()}>{adding ? <Spinner /> : <ShoppingBag />} {product.availableQuantity > 0 ? 'Add to cart' : 'Out of stock'}</Button>
                    </div>
                    <Button variant="outline" size="lg" disabled={saving} onClick={() => void toggleWishlist()}>{saving ? <Spinner /> : <Heart className={saved ? 'fill-current' : ''} />} {saved ? 'Remove from wishlist' : 'Save to wishlist'}</Button>
                  </div>
                ) : (
                  <Button className="w-full" size="lg" disabled>Customer accounts can add products to cart</Button>
                )}
              </div>
            </div>
          </article>

          <section className="mt-6 rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">Verified purchases</p><h2 className="mt-2 text-2xl font-extrabold">Customer reviews</h2></div><div className="text-right"><p className="text-2xl font-extrabold">{reviewSummary.averageRating?.toFixed(1) ?? '—'} <Star className="inline size-5 fill-amber-400 text-amber-400" /></p><p className="text-sm text-muted-foreground">{reviewSummary.count} published {reviewSummary.count === 1 ? 'review' : 'reviews'}</p></div></div>

            {reviewEligibility?.eligible && <div className="mt-6 rounded-2xl border bg-muted/30 p-5"><h3 className="font-extrabold">Review your delivered purchase</h3><div className="mt-4 grid gap-3 sm:grid-cols-[9rem_1fr]"><NativeSelect value={reviewRating} onChange={(event) => setReviewRating(event.target.value)} aria-label="Review rating">{[5, 4, 3, 2, 1].map((rating) => <NativeSelectOption key={rating} value={String(rating)}>{rating} stars</NativeSelectOption>)}</NativeSelect><Textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} minLength={10} maxLength={1000} placeholder="Share what other customers should know" /></div><div className="mt-3 flex justify-end"><Button disabled={reviewSubmitting || reviewComment.trim().length < 10} onClick={() => void submitReview()}>{reviewSubmitting && <Spinner />} Submit for moderation</Button></div></div>}
            {reviewEligibility?.review && <Alert className="mt-6"><Check /><AlertTitle>Review {reviewEligibility.review.status}</AlertTitle><AlertDescription>{reviewEligibility.review.status === 'pending' ? 'Your review is awaiting administrator moderation.' : reviewEligibility.review.status === 'published' ? 'Your verified review is visible below.' : 'This review was not published.'}</AlertDescription></Alert>}

            {reviews.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed p-7 text-center text-sm text-muted-foreground">No published reviews yet.</div> : <div className="mt-6 grid gap-4">{reviews.map((review) => <article key={review.id} className="rounded-2xl border p-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-extrabold">{review.customerFirstName} {review.customerLastName.slice(0, 1)}.</p><span className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`size-4 ${index < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} />)}</span></div><p className="mt-3 leading-7 text-muted-foreground">{review.comment}</p></article>)}</div>}
          </section>
          </>
        )}
      </div>
    </main>
  );
}
