import { Leaf } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-cropguard-mint flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-cropguard-dark rounded-2xl flex items-center justify-center mx-auto animate-pulse">
          <Leaf className="w-8 h-8 text-white" />
        </div>
        <p className="text-cropguard-slate text-sm font-medium">Loading CropGuard…</p>
      </div>
    </div>
  );
}
