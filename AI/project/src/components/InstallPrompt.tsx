import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'pwa-install-dismissed';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    if (ios) {
      const t = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const t = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(t);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    setVisible(false);
    sessionStorage.setItem(STORAGE_KEY, '1');
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
      setDeferredPrompt(null);
    }
  }

  if (isStandalone || !visible) return null;

  if (isIOS) {
    return (
      <div className={cn(
        'fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-50',
        'bg-cropguard-dark text-white rounded-2xl shadow-2xl p-4',
        'animate-in slide-in-from-bottom-4 duration-300'
      )}>
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div className="w-10 h-10 bg-cropguard-light rounded-xl flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-cropguard-forest" />
          </div>
          <div>
            <p className="text-sm font-bold leading-snug">Install CropGuard</p>
            <p className="text-xs text-cropguard-pale mt-1 leading-relaxed">
              Tap <span className="font-bold">Share</span> then{' '}
              <span className="font-semibold">"Add to Home Screen"</span> to use offline.
            </p>
          </div>
        </div>
        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-cropguard-dark rotate-45 rounded-sm" />
      </div>
    );
  }

  return (
    <div className={cn(
      'fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-50',
      'bg-cropguard-dark text-white rounded-2xl shadow-2xl p-4',
      'animate-in slide-in-from-bottom-4 duration-300'
    )}>
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-center gap-3 pr-6">
        <div className="w-10 h-10 bg-cropguard-light rounded-xl flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-cropguard-forest" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">Install CropGuard</p>
          <p className="text-xs text-cropguard-pale mt-0.5">Works offline · No app store needed</p>
        </div>
        <button
          onClick={install}
          className="shrink-0 bg-cropguard-light text-cropguard-forest text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
        >
          Install
        </button>
      </div>
    </div>
  );
}
