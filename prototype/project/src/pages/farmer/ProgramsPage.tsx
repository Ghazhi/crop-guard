import { useEffect, useState } from 'react';
import { CalendarDays, MapPin, Sprout, Users, Loader2, BookOpen } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface ProgramInfo {
  name: string;
  description: string | null;
  crop_season: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface CohortInfo {
  name: string;
  checkin_start_date: string | null;
  total_weeks: number | null;
}

interface EnrollmentInfo {
  status: string;
  enrolled_at: string;
  program: ProgramInfo | null;
  cohort: CohortInfo | null;
}

export default function FarmerProgramsPage() {
  const profile = useAuthStore(s => s.profile);
  const [enrollments, setEnrollments] = useState<EnrollmentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase.from('farmers').select('id').eq('user_id', profile.id).maybeSingle()
      .then(({ data: f }) => {
        if (!f) { setLoading(false); return; }
        supabase.from('enrollments')
          .select('status, created_at, cohort_id, cohorts(name, checkin_start_date, total_weeks)')
          .eq('farmer_id', f.id)
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            if (!data?.length) { setLoading(false); return; }
            // Resolve program names via cohort → program
            const cohortIds = data.map((e: any) => e.cohort_id).filter(Boolean);
            const cohortProgramMap: Record<string, string> = {};
            if (cohortIds.length) {
              supabase.from('cohorts').select('id, program_id').in('id', cohortIds)
                .then(({ data: cohorts }) => {
                  (cohorts ?? []).forEach((c: any) => { cohortProgramMap[c.id] = c.program_id; });
                  const programIds = [...new Set(Object.values(cohortProgramMap))];
                  if (!programIds.length) { buildList(data); return; }
                  supabase.from('programs').select('id, name, description, crop_season, start_date, end_date')
                    .in('id', programIds)
                    .then(({ data: progs }) => {
                      const progMap: Record<string, ProgramInfo> = {};
                      (progs ?? []).forEach((p: any) => { progMap[p.id] = p; });
                      buildList(data, progMap, cohortProgramMap);
                    });
                });
            } else {
              buildList(data);
            }
          });
      });

    function buildList(rows: any[], progMap?: Record<string, ProgramInfo>, cMap?: Record<string, string>) {
      const list: EnrollmentInfo[] = rows.map((e: any) => {
        const cohort = e.cohorts as any;
        const progId = cMap?.[e.cohort_id] ?? null;
        return {
          status: e.status,
          enrolled_at: e.created_at,
          program: progId ? (progMap?.[progId] ?? null) : null,
          cohort: cohort ? {
            name: cohort.name,
            checkin_start_date: cohort.checkin_start_date,
            total_weeks: cohort.total_weeks,
          } : null,
        };
      });
      setEnrollments(list);
      setLoading(false);
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 text-cropguard-mid animate-spin" />
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] p-4">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-cropguard-mint rounded-2xl flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8 text-cropguard-dark" />
          </div>
          <h2 className="text-xl font-semibold text-cropguard-forest">No Programmes Yet</h2>
          <p className="text-sm text-cropguard-slate max-w-[260px]">
            Speak to your Asinyo agent to be enrolled in a programme and start your weekly check-ins.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-6">
      <div className="pt-2">
        <h2 className="text-xl font-bold text-cropguard-forest">My Programmes</h2>
        <p className="text-sm text-cropguard-slate">Your enrolled programmes and cohorts</p>
      </div>

      {enrollments.map((enr, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-cropguard-forest">
                {enr.program?.name ?? 'Programme'}
              </p>
              {enr.program?.crop_season && (
                <p className="text-[10px] text-cropguard-slate mt-0.5">{enr.program.crop_season}</p>
              )}
            </div>
            <span className={cn(
              'text-[9px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0',
              enr.status === 'active' ? 'bg-cropguard-mint text-cropguard-dark' : 'bg-gray-100 text-gray-500'
            )}>
              {enr.status}
            </span>
          </div>

          {enr.program?.description && (
            <p className="text-xs text-gray-600 leading-relaxed">{enr.program.description}</p>
          )}

          {enr.cohort && (
            <div className="flex items-center gap-2 text-[10px] text-cropguard-slate bg-gray-50 rounded-lg px-2.5 py-2">
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>Cohort: <strong className="text-cropguard-dark">{enr.cohort.name}</strong></span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {enr.program?.start_date && (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <CalendarDays className="w-3 h-3 shrink-0" />
                <span>Started {new Date(enr.program.start_date).toLocaleDateString()}</span>
              </div>
            )}
            {enr.cohort?.total_weeks && (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <CalendarDays className="w-3 h-3 shrink-0" />
                <span>{enr.cohort.total_weeks} weeks</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
