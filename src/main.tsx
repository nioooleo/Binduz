import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Register Google Maps quota & auth failure guard BEFORE rendering React
if (typeof window !== 'undefined') {
  const gmpWin = window as unknown as {
    gm_authFailure?: () => void;
    __gmpQuotaErrorDispatched?: boolean;
  };

  gmpWin.gm_authFailure = () => {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  };

  const origConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const joined = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ');
    if (/OverQuotaMapError|QuotaExceededError|Google Maps JavaScript API error/i.test(joined)) {
      if (!gmpWin.__gmpQuotaErrorDispatched) {
        gmpWin.__gmpQuotaErrorDispatched = true;
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
    }
    origConsoleError(...args);
  };
}

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
