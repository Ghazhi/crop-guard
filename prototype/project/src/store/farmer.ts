import { create } from 'zustand';
import type { Farmer, FarmDetail, Enrollment, EnrollmentOpp } from '@/types';

interface FarmerState {
  activeFarmer:   Farmer | null;
  activeFarms:    FarmDetail[];
  activeEnrollments: Enrollment[];
  activeOpps:     EnrollmentOpp[];
  setActiveFarmer:      (farmer: Farmer | null) => void;
  setActiveFarms:       (farms: FarmDetail[]) => void;
  setActiveEnrollments: (enrollments: Enrollment[]) => void;
  setActiveOpps:        (opps: EnrollmentOpp[]) => void;
  clearActiveFarmer:    () => void;
}

export const useFarmerStore = create<FarmerState>((set) => ({
  activeFarmer:      null,
  activeFarms:       [],
  activeEnrollments: [],
  activeOpps:        [],

  setActiveFarmer:      (activeFarmer) => set({ activeFarmer }),
  setActiveFarms:       (activeFarms) => set({ activeFarms }),
  setActiveEnrollments: (activeEnrollments) => set({ activeEnrollments }),
  setActiveOpps:        (activeOpps) => set({ activeOpps }),

  clearActiveFarmer: () => set({
    activeFarmer:      null,
    activeFarms:       [],
    activeEnrollments: [],
    activeOpps:        [],
  }),
}));
