import React, { useState, useRef, useMemo } from 'react';
import { 
  Type, 
  Palette, 
  ArrowRight, 
  AtSign,
  Sparkles,
  CheckCircle2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Film
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
    sourceVideo,
    subtitlesState, 
    setSubtitlesState, 
    clips, 
    activeClipIndex, 
    selectClip,
    updateActiveClip 
  } = useWorkflow();

  const {
    headline,
    hookBannerPreset = 'frosted_gold',
    stylePreset,
    includeSocialPills,
    tiktokHandle,
    youtubeHandle,
    instagramHandle
  } = subtitlesState;

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeClip = clips[activeClipIndex] || {
    id: 'Clip1',
    title: 'Discover Your Divine Calling & Purpose',
    hook: 'WHAT IS YOUR TRUE CALLING? 🎯',
    customHeadline: headline,
    hookBannerPreset: hookBannerPreset,
    subtitlePreset: stylePreset,
    start: 15.0,
    end: 45.0,
    isRendered: false,
    renderedPath: undefined
  };

  // Convert paths to file:/// URLs for Electron video playback
  const clipVideoUrl = useMemo(() => {
    // 1. If explicit rendered path exists
    let p = activeClip.renderedPath;
    // 2. If clip has id, check convention clips/ClipX_...
    if (!p && activeClip.id) {
      p = `clips/${activeClip.id}.mp4`;
    }
    // 3. Fallback to source video
    if (!p && sourceVideo) {
      p = sourceVideo;
    }
    if (!p) return '';
    if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('file://')) return p;
    const normalized = p.replace(/\\/g, '/');
    return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`;
  }, [activeClip.renderedPath, activeClip.id, sourceVideo]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleOpenRendered = () => {
    const p = activeClip.renderedPath || (activeClip.id ? `clips/${activeClip.id}.mp4` : null);
    if (window.hclipper && p) {
      window.hclipper.openPath(p);
    }
  };

  const handleHeadlineChange = (newHeadline: string) => {
    setSubtitlesState((prev) => ({ ...prev, headline: newHeadline }));
    updateActiveClip({ customHeadline: newHeadline });
  };

  const handleHookPresetChange = (preset: 'frosted_gold' | 'cyber_neon' | 'clean_minimal' | 'viral_warning') => {
    setSubtitlesState((prev) => ({ ...prev, hookBannerPreset: preset }));
    updateActiveClip({ hookBannerPreset: preset });
  };

  const handlePresetChange = (preset: 'tiktok_bold' | 'dynamic_pop' | 'clean_white') => {
    setSubtitlesState((prev) => ({ ...prev, stylePreset: preset }));
    updateActiveClip({ subtitlePreset: preset });
  };

  const hookPresets: {
    id: 'frosted_gold' | 'cyber_neon' | 'clean_minimal' | 'viral_warning';
    label: string;
    desc: string;
    bannerClasses: string;
    textClasses: string;
  }[] = [
    {
      id: 'frosted_gold',
      label: 'Frosted Gold',
      desc: 'Obsidian glass with 24k gold border & typography',
      bannerClasses: 'bg-black/85 backdrop-blur-md border border-amber-400/50 shadow-[0_4px_20px_rgba(245,158,11,0.25)]',
      textClasses: 'text-amber-300'
    },
    {
      id: 'cyber_neon',
      label: 'Cyber Neon',
      desc: 'Midnight glass with electric cyan & purple border glow',
      bannerClasses: 'bg-slate-950/90 backdrop-blur-md border border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.35)]',
      textClasses: 'text-cyan-300'
    },
    {
      id: 'clean_minimal',
      label: 'Clean Minimal',
      desc: 'Translucent smoke glass with crisp white bold font',
      bannerClasses: 'bg-white/10 backdrop-blur-lg border border-white/30 shadow-lg',
      textClasses: 'text-white'
    },
    {
      id: 'viral_warning',
      label: 'Viral Alert',
      desc: 'High-contrast warning yellow badge with black font',
      bannerClasses: 'bg-amber-400 border-2 border-amber-300 shadow-xl',
      textClasses: 'text-slate-950 font-black'
    }
  ];

  const currentHookConfig = hookPresets.find((p) => p.id === hookBannerPreset) || hookPresets[0];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
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

      <div className="grid grid-cols-12 gap-7">
        {/* Left: Customization Settings (7 cols) */}
        <div className="col-span-7 space-y-5">
          {/* Hook Banner Card */}
          <div className="glass-card rounded-xl p-5 space-y-3.5 border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Type className="w-4 h-4 text-amber-400" />
                Clip #{activeClipIndex + 1} Hook Banner Headline
              </span>
              <span className="text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 font-semibold">
                {currentHookConfig.label}
              </span>
            </div>

            <input 
              type="text" 
              value={headline}
              onChange={(e) => handleHeadlineChange(e.target.value)}
              placeholder="e.g. KNOW THE ATTACHMENT WHEN YOU START..."
              className="w-full bg-slate-900 border border-white/15 rounded-lg px-4 py-2.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400/60 shadow-inner"
            />

            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
              <span className="text-slate-500 font-medium">AI Suggested Hook:</span>
              <button
                onClick={() => handleHeadlineChange(activeClip.hook)}
                className="text-amber-400 hover:underline italic font-medium truncate max-w-sm"
              >
                "{activeClip.hook}"
              </button>
            </div>

            {/* Hook Banner Style Presets */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Hook Banner Visual Themes:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {hookPresets.map((preset) => {
                  const isSelected = hookBannerPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleHookPresetChange(preset.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-400/10 border-amber-400/60 text-white shadow-sm'
                          : 'bg-slate-900/80 border-white/5 text-slate-400 hover:text-white hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                          {preset.label}
                        </span>
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-amber-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{preset.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Subtitle Style Presets */}
          <div className="glass-card rounded-xl p-5 space-y-3.5 border-white/10">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-sky-400" />
              Subtitle Styling Presets (ASS)
            </span>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handlePresetChange('tiktok_bold')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  stylePreset === 'tiktok_bold'
                    ? 'bg-amber-400/10 border-amber-400/50 text-white shadow-sm'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-amber-400">TikTok Bold</div>
                <div className="text-[10px] text-slate-400 mt-1 leading-snug">Segoe UI Black with gold word highlight</div>
              </button>

              <button
                onClick={() => handlePresetChange('dynamic_pop')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  stylePreset === 'dynamic_pop'
                    ? 'bg-sky-400/10 border-sky-400/50 text-white shadow-sm'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-sky-400">Dynamic Pop</div>
                <div className="text-[10px] text-slate-400 mt-1 leading-snug">Bouncing word animation with neon cyan box</div>
              </button>

              <button
                onClick={() => handlePresetChange('clean_white')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  stylePreset === 'clean_white'
                    ? 'bg-white/10 border-white/40 text-white shadow-sm'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-slate-200">Clean Minimal</div>
                <div className="text-[10px] text-slate-400 mt-1 leading-snug">Understated semi-bold with crisp shadow</div>
              </button>
            </div>
          </div>

          {/* Social Watermark Pills */}
          <div className="glass-card rounded-xl p-5 space-y-3.5 border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <AtSign className="w-4 h-4 text-emerald-400" />
                Safe-Zone Social Watermark Pills
              </span>
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer font-medium">
                <input 
                  type="checkbox" 
                  checked={includeSocialPills}
                  onChange={(e) => setSubtitlesState((prev) => ({ ...prev, includeSocialPills: e.target.checked }))}
                  className="accent-amber-400 w-3.5 h-3.5"
                />
                <span>Enable Watermark</span>
              </label>
            </div>

            {includeSocialPills && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center space-x-3">
                  <div className="w-24 flex items-center space-x-1.5 text-xs text-slate-300">
                    <TikTokIcon className="w-3.5 h-3.5 text-white" />
                    <span>TikTok</span>
                  </div>
                  <input 
                    type="text" 
                    value={tiktokHandle}
                    onChange={(e) => setSubtitlesState((prev) => ({ ...prev, tiktokHandle: e.target.value }))}
                    className="flex-1 bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400/50"
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
                    className="flex-1 bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400/50"
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
                    className="flex-1 bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400/50"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Vertical 9:16 Preview (5 cols) */}
        <div className="col-span-5 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Clip #{activeClipIndex + 1} 9:16 Composite Preview</span>
            </span>
            {activeClip.isRendered && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Rendered (QSV)</span>
              </span>
            )}
          </div>

          {/* Vertical 9:16 Mockup Frame */}
          <div className="relative w-72 h-[505px] bg-slate-950 rounded-3xl border-4 border-slate-800 overflow-hidden shadow-2xl flex flex-col justify-between p-3.5 select-none ring-1 ring-white/10">
            {/* Background Video Player */}
            {clipVideoUrl ? (
              <video
                ref={videoRef}
                src={clipVideoUrl}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                loop
                muted={isMuted}
                playsInline
              />
            ) : (
              <div className="absolute inset-0 bg-slate-950 flex items-center justify-center text-slate-600 text-xs font-medium">
                No Video Media Available
              </div>
            )}

            {/* Cinematic Readability Vignette */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/85 pointer-events-none z-10" />

            {/* Top Hook Banner Overlay */}
            <div className="relative z-20 w-full mt-1">
              <div className={`w-full rounded-xl p-2.5 text-center transition-all ${currentHookConfig.bannerClasses}`}>
                <span className={`text-[11px] font-black uppercase tracking-wider font-display leading-tight block ${currentHookConfig.textClasses}`}>
                  {headline || 'YOUR HOOK HEADLINE HERE'}
                </span>
              </div>
            </div>

            {/* Middle Animated Karaoke Subtitle Demo */}
            <div className="relative z-20 text-center px-2 space-y-1 my-auto">
              {stylePreset === 'tiktok_bold' && (
                <div className="text-base font-black tracking-tight leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
                  <span className="text-white">THIS IS YOUR </span>
                  <span className="text-amber-400 bg-black/70 px-1 py-0.5 rounded border border-amber-400/40">DIVINE MOMENT</span>
                  <span className="text-white"> TO RISE</span>
                </div>
              )}

              {stylePreset === 'dynamic_pop' && (
                <div className="text-base font-black tracking-tight leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
                  <span className="text-white">STOP </span>
                  <span className="text-sky-300 bg-sky-950/90 px-1.5 py-0.5 rounded border border-sky-400/70 shadow-lg">COMPARING</span>
                  <span className="text-white"> YOUR SEASON!</span>
                </div>
              )}

              {stylePreset === 'clean_white' && (
                <div className="text-sm font-semibold tracking-wide text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                  Consistency beats talent when talent doesn't work hard.
                </div>
              )}
            </div>

            {/* Bottom Safe Zone: Watermark Pills (TikTok + YouTube + Instagram) */}
            {includeSocialPills && (
              <div className="relative z-20 w-full flex flex-wrap justify-center gap-1.5 mb-2">
                {tiktokHandle && (
                  <div className="bg-black/75 backdrop-blur-md border border-white/15 rounded-full px-2.5 py-0.5 flex items-center space-x-1 shadow">
                    <TikTokIcon className="w-2.5 h-2.5 text-white" />
                    <span className="text-[9px] font-mono text-slate-200">{tiktokHandle}</span>
                  </div>
                )}
                {youtubeHandle && (
                  <div className="bg-black/75 backdrop-blur-md border border-white/15 rounded-full px-2.5 py-0.5 flex items-center space-x-1 shadow">
                    <YoutubeIcon className="w-2.5 h-2.5 text-red-500" />
                    <span className="text-[9px] font-mono text-slate-200">{youtubeHandle}</span>
                  </div>
                )}
                {instagramHandle && (
                  <div className="bg-black/75 backdrop-blur-md border border-white/15 rounded-full px-2.5 py-0.5 flex items-center space-x-1 shadow">
                    <InstagramIcon className="w-2.5 h-2.5 text-pink-500" />
                    <span className="text-[9px] font-mono text-slate-200">{instagramHandle}</span>
                  </div>
                )}
              </div>
            )}

            {/* Floating Player Controls */}
            <div className="absolute top-3 right-3 z-30 flex items-center space-x-1.5 bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/15">
              <button
                onClick={togglePlay}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                title={isPlaying ? 'Pause Preview' : 'Play Preview'}
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 translate-x-0.5" />}
              </button>
              <button
                onClick={toggleMute}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <VolumeX className="w-3 h-3 text-slate-400" /> : <Volume2 className="w-3 h-3 text-amber-400" />}
              </button>
            </div>
          </div>

          {/* Action Row Under Phone Preview */}
          <div className="flex items-center space-x-2 mt-3 w-72 justify-between">
            <span className="text-[11px] font-mono text-slate-400 truncate">
              {activeClip.id || `Clip #${activeClipIndex + 1}`}
            </span>
            {activeClip.isRendered && (
              <button
                onClick={handleOpenRendered}
                className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Film className="w-3 h-3" />
                <span>Open in Player</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
