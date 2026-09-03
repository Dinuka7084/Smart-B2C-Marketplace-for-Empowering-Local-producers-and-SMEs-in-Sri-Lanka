import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, FolderTree, Pencil, Plus } from 'lucide-react';

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
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api';

type AdminCategory = { id: string; name: string; slug: string; description: string | null; isActive: boolean; productCount: number; createdAt: string; updatedAt: string };
type CategoryDraft = { name: string; slug: string; description: string };
const emptyDraft: CategoryDraft = { name: '', slug: '', description: '' };

export function AdminCategoriesView() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [draft, setDraft] = useState<CategoryDraft>(emptyDraft);
  const [editing, setEditing] = useState<(CategoryDraft & { id: string }) | null>(null);
  const [deactivating, setDeactivating] = useState<AdminCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchCategories = useCallback(() => apiRequest<{ categories: AdminCategory[] }>('/admin/categories'), []);

  useEffect(() => {
    let active = true;
    fetchCategories().then((data) => { if (active) setCategories(data.categories); }).catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Could not load categories.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchCategories]);

  const refresh = async () => { const data = await fetchCategories(); setCategories(data.categories); };
  const create = async () => {
    setSaving(true); setError(null);
    try { await apiRequest('/admin/categories', { method: 'POST', body: JSON.stringify({ ...draft, isActive: true }) }); await refresh(); setDraft(emptyDraft); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not create this category.'); }
    finally { setSaving(false); }
  };
  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true); setError(null);
    try { await apiRequest(`/admin/categories/${editing.id}`, { method: 'PATCH', body: JSON.stringify({ name: editing.name, slug: editing.slug, description: editing.description }) }); await refresh(); setEditing(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not update this category.'); }
    finally { setSaving(false); }
  };
  const setActive = async (category: AdminCategory, isActive: boolean) => {
    setSaving(true); setError(null);
    try { await apiRequest(`/admin/categories/${category.id}`, { method: 'PATCH', body: JSON.stringify({ isActive }) }); await refresh(); setDeactivating(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not update category visibility.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7"><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Catalog structure</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">Categories</h2><p className="mt-2 text-muted-foreground">Control how products are grouped and whether each group appears in the marketplace.</p></div>
      {error && <Alert variant="destructive" className="mb-5"><AlertCircle /><AlertTitle>Category action failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"><h3 className="font-extrabold">Add a category</h3><div className="mt-4 grid gap-3 md:grid-cols-2"><label htmlFor="category-name" className="grid gap-2 text-sm font-bold">Name<Input id="category-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label><label htmlFor="category-slug" className="grid gap-2 text-sm font-bold">URL slug<Input id="category-slug" value={draft.slug} onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))} placeholder="home-goods" /></label><label htmlFor="category-description" className="grid gap-2 text-sm font-bold md:col-span-2">Description<Textarea id="category-description" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} maxLength={1000} /></label></div><div className="mt-4 flex justify-end"><Button disabled={saving || draft.name.trim().length < 2 || draft.slug.trim().length < 3} onClick={() => void create()}>{saving ? <Spinner /> : <Plus />} Add category</Button></div></section>
      {loading ? <div className="mt-5 flex min-h-52 items-center justify-center gap-3 rounded-2xl border bg-card text-muted-foreground"><Spinner /> Loading categories…</div> : <div className="mt-5 grid gap-4">{categories.map((category) => <article key={category.id} className="rounded-2xl border bg-card p-5 shadow-sm">{editing?.id === category.id ? <div className="grid gap-3 md:grid-cols-2"><Input aria-label="Category name" value={editing.name} onChange={(event) => setEditing((current) => current ? { ...current, name: event.target.value } : null)} /><Input aria-label="Category URL slug" value={editing.slug} onChange={(event) => setEditing((current) => current ? { ...current, slug: event.target.value } : null)} /><Textarea aria-label="Category description" className="md:col-span-2" value={editing.description} onChange={(event) => setEditing((current) => current ? { ...current, description: event.target.value } : null)} /><div className="flex justify-end gap-2 md:col-span-2"><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={saving} onClick={() => void saveEdit()}>{saving && <Spinner />} Save changes</Button></div></div> : <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FolderTree className="size-5" /></span><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold">{category.name}</h3><Badge variant="outline">{category.productCount} products</Badge>{!category.isActive && <Badge variant="destructive">Hidden</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">/{category.slug}{category.description ? ` · ${category.description}` : ''}</p></div></div><div className="flex items-center justify-end gap-3"><Button variant="outline" size="sm" onClick={() => setEditing({ id: category.id, name: category.name, slug: category.slug, description: category.description ?? '' })}><Pencil /> Edit</Button><span className="flex items-center gap-2 text-sm font-bold"><Switch aria-label={`${category.name} active`} checked={category.isActive} onCheckedChange={(checked) => checked ? void setActive(category, true) : setDeactivating(category)} /> Active</span></div></div>}</article>)}</div>}
      <AlertDialog open={Boolean(deactivating)} onOpenChange={(open) => { if (!open) setDeactivating(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hide {deactivating?.name}?</AlertDialogTitle><AlertDialogDescription>Its {deactivating?.productCount ?? 0} products will stop appearing in the public marketplace until the category is reactivated.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep active</AlertDialogCancel><Button variant="destructive" disabled={!deactivating || saving} onClick={() => deactivating && void setActive(deactivating, false)}>{saving && <Spinner />} Hide category</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
