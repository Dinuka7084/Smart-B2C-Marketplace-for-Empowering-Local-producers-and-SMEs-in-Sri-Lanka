import { useState, type SyntheticEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  LockKeyhole,
  Store,
  UserRound,
} from 'lucide-react';
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router';

import { useAuth } from '@/auth/auth-context';
import { dashboardPathFor } from '@/auth/paths';
import { FullBrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const textValue = (formData: FormData, name: string): string => {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
};

const optionalText = (formData: FormData, name: string): string | undefined =>
  textValue(formData, name) || undefined;

const rawTextValue = (formData: FormData, name: string): string => {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180);

function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  autoComplete,
  required = false,
  minLength,
  value,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold" htmlFor={name}>
      {label}
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className="h-12 bg-background text-base"
      />
    </label>
  );
}

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { user, status, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState<'customer' | 'vendor'>(
    searchParams.get('role') === 'vendor' ? 'vendor' : 'customer',
  );
  const [businessName, setBusinessName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'ready' && user) {
    return <Navigate to={dashboardPathFor(user)} replace />;
  }

  const submitForm = async (formData: FormData) => {
    setError(null);
    setSubmitting(true);

    try {
      const authenticatedUser =
        mode === 'login'
          ? await login({
              email: textValue(formData, 'email'),
              password: rawTextValue(formData, 'password'),
            })
          : await register({
              email: textValue(formData, 'email'),
              password: rawTextValue(formData, 'password'),
              firstName: textValue(formData, 'firstName'),
              lastName: textValue(formData, 'lastName'),
              phone: optionalText(formData, 'phone'),
              role,
              ...(role === 'vendor'
                ? {
                    businessName,
                    storeSlug,
                    registrationNumber: optionalText(
                      formData,
                      'registrationNumber',
                    ),
                    description: optionalText(formData, 'description'),
                  }
                : {}),
            });

      const requestedPath = (location.state as { from?: string } | null)?.from;
      void navigate(requestedPath ?? dashboardPathFor(authenticatedUser), {
        replace: true,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'We could not complete your request. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitForm(new FormData(event.currentTarget));
  };

  const updateBusinessName = (value: string) => {
    setBusinessName(value);
    if (!slugEdited) setStoreSlug(slugify(value));
  };

  return (
    <main id="main-content" tabIndex={-1} className="grid min-h-screen bg-background outline-none lg:grid-cols-[minmax(0,0.88fr)_minmax(32rem,1.12fr)]">
      <section className="relative hidden overflow-hidden bg-[#123b2f] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-36 -top-36 size-[30rem] rounded-full border-[5rem] border-white/5" />
        <div className="absolute -bottom-28 -left-24 size-80 rounded-full bg-[#f0bd45]/12 blur-2xl" />

        <Link to="/" className="relative w-fit rounded-3xl bg-white/95 p-1 shadow-lg shadow-black/10" aria-label="Smart Lanka home">
          <FullBrandLogo className="size-32" />
        </Link>

        <div className="relative max-w-lg">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#f0bd45]">
            Sri Lankan enterprise, connected
          </p>
          <h1 className="mt-5 text-5xl font-extrabold leading-[1.02] tracking-[-0.05em]">
            One account for your local marketplace.
          </h1>
          <div className="mt-9 grid gap-4 text-base text-white/78">
            <span className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-[#f0bd45]" /> Buy directly from local businesses
            </span>
            <span className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-[#f0bd45]" /> Manage a growing storefront
            </span>
            <span className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-[#f0bd45]" /> Keep orders and activity in one place
            </span>
          </div>
        </div>

        <p className="relative text-sm text-white/55">
          Built for customers, producers and marketplace administrators.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-xl">
          <div className="mb-9 flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Back to marketplace
            </Link>
            <ThemeToggle className="size-9 rounded-lg" />
          </div>

          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </p>
            <h2 className="mt-2 text-4xl font-extrabold tracking-[-0.04em]">
              {mode === 'login' ? 'Sign in to Smart Lanka' : 'Join Smart Lanka'}
            </h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              {mode === 'login'
                ? 'Use the email and password connected to your account.'
                : 'Choose how you plan to use the marketplace.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-5">
            {mode === 'register' && (
              <Tabs
                value={role}
                onValueChange={(value) =>
                  setRole(value as 'customer' | 'vendor')
                }
              >
                <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl p-1">
                  <TabsTrigger value="customer" className="rounded-lg text-sm">
                    <UserRound /> Customer
                  </TabsTrigger>
                  <TabsTrigger value="vendor" className="rounded-lg text-sm">
                    <Store /> Vendor
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="customer" className="pt-2 text-muted-foreground">
                  Shop local products, save favourites and track your orders.
                </TabsContent>
                <TabsContent value="vendor" className="pt-2 text-muted-foreground">
                  Apply to sell products through your own Smart Lanka storefront.
                </TabsContent>
              </Tabs>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>Could not continue</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {mode === 'register' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="First name"
                  name="firstName"
                  autoComplete="given-name"
                  required
                />
                <FormField
                  label="Last name"
                  name="lastName"
                  autoComplete="family-name"
                  required
                />
              </div>
            )}

            <FormField
              label="Email address"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <FormField
              label="Password"
              name="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'register' ? 12 : 1}
              required
            />

            {mode === 'register' && (
              <FormField
                label="Phone number (optional)"
                name="phone"
                type="tel"
                placeholder="+94 77 123 4567"
                autoComplete="tel"
              />
            )}

            {mode === 'register' && role === 'vendor' && (
              <div className="grid gap-4 rounded-2xl border bg-muted/40 p-5">
                <FormField
                  label="Business name"
                  name="businessName"
                  value={businessName}
                  onChange={updateBusinessName}
                  required
                />
                <FormField
                  label="Store URL"
                  name="storeSlug"
                  value={storeSlug}
                  onChange={(value) => {
                    setSlugEdited(true);
                    setStoreSlug(slugify(value));
                  }}
                  placeholder="your-business-name"
                  required
                />
                <p className="-mt-2 text-sm text-muted-foreground">
                  smartlanka.lk/store/{storeSlug || 'your-business-name'}
                </p>
                <FormField
                  label="Registration number (optional)"
                  name="registrationNumber"
                />
                <label className="grid gap-2 text-sm font-semibold" htmlFor="description">
                  Business description (optional)
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    maxLength={2000}
                    className="min-h-24 rounded-lg border bg-background px-3 py-2 text-base outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </label>
              </div>
            )}

            {mode === 'register' && (
              <p className="text-sm leading-6 text-muted-foreground">
                Passwords must contain at least 12 characters. Vendor applications require administrator approval before products can be published.
              </p>
            )}

            <Button type="submit" size="lg" className="mt-1 h-12" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner /> Please wait…
                </>
              ) : mode === 'login' ? (
                <>
                  <LockKeyhole /> Sign in
                </>
              ) : (
                <>Create {role} account</>
              )}
            </Button>
          </form>

          <p className="mt-7 text-center text-sm text-muted-foreground">
            {mode === 'login' ? 'New to Smart Lanka?' : 'Already have an account?'}{' '}
            <Link
              className="font-bold text-primary hover:underline"
              to={mode === 'login' ? '/register' : '/login'}
            >
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
