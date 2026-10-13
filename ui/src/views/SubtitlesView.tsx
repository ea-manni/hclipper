import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  Film,
  Zap,
  Loader2,
  FolderOpen,
  FileText,
  Plus,
  Trash2,
  Clock,
  Eye
} from 'lucide-react';
import { YoutubeIcon, TikTokIcon, InstagramIcon } from '../components/Icons';
import { useWorkflow } from '../context/WorkflowContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

interface SubtitlesViewProps {
  onNext: () => void;
  onNavigateToScout?: () => void;
}

export const SubtitlesView: React.FC<SubtitlesViewProps> = ({ 
  onNext
}) => {
  const { 
    sourceVideo,
    activeProject,
    subtitlesState, 
    setSubtitlesState, 
    clips, 
    activeClipIndex, 
    selectClip,
    updateActiveClip,
    reframeState,
    startRenderClip,
    startBatchRenderAll
  } = useWorkflow();

  // Derive speaker name and organization dynamically from the active project
  const projectName = activeProject?.name || '';
  const speakerName = (() => {
    const nameMatch = projectName.match(/(?:Pastor|Dr\.?|Rev\.?|Bishop|Apostle|Prophet|Minister|Elder)\s+([^—–|\-]+)/i);
    if (nameMatch) return nameMatch[0].trim();
    const before = projectName.split(/[—–|\-]/)[0].trim();
    return before || 'Speaker';
  })();
  const speakerOrg = (() => {
    const afterDash = projectName.split(/[—–|]/)[1];
    return afterDash?.trim()?.split(/[·,]/)[0]?.trim() || '';
  })();

  const {
    headline,
    hookBannerPreset = 'frosted_gold',
    stylePreset = 'tiktok_bold',
    includeSubtitles = true,
    includeSocialPills,
    tiktokHandle,
    youtubeHandle,
    instagramHandle,
    enableHookBanner = true,
    hookBannerDuration = 'first_5s'
  } = subtitlesState;

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
    renderedPath: undefined,
    transcriptCues: []
  };

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [isRenderingMotion, setIsRenderingMotion] = useState(false);
  const [renderMotionStatus, setRenderMotionStatus] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'design' | 'rendered'>(
    activeClip.isRendered ? 'rendered' : 'design'
  );
  const videoRef = useRef<HTMLVideoElement>(null);

  // Automatically update preview mode when active clip changes or is rendered
  useEffect(() => {
    if (activeClip.isRendered && activeClip.renderedPath) {
      setPreviewMode('rendered');
    } else {
      setPreviewMode('design');
    }
  }, [activeClip.id, activeClip.isRendered]);

  const cleanSermonHeadline = (text?: string): string => {
    if (!text) return 'SERMON HIGHLIGHT';
    let clean = text
      .replace(/\[[a-zA-Z0-9_-]+\]/g, '')
      .replace(/(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*\.?\s+\d{1,2},?\s+\d{4}/gi, '')
      .replace(/\b\d{4}\b/g, '');
    const parts = clean.split(/[|｜—–]/);
    clean = (parts[0] || clean).trim().replace(/\s+/g, ' ');
    return clean.toUpperCase() || 'SERMON HIGHLIGHT';
  };

  const toFileUrl = (rawPath: string | null | undefined): string => {
    if (!rawPath) return '';
    if (rawPath.startsWith('http://') || rawPath.startsWith('https://') || rawPath.startsWith('file://')) {
      return rawPath;
    }
    let norm = rawPath.replace(/\\/g, '/');
    if (!norm.includes(':') && !norm.startsWith('/')) {
      norm = `C:/Users/Ebunoluwa/Desktop/hclipper/${norm}`;
    }
    return norm.startsWith('/') ? `file://${norm}` : `file:///${norm}`;
  };

  // Resolve video URL for playback depending on preview mode
  const currentVideoSrc = useMemo(() => {
    if (previewMode === 'rendered' && activeClip.renderedPath) {
      return toFileUrl(activeClip.renderedPath);
    }
    // In design mode, use sourceVideo so frames have NO burned-in duplicate text
    if (sourceVideo) {
      return toFileUrl(sourceVideo);
    }
    return activeClip.renderedPath ? toFileUrl(activeClip.renderedPath) : '';
  }, [previewMode, activeClip.renderedPath, sourceVideo]);

  // Keep design preview loop within clip boundaries
  useEffect(() => {
    if (!videoRef.current) return;
    if (previewMode === 'design' && sourceVideo && activeClip.start !== undefined) {
      videoRef.current.currentTime = activeClip.start;
      setVideoCurrentTime(activeClip.start);
    }
  }, [activeClip.id, activeClip.start, previewMode, sourceVideo]);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    const curTime = v.currentTime;
    if (previewMode === 'design' && sourceVideo && activeClip.end !== undefined && activeClip.start !== undefined) {
      if (curTime >= activeClip.end || curTime < activeClip.start) {
        v.currentTime = activeClip.start;
        setVideoCurrentTime(activeClip.start);
        return;
      }
    }
    setVideoCurrentTime(curTime);
  };

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

  const handleHookPresetChange = (preset: 'frosted_gold' | 'cyber_neon' | 'clean_minimal' | 'viral_warning' | 'kinetic_spring') => {
    setSubtitlesState((prev) => ({ ...prev, hookBannerPreset: preset }));
    updateActiveClip({ hookBannerPreset: preset });
  };

  const handlePresetChange = (preset: 'tiktok_bold' | 'dynamic_pop' | 'clean_white') => {
    setSubtitlesState((prev) => ({ ...prev, stylePreset: preset }));
    updateActiveClip({ subtitlePreset: preset });
  };

  // Dynamic progressive word-by-word active caption computation
  const currentCaption = useMemo(() => {
    // 1. Spoken transcript cues (from Whisper, VTT, or user edits)
    if (activeClip.transcriptCues && activeClip.transcriptCues.length > 0) {
      const relativeTime = (videoCurrentTime >= activeClip.start && videoCurrentTime <= activeClip.end)
        ? videoCurrentTime - activeClip.start
        : videoCurrentTime;

      const match = activeClip.transcriptCues.find((c) => {
        if (videoCurrentTime >= c.start && videoCurrentTime <= c.end) return true;
        if (relativeTime >= c.start && relativeTime <= c.end) return true;
        return false;
      });

      if (match) {
        const words = match.text.split(/\s+/).filter(Boolean);
        if (words.length === 0) return null;

        const isAbs = videoCurrentTime >= match.start && videoCurrentTime <= match.end;
        const cur = isAbs ? videoCurrentTime : relativeTime;
        const cueDur = Math.max(0.1, match.end - match.start);
        const elapsed = Math.max(0, cur - match.start);
        const progress = Math.min(0.999, elapsed / cueDur);
        const activeWordIdx = Math.floor(progress * words.length);

        return {
          words,
          activeWordIdx,
          rawText: match.text,
          start: match.start,
          end: match.end
        };
      }
      return null;
    }

    // 2. Fallback to rhythmic words from headline/title if no cues exist yet
    const cleanSource = cleanSermonHeadline(activeClip.customHeadline || activeClip.title || activeClip.hook);
    const words = cleanSource.split(/\s+/).filter(Boolean);
    if (!words.length) return null;

    const groupSize = 4;
    const totalGroups = Math.ceil(words.length / groupSize);
    const loopDur = totalGroups * 2.5;
    const loopTime = loopDur > 0 ? (videoCurrentTime % loopDur) : 0;
    const currentGroupIdx = Math.floor(loopTime / 2.5);
    const groupStart = currentGroupIdx * groupSize;
    const groupWords = words.slice(groupStart, groupStart + groupSize);
    const groupElapsed = loopTime - (currentGroupIdx * 2.5);
    const activeWordIdx = Math.min(
      groupWords.length - 1,
      Math.floor((groupElapsed / 2.5) * groupWords.length)
    );

    return {
      words: groupWords,
      activeWordIdx,
      rawText: groupWords.join(' '),
      start: 0,
      end: 2.5
    };
  }, [activeClip.transcriptCues, activeClip.customHeadline, activeClip.title, activeClip.hook, activeClip.start, activeClip.end, videoCurrentTime]);

  // Hook banner visibility window
  const isHookVisible = enableHookBanner && (
    hookBannerDuration === 'full_clip' ||
    (hookBannerDuration === 'first_3s' ? (videoCurrentTime - (activeClip.start || 0)) <= 3.2 : (videoCurrentTime - (activeClip.start || 0)) <= 5.2)
  );

  // Transcript Cue Editor handlers
  const handleUpdateCueText = (index: number, newText: string) => {
    const currentCues = [...(activeClip.transcriptCues || [])];
    if (currentCues[index]) {
      currentCues[index] = { ...currentCues[index], text: newText };
      updateActiveClip({ transcriptCues: currentCues });
    }
  };

  const handleAddCue = () => {
    const currentCues = [...(activeClip.transcriptCues || [])];
    const clipStart = activeClip.start || 0;
    const clipEnd = activeClip.end || (clipStart + 30);
    const lastEnd = currentCues.length > 0 
      ? currentCues[currentCues.length - 1].end 
      : clipStart;
    const newStart = Math.min(clipEnd, lastEnd);
    const newEnd = Math.min(clipEnd, newStart + 3.0);
    currentCues.push({
      start: Number(newStart.toFixed(1)),
      end: Number(newEnd.toFixed(1)),
      text: 'New spoken phrase...'
    });
    updateActiveClip({ transcriptCues: currentCues });
  };

  const handleDeleteCue = (index: number) => {
    const currentCues = (activeClip.transcriptCues || []).filter((_, i) => i !== index);
    updateActiveClip({ transcriptCues: currentCues });
  };

  const handlePopulateDefaultCues = () => {
    const headlineWords = (activeClip.customHeadline || activeClip.title || activeClip.hook || 'Key sermon insight').split(/\s+/).filter(Boolean);
    const sTime = activeClip.start || 0;
    const eTime = activeClip.end || (sTime + 30);
    const dur = Math.max(1, eTime - sTime);
    const chunkSize = 4;
    const totalChunks = Math.ceil(headlineWords.length / chunkSize);
    const chunkDur = dur / Math.max(1, totalChunks);
    const newCues = [];
    for (let i = 0; i < totalChunks; i++) {
      const s = sTime + (i * chunkDur);
      const e = s + chunkDur;
      const txt = headlineWords.slice(i * chunkSize, (i + 1) * chunkSize).join(' ');
      newCues.push({
        start: Number(s.toFixed(1)),
        end: Number(e.toFixed(1)),
        text: txt
      });
    }
    updateActiveClip({ transcriptCues: newCues });
  };

  const handleSeekToCue = (startSec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = startSec;
      setVideoCurrentTime(startSec);
    }
  };

  const hookPresets: {
    id: 'frosted_gold' | 'cyber_neon' | 'clean_minimal' | 'viral_warning' | 'kinetic_spring';
    label: string;
    desc: string;
    bannerClasses: string;
    textClasses: string;
  }[] = [
    {
      id: 'kinetic_spring',
      label: 'Kinetic Motion (Studio)',
      desc: 'Physics-driven damped spring typography with neon cyan glow',
      bannerClasses: 'bg-slate-950/95 backdrop-blur-xl border border-cyan-400/80 shadow-[0_0_25px_rgba(0,245,255,0.4)] ring-1 ring-cyan-400/30',
      textClasses: 'text-cyan-300 font-black'
    },
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
            Grounded workflow presets: customize individual hook banners, progressive word-by-word karaoke subtitles, and transcript cues for publication.
          </p>
        </div>

        <Button onClick={onNext} className="shadow-lg shadow-amber-500/20">
          <span>Proceed to Step 6: Publish</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
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
              <div className="flex items-center space-x-2.5">
                <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={enableHookBanner}
                    onChange={(e) => setSubtitlesState((prev) => ({ ...prev, enableHookBanner: e.target.checked }))}
                    className="accent-amber-400 w-3.5 h-3.5"
                  />
                  <span>Show Hook Banner</span>
                </label>
                {enableHookBanner && (
                  <span className="text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 font-semibold">
                    {currentHookConfig.label}
                  </span>
                )}
              </div>
            </div>

            {enableHookBanner ? (
              <div className="space-y-3.5">
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

                {/* Banner Display Duration */}
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Banner On-Screen Duration:
                    </span>
                    <span className="text-[10px] text-amber-400/80 italic font-mono">
                      Auto-fades to uncover speaker's face
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setSubtitlesState((prev) => ({ ...prev, hookBannerDuration: 'first_3s' }))}
                      className={`px-3 py-2 rounded-lg border text-center transition-all ${
                        hookBannerDuration === 'first_3s'
                          ? 'bg-amber-400/10 border-amber-400/60 text-amber-300 shadow-sm font-bold'
                          : 'bg-slate-900/80 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">⏱️ First 3 Seconds</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">Viral Hook Window</div>
                    </button>
                    <button
                      onClick={() => setSubtitlesState((prev) => ({ ...prev, hookBannerDuration: 'first_5s' }))}
                      className={`px-3 py-2 rounded-lg border text-center transition-all ${
                        hookBannerDuration === 'first_5s'
                          ? 'bg-amber-400/10 border-amber-400/60 text-amber-300 shadow-sm font-bold'
                          : 'bg-slate-900/80 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">⏱️ First 5 Seconds</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">Standard Intro</div>
                    </button>
                    <button
                      onClick={() => setSubtitlesState((prev) => ({ ...prev, hookBannerDuration: 'full_clip' }))}
                      className={`px-3 py-2 rounded-lg border text-center transition-all ${
                        hookBannerDuration === 'full_clip'
                          ? 'bg-amber-400/10 border-amber-400/60 text-amber-300 shadow-sm font-bold'
                          : 'bg-slate-900/80 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">♾️ Entire Clip</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">Permanent Overlay</div>
                    </button>
                  </div>
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
                        <Card
                          interactive
                          key={preset.id}
                          onClick={() => handleHookPresetChange(preset.id as any)}
                          className={`p-3 text-left relative overflow-hidden ${
                            isSelected
                              ? 'bg-amber-400/10 border-amber-400/50'
                              : 'bg-slate-900 border-white/5 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                              {preset.label}
                            </span>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-amber-400" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{preset.desc}</p>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">
                Hook banner is disabled for this clip. The full video frame remains 100% unobstructed.
              </p>
            )}
          </div>

          {/* Subtitle Style Presets (With Burn Toggle) */}
          <div className="glass-card rounded-xl p-5 space-y-3.5 border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-sky-400" />
                Subtitle Styling Presets (ASS Progressive Karaoke)
              </span>
              <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer font-medium">
                <input 
                  type="checkbox" 
                  checked={includeSubtitles !== false}
                  onChange={(e) => setSubtitlesState((prev) => ({ ...prev, includeSubtitles: e.target.checked }))}
                  className="accent-amber-400 w-3.5 h-3.5"
                />
                <span className={includeSubtitles !== false ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                  Burn Subtitles into Video
                </span>
              </label>
            </div>

            {includeSubtitles !== false ? (
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handlePresetChange('tiktok_bold')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    stylePreset === 'tiktok_bold'
                      ? 'bg-amber-400/10 border-amber-400/50 text-white shadow-sm ring-1 ring-amber-400/30'
                      : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold text-amber-400 flex items-center justify-between">
                    <span>TikTok Bold</span>
                    {stylePreset === 'tiktok_bold' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                    Segoe UI Black with gold word highlight & active word underline
                  </div>
                </button>

                <button
                  onClick={() => handlePresetChange('dynamic_pop')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    stylePreset === 'dynamic_pop'
                      ? 'bg-sky-400/10 border-sky-400/50 text-white shadow-sm ring-1 ring-sky-400/30'
                      : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold text-sky-400 flex items-center justify-between">
                    <span>Dynamic Pop</span>
                    {stylePreset === 'dynamic_pop' && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                    Bouncing word animation with neon cyan box & active word underline
                  </div>
                </button>

                <button
                  onClick={() => handlePresetChange('clean_white')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    stylePreset === 'clean_white'
                      ? 'bg-white/10 border-white/40 text-white shadow-sm ring-1 ring-white/30'
                      : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span>Clean Minimal</span>
                    {stylePreset === 'clean_white' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                    Understated semi-bold with crisp shadow & clean word underline
                  </div>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-slate-900/80 rounded-lg border border-white/5 text-slate-400 text-xs italic flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Subtitles are disabled for this clip. Video will render 100% clean without burned-in dialogue captions.</span>
              </div>
            )}
          </div>

          {/* Spoken Transcript Cues (Interactive Inline Editor) */}
          <div className="glass-card rounded-xl p-5 space-y-3.5 border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-400" />
                Spoken Transcript Cues (Click to Edit)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePopulateDefaultCues}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-[10px] font-semibold rounded transition-colors"
                  title="Auto-split clip title/headline into rhythmic speech cues"
                >
                  Auto-Split Headline
                </button>
                <button
                  onClick={handleAddCue}
                  className="px-2.5 py-1 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-semibold rounded flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Cue</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-snug">
              Edit the spoken words burned into the video. The karaoke engine underlines and highlights each word dynamically as speech advances.
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {activeClip.transcriptCues && activeClip.transcriptCues.length > 0 ? (
                activeClip.transcriptCues.map((cue, idx) => {
                  const isCurCue = videoCurrentTime >= cue.start && videoCurrentTime <= cue.end;
                  return (
                    <div 
                      key={idx}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                        isCurCue 
                          ? 'bg-amber-400/10 border-amber-400/40 shadow-sm' 
                          : 'bg-slate-900/80 border-white/5'
                      }`}
                    >
                      <button
                        onClick={() => handleSeekToCue(cue.start)}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 border shrink-0 transition-colors ${
                          isCurCue
                            ? 'bg-amber-400 text-slate-950 border-amber-300'
                            : 'bg-black/60 text-slate-300 border-white/10 hover:text-white'
                        }`}
                        title="Click to seek player to this cue"
                      >
                        <Clock className="w-2.5 h-2.5" />
                        <span>{cue.start.toFixed(1)}s - {cue.end.toFixed(1)}s</span>
                      </button>

                      <input
                        type="text"
                        value={cue.text}
                        onChange={(e) => handleUpdateCueText(idx, e.target.value)}
                        className="flex-1 bg-slate-950/80 border border-white/10 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400/60"
                        placeholder="Spoken words..."
                      />

                      <button
                        onClick={() => handleDeleteCue(idx)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors rounded"
                        title="Delete this cue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 bg-slate-900/50 rounded-lg border border-white/5 text-center space-y-2">
                  <p className="text-xs text-slate-400">No custom speech cues recorded for this clip yet.</p>
                  <button
                    onClick={handlePopulateDefaultCues}
                    className="px-3 py-1.5 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-semibold rounded transition-colors"
                  >
                    Generate Speech Cues from Clip Title
                  </button>
                </div>
              )}
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

          {/* Master Short Composite Render Card (Captions + Hook + Audio DSP) */}
          <div className="glass-card rounded-xl p-5 space-y-3.5 border-amber-400/30 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 shadow-[0_0_25px_rgba(245,158,11,0.08)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                Render Master Short (Captions + Hook + Audio)
              </span>
              {activeClip.isRendered && (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Rendered (QSV)
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Burns stylized progressive karaoke subtitles, frosted glass hook banner, and broadcast audio mastering (loudnorm, vocal highpass, denoise) into a publish-ready 1080x1920 MP4 via Intel QSV hardware acceleration.
            </p>

            {/* Progress bar if rendering */}
            {reframeState.isRendering && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span className="capitalize">{reframeState.renderPhase}...</span>
                  <span className="font-mono text-amber-400 font-bold">{reframeState.renderProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
                    style={{ width: `${reframeState.renderProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2 pt-1">
              <button
                disabled={reframeState.isRendering || !sourceVideo}
                onClick={async () => {
                  const out = await startRenderClip(activeClipIndex, true, true);
                  if (out) {
                    setPreviewMode('rendered');
                  }
                }}
                className={`flex-1 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                  reframeState.isRendering || !sourceVideo
                    ? 'bg-slate-800 text-slate-400 border border-white/10 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 active:scale-95 shadow-amber-500/20'
                }`}
              >
                {reframeState.isRendering ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                    <span>Rendering Master Short ({reframeState.renderProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>{activeClip.isRendered ? 'Re-render Master Short' : 'Render Master Short (GPU)'}</span>
                  </>
                )}
              </button>

              {activeClip.isRendered && (
                <>
                  <button
                    onClick={handleOpenRendered}
                    className="px-3 py-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                    title="Play in Default Video Player"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Play</span>
                  </button>
                  <button
                    onClick={() => {
                      const p = activeClip.renderedPath || (activeClip.id ? `clips/${activeClip.id}.mp4` : null);
                      if (window.hclipper && p) window.hclipper.showInFolder(p);
                    }}
                    className="px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                    title="Show in File Explorer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">All {clips.length} discovered clips in project:</span>
              <button
                disabled={reframeState.isRendering || !sourceVideo}
                onClick={async () => {
                  await startBatchRenderAll(false, true);
                }}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <Zap className="w-3 h-3" />
                <span>Batch Render All Masters</span>
              </button>
            </div>
          </div>

          {/* Bespoke Dynamic Motion Design Track */}
          <div className="glass-card rounded-xl p-5 space-y-4 border-cyan-500/30 bg-gradient-to-br from-slate-950/90 to-cyan-950/20 shadow-[0_0_25px_rgba(0,245,255,0.08)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Bespoke Dynamic Motion Design (Multi-Cue)
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/30 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
                  3 Active Cues
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Synthesizes physical spring physics typography, responsive lower-third speaker identifiers, and synchronized tactile sound effects directly onto the reframed vertical short.
            </p>

            <div className="space-y-2 pt-1 border-t border-white/10">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Active Visual Motion Layers:
              </div>
              
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">🎯 0.0s - 3.8s</span>
                    <span className="text-white font-semibold">Kinetic Hook Typography (Auto-fades to uncover face)</span>
                  </div>
                  <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">SFX: Whoosh Swish</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">👤 4.0s - 7.5s</span>
                    <span className="text-white font-semibold">Speaker Badge: {speakerName}</span>
                  </div>
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">SFX: Acoustic Slide</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">⚡ 0.0s - End</span>
                    <span className="text-white font-semibold">Karaoke Dialogue: Progressive Underlined Subtitles</span>
                  </div>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">Karaoke Engine</span>
                </div>
              </div>
            </div>

            {renderMotionStatus && (
              <div className="text-[11px] p-2 rounded-lg bg-slate-900/90 border border-amber-400/30 text-amber-300 font-medium animate-in fade-in">
                {renderMotionStatus}
              </div>
            )}

            <div className="pt-2">
              <button
                disabled={isRenderingMotion || (!activeClip.renderedPath && !sourceVideo)}
                onClick={async () => {
                  if (!window.hclipper) return;
                  const inputVid = activeClip.renderedPath || (activeClip.id ? `clips/${activeClip.id}.mp4` : null) || sourceVideo;
                  if (!inputVid) return;

                  setIsRenderingMotion(true);
                  setRenderMotionStatus('Rendering deterministic motion graphics & physical sound effects...');

                  const cleanHeadline = cleanSermonHeadline(activeClip.customHeadline || activeClip.hook || activeClip.title);
                  const targetOut = `clips/${activeClip.id || 'Clip'}_Dynamic_Motion.mp4`;

                  try {
                    const res = await window.hclipper.runEngine('motion', [
                      inputVid,
                      targetOut,
                      '--headline', cleanHeadline,
                      '--speaker', speakerName,
                      '--topic', speakerOrg || cleanHeadline,
                      '--template', 'kinetic_hook.html'
                    ]);

                    if (res && res.success) {
                      updateActiveClip({
                        isRendered: true,
                        renderedPath: targetOut
                      });
                      setPreviewMode('rendered');
                      setRenderMotionStatus(`✓ Motion design short rendered successfully -> ${targetOut}`);
                    } else {
                      setRenderMotionStatus('Motion render finished.');
                    }
                  } catch (err: any) {
                    setRenderMotionStatus(`Error rendering motion: ${err?.message || err}`);
                  } finally {
                    setIsRenderingMotion(false);
                  }
                }}
                className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                  isRenderingMotion
                    ? 'bg-slate-800 text-slate-400 border border-white/10 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 active:scale-95'
                }`}
              >
                {isRenderingMotion ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <span>Rendering Dynamic Motion Graphics...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Render Dynamic Motion Clip in HClipper</span>
                  </>
                )}
              </button>
            </div>
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

          {/* Mode Switcher: Live Design Overlays vs Final Burned Master */}
          <div className="flex bg-slate-900 border border-white/10 rounded-lg p-0.5 text-[11px] mb-3 w-72 justify-center shadow-inner">
            <button
              onClick={() => setPreviewMode('design')}
              className={`flex-1 py-1.5 px-2 rounded-md font-bold transition-all flex items-center justify-center gap-1.5 ${
                previewMode === 'design'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>✨ Live Design</span>
            </button>
            <button
              onClick={() => setPreviewMode('rendered')}
              disabled={!activeClip.isRendered}
              className={`flex-1 py-1.5 px-2 rounded-md font-bold transition-all flex items-center justify-center gap-1.5 ${
                previewMode === 'rendered'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : activeClip.isRendered
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 cursor-not-allowed opacity-40'
              }`}
              title={activeClip.isRendered ? 'View final rendered video with burned subtitles' : 'Render master short first to view baked video'}
            >
              <Film className="w-3 h-3" />
              <span>🎬 Rendered Master</span>
            </button>
          </div>

          {/* Vertical 9:16 Mockup Frame */}
          <div className="relative w-72 h-[505px] bg-slate-950 rounded-3xl border-4 border-slate-800 overflow-hidden shadow-2xl flex flex-col justify-between p-3.5 select-none ring-1 ring-white/10">
            {/* Background Video Player */}
            {currentVideoSrc ? (
              <video
                ref={videoRef}
                src={currentVideoSrc}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                loop
                muted={isMuted}
                playsInline
                onTimeUpdate={handleTimeUpdate}
              />
            ) : (
              <div className="absolute inset-0 bg-slate-950 flex items-center justify-center text-slate-600 text-xs font-medium">
                No Video Media Available
              </div>
            )}

            {/* Cinematic Readability Vignette */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/85 pointer-events-none z-10" />

            {/* Mode Indicator Pill inside player */}
            {previewMode === 'rendered' ? (
              <div className="relative z-20 w-full mt-1 px-1">
                <div className="bg-emerald-950/85 backdrop-blur-md border border-emerald-400/40 text-emerald-300 text-[10px] font-bold px-2 py-1 rounded-lg text-center shadow-lg">
                  ✓ Viewing Rendered Video (Burned Subtitles Baked In)
                </div>
              </div>
            ) : null}

            {/* In Design Mode: Live Top Hook Banner Overlay with Auto-Fade */}
            {previewMode === 'design' && (
              <div className={`relative z-20 w-full mt-1 px-1 transition-all duration-500 ${isHookVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
                <div className={`w-full rounded-xl p-2.5 text-center transition-all ${currentHookConfig.bannerClasses}`}>
                  <span className={`text-[11px] font-black uppercase tracking-wider font-display leading-tight block ${currentHookConfig.textClasses}`}>
                    {cleanSermonHeadline(headline || activeClip.customHeadline || activeClip.hook || activeClip.title)}
                  </span>
                </div>
              </div>
            )}

            {/* In Design Mode: Middle Dynamic Synchronized Subtitle Karaoke with Active Word Underline */}
            {previewMode === 'design' && includeSubtitles !== false && currentCaption && (
              <div className="relative z-20 text-center px-2 space-y-1 my-auto transition-all">
                <div className="text-base font-black tracking-tight leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,1)] flex flex-wrap justify-center items-center gap-y-1">
                  {currentCaption.words.map((word, wIdx) => {
                    const isActive = wIdx === currentCaption.activeWordIdx;

                    if (stylePreset === 'tiktok_bold') {
                      return (
                        <span
                          key={wIdx}
                          className={`inline-block mx-1 transition-all duration-150 ${
                            isActive
                              ? 'text-amber-400 font-black underline decoration-amber-400 decoration-4 underline-offset-4 bg-black/85 px-2 py-0.5 rounded shadow-lg ring-1 ring-amber-400/50 scale-105 -translate-y-0.5'
                              : 'text-white font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,1)]'
                          }`}
                        >
                          {word.toUpperCase()}
                        </span>
                      );
                    } else if (stylePreset === 'dynamic_pop') {
                      return (
                        <span
                          key={wIdx}
                          className={`inline-block mx-1 transition-all duration-150 ${
                            isActive
                              ? 'text-cyan-300 font-black underline decoration-cyan-400 decoration-4 underline-offset-4 bg-cyan-950/95 px-2 py-0.5 rounded border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)] scale-110 -translate-y-0.5 animate-pulse'
                              : 'text-white font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,1)]'
                          }`}
                        >
                          {word.toUpperCase()}
                        </span>
                      );
                    } else {
                      // clean_white
                      return (
                        <span
                          key={wIdx}
                          className={`inline-block mx-1 transition-all duration-150 ${
                            isActive
                              ? 'text-amber-300 font-black underline decoration-amber-300 decoration-2 underline-offset-4 scale-105'
                              : 'text-white/90 font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,1)]'
                          }`}
                        >
                          {word.toUpperCase()}
                        </span>
                      );
                    }
                  })}
                </div>
              </div>
            )}

            {/* In Design Mode: Bottom Safe Zone Watermark Pills */}
            {previewMode === 'design' && includeSocialPills && (
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
