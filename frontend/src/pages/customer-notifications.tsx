import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, PackageCheck } from 'lucide-react';
import { useNavigate } from 'react-router';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { NotificationItem } from '@/engagement/types';
import { apiRequest } from '@/lib/api';

export function CustomerNotificationsView() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const dateFormat = useMemo(() => new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeStyle: 'short' }), []);

  useEffect(() => {
    let active = true;
    apiRequest<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications')
      .then((data) => { if (active) { setItems(data.notifications); setUnreadCount(data.unreadCount); } })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Could not load notifications.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const openNotification = async (item: NotificationItem) => {
    setError(null);
    try {
      if (!item.isRead) {
        await apiRequest(`/notifications/${item.id}/read`, { method: 'PATCH' });
        setItems((current) => current.map((record) => record.id === item.id ? { ...record, isRead: true } : record));
        setUnreadCount((current) => Math.max(0, current - 1));
      }
      if (item.link) void navigate(item.link);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open this notification.');
    }
  };

  const markAllRead = async () => {
    setUpdating(true);
    try {
      await apiRequest('/notifications/read-all', { method: 'PATCH' });
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update notifications.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Account activity</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">Notifications</h2><p className="mt-2 text-muted-foreground">Checkout and fulfilment updates from your orders.</p></div>{unreadCount > 0 && <Button variant="outline" disabled={updating} onClick={() => void markAllRead()}>{updating ? <Spinner /> : <CheckCheck />} Mark all read</Button>}</div>
      {error && <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
      {loading ? <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border bg-card text-muted-foreground"><Spinner /> Loading notifications…</div> : items.length === 0 ? <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed bg-card p-8 text-center"><div><Bell className="mx-auto size-10 text-primary" /><h3 className="mt-4 text-lg font-extrabold">No notifications yet</h3><p className="mt-2 text-sm text-muted-foreground">Order updates will appear here.</p></div></div> : <div className="grid gap-3">{items.map((item) => <button key={item.id} type="button" className={`flex w-full gap-4 rounded-2xl border p-5 text-left shadow-sm transition hover:border-primary/40 ${item.isRead ? 'bg-card' : 'border-primary/25 bg-primary/5'}`} onClick={() => void openNotification(item)}><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${item.isRead ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'}`}><PackageCheck className="size-5" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong>{item.title}</strong>{!item.isRead && <Badge>New</Badge>}</span><span className="mt-1 block text-sm leading-6 text-muted-foreground">{item.message}</span><span className="mt-2 block text-xs text-muted-foreground">{dateFormat.format(new Date(item.createdAt))}</span></span></button>)}</div>}
    </div>
  );
}
