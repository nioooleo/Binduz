import { Download, Share, WifiOff, X } from 'lucide-react';
import { useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { canInstall, isIOS, isInstalled, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (canInstall) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded hover:border-[#E1262D] hover:text-[#E1262D] transition-colors cursor-pointer"
        title="Install Binduz App"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowIOSGuide((v) => !v)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded hover:border-[#E1262D] transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div className="absolute right-0 mt-2 w-64 p-3.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-xl z-50 text-xs text-neutral-700 dark:text-neutral-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-neutral-900 dark:text-white">Install on iOS</span>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="leading-relaxed">
              Tap <Share className="inline w-3.5 h-3.5 mx-0.5 text-[#E1262D]" /> in Safari and choose{' '}
              <strong>Add to Home Screen</strong> for offline reading.
            </p>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-md bg-amber-600 text-white text-xs font-semibold shadow-lg"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Offline reading mode active — cached stories remain available.</span>
    </div>
  );
}
