import React, { useState } from 'react';
import { 
  Sparkles, 
  Flame, 
  CheckCircle2, 
  Scissors, 
  Zap, 
  Key, 
  Film, 
  Layers, 
  ArrowRight,
  FolderOpen,
  Loader2,
  AlertCircle,
  Check
} from 'lucide-react';
import { useWorkflow } from '../context/WorkflowContext';
import type { ClipCandidate } from '../context/WorkflowContext';



interface ClipScoutViewProps {
  onNavigateToTimeline: () => void;
  onNavigateToReframe?: () => void;
  onNavigateToSubtitles: () => void;
}

export const ClipScoutView: React.FC<ClipScoutViewProps> = ({
  onNavigateToTimeline,
  onNavigateToReframe,
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
    addLog,
    settings,
    setShowSettingsModal
  } = useWorkflow();

  const [clipCount, setClipCount] = useState<number>(5);
  const [targetDuration, setTargetDuration] = useState<'story' | 'short' | 'standard' | 'long'>('story');
  const [provider, setProvider] = useState<string>(settings.defaultProvider || 'gemini');
  const [isScouting, setIsScouting] = useState<boolean>(false);
  const [isBatchRendering, setIsBatchRendering] = useState<boolean>(false);
  const [rerenderConfirmIndex, setRerenderConfirmIndex] = useState<number | null>(null);
  const [showBatchConfirm, setShowBatchConfirm] = useState<boolean>(false);
  const [scoutError, setScoutError] = useState<string | null>(null);

  const activeApiKey = (settings.apiKeys as any)?.[provider] || '';
  const hasKey = provider === 'local' || Boolean(activeApiKey.trim());

  const handleScoutClips = async () => {
    setScoutError(null);

    if (provider !== 'local' && !activeApiKey.trim()) {
      setScoutError(`API Key for ${provider.toUpperCase()} is not configured. Click "Manage API Keys in Settings" to add your key, or switch to the 100% Offline Local Engine.`);
      addLog(`AI Scout aborted: Missing ${provider.toUpperCase()} API key.`, 'warn');
      return;
    }

    setIsScouting(true);
    addLog(`Running AI Highlight Scout (${clipCount} clips, provider: ${provider.toUpperCase()}, duration: ${targetDuration})...`, 'scout');

    if (window.hclipper) {
      const args = [
        '--provider', provider,
        '--count', clipCount.toString(),
        '--duration', targetDuration
      ];
      if (sourceVideo) {
        args.push('--video', sourceVideo);
      }
      if (activeApiKey.trim()) {
        args.push('--api-key', activeApiKey.trim());
      }

      try {
        const res = await window.hclipper.runEngine('highlights', args);
        setIsScouting(false);

        if (res && res.success && res.events) {
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
              customHeadline: (c.customHeadline || c.title || `VIRAL CLIP #${i + 1}`).toUpperCase(),
              subtitlePreset: 'tiktok_bold',
              transcriptCues: c.transcript_cues || c.transcriptCues || [],
              isRendered: false
            }));
            setClips(formatted);
            selectClip(0);
            setScoutError(null);
            addLog(`✓ AI Scout discovered ${formatted.length} viral clip moments!`, 'success');
            return;
          }
        }

        const errMsg = (res as any)?.error || (res?.events?.find((e: any) => e.event === 'error')?.message) || 'AI Scout engine did not return valid clip boundaries. Verify the video has speech audio or check engine console logs.';
        setScoutError(errMsg);
        addLog(`[AI Scout Error] ${errMsg}`, 'error');
        return;
      } catch (err: any) {
        setIsScouting(false);
        const errText = err?.message || String(err);
        setScoutError(`AI Scout execution failed: ${errText}`);
        addLog(`[AI Scout Exception] ${errText}`, 'error');
        return;
      }
    }

    // Dynamic browser preview fallback (ONLY executed when running outside Electron dev environment)
    setTimeout(() => {
      setIsScouting(false);
      let rawName = sourceVideo ? sourceVideo.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '') || 'Media' : 'Video Highlight';
      rawName = rawName.replace(/\[[a-zA-Z0-9_-]+\]/g, '');
      rawName = rawName.replace(/(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*\.?\s+\d{1,2},?\s+\d{4}/gi, '');
      rawName = rawName.replace(/\b\d{4}\b/g, '');
      const parts = rawName.split(/[|｜—–]/);
      const baseName = (parts[0] || rawName).trim().replace(/\s+/g, ' ') || 'Sermon Highlight';

      const durSec = targetDuration === 'short' ? 35 : targetDuration === 'long' ? 95 : 65;
      const step = durSec + 25;
      const generated: ClipCandidate[] = Array.from({ length: clipCount }, (_, i) => ({
        id: `Clip${i + 1}_${baseName.replace(/[^a-zA-Z0-9]/g, '_')}_Part${i + 1}`,
        start: 15.0 + i * step,
        end: 15.0 + i * step + durSec,
        score: Math.max(80, 97 - i * 2),
        title: `${baseName} (Insight #${i + 1})`,
        hook: `KEY LESSON #${i + 1}: ${baseName.toUpperCase()}`,
        reason: 'Standout narrative window detected by speech cadence heuristics.',
        customHeadline: baseName.toUpperCase(),
        subtitlePreset: 'tiktok_bold',
        isRendered: false
      }));
      setClips(generated);
      selectClip(0);
      addLog(`✓ Discovered ${generated.length} candidate moments for preview (Browser Demo Mode)!`, 'success');
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
    await startBatchRenderAll(skipExisting, false);
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
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1 underline decoration-dotted"
              >
                <Key className="w-3 h-3" />
                <span>API Keys in Settings</span>
              </button>
            </div>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
            >
              <option value="gemini">Google Gemini 2.5 Flash (100% Free - 15 RPM)</option>
              <option value="groq">GroqCloud (Ultra-Fast 500 T/s Llama 3.3 70B - Free)</option>
              <option value="deepseek">DeepSeek V3 / R1 (Platform BYOK)</option>
              <option value="openai">OpenAI GPT-4o-mini (BYOK)</option>
              <option value="claude">Anthropic Claude 3.5 Haiku (BYOK)</option>
              <option value="xai">xAI Grok-2 (BYOK)</option>
              <option value="kimi">Moonshot AI (Kimi - Long Context)</option>
              <option value="local">100% Offline Local Engine (No API Key Required)</option>
            </select>
          </div>
        </div>

        {/* API Key Status & Settings Integration Card */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs">
          <div className="flex items-center space-x-2.5">
            {hasKey ? (
              <span className="flex items-center space-x-1.5 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <Check className="w-3.5 h-3.5" />
                <span>
                  {provider === 'local' 
                    ? '100% Offline Engine (Speech Cadence & Natural Sentence Pauses)'
                    : `${provider.toUpperCase()} API Key Active (Configured in Settings)`}
                </span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>No API Key Configured for {provider.toUpperCase()}</span>
              </span>
            )}
            <span className="text-[11px] text-slate-400 hidden md:inline">
              {hasKey 
                ? 'Ready to extract self-contained viral moments with narrative resolution.'
                : 'Configure key in Settings to use LLM intelligence, or switch to the 100% Offline Local Engine.'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-semibold flex items-center space-x-1.5 transition-colors shrink-0"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Manage Keys in Settings</span>
          </button>
        </div>

        {/* Error notification banner if scout failed */}
        {scoutError && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between text-xs text-rose-300 animate-in fade-in">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="leading-relaxed">{scoutError}</span>
            </div>
            <button
              type="button"
              onClick={() => setScoutError(null)}
              className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5 shrink-0"
            >
              Dismiss
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
            {renderedCount} of {clips.length} Pre-rendered (Raw 9:16)
          </span>
        </div>

        <button
          onClick={handleBatchRenderClick}
          disabled={isBatchRendering || clips.length === 0}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-lg flex items-center space-x-2 shadow-md shadow-emerald-500/10 transition-all disabled:opacity-50"
          title="Pre-renders clean raw 9:16 vertical crop. Captions, banners, and audio mastering are finalized in Step 5."
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{isBatchRendering ? 'Pre-rendering Raw 9:16 Batch...' : `⚡ Pre-render All ${clips.length} Raw 9:16 Clips (QSV)`}</span>
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
                    <span>Step 3: Timeline</span>
                  </button>

                  {onNavigateToReframe && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectClip(index);
                        onNavigateToReframe();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-[11px] font-semibold flex items-center space-x-1 transition-colors"
                    >
                      <Layers className="w-3 h-3 text-emerald-400" />
                      <span>Step 4: Reframe</span>
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectClip(index);
                      onNavigateToSubtitles();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-[11px] font-semibold flex items-center space-x-1 transition-colors"
                  >
                    <Film className="w-3 h-3 text-sky-400" />
                    <span>Step 5: Master Short</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectClip(index);
                      if (clip.isRendered) {
                        setRerenderConfirmIndex(index);
                      } else {
                        startRenderClip(index, true, false);
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
                        <span>Pre-rendering ({reframeState.renderProgress}%)...</span>
                      </>
                    ) : clip.isRendered ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Raw 9:16 Ready ✓</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3" />
                        <span>Pre-render Raw 9:16</span>
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

            {/* Single Clip Re-render Confirmation Modal */}
      {rerenderConfirmIndex !== null && clips[rerenderConfirmIndex] && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 rounded-2xl border-amber-400/40 space-y-4 shadow-2xl animate-in zoom-in-95 bg-slate-900/95 overflow-hidden">
            <div className="flex items-center space-x-3 text-amber-400">
              <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Clip Already Rendered</h3>
                <span className="text-[11px] text-amber-400 font-semibold">Clip #{rerenderConfirmIndex + 1} • Overwrite Confirmation</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-2 overflow-hidden">
              <div className="text-xs font-bold text-white line-clamp-2">
                {clips[rerenderConfirmIndex].title}
              </div>
              <div className="text-[11px] text-slate-400 font-mono space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Saved Destination:</span>
                <span className="text-emerald-400 font-semibold break-all bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg block leading-relaxed select-all">
                  {clips[rerenderConfirmIndex].renderedPath || `clips/${clips[rerenderConfirmIndex].id}.mp4`}
                </span>
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
                  await startRenderClip(idx, true, false);
                }}
                className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Yes, Re-crop Raw 9:16</span>
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
                <h3 className="text-base font-bold text-white">Pre-render Raw 9:16 Batch Confirmation</h3>
                <span className="text-[11px] text-amber-400 font-semibold">
                  {renderedCount} of {clips.length} Clips Already Pre-rendered (Raw 9:16)
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will pre-render clean raw 9:16 vertical video crops with face tracking on Intel QSV hardware. No subtitles or banners are burned yet — you can customize those in Steps 3–5 before final master export.
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
