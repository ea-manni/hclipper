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
  Eye,
  AlertCircle,
  User,
  Tag
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

  // Clean speaker and topic derivation with automatic ID stripping
  const cleanSpeaker = (raw: string) => {
    return raw
      .replace(/\[[^\]]*\]/g, '') // remove bracketed IDs like [4_Uetxw16pE]
      .replace(/\([^)]*\)/g, '')   // remove parenthetical info
      .replace(/[—–|\/\\_#]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const defaultSpeaker = useMemo(() => {
    const pName = activeProject?.name || '';
    const nameMatch = pName.match(/(?:Pastor|Dr\.?|Rev\.?|Bishop|Apostle|Prophet|Minister|Elder)\s+[^—–|\-\[\]]+/i);
    if (nameMatch) return cleanSpeaker(nameMatch[0]);
    const before = pName.split(/[—–|\-]/)[0];
    return cleanSpeaker(before) || 'Pastor Bankie Olusina';
  }, [activeProject?.name]);

  const defaultTopic = useMemo(() => {
    const pName = activeProject?.name || '';
    const parts = pName.split(/[—–|｜]/).map(p => cleanSpeaker(p)).filter(Boolean);
    return parts[0] || 'Value Keys For Right Decisions';
  }, [activeProject?.name]);

  const [customSpeaker, setCustomSpeaker] = useState(defaultSpeaker);
  const [customTopic, setCustomTopic] = useState(defaultTopic);

  useEffect(() => {
    setCustomSpeaker(defaultSpeaker);
  }, [defaultSpeaker]);

  useEffect(() => {
    setCustomTopic(defaultTopic);
  }, [defaultTopic]);

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
  const [motionProgress, setMotionProgress] = useState(0);
  const [motionPhase, setMotionPhase] = useState<'idle' | 'sfx' | 'canvas' | 'compositing' | 'completed' | 'error'>('idle');
  const [motionDetail, setMotionDetail] = useState('');
  const [renderMotionStatus, setRenderMotionStatus] = useState<string | null>(null);
  const [showRerenderMasterConfirm, setShowRerenderMasterConfirm] = useState(false);
  const [isTranscribingWhisper, setIsTranscribingWhisper] = useState(false);
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

  // IPC listener for real-time motion rendering progress
  useEffect(() => {
    if (!window.hclipper) return;
    const unsub = window.hclipper.onEngineEvent((data) => {
      if (data.event === 'motion_progress') {
        if (typeof data.percent === 'number') {
          setMotionProgress(data.percent);
        }
        if (data.phase) {
          setMotionPhase(data.phase);
        }
        if (data.detail) {
          setMotionDetail(data.detail);
        }
      } else if (data.event === 'motion_result') {
        if (data.success) {
          setMotionProgress(100);
          setMotionPhase('completed');
          setIsRenderingMotion(false);
        } else {
          setMotionPhase('error');
          setIsRenderingMotion(false);
        }
      }
    });
    return () => unsub();
  }, []);

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

  // Dynamic Semantic Motion Cue Detection based on actual speech cues
  const detectedMotionCues = useMemo(() => {
    const list: Array<{
      id: string;
      type: string;
      icon: string;
      label: string;
      timeRange: string;
      sfx: string;
      detail: string;
      badgeColor: string;
    }> = [];

    const clipDur = Math.max(10, (activeClip.end || 30) - (activeClip.start || 0));

    // 1. Kinetic Hook Intro (0.0s - 3.5s)
    list.push({
      id: 'cue_hook',
      type: 'kinetic_hook',
      icon: '🎯',
      label: 'Kinetic Hook Typography',
      timeRange: '0.0s - 3.5s',
      sfx: 'Whoosh Swish',
      detail: cleanSermonHeadline(headline || activeClip.customHeadline || activeClip.hook || activeClip.title),
      badgeColor: 'border-amber-500/40 bg-amber-950/60 text-amber-300'
    });

    // 2. Speaker Badge Lower-Third (4.0s - 7.5s)
    list.push({
      id: 'cue_speaker',
      type: 'lower_third',
      icon: '👤',
      label: `Speaker: ${customSpeaker}`,
      timeRange: '4.0s - 7.5s',
      sfx: 'Acoustic Slide',
      detail: customTopic,
      badgeColor: 'border-cyan-500/40 bg-cyan-950/60 text-cyan-300'
    });

    // 3. Scan transcript cues for semantic triggers
    const transcript = activeClip.transcriptCues || [];
    let lastTime = 7.5;

    for (let i = 0; i < transcript.length; i++) {
      const c = transcript[i];
      const s = typeof c.start === 'number' ? c.start : 0;
      const txt = c.text || '';
      if (s - lastTime < 3.0) continue;

      // Scripture / Wisdom detection
      if (/\b(scripture|bible|proverb|psalm|god|lord|verse|solomon|matthew|john|romans|commandment)\b/i.test(txt)) {
        list.push({
          id: `cue_scripture_${i}`,
          type: 'scripture_plaque',
          icon: '📖',
          label: 'Scripture / Wisdom Plaque',
          timeRange: `${s.toFixed(1)}s - ${(s + 3.8).toFixed(1)}s`,
          sfx: 'Harmonic Chime',
          detail: `"${txt.slice(0, 48)}..."`,
          badgeColor: 'border-purple-500/40 bg-purple-950/60 text-purple-300'
        });
        lastTime = s + 3.8;
        continue;
      }

      // Money / Currency / Value detection
      if (/\b(money|wealth|salary|dollar|naira|paid|cash|profit|50 houses|rollsroyce|\$|₦|£|€)\b/i.test(txt)) {
        list.push({
          id: `cue_money_${i}`,
          type: 'currency_badge',
          icon: '💰',
          label: 'Value & Wealth Callout',
          timeRange: `${s.toFixed(1)}s - ${(s + 3.0).toFixed(1)}s`,
          sfx: 'Kaching Ring',
          detail: `Highlight: ${txt.slice(0, 36)}`,
          badgeColor: 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300'
        });
        lastTime = s + 3.0;
        continue;
      }

      // Warning / Danger / Trap detection
      if (/\b(warning|danger|trap|mistake|stop|never|beware|leanness|sickness)\b/i.test(txt)) {
        list.push({
          id: `cue_warning_${i}`,
          type: 'warning_stamp',
          icon: '⚠️',
          label: 'High-Impact Warning Stamp',
          timeRange: `${s.toFixed(1)}s - ${(s + 3.0).toFixed(1)}s`,
          sfx: 'Vinyl Scratch',
          detail: txt.toUpperCase().slice(0, 36),
          badgeColor: 'border-rose-500/40 bg-rose-950/60 text-rose-300'
        });
        lastTime = s + 3.0;
        continue;
      }

      // Chat / DM / Quote detection
      if (/\b(said to me|told me|replied|dm|message|texted)\b/i.test(txt)) {
        list.push({
          id: `cue_chat_${i}`,
          type: 'chat_bubble',
          icon: '💬',
          label: 'Simulated Dialogue Bubble',
          timeRange: `${s.toFixed(1)}s - ${(s + 3.2).toFixed(1)}s`,
          sfx: 'Tactile Pop',
          detail: `"${txt.slice(0, 40)}..."`,
          badgeColor: 'border-sky-500/40 bg-sky-950/60 text-sky-300'
        });
        lastTime = s + 3.2;
        continue;
      }
    }

    // 4. Karaoke Subtitles
    list.push({
      id: 'cue_subs',
      type: 'karaoke_subs',
      icon: '⚡',
      label: `Progressive Subtitles (${stylePreset === 'dynamic_pop' ? 'Electric Cyan' : stylePreset === 'clean_white' ? 'Clean White' : 'TikTok Gold'})`,
      timeRange: '0.0s - End',
      sfx: 'Karaoke Sync',
      detail: 'Progressive word-by-word karaoke with safe-zone positioning',
      badgeColor: 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300'
    });

    // 5. Outro Call to Action
    if (clipDur >= 18) {
      list.push({
        id: 'cue_outro',
        type: 'outro_cta',
        icon: '🚀',
        label: 'Outro Engagement CTA',
        timeRange: `${(clipDur - 4.0).toFixed(1)}s - ${clipDur.toFixed(1)}s`,
        sfx: 'Warm Chime',
        detail: 'Follow for more divine insights',
        badgeColor: 'border-amber-500/40 bg-amber-950/60 text-amber-300'
      });
    }

    return list;
  }, [activeClip.transcriptCues, activeClip.start, activeClip.end, headline, activeClip.customHeadline, activeClip.hook, activeClip.title, customSpeaker, customTopic, stylePreset]);

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

  const handleTranscribeWithWhisper = async () => {
    if (!window.hclipper) return;
    const targetVid = activeClip.renderedPath || (activeClip.id ? `clips/${activeClip.id}.mp4` : null) || sourceVideo;
    if (!targetVid) return;

    setIsTranscribingWhisper(true);
    try {
      const tempAss = `scratch/whisper_${activeClip.id || 'clip'}.ass`;
      const res = await window.hclipper.runEngine('subtitles', [
        targetVid,
        tempAss,
        '--preset', subtitlesState.stylePreset || activeClip.subtitlePreset || 'tiktok_bold'
      ]);
      const evt = res?.events?.find((e: any) => e.event === 'subtitles_result');
      if (evt && evt.cues && evt.cues.length > 0) {
        updateActiveClip({ transcriptCues: evt.cues });
      }
    } catch (e) {
      console.error('Whisper transcription error:', e);
    } finally {
      setIsTranscribingWhisper(false);
    }
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
                  disabled={isTranscribingWhisper}
                  onClick={handleTranscribeWithWhisper}
                  className="px-2.5 py-1 bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-semibold rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                  title="Transcribe speech with frame-perfect word timestamps using local faster-whisper"
                >
                  {isTranscribingWhisper ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                      <span>Transcribing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3 text-cyan-400" />
                      <span>Whisper AI Sync</span>
                    </>
                  )}
                </button>
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
                  if (activeClip.isRendered) {
                    setShowRerenderMasterConfirm(true);
                  } else {
                    const out = await startRenderClip(activeClipIndex, true, true);
                    if (out) {
                      setPreviewMode('rendered');
                    }
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
                  {detectedMotionCues.length} Active Cues
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Synthesizes physical spring physics typography, responsive lower-third speaker identifiers, and synchronized tactile sound effects directly onto the reframed vertical short.
            </p>

            {/* Editable Speaker & Topic Config */}
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-lg bg-slate-900/90 border border-cyan-400/20 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-cyan-400" />
                  Speaker Name
                </label>
                <input
                  type="text"
                  value={customSpeaker}
                  onChange={(e) => setCustomSpeaker(e.target.value)}
                  placeholder="e.g. Pastor Bankie Olusina"
                  className="w-full bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-cyan-400" />
                  Sermon Topic / Org
                </label>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g. Value Keys For Right Decisions"
                  className="w-full bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-white/10">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Active Visual Motion Layers:</span>
                <span className="text-[10px] text-cyan-400/80 font-mono">Dynamic AI Speech Analysis</span>
              </div>
              
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {detectedMotionCues.map((cue) => (
                  <div key={cue.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-white/5 text-xs">
                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                      <span className="font-bold text-amber-400 shrink-0 font-mono text-[11px]">{cue.timeRange}</span>
                      <span className="text-white font-semibold truncate flex items-center gap-1">
                        <span>{cue.icon}</span>
                        <span className="truncate">{cue.label}</span>
                      </span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded border shrink-0 ${cue.badgeColor}`}>
                      SFX: {cue.sfx}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Visual Motion Rendering Feedback Panel */}
            {isRenderingMotion && (
              <div className="p-4 rounded-xl bg-slate-900 border border-cyan-400/40 shadow-xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-cyan-300 font-bold">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>Rendering Dynamic Motion Clip...</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-400/40 text-cyan-300 font-semibold">{motionPhase}</span>
                  </div>
                  <span className="font-mono text-cyan-400 font-black text-sm">{motionProgress}%</span>
                </div>

                {/* Animated Glowing Progress Bar */}
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-cyan-400/30">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-amber-400 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                    style={{ width: `${motionProgress}%` }}
                  />
                </div>

                {/* Multi-Stage Visual Stepper */}
                <div className="space-y-1.5 pt-1 text-[11px]">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      {motionProgress >= 15 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
                      <span>1. Tactile SFX Track Synthesis (Whoosh, Pop, Slide)</span>
                    </span>
                    <span className={motionProgress >= 15 ? 'text-emerald-400 font-mono font-bold' : 'text-cyan-400 font-mono'}>
                      {motionProgress >= 15 ? 'Complete ✓' : 'Running...'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      {motionProgress >= 85 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : motionProgress >= 15 ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <Clock className="w-3.5 h-3.5 text-slate-500" />}
                      <span>2. Headless Chromium Kinetic Motion Canvas</span>
                    </span>
                    <span className={motionProgress >= 85 ? 'text-emerald-400 font-mono font-bold' : motionProgress >= 15 ? 'text-cyan-400 font-mono font-bold' : 'text-slate-500 font-mono'}>
                      {motionProgress >= 85 ? 'Complete ✓' : motionProgress >= 15 ? `${motionProgress}%` : 'Waiting'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      {motionProgress === 100 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : motionProgress >= 85 ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <Clock className="w-3.5 h-3.5 text-slate-500" />}
                      <span>3. Hardware FFmpeg Overlay & SFX Audio Mastering</span>
                    </span>
                    <span className={motionProgress === 100 ? 'text-emerald-400 font-mono font-bold' : motionProgress >= 85 ? 'text-cyan-400 font-mono' : 'text-slate-500 font-mono'}>
                      {motionProgress === 100 ? 'Complete ✓' : motionProgress >= 85 ? 'Encoding...' : 'Waiting'}
                    </span>
                  </div>
                </div>

                {motionDetail && (
                  <div className="text-[10px] text-cyan-300/90 font-mono bg-cyan-950/70 px-2.5 py-1 rounded border border-cyan-400/20 truncate">
                    {motionDetail}
                  </div>
                )}
              </div>
            )}

            {/* Completion Result Banner with Direct Player Action */}
            {renderMotionStatus && !isRenderingMotion && (
              <div className={`text-[11px] p-3 rounded-xl border flex items-start gap-2.5 animate-in fade-in ${
                renderMotionStatus.startsWith('✓') 
                  ? 'bg-emerald-950/80 border-emerald-400/40 text-emerald-200 shadow-lg' 
                  : 'bg-red-950/80 border-red-400/40 text-red-200'
              }`}>
                {renderMotionStatus.startsWith('✓') ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-2 flex-1">
                  <div className="font-semibold break-all leading-relaxed">{renderMotionStatus}</div>
                  {renderMotionStatus.startsWith('✓') && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        onClick={() => {
                          const targetOut = `clips/${activeClip.id || 'Clip'}_Dynamic_Motion.mp4`;
                          if (window.hclipper) window.hclipper.openPath(targetOut);
                        }}
                        className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition-colors shadow"
                      >
                        <Film className="w-3 h-3" />
                        <span>Play Video</span>
                      </button>
                      <button
                        onClick={() => {
                          const targetOut = `clips/${activeClip.id || 'Clip'}_Dynamic_Motion.mp4`;
                          if (window.hclipper) window.hclipper.showInFolder(targetOut);
                        }}
                        className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1 transition-colors border border-white/10"
                      >
                        <FolderOpen className="w-3 h-3" />
                        <span>Show in Folder</span>
                      </button>
                      <button
                        onClick={() => setPreviewMode('rendered')}
                        className="px-2.5 py-1 rounded bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-300 text-xs font-semibold flex items-center gap-1 transition-colors border border-cyan-400/40"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View in Mockup Frame</span>
                      </button>
                    </div>
                  )}
                </div>
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
                  setMotionProgress(5);
                  setMotionPhase('sfx');
                  setMotionDetail('Synthesizing tactile SFX audio track (whoosh, pop, slide)...');
                  setRenderMotionStatus(null);

                  const cleanHeadline = cleanSermonHeadline(activeClip.customHeadline || activeClip.hook || activeClip.title);
                  const targetOut = `clips/${activeClip.id || 'Clip'}_Dynamic_Motion.mp4`;

                  const motionArgs = [
                    inputVid,
                    targetOut,
                    '--headline', cleanHeadline,
                    '--speaker', customSpeaker,
                    '--topic', customTopic,
                    '--template', 'motion_canvas.html',
                    '--preset', subtitlesState.stylePreset || activeClip.subtitlePreset || 'tiktok_bold'
                  ];

                  if (activeClip.transcriptCues && activeClip.transcriptCues.length > 0) {
                    motionArgs.push('--text-cues', JSON.stringify(activeClip.transcriptCues));
                  }
                  if (subtitlesState.includeSubtitles === false) {
                    motionArgs.push('--no-subs');
                  }

                  try {
                    const res = await window.hclipper.runEngine('motion', motionArgs);

                    const resultEvt = res?.events?.find((e: any) => e.event === 'motion_result');
                    const isSuccess = Boolean(res?.success && (resultEvt ? resultEvt.success : true));

                    if (isSuccess) {
                      setMotionProgress(100);
                      setMotionPhase('completed');
                      updateActiveClip({
                        isRendered: true,
                        renderedPath: targetOut
                      });
                      setPreviewMode('rendered');
                      setRenderMotionStatus(`✓ Motion design short rendered successfully -> ${targetOut}`);

                      if (window.hclipper?.readQueue && window.hclipper?.saveQueue) {
                        try {
                          const curQueue = (await window.hclipper.readQueue()) || [];
                          const itemIdx = curQueue.findIndex((q: any) => q.filename === `${activeClip.id || 'Clip'}_Dynamic_Motion.mp4`);
                          const motionItem = {
                            id: `${activeClip.id || 'Clip'}_dynamic`,
                            projectId: activeProject.id,
                            projectName: activeProject.name,
                            title: `${activeClip.title || 'Clip'} (Dynamic Motion)`,
                            filename: `${activeClip.id || 'Clip'}_Dynamic_Motion.mp4`,
                            file_path: targetOut,
                            duration: `${Math.round(activeClip.end - activeClip.start)}s`,
                            caption: cleanHeadline,
                            status: { youtube: 'pending', tiktok_ng: 'pending', tiktok_us: 'pending', instagram: 'pending' }
                          };
                          if (itemIdx >= 0) curQueue[itemIdx] = motionItem;
                          else curQueue.push(motionItem);
                          await window.hclipper.saveQueue(curQueue);
                        } catch (e) {}
                      }
                    } else {
                      const errMsg = resultEvt?.error || 'Motion render process returned an error.';
                      setMotionPhase('error');
                      setRenderMotionStatus(`Error rendering motion: ${errMsg}`);
                    }
                  } catch (err: any) {
                    setMotionPhase('error');
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
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                    <span>Rendering Dynamic Motion ({motionProgress}%)...</span>
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

      {/* Re-render Master Short Confirmation Modal */}
      {showRerenderMasterConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 rounded-2xl border-amber-400/40 space-y-4 shadow-2xl animate-in zoom-in-95 bg-slate-900/95 overflow-hidden">
            <div className="flex items-center space-x-3 text-amber-400">
              <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Re-render Master Short Confirmation</h3>
                <span className="text-[11px] text-amber-400 font-semibold">Clip #{activeClipIndex + 1} • Overwrite Existing Master Video</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-2 overflow-hidden">
              <div className="text-xs font-bold text-white line-clamp-2">
                {activeClip.title}
              </div>
              <div className="text-[11px] text-slate-400 font-mono space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Subtitle Style Preset:</span>
                <span className="text-amber-400 font-semibold">{stylePreset.toUpperCase()} (Progressive Karaoke Underlining)</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This clip has already been rendered. Re-rendering will re-encode with your latest subtitle presets, hook banner, and audio DSP settings, overwriting the master MP4 file.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowRerenderMasterConfirm(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-colors"
              >
                Cancel (Keep Existing)
              </button>
              <button
                onClick={async () => {
                  setShowRerenderMasterConfirm(false);
                  const out = await startRenderClip(activeClipIndex, true, true);
                  if (out) setPreviewMode('rendered');
                }}
                className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Yes, Re-render Master Short</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
