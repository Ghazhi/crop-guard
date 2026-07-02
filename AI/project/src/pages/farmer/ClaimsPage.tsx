import { ShieldCheck } from 'lucide-react';
export default function FarmerClaimsPage() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[70vh]">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-cropguard-mint rounded-2xl flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8 text-cropguard-dark" />
        </div>
        <h2 className="text-xl font-semibold text-cropguard-forest">Claims</h2>
        <p className="text-sm text-cropguard-slate">Claims management coming soon</p>
      </div>
    </div>
  );
}
