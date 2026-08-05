export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <img
        src="/assets/images/Snip20260801_52.png"
        alt="CropGuard"
        className="w-40 h-auto object-contain"
        style={{ animation: 'cgFadeIn 0.5s ease-out forwards' }}
      />

      <style>{`
        @keyframes cgFadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
