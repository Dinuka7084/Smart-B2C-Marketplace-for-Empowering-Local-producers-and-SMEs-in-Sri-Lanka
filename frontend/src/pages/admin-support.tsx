import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, MessageSquareWarning, ShieldCheck, Star, X } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import type { ComplaintStatus } from '@/engagement/types';
import { apiRequest } from '@/lib/api';

type PendingReview = { id: string; rating: number; comment: string; createdAt: string; productName: string; customerFirstName: string; customerLastName: string };
type AdminComplaint = { id: string; orderReference: string; customerFirstName: string; customerLastName: string; customerEmail: string; subject: string; description: string; status: ComplaintStatus; resolutionNote: string | null; createdAt: string; updatedAt: string };

export function AdminSupportView() {
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [resolution, setResolution] = useState<{ id: string; status: 'resolved' | 'dismissed' } | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const fetchQueues = useCallback(
    () => Promise.all([
      apiRequest<{ reviews: PendingReview[] }>('/admin/reviews/pending'),
      apiRequest<{ complaints: AdminComplaint[] }>('/admin/complaints'),
    ]),
    [],
  );

  useEffect(() => {
    let active = true;
    fetchQueues()
      .then(([reviewData, complaintData]) => { if (active) { setReviews(reviewData.reviews); setComplaints(complaintData.complaints); } })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Could not load moderation queues.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchQueues]);

  const moderateReview = async (id: string, status: 'published' | 'rejected') => {
    setActionId(id); setError(null);
    try {
      await apiRequest(`/admin/reviews/${id}/moderation`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setReviews((current) => current.filter((review) => review.id !== id));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The review decision could not be saved.'); }
    finally { setActionId(null); }
  };

  const updateComplaint = async (id: string, status: 'in_review' | 'resolved' | 'dismissed', note?: string) => {
    setActionId(id); setError(null);
    try {
      await apiRequest(`/admin/complaints/${id}`, { method: 'PATCH', body: JSON.stringify({ status, ...(note ? { resolutionNote: note } : {}) }) });
      const [, complaintData] = await fetchQueues();
      setComplaints(complaintData.complaints);
      setResolution(null); setResolutionNote('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The complaint decision could not be saved.'); }
    finally { setActionId(null); }
  };

  if (loading) return <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border bg-card text-muted-foreground"><Spinner /> Loading moderation queues…</div>;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Trust and support</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">Moderation queues</h2><p className="mt-2 text-muted-foreground">Publish verified reviews and resolve customer order complaints.</p></div>
      {error && <Alert variant="destructive" className="mb-5"><AlertCircle /><AlertTitle>Moderation action failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      <section><div className="flex items-center justify-between"><h3 className="text-xl font-extrabold">Pending reviews</h3><Badge variant="outline">{reviews.length}</Badge></div>{reviews.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed bg-card p-7 text-center text-sm text-muted-foreground">No reviews awaiting moderation.</div> : <div className="mt-4 grid gap-4">{reviews.map((review) => <article key={review.id} className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-extrabold">{review.productName}</h4><p className="mt-1 text-sm text-muted-foreground">{review.customerFirstName} {review.customerLastName}</p></div><span className="flex items-center gap-1 font-bold">{review.rating}<Star className="size-4 fill-amber-400 text-amber-400" /></span></div><p className="mt-4 leading-7 text-muted-foreground">{review.comment}</p><div className="mt-4 flex justify-end gap-2"><Button variant="outline" disabled={actionId === review.id} onClick={() => void moderateReview(review.id, 'rejected')}><X /> Reject</Button><Button disabled={actionId === review.id} onClick={() => void moderateReview(review.id, 'published')}>{actionId === review.id ? <Spinner /> : <Check />} Publish</Button></div></article>)}</div>}</section>

      <section className="mt-9"><div className="flex items-center justify-between"><h3 className="text-xl font-extrabold">Customer complaints</h3><Badge variant="outline">{complaints.filter((item) => item.status === 'open' || item.status === 'in_review').length} active</Badge></div>{complaints.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed bg-card p-7 text-center text-sm text-muted-foreground">No customer complaints.</div> : <div className="mt-4 grid gap-4">{complaints.map((complaint) => <article key={complaint.id} className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-extrabold">{complaint.subject}</h4><p className="mt-1 text-sm text-muted-foreground">{complaint.orderReference} · {complaint.customerFirstName} {complaint.customerLastName} · {complaint.customerEmail}</p></div><Badge variant="outline">{complaint.status.replace('_', ' ')}</Badge></div><p className="mt-4 leading-7 text-muted-foreground">{complaint.description}</p>{complaint.resolutionNote && <p className="mt-4 rounded-xl bg-muted p-3 text-sm"><strong>Response:</strong> {complaint.resolutionNote}</p>}{(complaint.status === 'open' || complaint.status === 'in_review') && <div className="mt-4 border-t pt-4">{resolution?.id === complaint.id ? <div className="grid gap-3"><Textarea value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} placeholder="Explain the decision to the customer" maxLength={2000} /><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => { setResolution(null); setResolutionNote(''); }}>Cancel</Button><Button variant={resolution.status === 'dismissed' ? 'destructive' : 'default'} disabled={resolutionNote.trim().length < 3 || actionId === complaint.id} onClick={() => void updateComplaint(complaint.id, resolution.status, resolutionNote.trim())}>{actionId === complaint.id && <Spinner />} Confirm {resolution.status}</Button></div></div> : <div className="flex flex-wrap justify-end gap-2">{complaint.status === 'open' && <Button variant="outline" disabled={actionId === complaint.id} onClick={() => void updateComplaint(complaint.id, 'in_review')}><ShieldCheck /> Start review</Button>}<Button variant="outline" onClick={() => setResolution({ id: complaint.id, status: 'dismissed' })}><MessageSquareWarning /> Dismiss</Button><Button onClick={() => setResolution({ id: complaint.id, status: 'resolved' })}><Check /> Resolve</Button></div>}</div>}</article>)}</div>}</section>
    </div>
  );
}
