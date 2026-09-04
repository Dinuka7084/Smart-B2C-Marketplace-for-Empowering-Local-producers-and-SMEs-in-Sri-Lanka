import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { AlertCircle, BarChart3, PackageSearch } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import type { VendorAnalytics } from '@/analytics/types';
import { formatPrice } from '@/catalog/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiRequest } from '@/lib/api';

const chartConfig = {
  revenueLkr: { label: 'Revenue (LKR)', color: 'var(--primary)' },
} satisfies ChartConfig;

export function VendorAnalyticsView() {
  const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<{ analytics: VendorAnalytics }>('/vendor/analytics')
      .then((result) => { if (active) setAnalytics(result.analytics); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Could not load sales analytics.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const chartData = useMemo(() => analytics?.daily.map((day) => ({
    ...day,
    revenueLkr: day.revenueCents / 100,
    label: format(parseISO(day.date), 'd MMM'),
  })) ?? [], [analytics]);

  if (loading) return <div className="flex min-h-80 items-center justify-center gap-3 text-muted-foreground"><Spinner /> Loading sales analytics…</div>;
  if (error) return <Alert variant="destructive"><AlertCircle /><AlertTitle>Analytics unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  if (!analytics) return null;

  const { summary } = analytics;
  const hasSales = summary.deliveredOrders > 0;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Sales performance</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">Vendor analytics</h2><p className="mt-2 text-muted-foreground">Delivered-order performance for the last {analytics.period.days} days.</p></div>
        <Badge variant="outline">{format(parseISO(analytics.period.from), 'd MMM')} – {format(parseISO(analytics.period.to), 'd MMM yyyy')}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Revenue', formatPrice(summary.revenueCents, summary.currency)],
          ['Delivered orders', String(summary.deliveredOrders)],
          ['Average order', formatPrice(summary.averageOrderCents, summary.currency)],
          ['Units sold', String(summary.unitsSold)],
        ].map(([label, value]) => <article key={label} className="rounded-2xl border bg-card p-5 shadow-sm"><p className="text-sm font-semibold text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-extrabold tracking-[-0.035em]">{value}</p></article>)}
      </div>

      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><BarChart3 className="size-5" /></span><div><h3 className="font-extrabold">Daily delivered revenue</h3><p className="text-sm text-muted-foreground">Only orders marked delivered contribute to revenue.</p></div></div>
        {hasSales ? <ChartContainer config={chartConfig} className="mt-6 h-72 w-full aspect-auto">
          <BarChart data={chartData} accessibilityLayer margin={{ left: 4, right: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={26} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(value: number) => value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)} width={44} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="revenueLkr" fill="var(--color-revenueLkr)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartContainer> : <div className="mt-6 grid min-h-56 place-items-center rounded-xl border border-dashed text-center text-sm text-muted-foreground"><div><BarChart3 className="mx-auto mb-3 size-7" /><p className="font-semibold text-foreground">No delivered sales in this period</p><p className="mt-1">Revenue will appear after an order is delivered.</p></div></div>}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm"><div className="border-b p-5"><h3 className="font-extrabold">Best-selling products</h3><p className="mt-1 text-sm text-muted-foreground">Ranked by delivered revenue.</p></div>{analytics.topProducts.length ? <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Units</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader><TableBody>{analytics.topProducts.map((product) => <TableRow key={`${product.productId}-${product.productName}`}><TableCell className="font-bold">{product.productName}</TableCell><TableCell>{product.units}</TableCell><TableCell className="text-right">{formatPrice(product.revenueCents, summary.currency)}</TableCell></TableRow>)}</TableBody></Table> : <div className="grid min-h-44 place-items-center text-sm text-muted-foreground"><PackageSearch className="mb-2 size-6" />No product sales yet.</div>}</section>
        <section className="rounded-2xl border bg-card p-5 shadow-sm"><h3 className="font-extrabold">Current order status</h3><p className="mt-1 text-sm text-muted-foreground">All vendor orders.</p><div className="mt-5 space-y-3">{analytics.orderStatuses.length ? analytics.orderStatuses.map((status) => <div key={status.status} className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3"><span className="font-semibold capitalize">{status.status}</span><Badge variant="secondary">{status.count}</Badge></div>) : <p className="py-10 text-center text-sm text-muted-foreground">No orders yet.</p>}</div></section>
      </div>
    </div>
  );
}
