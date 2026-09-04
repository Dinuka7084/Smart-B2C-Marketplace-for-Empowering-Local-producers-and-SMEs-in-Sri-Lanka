import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import { AppRouter } from './app-router';
import { AuthProvider } from './auth/auth-context';
import { ThemeProvider } from './theme/theme-provider';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element was not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider defaultTheme="system" storageKey="smart-lanka-theme">
        <AuthProvider>
          <a href="#main-content" className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground shadow-lg transition-transform focus:translate-y-0">Skip to main content</a>
          <AppRouter />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
