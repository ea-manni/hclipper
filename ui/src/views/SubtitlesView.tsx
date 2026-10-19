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
  Tag,
  RotateCcw
} from 'lucide-react';
import { YoutubeIcon, TikTokIcon, InstagramIcon } from '../components/Icons';
import { useWorkflow, type MotionSuggestion } from '../context/WorkflowContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

interface SubtitlesViewProps {
  onNext: () => void;
  onNavigateToScout?: () => void;
  isActive?: boolean;
}

const SFX_OPTIONS = [
  { value: 'fast_whip_whoosh', label: '⚡ Fast Whip Whoosh', desc: 'Punchy aerodynamic whip' },
  { value: 'paper_tear', label: '📄 Paper Tear', desc: 'Tactile torn paper rip' },
  { value: 'camera_shutter', label: '📸 Camera Shutter', desc: 'Mechanical snap & latch' },
  { value: 'stamp_thump', label: '🔴 Stamp Thump', desc: 'Heavy ink seal impact' },
  { value: 'whoosh', label: '💨 Classic Whoosh', desc: 'Smooth spring transition' },
  { value: 'paper_slide', label: '📜 Paper Slide', desc: 'Friction parchment drag' },
  { value: 'marker_squeak', label: '🖍️ Marker Squeak', desc: 'Fluorescent highlighter swipe' },
  { value: 'pencil_scribble', label: '✏️ Pencil Scribble', desc: 'Graphite scribble accent' },
  { value: 'keyboard_thock', label: '⌨️ Keyboard Thock', desc: 'Mechanical keycap click' },
  { value: 'warm_chime', label: '🔔 Warm Chime', desc: 'Harmonic wisdom accent' },
  { value: 'pop', label: '🫧 Tactile Pop', desc: 'Crisp spring bubble' },
  { value: 'sub_thud', label: '💥 Sub Thud', desc: 'Low-frequency punch' },
  { value: 'red_scratch', label: '⚡ Vinyl Scratch', desc: 'Record needle pause' }
];

const ELEMENT_OPTIONS = [
  { value: 'kinetic_hook', label: '🎯 Kinetic Spring Hook', style: 'hyperframes' },
  { value: 'torn_paper_stat', label: '📄 Torn Paper Stat Box', style: 'collage' },
  { value: 'polaroid_card', label: '🖼️ Polaroid Picture Frame', style: 'collage' },
  { value: 'highlighter_swatch', label: '🖍️ Fluorescent Swatch', style: 'hyperframes' },
  { value: 'rubber_stamp', label: '🔴 Inked Rubber Stamp', style: 'collage' },
  { value: 'wisdom_plaque', label: '💎 Frosted Wisdom Plaque', style: 'hyperframes' },
  { value: 'chat_bubble', label: '💬 Simulated Chat Bubble', style: 'collage' }
];

