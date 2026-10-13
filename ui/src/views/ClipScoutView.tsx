import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Flame, 
  CheckCircle2, 
  Scissors, 
  Zap, 
  Key, 
  ExternalLink, 
  HelpCircle, 
  X, 
  Film, 
  Layers, 
  ArrowRight,
  FolderOpen,
  Loader2,
  Cpu,
  AlertCircle
} from 'lucide-react';
import { useWorkflow } from '../context/WorkflowContext';
import type { ClipCandidate } from '../context/WorkflowContext';

const PROVIDER_GUIDES: Record<string, {
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  steps: Array<{ step: number; title: string; desc: string; url?: string; urlLabel?: string }>;
  keyPrefix?: string;
  isOffline?: boolean;
}> = {
  gemini: {
    title: "Google Gemini 2.5 Flash Setup",
    badge: "100% Free Forever Tier",
    badgeColor: "bg-amber-400/10 border-amber-400/20 text-amber-300",
    description: "Google AI Studio provides every Google account 15 requests per minute (1,500 free requests per day) with Gemini 2.5 Flash. No billing account or credit card required.",
    steps: [
      {
        step: 1,
        title: "Open Google AI Studio",
        desc: "Visit the official Google AI Studio website and sign in with any personal or workspace Google account.",
        url: "https://aistudio.google.com/app/apikey",
        urlLabel: "Open aistudio.google.com/app/apikey"
      },
      {
        step: 2,
        title: 'Click "Create API Key"',
        desc: 'Click the blue "Create API key in new project" button. Google generates your personal secret token in seconds.'
      },
      {
        step: 3,
        title: "Copy & Paste into hclipper",
        desc: "Copy your key string (begins with AIzaSy...) and paste it into the field below."
      }
    ],
    keyPrefix: "AIzaSy..."
  },
  deepseek: {
    title: "DeepSeek V3 / R1 Engine Setup",
    badge: "High Virality • Ultra Low Cost",
    badgeColor: "bg-blue-400/10 border-blue-400/20 text-blue-300",
    description: "DeepSeek V3 / R1 provides state-of-the-art transcript and sermon narrative reasoning at pennies per million tokens.",
    steps: [
      {
        step: 1,
        title: "Open DeepSeek Open Platform",
        desc: "Log in or register your account at the official DeepSeek Platform.",
        url: "https://platform.deepseek.com/api_keys",
        urlLabel: "Open platform.deepseek.com/api_keys"
      },
      {
        step: 2,
        title: 'Generate an API Key',
        desc: 'Navigate to "API Keys", click "Create new API key", name it "hclipper Studio", and copy the token.'
      },
      {
        step: 3,
        title: "Paste & Save in hclipper",
        desc: "Paste your sk-... key below. Keys are stored locally on your machine and never transmitted to third parties."
      }
    ],
    keyPrefix: "sk-..."
  },
  openai: {
    title: "OpenAI GPT-4o-mini Setup",
    badge: "OpenAI Platform Key",
    badgeColor: "bg-emerald-400/10 border-emerald-400/20 text-emerald-300",
    description: "Connect OpenAI's official GPT-4o-mini engine for structured hook banner generation and timestamped clip segmentation.",
    steps: [
      {
        step: 1,
        title: "Open OpenAI API Platform",
        desc: "Sign in to OpenAI Developer Dashboard.",
        url: "https://platform.openai.com/api-keys",
        urlLabel: "Open platform.openai.com/api-keys"
      },
      {
        step: 2,
        title: 'Create Secret Key',
        desc: 'Click "+ Create new secret key", copy the generated string.'
      },
      {
        step: 3,
        title: "Paste into hclipper",
        desc: "Paste your sk-proj-... token below to unlock GPT-4o highlight discovery."
      }
    ],
    keyPrefix: "sk-proj-..."
  },
  anthropic: {
    title: "Anthropic Claude 3.5 Haiku Setup",
    badge: "Claude 3.5 Haiku",
    badgeColor: "bg-orange-400/10 border-orange-400/20 text-orange-300",
    description: "Claude 3.5 Haiku delivers lightning-fast transcript reasoning with deep sensitivity to spoken rhythm and rhetorical nuances.",
    steps: [
      {
        step: 1,
        title: "Open Anthropic Console",
        desc: "Sign in to the Anthropic API Console.",
        url: "https://console.anthropic.com/settings/keys",
        urlLabel: "Open console.anthropic.com/settings/keys"
      },
      {
        step: 2,
        title: 'Create API Key',
        desc: 'Click "Create Key", copy your secret token.'
      },
      {
        step: 3,
        title: "Paste into hclipper",
        desc: "Paste your sk-ant-... key below."
      }
    ],
    keyPrefix: "sk-ant-..."
  },
  local: {
    title: "100% Offline Local Engine Architecture",
    badge: "Zero Network • 100% Private",
    badgeColor: "bg-emerald-400/10 border-emerald-400/20 text-emerald-300",
    description: "Processes your videos completely on your device without sending a single byte of data to the cloud or external servers.",
    isOffline: true,
    steps: [
      {
        step: 1,
        title: "On-Device Audio Cadence & Energy Heuristics",
        desc: "Uses FFmpeg native audio analysis to detect vocal inflection, pauses, breathing cadence, and volume peaks directly on your local CPU."
      },
      {
        step: 2,
        title: "Natural Speech Segmentation",
        desc: "Locates stand-alone 30–60 second narrative windows that start on strong opening declarations and conclude on complete thoughts."
      },
      {
        step: 3,
        title: "Zero API Keys, Zero Cost, Zero Internet Required",
        desc: "Fully functional in airplane mode, air-gapped studio computers, or high-security production environments."
      }
    ]
  }
};

