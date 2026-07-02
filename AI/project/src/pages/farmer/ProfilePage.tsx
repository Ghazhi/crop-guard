import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function FarmerProfilePage() {
  const { profile, signOut } = useAuthStore();
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-cropguard-forest pt-2">Profile</h2>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-cropguard-dark flex items-center justify-center">
            <span className="text-white text-xl font-bold">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'F'}
            </span>
          </div>
          <div>
            <p className="font-semibold text-cropguard-forest">{profile?.full_name || '—'}</p>
            <p className="text-sm text-cropguard-slate capitalize">{profile?.role}</p>
          </div>
        </CardContent>
      </Card>
      <Button variant="outline" className="w-full text-cropguard-red border-red-100" onClick={signOut}>
        <LogOut className="w-4 h-4 mr-2" /> Sign Out
      </Button>
    </div>
  );
}
