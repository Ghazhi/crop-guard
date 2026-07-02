import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { phoneToEmail } from '@/lib/constants';
import type { Gender, CropType, RegionCode } from '@/types';
import FarmerRegistrationForm, { type FarmerFormData } from '@/components/FarmerRegistrationForm';

export default function FarmerRegistrationPage() {
  const navigate = useNavigate();
  const profile  = useAuthStore(s => s.profile);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleComplete = async (data: FarmerFormData) => {
    if (!profile) return;
    setSaveError('');
    setSaving(true);

    try {
      const fullName = `${data.first_name} ${data.last_name}`.trim();

      const { data: farmer, error: farmerErr } = await supabase.from('farmers').insert({
        full_name:                    fullName,
        first_name:                   data.first_name,
        last_name:                    data.last_name,
        phone:                        data.phone,
        date_of_birth:                data.date_of_birth || null,
        gender:                       (data.gender as Gender) || null,
        national_id:                  data.national_id,
        national_id_type:             data.national_id_type,
        photo_url:                    data.photo_url || null,
        id_front_url:                 data.id_front_url || null,
        id_back_url:                  data.id_back_url || null,
        voice_consent_url:            data.voice_consent_url || null,
        community_id:                 data.community_id || null,
        cooperative_id:               data.cooperative_id || null,
        program_id:                   data.program_id || null,
        cohort_id_ref:                data.cohort_id_ref || null,
        gps_address:                  data.gps_address || null,
        primary_crop:                 data.primary_crop as CropType,
        primary_crop_other:           data.primary_crop_other || null,
        secondary_crop:               data.secondary_crop || null,
        secondary_crop_other:         data.secondary_crop_other || null,
        years_farm_experience:        parseInt(data.years_farm_experience) || null,
        acres_cultivated:             parseFloat(data.acres_cultivated) || null,
        primary_bags_prev_season:     parseInt(data.primary_bags_prev_season) || null,
        secondary_bags_prev_season:   parseInt(data.secondary_bags_prev_season) || null,
        owns_tractor:                 data.owns_tractor === 'yes' ? true : data.owns_tractor === 'no' ? false : null,
        owns_house:                   data.owns_house === 'yes' ? true : data.owns_house === 'no' ? false : null,
        marital_status:               data.marital_status || null,
        wives_count:                  parseInt(data.wives_count) || null,
        children_count:               parseInt(data.children_count) || null,
        other_business:               data.other_business === 'yes' ? true : data.other_business === 'no' ? false : null,
        other_business_specify:       data.other_business_specify || null,
        is_community_native:          data.is_community_native === 'yes' ? true : data.is_community_native === 'no' ? false : null,
        origin_if_not_native:         data.origin_if_not_native || null,
        community_preferences:        data.community_preferences.length ? data.community_preferences : null,
        other_agric_companies:        data.other_agric_companies === 'yes' ? true : data.other_agric_companies === 'no' ? false : null,
        other_agric_companies_specify: data.other_agric_companies_specify || null,
        desired_assets:               data.desired_assets.length ? data.desired_assets : null,
        input_credit_participation:   data.input_credit_participation === 'yes' ? true : data.input_credit_participation === 'no' ? false : null,
        other_org_engagement:         data.other_org_engagement === 'yes' ? true : data.other_org_engagement === 'no' ? false : null,
        other_org_activities:         data.other_org_activities || null,
        other_org_name:               data.other_org_name || null,
        asinyo_improvement_notes:     data.asinyo_improvement_notes || null,
        organisation_id:              profile.organisation_id,
        is_draft:                     false,
      }).select().maybeSingle();

      if (farmerErr || !farmer) {
        setSaveError(farmerErr?.message ?? 'Failed to save farmer. Please try again.');
        setSaving(false);
        return;
      }

      // Create auth user for the farmer
      const { data: signUpData } = await supabase.auth.signUp({
        email: phoneToEmail(data.phone),
        password: '654321',
        options: {
          data: {
            role: 'farmer',
            full_name: fullName,
            organisation_id: profile.organisation_id,
            farmer_id: farmer.id,
          },
        },
      });

      if (signUpData?.user?.id) {
        await supabase.from('users').update({ must_change_password: true }).eq('id', signUpData.user.id);
      }

      // Enroll in agent's active cohort
      const { data: agentRow } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (agentRow) {
        const cohortId = data.cohort_id_ref || null;
        const programId = data.program_id || null;

        if (!cohortId) {
          const { data: cohortRow } = await supabase
            .from('cohorts')
            .select('id,program_id')
            .eq('organisation_id', profile.organisation_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (cohortRow) {
            await supabase.from('enrollments').insert({
              farmer_id:       farmer.id,
              cohort_id:       cohortRow.id,
              program_id:      cohortRow.program_id,
              agent_id:        profile.id,
              organisation_id: profile.organisation_id,
              status:          'active',
            });
          }
        } else {
          await supabase.from('enrollments').insert({
            farmer_id:       farmer.id,
            cohort_id:       cohortId,
            program_id:      programId,
            agent_id:        profile.id,
            organisation_id: profile.organisation_id,
            status:          'active',
          });
        }
      }

      navigate('/agent/farmers');
    } catch {
      setSaveError('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <FarmerRegistrationForm
        onComplete={handleComplete}
        onBack={() => navigate(-1)}
        saving={saving}
        saveError={saveError}
      />
    </div>
  );
}
