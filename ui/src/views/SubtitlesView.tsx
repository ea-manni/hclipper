import React, { useState } from 'react';
import { 
  Type, 
  Palette, 
  ArrowRight, 
  Layers
} from 'lucide-react';

interface SubtitlesViewProps {
  onNext: () => void;
}

export const SubtitlesView: React.FC<SubtitlesViewProps> = ({ onNext }) => {
  const [headline, setHeadline] = useState('STOP PROVING THINGS TO PEOPLE');
  const [stylePreset, setStylePreset] = useState<'tiktok_bold' | 'dynamic_pop' | 'clean_white'>('tiktok_bold');
  const [includeSocialPills, setIncludeSocialPills] = useState(true);
  const [includeOutro, setIncludeOutro] = useState(true);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-white">Captions & Hook Branding</h2>
          <p className="text-xs text-slate-400 mt-1">
            Generate high-impact hook banners, animated karaoke captions, and safe-zone social pills.
          </p>
        </div>
        <button
          onClick={onNext}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-amber-500/10 flex items-center space-x-2"
        >
          <span>Proceed to Social Publisher</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Customization Settings (7 cols) */}
        <div className="col-span-7 space-y-5">
          {/* Hook Banner Card */}
          <div className="glass-card rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Type className="w-4 h-4 text-amber-400" />
                Top Hook Banner Headline
              </span>
              <span className="text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                Frosted Dark Glass
              </span>
            </div>
            <input 
              type="text" 
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. STOP PROVING THINGS TO PEOPLE"
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400/50"
            />
            <p className="text-[11px] text-slate-400">
              Header banner renders with 70% black frosted glass, gold border accents, and bold condensed typography.
            </p>
          </div>

          {/* Subtitle Style Presets */}
          <div className="glass-card rounded-xl p-5 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-sky-400" />
              Subtitle Styling Presets (ASS)
            </span>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setStylePreset('tiktok_bold')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  stylePreset === 'tiktok_bold'
                    ? 'bg-amber-400/10 border-amber-400/50 text-white'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-amber-400">TikTok Bold</div>
                <div className="text-[10px] text-slate-400 mt-1">Segoe UI Black with gold word highlight</div>
              </button>

              <button
                onClick={() => setStylePreset('dynamic_pop')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  stylePreset === 'dynamic_pop'
                    ? 'bg-amber-400/10 border-amber-400/50 text-white'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-sky-400">Dynamic Pop</div>
                <div className="text-[10px] text-slate-400 mt-1">Word-by-word bounce scale tags</div>
              </button>

              <button
                onClick={() => setStylePreset('clean_white')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  stylePreset === 'clean_white'
                    ? 'bg-amber-400/10 border-amber-400/50 text-white'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-slate-200">Clean Minimal</div>
                <div className="text-[10px] text-slate-400 mt-1">Solid white with subtle drop shadow</div>
              </button>
            </div>
          </div>

          {/* Brand Overlays Toggles */}
          <div className="glass-card rounded-xl p-5 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-400" />
              Branding & Overlays
            </span>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-white/5">
                <div>
                  <div className="font-semibold text-slate-200">Animated Social Handle Pills</div>
                  <div className="text-[10px] text-slate-500">TikTok, YouTube, Instagram badges fade in at 0.5s</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={includeSocialPills} 
                  onChange={(e) => setIncludeSocialPills(e.target.checked)}
                  className="accent-amber-400"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-white/5">
                <div>
                  <div className="font-semibold text-slate-200">Branded Outro Card Crossfade</div>
                  <div className="text-[10px] text-slate-500">4.5s call-to-action screen with YouTube subscription prompt</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={includeOutro} 
                  onChange={(e) => setIncludeOutro(e.target.checked)}
                  className="accent-amber-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: 9:16 Mobile Phone Safe-Zone Canvas Preview (5 cols) */}
        <div className="col-span-5 flex flex-col items-center">
          <div className="relative w-64 h-[490px] bg-slate-950 rounded-[32px] border-4 border-slate-700 shadow-2xl overflow-hidden flex flex-col justify-between p-3 select-none">
            {/* Top Hook Banner Rendered */}
            <div className="mt-7 w-full bg-slate-950/80 border-t-2 border-b-2 border-amber-400/80 py-2.5 px-2 text-center backdrop-blur-md">
              <span className="text-[10px] font-extrabold text-amber-300 tracking-tight leading-tight block">
                {headline.toUpperCase()}
              </span>
            </div>

            {/* Video center area */}
            <div className="my-auto text-center">
              {/* Animated Subtitle Safe-Zone Preview */}
              <div className="bg-black/50 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/5 inline-block">
                <span className="text-xs font-black tracking-wide text-white font-sans drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  WHEN GOD WANTS TO <span className="text-amber-400 underline decoration-amber-400/60">BLESS YOU</span>
                </span>
              </div>
            </div>

            {/* Simulated TikTok UI Overlays to check Safe-Zone */}
            <div className="absolute right-2.5 bottom-16 flex flex-col items-center space-y-3 opacity-60 pointer-events-none">
              <div className="w-6 h-6 rounded-full bg-slate-600 border border-white/20" />
              <div className="w-5 h-5 rounded-full bg-slate-600" />
              <div className="w-5 h-5 rounded-full bg-slate-600" />
              <div className="w-5 h-5 rounded-full bg-slate-600" />
            </div>

            {/* Social pills in phone preview */}
            {includeSocialPills && (
              <div className="mb-4 space-y-1 opacity-90 scale-75 origin-bottom-left">
                <div className="bg-white text-slate-950 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 w-max shadow">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-950" /> niyiadekunle6
                </div>
                <div className="bg-white text-slate-950 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 w-max shadow">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600" /> NIYIADEKUNLETV
                </div>
              </div>
            )}

            {/* Safe Zone Boundary Notice */}
            <div className="absolute bottom-1 left-0 right-0 text-center">
              <span className="text-[8px] text-emerald-400 font-bold bg-black/80 px-2 py-0.5 rounded">
                Safe Zone: Clear of Platform UI
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
