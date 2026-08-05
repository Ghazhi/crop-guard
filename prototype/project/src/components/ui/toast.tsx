import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'loading';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  detail?: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, detail?: string) => string;
  dismiss: (id: string) => void;
  success: (message: string, detail?: string) => string;
  error: (message: string, detail?: string) => string;
  info: (message: string, detail?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
  error: <AlertCircle className="w-5 h-5 text-red-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
  loading: <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />,
};

const STYLES: Record<ToastType, string> = {
  success: 'bg-white border-emerald-200',
  error: 'bg-white border-red-200',
  info: 'bg-white border-blue-200',
  loading: 'bg-white border-blue-200',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info', detail?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, message, detail }]);
    if (type !== 'loading') {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), type === 'error' ? 7000 : 5000);
    }
    return id;
  }, []);

  const success = useCallback((m: string, d?: string) => toast(m, 'success', d), [toast]);
  const error = useCallback((m: string, d?: string) => toast(m, 'error', d), [toast]);
  const info = useCallback((m: string, d?: string) => toast(m, 'info', d), [toast]);

  return (
    <ToastContext.Provider value={{ toast, dismiss, success, error, info }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border shadow-lg p-4 transition-all animate-in slide-in-from-right',
              STYLES[t.type],
            )}
          >
            <div className="shrink-0 mt-0.5">{ICONS[t.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{t.message}</p>
              {t.detail && <p className="text-xs text-gray-500 mt-0.5">{t.detail}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Extract a human-readable error message from a Supabase error or fetch response. */
export function extractError(err: unknown, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === 'object' && 'message' in err) {
    const msg = (err as { message: string }).message;
    if (msg && msg !== 'undefined') return msg;
  }
  return fallback;
}

/** Extract error message from a fetch Response body (tries JSON first, falls back to text). */
export async function extractFetchError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (body?.error) return body.error;
    if (body?.message) return body.message;
    return fallback;
  } catch {
    try {
      const text = await res.text();
      return text || fallback;
    } catch {
      return fallback;
    }
  }
}
