import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, MessageSquareWarning, PackageCheck, ReceiptText } from 'lucide-react';
import { Link } from 'react-router';

import { formatPrice } from '@/catalog/types';
import type { OrderListItem } from '@/checkout/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { apiRequest } from '@/lib/api';

export function CustomerOrdersView() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dateFormat = useMemo(() => new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeStyle: 'short' }), []);

  useEffect(() => {
    let active = true;
    apiRequest<{ orders: OrderListItem[] }>('/orders')
      .then((data) => active && setOrders(data.orders))
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load your orders.');
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Purchase history</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">Your orders</h2><p className="mt-2 text-muted-foreground">Track every Smart Lanka checkout from one place.</p></div>
      {error && <Alert variant="destructive" className="mb-5"><AlertCircle /><AlertTitle>Orders unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {loading ? <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border bg-card text-muted-foreground"><Spinner /> Loading orders…</div> : orders.length === 0 ? <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed bg-card p-8 text-center"><div><ReceiptText className="mx-auto size-10 text-primary" /><h3 className="mt-4 text-lg font-extrabold">No orders yet</h3><p className="mt-2 text-sm text-muted-foreground">Your completed checkouts will appear here.</p><Button className="mt-5" render={<Link to="/products" />}>Browse products</Button></div></div> : <div className="grid gap-4">{orders.map((order) => <article key={order.id} className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><PackageCheck className="size-5" /></span><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold">{order.reference}</h3><Badge variant="outline">{order.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{dateFormat.format(new Date(order.createdAt))}</p></div></div><div className="flex flex-wrap items-center gap-3 sm:justify-end"><p className="mr-1 text-xl font-extrabold text-primary">{formatPrice(order.totalCents, order.currency)}</p><Button variant="outline" render={<Link to={`/account/orders/${order.id}`} />}>View tracking</Button><Button variant="ghost" render={<Link to={`/account/complaints?order=${order.id}`} />}><MessageSquareWarning /> Report issue</Button></div></article>)}</div>}
    </div>
  );
}
