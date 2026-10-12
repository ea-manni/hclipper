import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Eye, 
  ArrowRight, 
  Sparkles, 
  Play, 
  Pause, 
  Smartphone, 
  Square, 
  Monitor, 
  CheckCircle2, 
  Film, 
  Target, 
  FolderOpen, 
  Loader2, 
  RefreshCw, 
  Zap, 
  Layers,
  AlertCircle
} from 'lucide-react';
import { useWorkflow } from '../context/WorkflowContext';

interface ReframeViewProps {
  onNext: () => void;
  onNavigateToScout: () => void;
}

export const ReframeView: React.FC<ReframeViewProps> = ({ 
  onNext,
  onNavigateToScout 
}) => {
  const { 
    sourceVideo, 
    reframeState, 
    setReframeState, 
    startAnalyzeTrajectory, 
    startRenderClip, 
    startBatchRenderAll,
    clips, 
    activeClipIndex, 
    selectClip
  } = useWorkflow();

  const {
    aspectRatio,
    deadzone,
    smoothFactor,
    trajectoryData,
    isAnalyzing,
    analysisProgress,
    isRendering,
    renderProgress,
    renderedOutput
  } = reframeState;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [cropXPercent, setCropXPercent] = useState(34);
  const [isBatchRendering, setIsBatchRendering] = useState(false);
  const [showRerenderConfirm, setShowRerenderConfirm] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const activeClip = clips[activeClipIndex] || {
    id: 'Clip1',
    title: 'Discover Your Divine Calling & Purpose',
    start: 15.0,
    end: 45.0,
    isRendered: false
  };

  // Convert Windows path to file:/// URL
  const formattedSourceVideo = useMemo(() => {
    if (!sourceVideo) return '';
    if (sourceVideo.startsWith('http://') || sourceVideo.startsWith('https://') || sourceVideo.startsWith('file://')) {
      return sourceVideo;
    }
    const normalized = sourceVideo.replace(/\\/g, '/');
    return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`;
  }, [sourceVideo]);

  // Dynamic Aspect Configuration
  const getAspectConfig = () => {
    switch (aspectRatio) {
      case '1:1':
        return {
          widthPct: 56.25,
          badgeTitle: '1:1 SQUARE CROP',
          resolution: '1080x1080',
          cropLabel: '1080 x 1080',
          subLabel: '(Instagram Feed Square)',
          buttonLabel: 'Render 1:1 Square Video',
          cardTitle: 'Render 1:1 Square Video',
          desc: 'Encodes natively with Intel QSV / NVENC GPU hardware acceleration at 1080x1080.'
        };
      case '16:9':
        return {
          widthPct: 100,
          badgeTitle: '16:9 MASTER FULL FRAME',
          resolution: '1920x1080',
          cropLabel: '1920 x 1080',
          subLabel: '(Full HD Master VOD)',
          buttonLabel: 'Render 16:9 Master Video',
          cardTitle: 'Render 16:9 Master Video',
          desc: 'Encodes natively with Intel QSV / NVENC GPU hardware acceleration at 1920x1080.'
        };
      case '9:16':
      default:
        return {
          widthPct: 31.64,
          badgeTitle: '9:16 SHORTS CROP',
          resolution: '1080x1920',
          cropLabel: '608 x 1080',
          subLabel: '(Lanczos Full HD Shorts)',
          buttonLabel: 'Render 9:16 Short (GPU)',
          cardTitle: 'Render 9:16 Vertical Short',
          desc: 'Encodes natively with Intel QSV / NVENC GPU hardware acceleration at 1080x1920.'
        };
    }
  };

  const config = getAspectConfig();
  const activeLeft = aspectRatio === '16:9' ? 0 : Math.min(Math.max(cropXPercent, 0), 100 - config.widthPct);
  const activeCenter = aspectRatio === '16:9' ? 50 : activeLeft + (config.widthPct / 2);

  // Synchronize playback frame with crop position
  useEffect(() => {
    let animId: number;
    if (isPlaying && trajectoryData.length > 0) {
      const step = () => {
        setCurrentFrameIndex((prev) => {
          const next = (prev + 1) % trajectoryData.length;
          const frameCoord = trajectoryData[next];
          const pct = (frameCoord / 1280) * 100;
          setCropXPercent(pct);
          return next;
        });
        animId = requestAnimationFrame(step);
      };
      animId = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, trajectoryData]);

  const handleOpenRendered = () => {
    if (window.hclipper && renderedOutput) {
      window.hclipper.openPath(renderedOutput);
    }
  };

  const handleShowInFolder = () => {
    if (window.hclipper && renderedOutput) {
      window.hclipper.showInFolder(renderedOutput);
    }
  };

  const handleRenderActiveClip = async () => {
    if (activeClip.isRendered || renderedOutput) {
      setShowRerenderConfirm(true);
      return;
    }
    await startRenderClip(activeClipIndex);
  };

  const handleBatchRenderAll = async () => {
    setIsBatchRendering(true);
    await startBatchRenderAll();
    setIsBatchRendering(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-7">
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-2xl font-bold font-display text-white">
              AI Auto-Reframe & Face Tracking
            </h2>
            <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Step 4 of 6
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            OpenCV YuNet ONNX face detection centers the speaker dynamically using deadzone camera physics. Hardware encoding completes targeted shorts in seconds.
          </p>
        </div>

        <button
          onClick={onNavigateToScout}
          className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Switch / Add Clips (Step 2)</span>
        </button>
      </div>

      {/* Clip Selector Tabs (Pills) */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Select Clip to Reframe ({activeClipIndex + 1} of {clips.length}):
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
                <span className="truncate max-w-[150px]">{c.title}</span>
                {c.isRendered ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-950" />
                ) : (
                  <span className="text-[10px] opacity-60">Pending</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: 16:9 Viewport & Reframe Simulation Canvas (8 cols) */}
        <div className="col-span-8 glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-amber-400" />
              Clip #{activeClipIndex + 1} Face Tracking & 9:16 Crop Window
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                Intel QSV Hardware Accel
              </span>
            </div>
          </div>

          {/* 16:9 Container Canvas */}
          <div className="relative aspect-video bg-slate-950 rounded-lg border border-white/10 overflow-hidden flex items-center justify-center">
            {/* Simulated Stage Background */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900 to-slate-800 opacity-70" />

            {/* Video preview if available */}
            {formattedSourceVideo ? (
              <video
                ref={videoRef}
                src={formattedSourceVideo}
                className="w-full h-full object-cover opacity-60"
                playsInline
                muted
              />
            ) : (
              <div className="text-slate-600 text-xs">No media loaded</div>
            )}
            
            {/* Speaker Silhouette Graphic - Dead-Centered Reticle on Face & Torso */}
            <div 
              className="absolute bottom-4 flex flex-col items-center transition-all duration-75 select-none" 
              style={{ 
                left: `${activeCenter}%`,
                transform: 'translateX(-50%)'
              }}
            >
              {/* Head with Concentric Crosshair & Reticle */}
              <div className="w-16 h-16 rounded-full bg-slate-700/90 border-2 border-amber-400/90 shadow-xl relative flex items-center justify-center">
                <div className="absolute w-full h-[1px] bg-amber-400/50" />
                <div className="absolute h-full w-[1px] bg-amber-400/50" />
                <div className="w-6 h-6 rounded-full border border-amber-300/80" />
                <span className="absolute -top-5 bg-amber-400 text-slate-950 font-bold text-[8px] px-1 rounded uppercase tracking-wider">
                  YuNet Face Lock
                </span>
              </div>
              <div className="w-5 h-2 bg-slate-700/80 -mt-0.5" />
              <div className="w-32 h-24 bg-slate-800/90 rounded-t-[32px] border border-white/10 shadow-inner flex justify-center pt-2">
                <Target className="w-4 h-4 text-slate-600/60" />
              </div>
            </div>

            {/* Dynamic Aspect Ratio Crop Window Highlight */}
            <div 
              className="absolute top-0 bottom-0 bg-transparent border-2 border-amber-400 shadow-2xl transition-all duration-75 flex flex-col justify-between p-2 pointer-events-none"
              style={{
                width: `${config.widthPct}%`,
                left: `${activeLeft}%`,
                boxShadow: aspectRatio === '16:9' ? 'none' : '0 0 0 9999px rgba(0, 0, 0, 0.65)'
              }}
            >
              <div className="flex justify-between items-center text-[9px] font-bold text-amber-300 bg-black/80 px-2 py-0.5 rounded shadow">
                <span>{config.badgeTitle}</span>
                <span className="font-mono">{config.resolution}</span>
              </div>
              <div className="text-center text-[9px] text-amber-300 bg-black/80 px-1.5 py-0.5 rounded self-center shadow">
                Deadzone Pan Camera: Frame {currentFrameIndex}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={trajectoryData.length === 0}
                className="w-8 h-8 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold flex items-center justify-center transition-all"
                title={isPlaying ? 'Pause Tracking Preview' : 'Play Tracking Preview'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>
              <button
                onClick={startAnalyzeTrajectory}
                disabled={isAnalyzing || isRendering}
                className="px-4 py-2 bg-amber-400/10 hover:bg-amber-400/20 disabled:opacity-50 border border-amber-400/30 text-amber-300 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Tracking Faces ({analysisProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Test YuNet Face Lock ({aspectRatio})</span>
                  </>
                )}
              </button>
            </div>

            <span className="text-[11px] text-slate-400">
              Crop Window: <strong className="text-white">{config.cropLabel}</strong> {config.subLabel}
            </span>
          </div>

          {/* Render Action Box */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Film className="w-4 h-4 text-amber-400" />
                <span>Render Clip #{activeClipIndex + 1} ({activeClip.title})</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Encodes targeted segment ({(activeClip.end - activeClip.start).toFixed(0)}s) with Intel QSV GPU in ~5 seconds.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {renderedOutput && !isRendering ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleOpenRendered}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 active:scale-95"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Open in Player</span>
                  </button>
                  <button
                    onClick={handleShowInFolder}
                    className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-medium text-xs rounded-lg transition-all flex items-center space-x-1"
                    title="Show in Folder"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleRenderActiveClip}
                    disabled={isRendering || !sourceVideo}
                    className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-amber-400 border border-amber-400/20 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Re-render with current settings"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Re-render</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleRenderActiveClip}
                  disabled={isRendering || !sourceVideo}
                  className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 shadow-md ${
                    isRendering
                      ? 'bg-slate-800 text-slate-400 border border-white/10 cursor-not-allowed opacity-75'
                      : !sourceVideo
                      ? 'bg-slate-800/80 text-slate-500 border border-white/5 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/20 active:scale-95'
                  }`}
                >
                  {isRendering ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>Rendering ({renderProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Render Clip #{activeClipIndex + 1} (GPU)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Reframing Physics & Aspect Controls (4 cols) */}
        <div className="col-span-4 space-y-4">
          {/* Aspect Ratio Picker */}
          <div className="glass-card rounded-xl p-5 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Output Aspect Ratio
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setReframeState((prev) => ({ ...prev, aspectRatio: '9:16' }))}
                className={`p-3 rounded-lg border text-center transition-all ${
                  aspectRatio === '9:16'
                    ? 'bg-amber-400/10 border-amber-400/50 text-white'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                <div className="text-xs font-bold">9:16</div>
                <div className="text-[9px] text-slate-500">TikTok/Reels</div>
              </button>

              <button
                onClick={() => setReframeState((prev) => ({ ...prev, aspectRatio: '1:1' }))}
                className={`p-3 rounded-lg border text-center transition-all ${
                  aspectRatio === '1:1'
                    ? 'bg-amber-400/10 border-amber-400/50 text-white'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Square className="w-5 h-5 mx-auto mb-1 text-sky-400" />
                <div className="text-xs font-bold">1:1</div>
                <div className="text-[9px] text-slate-500">Instagram</div>
              </button>

              <button
                onClick={() => setReframeState((prev) => ({ ...prev, aspectRatio: '16:9' }))}
                className={`p-3 rounded-lg border text-center transition-all ${
                  aspectRatio === '16:9'
                    ? 'bg-amber-400/10 border-amber-400/50 text-white'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                <div className="text-xs font-bold">16:9</div>
                <div className="text-[9px] text-slate-500">Landscape</div>
              </button>
            </div>
          </div>

          {/* Camera Physics */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Camera Deadzone Physics
            </span>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Deadzone Leeway</span>
                <span className="font-mono text-white font-bold">{deadzone}px</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="80" 
                value={deadzone}
                onChange={(e) => setReframeState((prev) => ({ ...prev, deadzone: parseInt(e.target.value) }))}
                className="w-full accent-amber-400 bg-slate-800 rounded-lg cursor-pointer h-1.5"
              />
              <p className="text-[10px] text-slate-500">
                Prevents jittery camera pan when speaker makes slight head movements.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Camera Pan Smooth Factor</span>
                <span className="font-mono text-white font-bold">{smoothFactor}</span>
              </div>
              <input 
                type="range" 
                min="0.01" 
                max="0.2" 
                step="0.01"
                value={smoothFactor}
                onChange={(e) => setReframeState((prev) => ({ ...prev, smoothFactor: parseFloat(e.target.value) }))}
                className="w-full accent-amber-400 bg-slate-800 rounded-lg cursor-pointer h-1.5"
              />
              <p className="text-[10px] text-slate-500">
                Controls how fluidly the crop follows rapid stage pacing.
              </p>
            </div>
          </div>

          {/* Batch Render Quick Card */}
          <div className="glass-card rounded-xl p-5 space-y-3 bg-gradient-to-br from-slate-900 to-amber-950/20 border-amber-500/20">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Batch Render All {clips.length} Clips
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Renders all discovered viral moments into 9:16 vertical shorts sequentially using Intel QSV hardware acceleration.
            </p>
            <button
              onClick={handleBatchRenderAll}
              disabled={isBatchRendering || isRendering || !sourceVideo}
              className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-md ${
                isBatchRendering || isRendering
                  ? 'bg-slate-800 text-slate-400 border border-white/10 cursor-not-allowed opacity-75'
                  : !sourceVideo
                  ? 'bg-slate-800/80 text-slate-500 border border-white/5 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/20 active:scale-95'
              }`}
            >
              {isBatchRendering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Batch Rendering ({clips.filter(c => c.isRendered).length}/{clips.length} Finished)...</span>
                </>
              ) : isRendering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Rendering Single Clip in Progress...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>⚡ Batch Render All {clips.length} Clips (QSV)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <button
          onClick={onNavigateToScout}
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-semibold"
        >
          ← Back to Step 2: AI Clip Scout
        </button>

        <button
          onClick={onNext}
          className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center space-x-2 shadow-lg shadow-amber-500/20"
        >
          <span>Proceed to Step 5: Captions & Hooks</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Re-render Confirmation Modal */}
      {showRerenderConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border-amber-400/40 space-y-4 shadow-2xl animate-in zoom-in-95 bg-slate-900/95">
            <div className="flex items-center space-x-3 text-amber-400">
              <AlertCircle className="w-6 h-6 text-amber-400 shrink-0" />
              <h3 className="text-base font-bold text-white">Clip Already Rendered</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Clip #{activeClipIndex + 1} (<strong className="text-white">{activeClip.title}</strong>) has already been rendered with GPU hardware acceleration.
              Are you sure you want to re-render it? This will overwrite the existing file in your clips directory.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowRerenderConfirm(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowRerenderConfirm(false);
                  await startRenderClip(activeClipIndex);
                }}
                className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all"
              >
                Yes, Re-render Clip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
