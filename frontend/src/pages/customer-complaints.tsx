import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, MessageSquareWarning } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';

import type { OrderListItem } from '@/checkout/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import type { ComplaintStatus, CustomerComplaint } from '@/engagement/types';
import { apiRequest } from '@/lib/api';

const statusClasses: Record<ComplaintStatus, string> = {
  open: 'border-amber-300 bg-amber-50 text-amber-800',
  in_review: 'border-blue-300 bg-blue-50 text-blue-800',
  resolved: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  dismissed: 'border-slate-300 bg-slate-50 text-slate-700',
};

export function CustomerComplaintsView() {
  const [searchParams] = useSearchParams();
  const requestedOrderId = searchParams.get('order') ?? '';
  const [complaints, setComplaints] = useState<CustomerComplaint[]>([]);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [orderId, setOrderId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const dateFormat = useMemo(() => new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeStyle: 'short' }), []);
  const fetchComplaints = useCallback(() => apiRequest<{ complaints: CustomerComplaint[] }>('/complaints'), []);

  useEffect(() => {
    let active = true;
    Promise.all([fetchComplaints(), apiRequest<{ orders: OrderListItem[] }>('/orders')])
      .then(([complaintData, orderData]) => {
        if (!active) return;
        setComplaints(complaintData.complaints);
        setOrders(orderData.orders);
        setOrderId(
          orderData.orders.some((order) => order.id === requestedOrderId)
            ? requestedOrderId
            : (orderData.orders[0]?.id ?? ''),
        );
      })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Could not load support requests.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchComplaints, requestedOrderId]);

  const submit = async () => {
    setSubmitting(true); setError(null); setSubmitted(false);
    try {
      await apiRequest('/complaints', { method: 'POST', body: JSON.stringify({ checkoutOrderId: orderId, subject, description }) });
      const data = await fetchComplaints();
      setComplaints(data.complaints);
      setSubject(''); setDescription(''); setSubmitted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your complaint could not be submitted.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Customer support</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">Order complaints</h2><p className="mt-2 text-muted-foreground">Report an issue against one of your Smart Lanka orders and follow its resolution.</p></div>
      {error && <Alert variant="destructive" className="mb-5"><AlertCircle /><AlertTitle>Support request failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {submitted && <Alert className="mb-5"><CheckCircle2 /><AlertTitle>Complaint submitted</AlertTitle><AlertDescription>An administrator can now review your request.</AlertDescription></Alert>}
      {loading ? <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border bg-card text-muted-foreground"><Spinner /> Loading support requests…</div> : (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"><h3 className="text-xl font-extrabold">Submit a complaint</h3>{orders.length === 0 ? <div className="mt-5 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">You need an order before opening a complaint.</div> : <div className="mt-5 grid gap-4"><label className="grid gap-2 text-sm font-bold">Related order<NativeSelect value={orderId} onChange={(event) => setOrderId(event.target.value)}>{orders.map((order) => <NativeSelectOption key={order.id} value={order.id}>{order.reference}</NativeSelectOption>)}</NativeSelect></label><label htmlFor="complaint-subject" className="grid gap-2 text-sm font-bold">Subject<Input id="complaint-subject" value={subject} onChange={(event) => setSubject(event.target.value)} minLength={5} maxLength={160} placeholder="What went wrong?" /></label><label htmlFor="complaint-details" className="grid gap-2 text-sm font-bold">Details<Textarea id="complaint-details" value={description} onChange={(event) => setDescription(event.target.value)} minLength={20} maxLength={3000} rows={6} placeholder="Describe the problem and the outcome you need" /></label><Button disabled={submitting || !orderId || subject.trim().length < 5 || description.trim().length < 20} onClick={() => void submit()}>{submitting && <Spinner />} Submit complaint</Button></div>}</section>
          <section><h3 className="text-xl font-extrabold">Your requests</h3>{complaints.length === 0 ? <div className="mt-4 grid min-h-52 place-items-center rounded-2xl border border-dashed bg-card p-7 text-center"><div><MessageSquareWarning className="mx-auto size-9 text-primary" /><p className="mt-3 font-bold">No complaints submitted</p></div></div> : <div className="mt-4 grid gap-4">{complaints.map((complaint) => <article key={complaint.id} className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-extrabold">{complaint.subject}</h4><Button variant="link" className="h-auto p-0 text-sm" render={<Link to={`/account/orders/${complaint.checkoutOrderId}`} />}>{complaint.orderReference}</Button></div><Badge variant="outline" className={statusClasses[complaint.status]}>{complaint.status.replace('_', ' ')}</Badge></div><p className="mt-3 text-sm leading-6 text-muted-foreground">{complaint.description}</p>{complaint.resolutionNote && <div className="mt-4 rounded-xl bg-muted p-4"><p className="text-sm font-bold">Administrator response</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{complaint.resolutionNote}</p></div>}<p className="mt-4 text-xs text-muted-foreground">Opened {dateFormat.format(new Date(complaint.createdAt))}</p></article>)}</div>}</section>
        </div>
      )}
    </div>
  );
}
