import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, MapPin, MessageSquareWarning, PackageCheck } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { formatPrice } from '@/catalog/types';
import type { FulfilmentStatus, OrderSummary } from '@/checkout/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { apiRequest } from '@/lib/api';

const statusClasses: Record<FulfilmentStatus, string> = {
  placed: 'border-amber-300 bg-amber-50 text-amber-800',
  processing: 'border-blue-300 bg-blue-50 text-blue-800',
  shipped: 'border-violet-300 bg-violet-50 text-violet-800',
  delivered: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  cancelled: 'border-red-300 bg-red-50 text-red-800',
};

const eventLabels: Record<FulfilmentStatus, string> = {
  placed: 'Order placed',
  processing: 'Vendor started processing',
  shipped: 'Order dispatched',
  delivered: 'Order delivered',
  cancelled: 'Order cancelled',
};

export function CustomerOrderDetailView() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeStyle: 'short' }),
    [],
  );

  useEffect(() => {
    let active = true;
    apiRequest<{ order: OrderSummary }>(`/orders/${orderId ?? ''}`)
      .then((data) => { if (active) setOrder(data.order); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Could not load this order.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId]);

  if (loading) return <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border bg-card text-muted-foreground"><Spinner /> Loading order tracking…</div>;

  if (error || !order) {
    return <div className="mx-auto max-w-4xl"><Button variant="ghost" className="mb-4" render={<Link to="/account/orders" />}><ArrowLeft /> Back to orders</Button><Alert variant="destructive"><AlertCircle /><AlertTitle>Order unavailable</AlertTitle><AlertDescription>{error ?? 'This order could not be found.'}</AlertDescription></Alert></div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" render={<Link to="/account/orders" />}><ArrowLeft /> Back to orders</Button>
        <Button variant="outline" render={<Link to={`/account/complaints?order=${order.id}`} />}><MessageSquareWarning /> Report an issue</Button>
      </div>
      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Order tracking</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">{order.reference}</h2><p className="mt-2 text-sm text-muted-foreground">Placed {dateFormat.format(new Date(order.createdAt))}</p></div>
          <div className="sm:text-right"><Badge variant="outline">{order.status}</Badge><p className="mt-3 text-2xl font-extrabold text-primary">{formatPrice(order.totalCents, order.currency)}</p></div>
        </div>
        <div className="mt-6 flex gap-3 rounded-xl bg-muted/45 p-4 text-sm leading-6"><MapPin className="mt-1 size-4 shrink-0 text-primary" /><div><p className="font-bold">Deliver to {order.recipientName}</p><p className="text-muted-foreground">{order.addressLine1}{order.addressLine2 ? `, ${order.addressLine2}` : ''}, {order.city}, {order.district}{order.postalCode ? ` ${order.postalCode}` : ''} · {order.phone}</p></div></div>
      </section>

      <div className="mt-5 grid gap-5">
        {order.vendors.map((vendor) => (
          <section key={vendor.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5 sm:p-6">
              <div><p className="text-sm text-muted-foreground">Fulfilled by</p><h3 className="text-xl font-extrabold">{vendor.vendorName}</h3></div>
              <Badge variant="outline" className={statusClasses[vendor.status]}>{vendor.status}</Badge>
            </div>

            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_0.85fr]">
              <div>
                <h4 className="font-extrabold">Items</h4>
                <div className="mt-3 grid gap-3">
                  {vendor.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl border p-3">
                      {item.imageUrl ? <img src={item.imageUrl} alt="" className="size-12 rounded-lg object-cover" /> : <span className="grid size-12 place-items-center rounded-lg bg-muted"><PackageCheck className="size-5 text-muted-foreground" /></span>}
                      <div className="min-w-0 flex-1"><p className="truncate font-bold">{item.productName}</p><p className="text-sm text-muted-foreground">Quantity {item.quantity}</p></div>
                      <p className="font-bold">{formatPrice(item.lineTotalCents, order.currency)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-between border-t pt-4 font-extrabold"><span>Vendor subtotal</span><span>{formatPrice(vendor.subtotalCents, order.currency)}</span></div>
              </div>

              <div>
                <h4 className="font-extrabold">Tracking timeline</h4>
                <ol className="mt-4">
                  {vendor.history.map((event, index) => (
                    <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
                      {index < vendor.history.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-border" />}
                      <span className="z-10 grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-4" /></span>
                      <div><p className="font-bold">{eventLabels[event.nextStatus]}</p><p className="mt-0.5 text-xs text-muted-foreground">{dateFormat.format(new Date(event.createdAt))}</p>{event.note && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{event.note}</p>}</div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
