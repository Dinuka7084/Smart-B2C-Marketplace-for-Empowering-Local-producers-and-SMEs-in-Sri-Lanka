import { ArrowLeft, Leaf } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <main id="main-content" tabIndex={-1} className="grid min-h-screen place-items-center bg-background px-5 text-center outline-none">
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Leaf className="size-7" />
        </span>
        <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-primary">404</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.04em]">Page not found</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          The page may have moved, or the address may be incorrect.
        </p>
        <Button className="mt-7" render={<Link to="/" />}>
          <ArrowLeft /> Return to marketplace
        </Button>
      </div>
    </main>
  );
}
