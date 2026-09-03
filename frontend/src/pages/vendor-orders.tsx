import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, MapPin, PackageCheck, Phone, Truck } from 'lucide-react';

import { formatPrice } from '@/catalog/types';
import type {
  FulfilmentStatus,
  VendorFulfilmentOrder,
} from '@/checkout/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api';

const actionLabels: Partial<Record<FulfilmentStatus, string>> = {
  processing: 'Start processing',
  shipped: 'Mark as shipped',
  delivered: 'Mark as delivered',
  cancelled: 'Cancel order',
};

const statusClasses: Record<FulfilmentStatus, string> = {
  placed: 'border-amber-300 bg-amber-50 text-amber-800',
  processing: 'border-blue-300 bg-blue-50 text-blue-800',
  shipped: 'border-violet-300 bg-violet-50 text-violet-800',
  delivered: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  cancelled: 'border-red-300 bg-red-50 text-red-800',
};

export function VendorOrdersView() {
  const [orders, setOrders] = useState<VendorFulfilmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<VendorFulfilmentOrder | null>(null);
  const [cancelNote, setCancelNote] = useState('');

  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeStyle: 'short' }),
    [],
  );

  const fetchOrders = useCallback(
    () => apiRequest<{ orders: VendorFulfilmentOrder[] }>('/vendor/orders'),
    [],
  );

  useEffect(() => {
    let active = true;
    fetchOrders()
      .then((data) => {
        if (active) setOrders(data.orders);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load fulfilment orders.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [fetchOrders]);

  const updateStatus = async (
    order: VendorFulfilmentOrder,
    nextStatus: FulfilmentStatus,
    note?: string,
  ) => {
    setUpdatingId(order.id);
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/vendor/orders/${order.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ nextStatus, ...(note ? { note } : {}) }),
      });
      const data = await fetchOrders();
      setOrders(data.orders);
      setNotice(`${order.reference} is now ${nextStatus}.`);
      setCancellingOrder(null);
      setCancelNote('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The order status could not be updated.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Fulfilment queue</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">Vendor orders</h2>
        <p className="mt-2 text-muted-foreground">Prepare, dispatch and complete orders placed with your store.</p>
      </div>

      {error && <Alert variant="destructive" className="mb-5"><AlertCircle /><AlertTitle>Order update failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {notice && <Alert className="mb-5 border-primary/30 bg-primary/5"><PackageCheck /><AlertTitle>Order updated</AlertTitle><AlertDescription>{notice}</AlertDescription></Alert>}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border bg-card text-muted-foreground"><Spinner /> Loading fulfilment queue…</div>
      ) : orders.length === 0 ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed bg-card p-8 text-center">
          <div><PackageCheck className="mx-auto size-10 text-primary" /><h3 className="mt-4 text-lg font-extrabold">No orders to fulfil</h3><p className="mt-2 text-sm text-muted-foreground">New customer purchases from your store will appear here.</p></div>
        </div>
      ) : (
        <div className="grid gap-5">
          {orders.map((order) => (
            <article key={order.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-extrabold">{order.reference}</h3>
                    <Badge variant="outline" className={statusClasses[order.status]}>{order.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Placed {dateFormat.format(new Date(order.createdAt))}</p>
                </div>
                <p className="text-xl font-extrabold text-primary">{formatPrice(order.subtotalCents, order.currency)}</p>
              </div>

              <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_0.8fr]">
                <div>
                  <h4 className="text-sm font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Items</h4>
                  <div className="mt-3 grid gap-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 rounded-xl border bg-muted/25 p-3">
                        {item.imageUrl ? <img src={item.imageUrl} alt="" className="size-14 rounded-lg object-cover" /> : <span className="grid size-14 place-items-center rounded-lg bg-muted"><PackageCheck className="size-5 text-muted-foreground" /></span>}
                        <div className="min-w-0 flex-1"><p className="truncate font-bold">{item.productName}</p><p className="text-sm text-muted-foreground">Quantity {item.quantity}</p></div>
                        <p className="font-bold">{formatPrice(item.lineTotalCents, order.currency)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/25 p-4">
                  <h4 className="font-extrabold">Delivery details</h4>
                  <p className="mt-3 font-bold">{order.recipientName}</p>
                  <p className="mt-2 flex gap-2 text-sm leading-6 text-muted-foreground"><MapPin className="mt-1 size-4 shrink-0" />{order.addressLine1}{order.addressLine2 ? `, ${order.addressLine2}` : ''}, {order.city}, {order.district}{order.postalCode ? ` ${order.postalCode}` : ''}</p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Phone className="size-4" />{order.phone}</p>
                </div>
              </div>

              {order.allowedNextStatuses.length > 0 && (
                <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/20 px-5 py-4 sm:px-6">
                  {order.allowedNextStatuses.map((nextStatus) => nextStatus === 'cancelled' ? (
                    <Button key={nextStatus} variant="outline" disabled={updatingId === order.id} onClick={() => setCancellingOrder(order)}>Cancel order</Button>
                  ) : (
                    <Button key={nextStatus} disabled={updatingId === order.id} onClick={() => void updateStatus(order, nextStatus)}>
                      {updatingId === order.id ? <Spinner /> : <Truck />}{actionLabels[nextStatus]}
                    </Button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <AlertDialog open={Boolean(cancellingOrder)} onOpenChange={(open) => { if (!open) { setCancellingOrder(null); setCancelNote(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {cancellingOrder?.reference}?</AlertDialogTitle>
            <AlertDialogDescription>This stops fulfilment for your portion of the checkout. The customer will see the cancellation and your reason.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea aria-label="Cancellation reason" placeholder="Explain why this order is being cancelled" value={cancelNote} onChange={(event) => setCancelNote(event.target.value)} maxLength={1000} />
          <AlertDialogFooter>
            <AlertDialogCancel>Keep order</AlertDialogCancel>
            <Button variant="destructive" disabled={!cancellingOrder || cancelNote.trim().length < 3 || updatingId === cancellingOrder.id} onClick={() => cancellingOrder && void updateStatus(cancellingOrder, 'cancelled', cancelNote.trim())}>
              {cancellingOrder && updatingId === cancellingOrder.id && <Spinner />} Confirm cancellation
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
