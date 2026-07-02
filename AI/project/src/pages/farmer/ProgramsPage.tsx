import { BookOpen } from 'lucide-react';
export default function FarmerProgramsPage() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[70vh]">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-cropguard-mint rounded-2xl flex items-center justify-center mx-auto">
          <BookOpen className="w-8 h-8 text-cropguard-dark" />
        </div>
        <h2 className="text-xl font-semibold text-cropguard-forest">My Programs</h2>
        <p className="text-sm text-cropguard-slate">Enrolled programs coming soon</p>
      </div>
    </div>
  );
}
