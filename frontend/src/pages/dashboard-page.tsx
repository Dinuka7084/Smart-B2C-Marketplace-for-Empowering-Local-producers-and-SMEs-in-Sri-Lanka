import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  BarChart3,
  Boxes,
  Check,
  Clock3,
  Heart,
  Home,
  Leaf,
  LogOut,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';

import { useAuth } from '@/auth/auth-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { apiRequest, type UserRole } from '@/lib/api';
import { VendorProductsView } from '@/pages/vendor-products';

type NavItem = {
  label: string;
  icon: LucideIcon;
  path?: string;
};

const roleConfig: Record<
  UserRole,
  { label: string; eyebrow: string; items: NavItem[] }
> = {
  customer: {
    label: 'My account',
    eyebrow: 'Customer',
    items: [
      { label: 'Overview', icon: Home, path: '/account' },
      { label: 'Orders', icon: ShoppingBag },
      { label: 'Wishlist', icon: Heart },
    ],
  },
  vendor: {
    label: 'Seller workspace',
    eyebrow: 'Vendor',
    items: [
      { label: 'Overview', icon: Home, path: '/vendor' },
      { label: 'Products', icon: Store, path: '/vendor/products' },
      { label: 'Inventory', icon: Boxes },
      { label: 'Orders', icon: PackageCheck },
      { label: 'Analytics', icon: BarChart3 },
    ],
  },
  admin: {
    label: 'Administration',
    eyebrow: 'Administrator',
    items: [
      { label: 'Overview', icon: Home, path: '/admin' },
      { label: 'Vendors', icon: Store },
      { label: 'Users', icon: Users },
      { label: 'Platform reports', icon: BarChart3 },
    ],
  },
};

function DashboardShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const config = roleConfig[user.role];
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`;

  const handleLogout = async () => {
    await logout();
    void navigate('/', { replace: true });
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b p-4">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="size-4" />
            </span>
            <span className="truncate font-extrabold tracking-[-0.03em]">Smart Lanka</span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{config.eyebrow}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {config.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        tooltip={item.path ? item.label : `${item.label} · coming next`}
                        isActive={item.path === location.pathname}
                        disabled={!item.path}
                        onClick={() => {
                          if (item.path) void navigate(item.path);
                        }}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t p-3">
          <div className="flex items-center gap-3 overflow-hidden px-1 py-2">
            <Avatar className="size-9 shrink-0">
              <AvatarFallback className="bg-accent font-bold text-primary">
                {initials.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-bold">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Sign out" onClick={() => void handleLogout()}>
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-background/92 px-5 backdrop-blur-xl lg:px-8">
          <SidebarTrigger />
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">{config.eyebrow}</p>
            <h1 className="truncate text-lg font-extrabold tracking-[-0.025em]">{config.label}</h1>
          </div>
          <Button variant="outline" className="ml-auto hidden sm:inline-flex" render={<Link to="/" />}>
            Marketplace
          </Button>
        </header>
        <div className="flex-1 bg-muted/35 p-5 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

const statCards = (
  cards: Array<{ label: string; value: string; detail: string }>,
) => (
  <div className="grid gap-4 md:grid-cols-3">
    {cards.map((card) => (
      <article key={card.label} className="rounded-2xl border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold text-muted-foreground">{card.label}</p>
        <p className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">{card.value}</p>
        <p className="mt-2 text-sm text-muted-foreground">{card.detail}</p>
      </article>
    ))}
  </div>
);

function CustomerOverview() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Your marketplace</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">
          Welcome, {user?.firstName}
        </h2>
        <p className="mt-2 text-muted-foreground">Orders, saved products and profile activity will live here.</p>
      </div>

      {statCards([
        { label: 'Active orders', value: '0', detail: 'No orders in progress' },
        { label: 'Wishlist', value: '0', detail: 'Save products while you browse' },
        { label: 'Notifications', value: '0', detail: 'You are all caught up' },
      ])}

      <section className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-extrabold">Start exploring local products</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Browse the live catalog from approved Sri Lankan vendors. Checkout will be added in the next commerce slice.
        </p>
        <Button className="mt-5" render={<Link to="/products" />}>
          Browse marketplace
        </Button>
      </section>
    </div>
  );
}

function VendorOverview() {
  const { user } = useAuth();

  if (user?.vendorApprovalStatus === 'pending') {
    return (
      <div className="mx-auto grid min-h-[calc(100vh-9rem)] max-w-3xl place-items-center">
        <section className="w-full rounded-3xl border bg-card p-7 text-center shadow-sm sm:p-10">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#f0bd45]/20 text-[#8a6200]">
            <Clock3 className="size-8" />
          </span>
          <Badge className="mt-6 bg-[#f0bd45]/20 text-[#765500]" variant="outline">Application pending</Badge>
          <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em]">We’re reviewing your business</h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-muted-foreground">
            You can sign in and check your status, but product publishing and order tools stay locked until a Smart Lanka administrator approves your vendor application.
          </p>
          <Button className="mt-7" variant="outline" render={<Link to="/" />}>
            Return to marketplace
          </Button>
        </section>
      </div>
    );
  }

  if (user?.vendorApprovalStatus === 'rejected') {
    return (
      <div className="mx-auto max-w-3xl">
        <Alert variant="destructive" className="p-5">
          <AlertCircle />
          <AlertTitle>Vendor application needs attention</AlertTitle>
          <AlertDescription>
            Your current application was not approved. Contact the marketplace administrator before submitting updated business details.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Store overview</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">Ready to build your catalog</h2>
          <p className="mt-2 text-muted-foreground">Your vendor account is approved and ready for marketplace tools.</p>
        </div>
        <Badge className="bg-primary/10 text-primary" variant="outline">
          <ShieldCheck /> Approved vendor
        </Badge>
      </div>
      {statCards([
        { label: 'Published products', value: '0', detail: 'Product management comes next' },
        { label: 'Orders to fulfil', value: '0', detail: 'No orders waiting' },
        { label: 'Low stock', value: '0', detail: 'Inventory is clear' },
      ])}
    </div>
  );
}

type PendingVendor = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  businessName: string;
  storeSlug: string;
  registrationNumber: string | null;
  description: string | null;
  submittedAt: string;
};

function AdminOverview() {
  const [vendors, setVendors] = useState<PendingVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    let active = true;

    apiRequest<{ vendors: PendingVendor[] }>('/admin/vendors/pending')
      .then((result) => {
        if (active) setVendors(result.vendors);
      })
      .catch((caughtError: unknown) => {
        if (active) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : 'Could not load vendor applications.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const decide = async (
    vendorUserId: string,
    status: 'approved' | 'rejected',
  ) => {
    setActionId(vendorUserId);
    setError(null);
    try {
      await apiRequest(`/admin/vendors/${vendorUserId}/approval`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          ...(status === 'rejected' ? { reason: rejectionReason } : {}),
        }),
      });
      setVendors((current) => current.filter((vendor) => vendor.userId !== vendorUserId));
      setRejectingId(null);
      setRejectionReason('');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'The decision could not be saved.');
    } finally {
      setActionId(null);
    }
  };

  const submittedLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-LK', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [],
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Vendor onboarding</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">Pending applications</h2>
          <p className="mt-2 text-muted-foreground">Review business details before granting seller access.</p>
        </div>
        <Badge variant="outline" className="h-8 px-3">{vendors.length} awaiting review</Badge>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-5">
          <AlertCircle />
          <AlertTitle>Could not load vendor approvals</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border bg-card text-muted-foreground">
          <Spinner /> Loading applications…
        </div>
      ) : vendors.length === 0 ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed bg-card p-8 text-center">
          <div>
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Check className="size-6" />
            </span>
            <h3 className="mt-4 text-lg font-extrabold">No applications waiting</h3>
            <p className="mt-1 text-sm text-muted-foreground">New vendor registrations will appear here.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {vendors.map((vendor) => (
            <article key={vendor.userId} className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-extrabold">{vendor.businessName}</h3>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {vendor.firstName} {vendor.lastName} · {vendor.email}
                  </p>
                  <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-muted-foreground">Store URL</dt>
                      <dd className="mt-1">/{vendor.storeSlug}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-muted-foreground">Registration number</dt>
                      <dd className="mt-1">{vendor.registrationNumber || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-muted-foreground">Submitted</dt>
                      <dd className="mt-1">{submittedLabel.format(new Date(vendor.submittedAt))}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-muted-foreground">Phone</dt>
                      <dd className="mt-1">{vendor.phone || 'Not provided'}</dd>
                    </div>
                  </dl>
                  {vendor.description && <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">{vendor.description}</p>}
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    disabled={actionId === vendor.userId}
                    onClick={() => setRejectingId(vendor.userId)}
                  >
                    <X /> Reject
                  </Button>
                  <Button
                    disabled={actionId === vendor.userId}
                    onClick={() => void decide(vendor.userId, 'approved')}
                  >
                    {actionId === vendor.userId ? <Spinner /> : <Check />} Approve
                  </Button>
                </div>
              </div>

              {rejectingId === vendor.userId && (
                <div className="mt-5 grid gap-3 border-t pt-5">
                  <label className="grid gap-2 text-sm font-semibold" htmlFor={`reason-${vendor.userId}`}>
                    Reason for rejection
                    <textarea
                      id={`reason-${vendor.userId}`}
                      value={rejectionReason}
                      onChange={(event) => setRejectionReason(event.target.value)}
                      rows={3}
                      minLength={3}
                      maxLength={1000}
                      className="rounded-lg border bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </label>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setRejectingId(null)}>Cancel</Button>
                    <Button
                      variant="destructive"
                      disabled={rejectionReason.trim().length < 3 || actionId === vendor.userId}
                      onClick={() => void decide(vendor.userId, 'rejected')}
                    >
                      {actionId === vendor.userId && <Spinner />} Confirm rejection
                    </Button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardPage({ workspace, view = 'overview' }: { workspace: UserRole; view?: 'overview' | 'products' }) {
  return (
    <DashboardShell>
      {workspace === 'customer' && <CustomerOverview />}
      {workspace === 'vendor' && view === 'overview' && <VendorOverview />}
      {workspace === 'vendor' && view === 'products' && <VendorProductsView />}
      {workspace === 'admin' && <AdminOverview />}
    </DashboardShell>
  );
}