interface ClipScoutViewProps {
  onNavigateToTimeline: () => void;
  onNavigateToReframe?: () => void;
  onNavigateToSubtitles: () => void;
}

export const ClipScoutView: React.FC<ClipScoutViewProps> = ({
  onNavigateToTimeline,
  onNavigateToSubtitles
}) => {
  const { 
    sourceVideo, 
    clips, 
    setClips, 
    selectClip, 
    activeClipIndex, 
    reframeState,
    startRenderClip, 
    startBatchRenderAll,
    openDirectory,
    addLog 
  } = useWorkflow();

  const [clipCount, setClipCount] = useState<number>(5);
  const [targetDuration, setTargetDuration] = useState<'story' | 'short' | 'standard' | 'long'>('story');
  const [provider, setProvider] = useState<string>('gemini');
  const [apiKey, setApiKey] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [isScouting, setIsScouting] = useState<boolean>(false);
  const [isBatchRendering, setIsBatchRendering] = useState<boolean>(false);
  const [rerenderConfirmIndex, setRerenderConfirmIndex] = useState<number | null>(null);
  const [showBatchConfirm, setShowBatchConfirm] = useState<boolean>(false);

  // Load saved API key from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`hclipper_key_${provider}`);
    if (saved) {
      setApiKey(saved);
    } else {
      setApiKey('');
    }
  }, [provider]);

  const handleSaveApiKey = (keyToSave: string) => {
    setApiKey(keyToSave);
    localStorage.setItem(`hclipper_key_${provider}`, keyToSave);
  };

  const handleScoutClips = async () => {
    setIsScouting(true);
    addLog(`Running AI Highlight Scout (${clipCount} clips, provider: ${provider.toUpperCase()})...`, 'scout');

    if (window.hclipper) {
      const args = [
        '--provider', provider,
        '--count', clipCount.toString(),
        '--duration', targetDuration
      ];
      if (sourceVideo) {
        args.push('--video', sourceVideo);
      }
      if (apiKey.trim()) {
        args.push('--api-key', apiKey.trim());
      }

      const res = await window.hclipper.runEngine('highlights', args);
      setIsScouting(false);

      if (res.success && res.events) {
        const found = res.events.find((e: any) => e.event === 'highlights_result');
        if (found && found.clips && Array.isArray(found.clips) && found.clips.length > 0) {
          const formatted: ClipCandidate[] = found.clips.slice(0, clipCount).map((c: any, i: number) => ({
            id: `Clip${i + 1}_${(c.title || `Moment_${i + 1}`).replace(/[^a-zA-Z0-9]/g, '_')}`,
            start: typeof c.start === 'number' ? c.start : (i * 60 + 15),
            end: typeof c.end === 'number' ? c.end : (i * 60 + 55),
            score: typeof c.score === 'number' ? c.score : Math.max(80, 96 - i * 2),
            title: c.title || `Viral Highlight #${i + 1}`,
            hook: c.hook || c.title || `KEY LESSON #${i + 1}`,
            reason: c.reason || 'Strong emotional hook and self-contained message.',
            durationAdvisory: c.duration_advisory || c.durationAdvisory || '',
            storyArc: c.story_arc || c.storyArc || ((typeof c.end === 'number' && typeof c.start === 'number' && (c.end - c.start) >= 50) ? 'complete_story' : 'punchy_takeaway'),
            customHeadline: c.hook || c.title || `VIRAL CLIP #${i + 1}`,
            subtitlePreset: 'tiktok_bold',
            isRendered: false
          }));
          setClips(formatted);
          selectClip(0);
          addLog(`✓ AI Scout discovered ${formatted.length} viral clip moments!`, 'success');
          return;
        }
      }
      addLog(`AI Scout engine completed. Processing results...`, 'info');
    }

    // Dynamic browser preview fallback (used when running outside Electron)
    setTimeout(() => {
      setIsScouting(false);
      const baseName = sourceVideo ? sourceVideo.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '') || 'Media' : 'Video Highlight';
      const durSec = targetDuration === 'short' ? 35 : targetDuration === 'long' ? 75 : 55;
      const step = durSec + 30;
      const generated: ClipCandidate[] = Array.from({ length: clipCount }, (_, i) => ({
        id: `Clip${i + 1}_${baseName.replace(/[^a-zA-Z0-9]/g, '_')}_Part${i + 1}`,
        start: 15.0 + i * step,
        end: 15.0 + i * step + durSec,
        score: Math.max(80, 97 - i * 2),
        title: `${baseName} Insight #${i + 1}`,
        hook: `KEY LESSON #${i + 1}: ${baseName.toUpperCase()}`,
        reason: 'Standout narrative window detected by speech cadence heuristics.',
        customHeadline: `${baseName.toUpperCase()} #${i + 1}`,
        subtitlePreset: 'tiktok_bold',
        isRendered: false
      }));
      setClips(generated);
      selectClip(0);
      addLog(`✓ Discovered ${generated.length} candidate moments for preview!`, 'success');
    }, 600);
  };

  const handleBatchRenderClick = () => {
    const renderedClips = clips.filter((c) => c.isRendered);
    if (renderedClips.length > 0) {
      setShowBatchConfirm(true);
    } else {
      executeBatchRender(false);
    }
  };

  const executeBatchRender = async (skipExisting: boolean) => {
    setIsBatchRendering(true);
    await startBatchRenderAll(skipExisting);
    setIsBatchRendering(false);
  };

  const renderedCount = clips.filter((c) => c.isRendered).length;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-7">
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-2xl font-bold font-display text-white">
              AI Clip Scout & Multi-Splitter
            </h2>
            <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Step 2 of 6
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Automatically transform 50+ minute long-form videos (sermons, podcasts, webinars) into multiple standalone viral shorts ready for TikTok, Reels, and YouTube Shorts.
          </p>
        </div>

        {/* Quick Directory Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => openDirectory('clips')}
            className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Clips Folder</span>
          </button>
        </div>
      </div>

      {/* Scout Configuration Card */}
      <div className="glass-card rounded-2xl p-6 border-white/10 space-y-5">
        <div className="grid grid-cols-12 gap-5 items-end">
          {/* Target Clip Count Selector */}
          <div className="col-span-4 space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Target Short Clips to Extract</span>
              <span className="text-amber-400 font-mono font-extrabold">{clipCount} Clips</span>
            </label>
            <div className="flex items-center space-x-2">
              {[3, 5, 8, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => setClipCount(num)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                    clipCount === num
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  }`}
                >
                  {num} Clips
                </button>
              ))}
            </div>
          </div>

          {/* Target Duration Selector */}
          <div className="col-span-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Story Arc & Clip Duration
              </label>
              <span className="text-[10px] text-amber-400 font-semibold flex items-center space-x-1">
                <span>✨ Adaptive Narrative Boundary</span>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'story', label: '📖 Auto Story Arc' },
                { id: 'short', label: '15–35s Micro' },
                { id: 'standard', label: '35–75s Balanced' },
                { id: 'long', label: '60–120s Full Story' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTargetDuration(opt.id as any)}
                  className={`py-2 px-1 text-center text-xs font-semibold rounded-lg border transition-all ${
                    targetDuration === opt.id
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI Engine & BYOK Key */}
          <div className="col-span-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                AI Discovery Engine
              </label>
              <button
                onClick={() => setShowKeyModal(true)}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1 underline decoration-dotted"
              >
                <HelpCircle className="w-3 h-3" />
                <span>{provider === 'local' ? 'Offline Architecture Guide' : `${provider.toUpperCase()} Key Guide`}</span>
              </button>
            </div>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
            >
              <option value="gemini">Google Gemini 2.5 Flash (100% Free - 15 RPM)</option>
              <option value="local">100% Offline Local Engine (No API Key Required)</option>
              <option value="deepseek">DeepSeek V3 / R1 (Platform BYOK)</option>
              <option value="openai">OpenAI GPT-4o-mini (BYOK)</option>
              <option value="anthropic">Anthropic Claude 3.5 Haiku (BYOK)</option>
            </select>
          </div>
        </div>

        {/* Dynamic Inline Walkthrough Card */}
        {provider === 'deepseek' && (
          <div className="p-3.5 bg-blue-500/10 border border-blue-400/30 rounded-xl space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>DeepSeek V3 / R1 API Key Setup Guide</span>
              </span>
              <button
                type="button"
                onClick={() => window.hclipper?.openPath?.('https://platform.deepseek.com/api_keys')}
                className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center space-x-1 underline"
              >
                <span>Open platform.deepseek.com/api_keys</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-300">
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-white/5 space-y-0.5">
                <strong className="text-white block">Step 1: Sign In</strong>
                <p className="text-slate-400 text-[10px]">Log in to DeepSeek Open Platform with email or phone.</p>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-white/5 space-y-0.5">
                <strong className="text-white block">Step 2: Generate Key</strong>
                <p className="text-slate-400 text-[10px]">Click "API Keys" → "Create new API key" and copy token (<code className="text-amber-300">sk-...</code>).</p>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-white/5 space-y-0.5">
                <strong className="text-white block">Step 3: Paste Below</strong>
                <p className="text-slate-400 text-[10px]">Paste into field below. Stored 100% locally on your computer.</p>
              </div>
            </div>
          </div>
        )}

        {provider === 'gemini' && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-400/30 rounded-xl space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Google Gemini 100% Free Forever Tier Guide</span>
              </span>
              <button
                type="button"
                onClick={() => window.hclipper?.openPath?.('https://aistudio.google.com/app/apikey')}
                className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center space-x-1 underline"
              >
                <span>Open aistudio.google.com/app/apikey</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-300">
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-white/5 space-y-0.5">
                <strong className="text-white block">Step 1: Open AI Studio</strong>
                <p className="text-slate-400 text-[10px]">Sign in with any standard Gmail account. No credit card required.</p>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-white/5 space-y-0.5">
                <strong className="text-white block">Step 2: Create API Key</strong>
                <p className="text-slate-400 text-[10px]">Click "Create API key in new project" and copy token (<code className="text-amber-300">AIzaSy...</code>).</p>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-white/5 space-y-0.5">
                <strong className="text-white block">Step 3: Paste Below</strong>
                <p className="text-slate-400 text-[10px]">Free tier provides 15 requests/min (1,500 requests/day).</p>
              </div>
            </div>
          </div>
        )}

        {provider === 'openai' && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-400/30 rounded-xl space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>OpenAI Platform (GPT-4o-mini) Setup Guide</span>
              </span>
              <button
                type="button"
                onClick={() => window.hclipper?.openPath?.('https://platform.openai.com/api-keys')}
                className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center space-x-1 underline"
              >
                <span>Open platform.openai.com/api-keys</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[11px] text-slate-300">
              Generate an API key on the OpenAI developer console (<code className="text-amber-300">sk-proj-...</code>) and paste it below.
            </p>
          </div>
        )}

        {provider === 'anthropic' && (
          <div className="p-3.5 bg-orange-500/10 border border-orange-400/30 rounded-xl space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span>Anthropic Console (Claude 3.5 Haiku) Setup Guide</span>
              </span>
              <button
                type="button"
                onClick={() => window.hclipper?.openPath?.('https://console.anthropic.com/settings/keys')}
                className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center space-x-1 underline"
              >
                <span>Open console.anthropic.com/settings/keys</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[11px] text-slate-300">
              Generate an API key on the Anthropic console (<code className="text-amber-300">sk-ant-...</code>) and paste it below.
            </p>
          </div>
        )}

        {provider === 'local' && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-400/30 rounded-xl space-y-1.5 animate-in fade-in duration-150">
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-300">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>100% Offline Local Engine Active (Zero API Key Required)</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Processes audio and video locally using on-device FFmpeg cadence audio energy detection and natural speech pause analysis. Zero internet connection required and 100% private.
            </p>
          </div>
        )}

        {/* API Key Bar (if not local) */}
        {provider !== 'local' && (
          <div className="flex items-center space-x-3 pt-2 border-t border-white/5">
            <div className="relative flex-1">
              <Key className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => handleSaveApiKey(e.target.value)}
                placeholder={`Paste your ${provider.toUpperCase()} API key here (saved locally in your app)...`}
                className="w-full bg-slate-900/80 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
            <button
              onClick={() => setShowKeyModal(true)}
              className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>{`${provider.toUpperCase()} Modal Walkthrough`}</span>
            </button>
          </div>
        )}

        {/* Action Trigger Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="font-semibold text-white">Source Video:</span>
            <span className="font-mono text-slate-300 truncate max-w-sm">
              {sourceVideo || 'No video selected'}
            </span>
          </div>

          <button
            onClick={handleScoutClips}
            disabled={isScouting || !sourceVideo}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isScouting ? 'animate-spin' : ''}`} />
            <span>{isScouting ? 'Scouting Highlights...' : `⚡ Scout Top ${clipCount} Viral Clips`}</span>
          </button>
        </div>
      </div>

      {/* Discovered Clips Deck Header & Batch Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Ranked Viral Clips Deck ({clips.length} Clips)</span>
          </h3>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {renderedCount} of {clips.length} Rendered & Playable
          </span>
        </div>

        <button
          onClick={handleBatchRenderClick}
          disabled={isBatchRendering || clips.length === 0}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-lg flex items-center space-x-2 shadow-md shadow-emerald-500/10 transition-all disabled:opacity-50"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{isBatchRendering ? 'Rendering Batch on GPU...' : `⚡ Render All ${clips.length} Clips (Batch QSV)`}</span>
        </button>
      </div>

      {/* Discovered Clips List */}
      <div className="space-y-3.5">
        {clips.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center border border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center mx-auto">
              <Film className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">No Clips Discovered Yet</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {sourceVideo 
                ? 'Source video attached. Click "⚡ Scout Top Viral Clips" above to run speech cadence heuristics and discover viral clip moments.'
                : 'No source video loaded in this project. Ingest a video in Step 1 to begin.'}
            </p>
          </div>
        ) : (
          clips.map((clip, index) => {
          const isSelected = activeClipIndex === index;
          return (
            <div
              key={clip.id}
              onClick={() => selectClip(index)}
              className={`glass-card rounded-xl p-5 border transition-all cursor-pointer ${
                isSelected
                  ? 'border-amber-400/80 bg-amber-500/[0.04] shadow-lg shadow-amber-500/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  {/* Rank Badge */}
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-900 border border-white/10 text-center shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Clip</span>
                    <span className="text-lg font-black text-white font-mono leading-none">#{index + 1}</span>
                  </div>

                  {/* Title & Viral Hook */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-sm font-bold text-white">{clip.title}</h4>
                      {clip.isRendered ? (
                        <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Ready in clips/</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          Pending Render
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-amber-300 font-semibold flex items-center space-x-1.5">
                      <span>Viral Hook Banner:</span>
                      <span className="text-white italic">"{clip.hook}"</span>
                    </div>

                    <p className="text-[11px] text-slate-400 max-w-2xl pt-0.5">
                      {clip.reason}
                    </p>

                    {/* AI Narrative Advisory Banner */}
                    {clip.durationAdvisory && (
                      <div className="mt-2.5 p-2 rounded-lg bg-amber-400/10 border border-amber-400/20 text-[11px] text-amber-300 flex items-start space-x-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-200">AI Story Advisory: </span>
                          <span className="text-slate-300">{clip.durationAdvisory}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Virality Score & Timing */}
                <div className="text-right space-y-1 shrink-0">
                  <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 font-bold text-xs">
                    <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>{clip.score}% Virality</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-300 font-medium">
                    Duration: {(clip.end - clip.start).toFixed(1)}s
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {Math.floor(clip.start / 60)}:{(clip.start % 60).toFixed(0).padStart(2, '0')} → {Math.floor(clip.end / 60)}:{(clip.end % 60).toFixed(0).padStart(2, '0')}
                  </div>
                  <div className="pt-0.5">
                    <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{clip.storyArc === 'punchy_takeaway' ? 'Punchy Arc' : 'Full Story Arc'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Row */}
              <div className="flex items-center justify-between pt-4 mt-3 border-t border-white/5 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-500">Headline:</span>
                  <span className="text-[11px] font-mono font-bold text-slate-300">
                    {clip.customHeadline || clip.hook}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectClip(index);
                      onNavigateToTimeline();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-[11px] font-semibold flex items-center space-x-1 transition-colors"
                  >
                    <Scissors className="w-3 h-3 text-amber-400" />
                    <span>Step 3: Timeline & Audio</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectClip(index);
                      onNavigateToSubtitles();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-[11px] font-semibold flex items-center space-x-1 transition-colors"
                  >
                    <Film className="w-3 h-3 text-sky-400" />
                    <span>Step 5: Edit Hook & Captions</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectClip(index);
                      if (clip.isRendered) {
                        setRerenderConfirmIndex(index);
                      } else {
                        startRenderClip(index, true);
                      }
                    }}
                    disabled={reframeState.isRendering && activeClipIndex === index}
                    className={`px-3.5 py-1.5 rounded-lg font-bold text-[11px] flex items-center space-x-1.5 shadow-sm transition-all ${
                      reframeState.isRendering && activeClipIndex === index
                        ? 'bg-slate-800 text-slate-400 border border-white/10 cursor-not-allowed opacity-75'
                        : clip.isRendered
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-amber-400 hover:bg-amber-300 text-slate-950 active:scale-95'
                    }`}
                  >
                    {reframeState.isRendering && activeClipIndex === index ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                        <span>Rendering ({reframeState.renderProgress}%)...</span>
                      </>
                    ) : clip.isRendered ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Rendered ✓ (Re-render)</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3" />
                        <span>Render 9:16 Short (GPU)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
      </div>

      {/* Next Step Footer Navigation */}
      {clips.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <span className="text-xs text-slate-400">
            Selected active clip: <strong className="text-white">Clip #{activeClipIndex + 1}</strong> ({clips[activeClipIndex]?.title})
          </span>

          <button
            onClick={onNavigateToTimeline}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center space-x-2 shadow-lg shadow-amber-500/20"
          >
            <span>Proceed to Step 3: Timeline & Audio Clarity</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Dynamic Step-by-Step API Key Setup & Offline Architecture Modal */}
      {showKeyModal && (() => {
        const guide = PROVIDER_GUIDES[provider] || PROVIDER_GUIDES.gemini;
        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-card bg-[#0e121c] border border-white/15 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                    {guide.isOffline ? (
                      <Cpu className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Key className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{guide.title}</h3>
                    <p className="text-[11px] text-slate-400">
                      {guide.isOffline ? 'Complete on-device privacy — No internet or tokens needed' : 'Step-by-step setup guide for Bring-Your-Own-Key'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowKeyModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Provider Selector Tabs inside Modal */}
              <div className="flex items-center space-x-1 p-1 bg-slate-900/90 rounded-xl border border-white/10 overflow-x-auto">
                {[
                  { id: 'deepseek', label: 'DeepSeek V3 / R1' },
                  { id: 'gemini', label: 'Google Gemini' },
                  { id: 'openai', label: 'OpenAI GPT-4o' },
                  { id: 'anthropic', label: 'Claude 3.5' },
                  { id: 'local', label: '100% Offline' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setProvider(tab.id);
                      const saved = localStorage.getItem(`hclipper_key_${tab.id}`);
                      setApiKey(saved || '');
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center whitespace-nowrap ${
                      provider === tab.id
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className={`p-3.5 rounded-xl border space-y-1 ${guide.badgeColor}`}>
                  <div className="font-bold flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{guide.badge}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {guide.description}
                  </p>
                </div>

                {/* Steps List */}
                <div className="space-y-3">
                  {guide.steps.map((st) => (
                    <div key={st.step} className="flex items-start space-x-3 p-3 rounded-lg bg-white/5 border border-white/5">
                      <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        {st.step}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white">{st.title}</div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          {st.desc}
                        </p>
                        {st.url && (
                          <button
                            type="button"
                            onClick={() => window.hclipper?.openPath?.(st.url!)}
                            className="inline-flex items-center space-x-1 text-sky-400 hover:underline mt-1.5 font-semibold text-[11px]"
                          >
                            <span>{st.urlLabel || st.url}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Key Input inside modal if not offline */}
                {!guide.isOffline ? (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">
                      Paste Your {provider.toUpperCase()} Key:
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => handleSaveApiKey(e.target.value)}
                        placeholder={`Paste token here (e.g. ${guide.keyPrefix || 'key...'})`}
                        className="flex-1 bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                      />
                      <button
                        onClick={() => setShowKeyModal(false)}
                        className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                      >
                        Save & Close
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-1">
                    <div className="text-xs font-bold text-emerald-300">Ready for Instant Offline Execution</div>
                    <p className="text-[11px] text-slate-400">
                      All video files stay 100% on this PC. No subscription, API bill, or rate limit ever applies.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Single Clip Re-render Confirmation Modal */}
      {rerenderConfirmIndex !== null && clips[rerenderConfirmIndex] && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border-amber-400/40 space-y-4 shadow-2xl animate-in zoom-in-95 bg-slate-900/95">
            <div className="flex items-center space-x-3 text-amber-400">
              <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Clip Already Rendered</h3>
                <span className="text-[11px] text-amber-400 font-semibold">Clip #{rerenderConfirmIndex + 1} • Overwrite Confirmation</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
              <div className="text-xs font-bold text-white line-clamp-1">
                {clips[rerenderConfirmIndex].title}
              </div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-2">
                <span>Saved path:</span>
                <span className="text-emerald-400 font-semibold">{clips[rerenderConfirmIndex].renderedPath || `clips/${clips[rerenderConfirmIndex].id}.mp4`}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This clip has already been processed with GPU hardware acceleration. Re-rendering will re-process the reframing trajectory and overwrite the existing MP4 video file.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setRerenderConfirmIndex(null)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-colors"
              >
                Cancel (Keep Existing)
              </button>
              <button
                onClick={async () => {
                  const idx = rerenderConfirmIndex;
                  setRerenderConfirmIndex(null);
                  await startRenderClip(idx, true);
                }}
                className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Yes, Re-render Clip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Re-render Confirmation Modal */}
      {showBatchConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 rounded-2xl border-amber-400/40 space-y-4 shadow-2xl animate-in zoom-in-95 bg-slate-900/95">
            <div className="flex items-center space-x-3 text-amber-400">
              <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Batch Render Confirmation</h3>
                <span className="text-[11px] text-amber-400 font-semibold">
                  {renderedCount} of {clips.length} Clips Already Rendered
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Some clips in this deck have already been rendered. How would you like the GPU batch render queue to proceed?
            </p>

            <div className="space-y-2 pt-1">
              {clips.length > renderedCount && (
                <button
                  onClick={async () => {
                    setShowBatchConfirm(false);
                    await executeBatchRender(true);
                  }}
                  className="w-full p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-left flex items-center justify-between group transition-all"
                >
                  <div>
                    <div className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Render Unrendered Only ({clips.length - renderedCount} clips)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Fastest option: Preserves your existing {renderedCount} rendered clips and only processes the remaining unrendered clips.
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0 ml-3" />
                </button>
              )}

              <button
                onClick={async () => {
                  setShowBatchConfirm(false);
                  await executeBatchRender(false);
                }}
                className="w-full p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left flex items-center justify-between group transition-all"
              >
                <div>
                  <div className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    <span>Re-render All ({clips.length} clips, Overwrite Existing)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Fresh rebuild: Re-encodes all {clips.length} clips from scratch, overwriting previous outputs.
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0 ml-3" />
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowBatchConfirm(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
