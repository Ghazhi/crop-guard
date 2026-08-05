import { create } from 'zustand';

export type AppLanguage = 'en' | 'fr' | 'tw' | 'ee' | 'ha' | 'gon';

export interface LanguageOption {
  code: AppLanguage;
  label: string;
  bcp47: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en',  label: 'English', bcp47: 'en-US'  },
  { code: 'fr',  label: 'French',  bcp47: 'fr-FR'  },
  { code: 'tw',  label: 'Twi',     bcp47: 'ak'     },
  { code: 'ee',  label: 'Ewe',     bcp47: 'ee'     },
  { code: 'ha',  label: 'Hausa',   bcp47: 'ha'     },
  { code: 'gon', label: 'Gonja',   bcp47: 'gon'    },
];

const STORAGE_KEY = 'cg_language';

interface LanguageState {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: (localStorage.getItem(STORAGE_KEY) as AppLanguage | null) ?? 'en',
  setLanguage: (language) => {
    localStorage.setItem(STORAGE_KEY, language);
    set({ language });
  },
}));

export function getBcp47(code: AppLanguage): string {
  return LANGUAGES.find(l => l.code === code)?.bcp47 ?? 'en-US';
}

export function speak(text: string, langCode: AppLanguage): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = getBcp47(langCode);
  window.speechSynthesis.speak(utter);
}
