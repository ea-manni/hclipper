import React from 'react';
import { 
  Type, 
  Palette, 
  ArrowRight, 
  AtSign,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { YoutubeIcon, TikTokIcon, InstagramIcon } from '../components/Icons';
import { useWorkflow } from '../context/WorkflowContext';

interface SubtitlesViewProps {
  onNext: () => void;
  onNavigateToScout?: () => void;
}

export const SubtitlesView: React.FC<SubtitlesViewProps> = ({ 
  onNext
}) => {
  const { 
    subtitlesState, 
    setSubtitlesState, 
    clips, 
    activeClipIndex, 
    selectClip,
    updateActiveClip 
  } = useWorkflow();

  const {
    headline,
    stylePreset,
    includeSocialPills,
    tiktokHandle,
    youtubeHandle,
    instagramHandle
  } = subtitlesState;

  const activeClip = clips[activeClipIndex] || {
    id: 'Clip1',
    title: 'Discover Your Divine Calling & Purpose',
    hook: 'WHAT IS YOUR TRUE CALLING? 🎯',
    customHeadline: headline,
    subtitlePreset: stylePreset,
    start: 15.0,
    end: 45.0
  };

  const handleHeadlineChange = (newHeadline: string) => {
    setSubtitlesState((prev) => ({ ...prev, headline: newHeadline }));
    updateActiveClip({ customHeadline: newHeadline });
  };

  const handlePresetChange = (preset: 'tiktok_bold' | 'dynamic_pop' | 'clean_white') => {
    setSubtitlesState((prev) => ({ ...prev, stylePreset: preset }));
    updateActiveClip({ subtitlePreset: preset });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-2xl font-bold font-display text-white">Captions & Viral Hook Branding</h2>
            <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Step 5 of 6
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Customize individual hook banner headlines, karaoke subtitle styles, and watermark badges for each specific clip.
          </p>
        </div>

        <button
          onClick={onNext}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-amber-500/10 flex items-center space-x-2"
        >
          <span>Proceed to Step 6: Social Publisher</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Clip Selector Tabs (Pills) */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Customize Branding For Clip ({activeClipIndex + 1} of {clips.length}):
        </label>
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {clips.map((c, i) => {
            const isCur = activeClipIndex === i;
            return (
              <button
                key={c.id || i}
                onClick={() => selectClip(i)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all flex items-center space-x-2 ${
                  isCur
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20 font-bold'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-white/10'
                }`}
              >
                <span className="font-mono text-[11px] opacity-80">#{i + 1}</span>
                <span className="truncate max-w-[160px]">{c.title}</span>
                {c.isRendered && (
                  <CheckCircle2 className="w-3 h-3 text-emerald-950" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Customization Settings (7 cols) */}
        <div className="col-span-7 space-y-5">
          {/* Hook Banner Card */}
          <div className="glass-card rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Type className="w-4 h-4 text-amber-400" />
                Clip #{activeClipIndex + 1} Hook Banner Headline
              </span>
              <span className="text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                Frosted Dark Glass
              </span>
            </div>
            <input 
              type="text" 
              value={headline}
              onChange={(e) => handleHeadlineChange(e.target.value)}
              placeholder="e.g. STOP COMPARING YOUR SEASON!"
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400/50"
            />
            <div className="flex items-center space-x-2 pt-1 text-[11px] text-slate-400">
              <span className="text-slate-500">AI Suggested Hook:</span>
              <button
                onClick={() => handleHeadlineChange(activeClip.hook)}
                className="text-amber-400 hover:underline italic font-medium truncate max-w-sm"
              >
                "{activeClip.hook}"
              </button>
            </div>
          </div>

          {/* Subtitle Style Presets */}
          <div className="glass-card rounded-xl p-5 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-sky-400" />
              Subtitle Styling Presets (ASS)
            </span>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handlePresetChange('tiktok_bold')}
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
                onClick={() => handlePresetChange('dynamic_pop')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  stylePreset === 'dynamic_pop'
                    ? 'bg-amber-400/10 border-amber-400/50 text-white'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-sky-400">Dynamic Pop</div>
                <div className="text-[10px] text-slate-400 mt-1">Bouncing word animation with neon cyan box</div>
              </button>

              <button
                onClick={() => handlePresetChange('clean_white')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  stylePreset === 'clean_white'
                    ? 'bg-amber-400/10 border-amber-400/50 text-white'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-slate-200">Clean Minimal</div>
                <div className="text-[10px] text-slate-400 mt-1">Understated semi-bold with crisp shadow</div>
              </button>
            </div>
          </div>

          {/* Social Watermark Pills */}
          <div className="glass-card rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <AtSign className="w-4 h-4 text-emerald-400" />
                Safe-Zone Social Watermark Pills
              </span>
              <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={includeSocialPills}
                  onChange={(e) => setSubtitlesState((prev) => ({ ...prev, includeSocialPills: e.target.checked }))}
                  className="accent-amber-400"
                />
                <span>Enable Watermark</span>
              </label>
            </div>

            {includeSocialPills && (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center space-x-3">
                  <div className="w-24 flex items-center space-x-1.5 text-xs text-slate-300">
                    <TikTokIcon className="w-3.5 h-3.5 text-white" />
                    <span>TikTok</span>
                  </div>
                  <input 
                    type="text" 
                    value={tiktokHandle}
                    onChange={(e) => setSubtitlesState((prev) => ({ ...prev, tiktokHandle: e.target.value }))}
                    className="flex-1 bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-24 flex items-center space-x-1.5 text-xs text-slate-300">
                    <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />
                    <span>YouTube</span>
                  </div>
                  <input 
                    type="text" 
                    value={youtubeHandle}
                    onChange={(e) => setSubtitlesState((prev) => ({ ...prev, youtubeHandle: e.target.value }))}
                    className="flex-1 bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-24 flex items-center space-x-1.5 text-xs text-slate-300">
                    <InstagramIcon className="w-3.5 h-3.5 text-pink-500" />
                    <span>Instagram</span>
                  </div>
                  <input 
                    type="text" 
                    value={instagramHandle}
                    onChange={(e) => setSubtitlesState((prev) => ({ ...prev, instagramHandle: e.target.value }))}
                    className="flex-1 bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Vertical 9:16 Preview (5 cols) */}
        <div className="col-span-5 flex flex-col items-center">
          <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Clip #{activeClipIndex + 1} 9:16 Preview</span>
          </div>

          <div className="relative w-64 h-[450px] bg-slate-950 rounded-2xl border-2 border-white/15 overflow-hidden shadow-2xl flex flex-col justify-between p-3 select-none">
            {/* Top Hook Banner */}
            <div className="w-full bg-black/85 backdrop-blur-md border border-amber-400/40 rounded-xl p-2.5 text-center shadow-lg mt-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 font-display leading-tight block">
                {headline || 'YOUR HOOK HEADLINE HERE'}
              </span>
            </div>

            {/* Middle Animated Karaoke Subtitle Demo */}
            <div className="text-center px-2 space-y-1 my-auto">
              {stylePreset === 'tiktok_bold' && (
                <div className="text-base font-black tracking-tight leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  <span className="text-white">THIS IS YOUR </span>
                  <span className="text-amber-400 bg-black/60 px-1 py-0.5 rounded">DIVINE MOMENT</span>
                  <span className="text-white"> TO RISE</span>
                </div>
              )}

              {stylePreset === 'dynamic_pop' && (
                <div className="text-base font-black tracking-tight leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  <span className="text-white">STOP </span>
                  <span className="text-sky-300 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-400/50">COMPARING</span>
                  <span className="text-white"> YOUR SEASON!</span>
                </div>
              )}

              {stylePreset === 'clean_white' && (
                <div className="text-sm font-semibold tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  Consistency beats talent when talent doesn't work hard.
                </div>
              )}
            </div>

            {/* Bottom Safe Zone: Watermark Pills */}
            {includeSocialPills && (
              <div className="w-full flex justify-center space-x-1.5 mb-4">
                <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-0.5 flex items-center space-x-1 shadow">
                  <TikTokIcon className="w-2.5 h-2.5 text-white" />
                  <span className="text-[9px] font-mono text-slate-200">{tiktokHandle}</span>
                </div>
                <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-0.5 flex items-center space-x-1 shadow">
                  <YoutubeIcon className="w-2.5 h-2.5 text-red-500" />
                  <span className="text-[9px] font-mono text-slate-200">{youtubeHandle}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