export const SubtitlesView: React.FC<SubtitlesViewProps> = ({ 
  onNext,
  isActive = true
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
  const [auditioningSfx, setAuditioningSfx] = useState<string | null>(null);
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

  const [resolvedVideoSrc, setResolvedVideoSrc] = useState<string>('');

  const toFileUrl = (rawPath: string | null | undefined): string => {
    if (!rawPath) return '';
    if (rawPath.startsWith('http://') || rawPath.startsWith('https://') || rawPath.startsWith('file://')) {
      return rawPath;
    }
    const norm = rawPath.replace(/\\/g, '/');
    return norm.startsWith('/') ? `file://${norm}` : `file:///${norm}`;
  };

  // Resolve video URL for playback depending on preview mode
  const rawTargetVideo = useMemo(() => {
    if (previewMode === 'rendered' && activeClip.renderedPath) {
      return activeClip.renderedPath;
    }
    if (sourceVideo) {
      return sourceVideo;
    }
    return activeClip.renderedPath || '';
  }, [previewMode, activeClip.renderedPath, sourceVideo]);

  useEffect(() => {
    let active = true;
    if (!rawTargetVideo) {
      setResolvedVideoSrc('');
      return;
    }
    if (window.hclipper?.resolveMediaUrl) {
      window.hclipper.resolveMediaUrl(rawTargetVideo).then((url: string) => {
        if (active && url) setResolvedVideoSrc(url);
      }).catch(() => {
        if (active) setResolvedVideoSrc(toFileUrl(rawTargetVideo));
      });
    } else {
      setResolvedVideoSrc(toFileUrl(rawTargetVideo));
    }
    return () => { active = false; };
  }, [rawTargetVideo]);

  const currentVideoSrc = resolvedVideoSrc || toFileUrl(rawTargetVideo);

  // Pause playback when tab is not active
  useEffect(() => {
    if (!isActive && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

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

  // Procedural Web Audio Synth fallback for instantaneous auditioning
  const playAudioSynthFallback = (cleanName: string) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      if (cleanName.includes('whoosh')) {
        const bufferSize = Math.floor(ctx.sampleRate * 0.35);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(250, now);
        filter.frequency.exponentialRampToValueAtTime(1900, now + 0.15);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.35);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.12);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
      } else if (cleanName.includes('pop') || cleanName.includes('bubble')) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(950, now + 0.07);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (cleanName.includes('chime')) {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.05);
          gain.gain.setValueAtTime(0.18, now + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.05);
          osc.stop(now + idx * 0.05 + 0.55);
        });
      } else if (cleanName.includes('stamp') || cleanName.includes('thud')) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.18);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(550, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
      }
    } catch {
      // ignore
    } finally {
      setTimeout(() => setAuditioningSfx(null), 500);
    }
  };

  const playAuditionSfx = (sfxName: string) => {
    setAuditioningSfx(sfxName);
    const cleanName = sfxName.replace(/\.wav$/i, '').trim();
    const filePath = `engine/motion/sfx/${cleanName}.wav`;
    const url = toFileUrl(filePath);

    try {
      const audio = new Audio(url);
      audio.volume = 0.85;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setTimeout(() => setAuditioningSfx(null), 600);
          })
          .catch(() => {
            playAudioSynthFallback(cleanName);
          });
      } else {
        playAudioSynthFallback(cleanName);
      }
    } catch {
      playAudioSynthFallback(cleanName);
    }
  };

  const getDefaultMotionSuggestions = (clip: any): MotionSuggestion[] => {
    const dur = Math.max(12, (clip.end || 30) - (clip.start || 0));
    const cleanHeadline = cleanSermonHeadline(clip.customHeadline || clip.hook || clip.title || 'THE KEY PRINCIPLE');
    const speaker = customSpeaker || 'Keynote Speaker';
    return [
      {
        id: 'beat_1',
        time_offset: 0.0,
        style: 'hyperframes',
        element: 'kinetic_hook',
        text: cleanHeadline,
        sfx: 'fast_whip_whoosh',
        position: 'upper-center',
        rationale: 'High-energy kinetic typography hook grabs viewer attention in first 3s.'
      },
      {
        id: 'beat_2',
        time_offset: Number(Math.min(3.5, dur * 0.2).toFixed(1)),
        style: 'collage',
        element: 'torn_paper_stat',
        text: speaker.toUpperCase(),
        sfx: 'paper_tear',
        position: 'lower-third',
        rationale: 'Torn-paper tactile stat callout establishes speaker authority.'
      },
      {
        id: 'beat_3',
        time_offset: Number(Math.min(7.0, dur * 0.45).toFixed(1)),
        style: 'hyperframes',
        element: 'highlighter_swatch',
        text: 'CORE VALUE INSIGHT',
        sfx: 'marker_squeak',
        position: 'center',
        rationale: 'Fluorescent neon highlighter anchors the central thesis.'
      },
      {
        id: 'beat_4',
        time_offset: Number(Math.min(11.5, dur * 0.7).toFixed(1)),
        style: 'collage',
        element: 'rubber_stamp',
        text: 'CRITICAL VERDICT',
        sfx: 'stamp_thump',
        position: 'floating-right',
        rationale: 'Inked rubber stamp provides visual punctuation on the turning point.'
      },
      {
        id: 'beat_5',
        time_offset: Number(Math.max(12.0, dur - 3.5).toFixed(1)),
        style: 'hyperframes',
        element: 'wisdom_plaque',
        text: 'FOLLOW FOR PART 2',
        sfx: 'warm_chime',
        position: 'lower-third',
        rationale: 'Frosted glass wisdom plaque delivers a high-conversion call to action.'
      }
    ];
  };

  const currentMotionCues: MotionSuggestion[] = useMemo(() => {
    if (activeClip.motionSuggestions && activeClip.motionSuggestions.length > 0) {
      return activeClip.motionSuggestions;
    }
    return getDefaultMotionSuggestions(activeClip);
  }, [activeClip.motionSuggestions, activeClip.id, activeClip.hook, activeClip.title, activeClip.customHeadline, activeClip.start, activeClip.end, customSpeaker]);

  const handleUpdateMotionCue = (index: number, updates: Partial<MotionSuggestion>) => {
    const updated = [...currentMotionCues];
    updated[index] = { ...updated[index], ...updates };
    updateActiveClip({ motionSuggestions: updated });
  };

  const handleAddMotionCue = () => {
    const lastOffset = currentMotionCues.length > 0 ? currentMotionCues[currentMotionCues.length - 1].time_offset + 3.0 : 0;
    const newCue: MotionSuggestion = {
      id: `beat_${Date.now()}`,
      time_offset: Number(lastOffset.toFixed(1)),
      style: 'collage',
      element: 'polaroid_card',
      text: 'KEY MOMENT',
      sfx: 'camera_shutter',
      position: 'center',
      rationale: 'Custom user-added tactile motion beat.'
    };
    updateActiveClip({ motionSuggestions: [...currentMotionCues, newCue] });
  };

  const handleDeleteMotionCue = (index: number) => {
    const updated = currentMotionCues.filter((_, i) => i !== index);
    updateActiveClip({ motionSuggestions: updated });
  };

  const handleResetMotionCues = () => {
    updateActiveClip({ motionSuggestions: getDefaultMotionSuggestions(activeClip) });
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

          {/* Bespoke Dynamic Motion & SFX Design Manager Track */}
          <div className="glass-card rounded-xl p-5 space-y-4 border-cyan-500/30 bg-gradient-to-br from-slate-950/90 to-cyan-950/20 shadow-[0_0_25px_rgba(0,245,255,0.08)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Dynamic Motion & SFX Design Manager
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleResetMotionCues}
                  className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded border border-white/10 hover:border-white/30 flex items-center gap-1 transition-colors"
                  title="Reset to 5 AI-curated beats"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset AI Beats</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddMotionCue}
                  className="text-[10px] text-cyan-300 bg-cyan-500/20 hover:bg-cyan-500/30 px-2 py-0.5 rounded border border-cyan-400/40 flex items-center gap-1 transition-colors font-semibold"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Beat</span>
                </button>
                <span className="text-[10px] text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/30 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
                  {currentMotionCues.length} Bespoke Beats
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Curate and fine-tune code-driven <strong className="text-amber-300">HyperFrames</strong> (kinetic spring physics) & <strong className="text-cyan-300">Collage Aesthetics</strong> (torn paper, polaroid, stamps). Audition tactile acoustic SFX in real-time before hardware rendering.
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

            {/* 5-Beat Interactive Motion & SFX List */}
            <div className="space-y-2.5 pt-1 border-t border-white/10">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Motion Beats & Tactile Sound FX:</span>
                <span className="text-[10px] text-cyan-400/90 font-mono">Realtime Spring Physics</span>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {currentMotionCues.map((cue, idx) => (
                  <div 
                    key={cue.id || idx}
                    className="p-3 rounded-xl bg-slate-900/90 border border-white/10 hover:border-cyan-400/40 transition-colors space-y-2.5 text-xs shadow-md"
                  >
                    {/* Cue Header Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-amber-400 text-xs px-2 py-0.5 rounded bg-amber-950/70 border border-amber-500/30">
                          Beat #{idx + 1}
                        </span>
                        
                        {/* Style Selector Pill */}
                        <div className="flex items-center rounded-lg p-0.5 bg-slate-950 border border-white/10 text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleUpdateMotionCue(idx, { style: 'hyperframes' })}
                            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                              cue.style === 'hyperframes'
                                ? 'bg-amber-400 text-slate-950 font-bold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            HyperFrames
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateMotionCue(idx, { style: 'collage' })}
                            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                              cue.style === 'collage'
                                ? 'bg-cyan-400 text-slate-950 font-bold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Collage
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Timestamp Offset */}
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={cue.time_offset}
                            onChange={(e) => handleUpdateMotionCue(idx, { time_offset: parseFloat(e.target.value) || 0 })}
                            className="w-14 bg-slate-950 border border-white/10 rounded px-1.5 py-0.5 text-[11px] font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 text-center"
                            title="Start time offset in seconds"
                          />
                          <span className="text-[10px] text-slate-400 font-mono">s</span>
                        </div>

                        {currentMotionCues.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMotionCue(idx)}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                            title="Remove this beat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Cue Element & SFX Row */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">
                          Visual Element
                        </label>
                        <select
                          value={cue.element}
                          onChange={(e) => {
                            const val = e.target.value;
                            const matched = ELEMENT_OPTIONS.find(o => o.value === val);
                            handleUpdateMotionCue(idx, { 
                              element: val, 
                              style: (matched?.style as any) || cue.style 
                            });
                          }}
                          className="w-full bg-slate-950 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-cyan-400 truncate"
                        >
                          {ELEMENT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">
                          Tactile Sound Effect
                        </label>
                        <div className="flex items-center space-x-1.5">
                          <select
                            value={cue.sfx}
                            onChange={(e) => handleUpdateMotionCue(idx, { sfx: e.target.value })}
                            className="w-full bg-slate-950 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-cyan-400 truncate"
                          >
                            {SFX_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => playAuditionSfx(cue.sfx)}
                            className={`p-1.5 rounded-md border shrink-0 transition-all ${
                              auditioningSfx === cue.sfx
                                ? 'bg-cyan-400 text-slate-950 border-cyan-300 scale-110 shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                                : 'bg-slate-950 border-white/10 text-cyan-300 hover:border-cyan-400/50 hover:bg-cyan-950/40'
                            }`}
                            title="Audition sound effect"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Cue Text Row */}
                    <div>
                      <input
                        type="text"
                        value={cue.text}
                        onChange={(e) => handleUpdateMotionCue(idx, { text: e.target.value })}
                        placeholder="Text on screen for this beat..."
                        className="w-full bg-slate-950 border border-white/10 rounded px-2.5 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    {cue.rationale && (
                      <div className="text-[10px] text-slate-400 italic">
                        💡 {cue.rationale}
                      </div>
                    )}
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
                disabled={isRenderingMotion}
                onClick={async () => {
                  if (!window.hclipper) return;

                  let inputVid = activeClip.renderedPath;
                  if (!inputVid && window.hclipper?.readQueue) {
                    try {
                      const curQueue = await window.hclipper.readQueue();
                      const item = curQueue?.find((q: any) => 
                        q.id === activeClip.id || 
                        q.title === activeClip.title || 
                        (q.filename && q.filename.startsWith(`Clip${activeClipIndex + 1}_`))
                      );
                      if (item?.file_path) {
                        inputVid = item.file_path;
                      } else if (item?.filename) {
                        inputVid = `clips/${item.filename}`;
                      }
                    } catch (e) {}
                  }

                  const cleanHeadline = cleanSermonHeadline(activeClip.customHeadline || activeClip.hook || activeClip.title);

                  // If clip has not been pre-rendered yet, automatically render the clean 9:16 vertical plate first
                  if (!inputVid) {
                    setIsRenderingMotion(true);
                    setMotionProgress(5);
                    setMotionPhase('sfx');
                    setMotionDetail('Pre-rendering clean 9:16 vertical plate before applying dynamic motion...');
                    try {
                      const preRendered = await startRenderClip(activeClipIndex, false);
                      if (preRendered) {
                        inputVid = preRendered;
                      }
                    } catch (e) {
                      console.error('Failed to pre-render plate for dynamic motion:', e);
                    }
                  }

                  if (!inputVid) {
                    const fallbackClean = (activeClip.customHeadline || activeClip.hook || activeClip.title || '')
                      .replace(/[^a-zA-Z0-9_-]/g, '_')
                      .replace(/_+/g, '_')
                      .replace(/^_|_$/g, '')
                      .substring(0, 50);
                    inputVid = `clips/Clip${activeClipIndex + 1}_${fallbackClean}.mp4`;
                  }

                  setIsRenderingMotion(true);
                  setMotionProgress(10);
                  setMotionPhase('sfx');
                  setMotionDetail('Synthesizing bespoke tactile SFX audio track (whoosh, paper tear, shutter, stamp)...');
                  setRenderMotionStatus(null);

                  const outFilename = `Clip${activeClipIndex + 1}_Dynamic_Motion.mp4`;
                  const targetOut = `clips/${outFilename}`;

                  const motionArgs = [
                    inputVid,
                    targetOut,
                    '--headline', cleanHeadline,
                    '--speaker', customSpeaker,
                    '--topic', customTopic,
                    '--template', 'collage_motion.html',
                    '--preset', subtitlesState.stylePreset || activeClip.subtitlePreset || 'tiktok_bold'
                  ];

                  if (currentMotionCues && currentMotionCues.length > 0) {
                    motionArgs.push('--custom-cues', JSON.stringify(currentMotionCues));
                  }

                  const alreadyHasBurnedSubs = Boolean(activeClip.isRendered && activeClip.renderedPath);
                  if (alreadyHasBurnedSubs || subtitlesState.includeSubtitles === false) {
                    motionArgs.push('--no-subs');
                  } else if (activeClip.transcriptCues && activeClip.transcriptCues.length > 0) {
                    motionArgs.push('--text-cues', JSON.stringify(activeClip.transcriptCues));
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
                          const itemIdx = curQueue.findIndex((q: any) => q.filename === outFilename || q.id === `${activeClip.id || 'Clip'}_dynamic`);
                          const motionItem = {
                            id: `${activeClip.id || 'Clip'}_dynamic`,
                            projectId: activeProject.id,
                            projectName: activeProject.name,
                            title: `${activeClip.title || 'Clip'} (Dynamic Motion)`,
                            filename: outFilename,
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
                      const errMsg = resultEvt?.error || res?.error || res?.stderr || 'Motion render process returned an error.';
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
            {previewMode === 'design' && includeSocialPills && (() => {
              const activeHandles = [
                tiktokHandle?.trim() ? { platform: 'tiktok', handle: tiktokHandle.trim().replace(/^@/, ''), icon: <TikTokIcon className="w-2.5 h-2.5 text-white" /> } : null,
                instagramHandle?.trim() ? { platform: 'instagram', handle: instagramHandle.trim().replace(/^@/, ''), icon: <InstagramIcon className="w-2.5 h-2.5 text-pink-400" /> } : null,
                youtubeHandle?.trim() ? { platform: 'youtube', handle: youtubeHandle.trim().replace(/^@/, ''), icon: <YoutubeIcon className="w-2.5 h-2.5 text-red-500" /> } : null,
              ].filter(Boolean) as { platform: string; handle: string; icon: React.ReactNode }[];

              if (activeHandles.length === 0) return null;

              // Check if all active handles are identical (e.g. 'ebun_olowo')
              const allIdentical = activeHandles.every(h => h.handle.toLowerCase() === activeHandles[0].handle.toLowerCase());

              if (allIdentical) {
                return (
                  <div className="relative z-20 w-full flex justify-center mb-3 px-2">
                    <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-full px-3 py-1 flex items-center space-x-2 shadow-xl ring-1 ring-black/40">
                      <div className="flex items-center space-x-1.5">
                        {activeHandles.map((h) => (
                          <span key={h.platform} className="opacity-95 hover:opacity-100 transition-opacity">
                            {h.icon}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] font-bold tracking-wide text-white/95 font-mono drop-shadow">
                        @{activeHandles[0].handle}
                      </span>
                    </div>
                  </div>
                );
              }

              // Group platforms by unique handle
              const grouped: { [handle: string]: { icons: React.ReactNode[] } } = {};
              activeHandles.forEach(h => {
                const k = h.handle;
                if (!grouped[k]) grouped[k] = { icons: [] };
                grouped[k].icons.push(h.icon);
              });

              return (
                <div className="relative z-20 w-full flex flex-wrap items-center justify-center gap-1.5 mb-3 px-2">
                  {Object.entries(grouped).map(([handleName, grp]) => (
                    <div
                      key={handleName}
                      className="bg-black/80 backdrop-blur-md border border-white/20 rounded-full px-2.5 py-1 flex items-center space-x-1.5 shadow-lg ring-1 ring-black/30"
                    >
                      <div className="flex items-center space-x-1">
                        {grp.icons.map((ic, i) => (
                          <span key={i}>{ic}</span>
                        ))}
                      </div>
                      <span className="text-[9px] font-bold text-white/95 font-mono drop-shadow">
                        @{handleName}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}

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
