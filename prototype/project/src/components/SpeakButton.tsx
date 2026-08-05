import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/store/language';

// Voice names that are known to be female across common TTS engines
const FEMALE_NAME_HINTS = [
  'female', 'woman',
  // macOS / iOS
  'samantha', 'victoria', 'karen', 'moira', 'fiona', 'tessa', 'veena', 'ting-ting', 'sin-ji',
  // Windows
  'zira', 'hazel', 'linda',
  // Google
  'google uk english female', 'google us english',
];

function isFemaleVoice(voice: SpeechSynthesisVoice): boolean {
  const n = voice.name.toLowerCase();
  return FEMALE_NAME_HINTS.some(h => n.includes(h));
}

const LANG_BCP47: Record<string, string> = {
  en: 'en', fr: 'fr', tw: 'ak', ee: 'ee', ha: 'ha', gon: 'gon',
};

function pickVoice(langCode: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const prefix = LANG_BCP47[langCode] ?? 'en';

  // 1. Female voice for exact language
  const langVoices = voices.filter(v => v.lang.startsWith(prefix));
  const female = langVoices.find(isFemaleVoice);
  if (female) return female;

  // 2. Any voice for that language (unavoidable fallback for minority languages)
  if (langVoices.length) return langVoices[0];

  // 3. Any female English voice
  const enVoices = voices.filter(v => v.lang.startsWith('en'));
  return enVoices.find(isFemaleVoice) ?? enVoices[0] ?? null;
}

interface SpeakButtonProps {
  text: string;
  className?: string;
}

export function SpeakButton({ text, className }: SpeakButtonProps) {
  const language = useLanguageStore(s => s.language);
  const [playing, setPlaying] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loaded = () => setVoicesReady(true);
    if (window.speechSynthesis.getVoices().length) {
      setVoicesReady(true);
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', loaded);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', loaded);
    }
  }, []);

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!('speechSynthesis' in window)) return;
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(language);
    if (voice) utter.voice = voice;
    utter.lang  = LANG_BCP47[language] ?? 'en-US';
    utter.onstart = () => setPlaying(true);
    utter.onend   = () => setPlaying(false);
    utter.onerror = () => setPlaying(false);
    window.speechSynthesis.speak(utter);
  }

  if (!voicesReady && !('speechSynthesis' in window)) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={playing ? 'Stop' : 'Listen'}
      className={cn(
        'inline-flex items-center justify-center w-7 h-7 rounded-full transition-all shrink-0',
        playing
          ? 'bg-cropguard-dark text-white'
          : 'bg-cropguard-mint text-cropguard-dark hover:bg-cropguard-pale',
        className
      )}
    >
      {playing
        ? <VolumeX className="w-3.5 h-3.5" />
        : <Volume2 className="w-3.5 h-3.5" />}
    </button>
  );
}
