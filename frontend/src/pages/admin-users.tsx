import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Ban, Search, ShieldCheck, UserRoundCheck, Users } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { apiRequest, type UserRole, type VendorApprovalStatus } from '@/lib/api';

type ManagedUser = { id: string; email: string; firstName: string; lastName: string; phone: string | null; role: UserRole; status: 'active' | 'suspended'; createdAt: string; businessName: string | null; vendorApprovalStatus: VendorApprovalStatus | null };

export function AdminUsersView() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState('');
  const [suspending, setSuspending] = useState<ManagedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchUsers = useCallback(() => apiRequest<{ users: ManagedUser[] }>('/admin/users'), []);

  useEffect(() => {
    let active = true;
    fetchUsers().then((data) => { if (active) setUsers(data.users); }).catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Could not load users.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchUsers]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return users;
    return users.filter((user) => `${user.firstName} ${user.lastName} ${user.email} ${user.businessName ?? ''} ${user.role}`.toLowerCase().includes(value));
  }, [query, users]);

  const setStatus = async (user: ManagedUser, status: 'active' | 'suspended') => {
    setActionId(user.id); setError(null);
    try {
      await apiRequest(`/admin/users/${user.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setUsers((current) => current.map((record) => record.id === user.id ? { ...record, status } : record));
      setSuspending(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not update this account.'); }
    finally { setActionId(null); }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Access control</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">Users</h2><p className="mt-2 text-muted-foreground">Review marketplace accounts and suspend access when intervention is required.</p></div>
      {error && <Alert variant="destructive" className="mb-5"><AlertCircle /><AlertTitle>Account action failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="relative max-w-lg"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, business or role" aria-label="Search users" /></div>
      {loading ? <div className="mt-5 flex min-h-64 items-center justify-center gap-3 rounded-2xl border bg-card text-muted-foreground"><Spinner /> Loading users…</div> : filtered.length === 0 ? <div className="mt-5 grid min-h-52 place-items-center rounded-2xl border border-dashed bg-card text-center"><div><Users className="mx-auto size-9 text-primary" /><p className="mt-3 font-bold">No matching users</p></div></div> : <div className="mt-5 grid gap-3">{filtered.map((user) => <article key={user.id} className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold">{user.firstName} {user.lastName}</h3><Badge variant="outline">{user.role}</Badge><Badge variant={user.status === 'suspended' ? 'destructive' : 'outline'}>{user.status}</Badge>{user.vendorApprovalStatus && <Badge variant="outline">vendor {user.vendorApprovalStatus}</Badge>}</div><p className="mt-1 truncate text-sm text-muted-foreground">{user.email}{user.businessName ? ` · ${user.businessName}` : ''}</p></div>{user.role === 'admin' ? <span className="flex items-center gap-2 text-sm font-bold text-muted-foreground"><ShieldCheck className="size-4" /> Protected</span> : user.status === 'active' ? <Button variant="outline" disabled={actionId === user.id} onClick={() => setSuspending(user)}><Ban /> Suspend</Button> : <Button disabled={actionId === user.id} onClick={() => void setStatus(user, 'active')}>{actionId === user.id ? <Spinner /> : <UserRoundCheck />} Reactivate</Button>}</article>)}</div>}
      <AlertDialog open={Boolean(suspending)} onOpenChange={(open) => { if (!open) setSuspending(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Suspend {suspending?.firstName} {suspending?.lastName}?</AlertDialogTitle><AlertDialogDescription>This immediately revokes all active sessions and blocks new sign-ins until an administrator reactivates the account.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep active</AlertDialogCancel><Button variant="destructive" disabled={!suspending || actionId === suspending.id} onClick={() => suspending && void setStatus(suspending, 'suspended')}>{suspending && actionId === suspending.id && <Spinner />} Suspend account</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
