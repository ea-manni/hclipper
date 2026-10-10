import React, { useState, useEffect, useRef } from 'react';
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
  Download,
  Target
} from 'lucide-react';

interface ReframeViewProps {
  sourceVideo: string;
  onNext: () => void;
}

export const ReframeView: React.FC<ReframeViewProps> = ({ 
  sourceVideo, 
  onNext 
}) => {
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1' | '16:9'>('9:16');
  const [enableFaceTracking, setEnableFaceTracking] = useState(true);
  const [deadzone, setDeadzone] = useState(25);
  const [smoothFactor, setSmoothFactor] = useState(0.06);

  // Trajectory & Playback State
  const [trajectoryData, setTrajectoryData] = useState<number[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderedOutput, setRenderedOutput] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [cropXPercent, setCropXPercent] = useState(34); // center default

  const videoRef = useRef<HTMLVideoElement>(null);

  // Dynamic Aspect Configuration
  const getAspectConfig = () => {
    switch (aspectRatio) {
      case '1:1':
        return {
          widthPct: 56.25, // (1/1) / (16/9) = 9/16 = 56.25%
          badgeTitle: '1:1 SQUARE CROP',
          resolution: '1080x1080',
          cropLabel: '1080 x 1080',
          subLabel: '(Instagram Feed Square)',
          buttonLabel: 'Render 1:1 Square Video',
          cardTitle: 'Render Master 1:1 Square Video',
          desc: 'Encodes with Intel QSV / NVENC hardware acceleration at 1080x1080 60fps.'
        };
      case '16:9':
        return {
          widthPct: 100,
          badgeTitle: '16:9 MASTER FULL FRAME',
          resolution: '1920x1080',
          cropLabel: '1920 x 1080',
          subLabel: '(Full HD Master VOD)',
          buttonLabel: 'Render 16:9 Master Video',
          cardTitle: 'Render Master 16:9 Master Video',
          desc: 'Encodes with Intel QSV / NVENC hardware acceleration at 1920x1080 60fps.'
        };
      case '9:16':
      default:
        return {
          widthPct: 31.64, // (9/16) / (16/9) = 81/256 = 31.64%
          badgeTitle: '9:16 SHORTS CROP',
          resolution: '1080x1920',
          cropLabel: '608 x 1080',
          subLabel: '(Lanczos Full HD Shorts)',
          buttonLabel: 'Render 9:16 Short',
          cardTitle: 'Render Master 9:16 Vertical Short',
          desc: 'Encodes with Intel QSV / NVENC hardware acceleration at 1080x1920 60fps.'
        };
    }
  };

  const config = getAspectConfig();

  // Active crop left coordinate constrained by aspect ratio width
  const activeLeft = aspectRatio === '16:9' ? 0 : Math.min(Math.max(cropXPercent, 0), 100 - config.widthPct);

  // Center coordinate of the active crop window (where face & camera track)
  const activeCenter = aspectRatio === '16:9' ? 50 : activeLeft + (config.widthPct / 2);

  // Run live analysis via Python engine IPC or simulated playback
  const handleAnalyzeTrajectory = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(10);

    if (window.hclipper && sourceVideo) {
      const unsub = window.hclipper.onEngineEvent((evt) => {
        if (evt.event === 'reframe_progress') {
          setAnalysisProgress(evt.percent || 0);
        } else if (evt.event === 'trajectory') {
          const traj = evt.trajectory || [];
          setTrajectoryData(traj);
          setIsAnalyzing(false);
          setAnalysisProgress(100);
        }
      });

      const res = await window.hclipper.runEngine('reframe', [
        sourceVideo, 
        '--trajectory-only',
        '--aspect', aspectRatio,
        '--deadzone', deadzone.toString(),
        '--smooth', smoothFactor.toString()
      ]);
      unsub();
      if (!res.success) {
        setIsAnalyzing(false);
      }
    } else {
      // Smooth preview simulation
      let p = 10;
      const interval = setInterval(() => {
        p += 25;
        if (p >= 100) {
          clearInterval(interval);
          setAnalysisProgress(100);
          setIsAnalyzing(false);
          // Generate 300 simulated frame coordinates with realistic speaker movement
          const mockTraj = Array.from({ length: 300 }, (_, i) => {
            const center = 550 + Math.sin(i / 25) * 120 + Math.cos(i / 15) * 40;
            return Math.max(0, Math.min(875, Math.round(center - 202)));
          });
          setTrajectoryData(mockTraj);
        } else {
          setAnalysisProgress(p);
        }
      }, 250);
    }
  };

  // Synchronize playback frame with crop position
  useEffect(() => {
    let animId: number;
    if (isPlaying && trajectoryData.length > 0) {
      const step = () => {
        setCurrentFrameIndex((prev) => {
          const next = (prev + 1) % trajectoryData.length;
          const frameCoord = trajectoryData[next];
          // Convert crop coordinate to percentage
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

  const handleRenderMaster = async () => {
    setIsRendering(true);
    setRenderProgress(10);

    const aspectSuffix = aspectRatio.replace(':', '_');
    const targetOut = `C:/Users/Ebunoluwa/Desktop/hclipper/clips/Master_Reframed_${aspectSuffix}.mp4`;

    if (window.hclipper && sourceVideo) {
      const unsub = window.hclipper.onEngineEvent((evt) => {
        if (evt.event === 'reframe_progress') {
          setRenderProgress(evt.percent || 0);
        } else if (evt.event === 'reframe_result') {
          setRenderProgress(100);
          setIsRendering(false);
          setRenderedOutput(evt.output);
        }
      });

      const res = await window.hclipper.runEngine('reframe', [
        sourceVideo, 
        targetOut,
        '--aspect', aspectRatio,
        '--deadzone', deadzone.toString(),
        '--smooth', smoothFactor.toString()
      ]);
      unsub();
      if (!res.success) {
        setIsRendering(false);
      }
    } else {
      let p = 10;
      const interval = setInterval(() => {
        p += 20;
        if (p >= 100) {
          clearInterval(interval);
          setRenderProgress(100);
          setIsRendering(false);
          setRenderedOutput(targetOut);
        } else {
          setRenderProgress(p);
        }
      }, 400);
    }
  };

  const handleOpenRendered = () => {
    if (window.hclipper && renderedOutput) {
      window.hclipper.openPath(renderedOutput);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-white">AI Smart Auto-Reframing</h2>
          <p className="text-xs text-slate-400 mt-1">
            YuNet ONNX neural network centers the speaker dynamically with deadzone camera pan physics.
          </p>
        </div>
        <button
          onClick={onNext}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-amber-500/10 flex items-center space-x-2"
        >
          <span>Proceed to Captions & Hook</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Preview & Physics Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left: Interactive 16:9 Stage Canvas with Dynamic Crop Box (8 cols) */}
        <div className="col-span-8 glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-amber-400" />
              Source 16:9 Stage View & Live Crop Window
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                CPU YuNet: 60+ FPS
              </span>
            </div>
          </div>

          {/* 16:9 Container Canvas */}
          <div className="relative aspect-video bg-slate-950 rounded-lg border border-white/10 overflow-hidden flex items-center justify-center">
            {/* Simulated Stage Background */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900 to-slate-800 opacity-70" />

            {/* Video preview if available */}
            {sourceVideo && (
              <video
                ref={videoRef}
                src={sourceVideo}
                className="w-full h-full object-cover opacity-60"
                playsInline
                muted
              />
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
                {/* Target reticle crosshairs */}
                <div className="absolute w-full h-[1px] bg-amber-400/50" />
                <div className="absolute h-full w-[1px] bg-amber-400/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/80 z-10" />
                <div className="absolute inset-1.5 border border-dashed border-amber-400/40 rounded-full animate-spin-slow" />
                <span className="absolute -bottom-2 text-[8px] font-extrabold uppercase tracking-wider text-amber-300 bg-slate-950/90 px-1 py-0.2 rounded border border-amber-400/40 z-20">
                  Face Center
                </span>
              </div>

              {/* Neck & Torso */}
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
                onClick={handleAnalyzeTrajectory}
                disabled={isAnalyzing}
                className="px-4 py-2 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAnalyzing ? `Tracking Faces (${analysisProgress}%)...` : `Analyze YuNet (${aspectRatio})`}</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-400">
              Crop Window: <strong className="text-white">{config.cropLabel}</strong> {config.subLabel}
            </span>
          </div>

          {/* Render Master Action Box */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Film className="w-4 h-4 text-amber-400" />
                <span>{config.cardTitle}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {config.desc}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {renderedOutput ? (
                <button
                  onClick={handleOpenRendered}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Open Video in Player</span>
                </button>
              ) : (
                <button
                  onClick={handleRenderMaster}
                  disabled={isRendering}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-amber-500/10 flex items-center space-x-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isRendering ? `Rendering (${renderProgress}%)...` : config.buttonLabel}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Reframing Physics & Aspect Controls (4 cols) */}
        <div className="col-span-4 space-y-4">
          {/* Aspect Ratio Selector */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Output Aspect Ratio
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  setAspectRatio('9:16');
                  setRenderedOutput(null);
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${
                  aspectRatio === '9:16'
                    ? 'bg-amber-400/15 border-amber-400/50 text-amber-300 shadow-sm shadow-amber-400/20'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4 mb-1" />
                <span className="text-[11px] font-bold">9:16 Vertical</span>
                <span className="text-[9px] text-slate-500">TikTok/Shorts</span>
              </button>

              <button
                onClick={() => {
                  setAspectRatio('1:1');
                  setRenderedOutput(null);
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${
                  aspectRatio === '1:1'
                    ? 'bg-amber-400/15 border-amber-400/50 text-amber-300 shadow-sm shadow-amber-400/20'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Square className="w-4 h-4 mb-1" />
                <span className="text-[11px] font-bold">1:1 Square</span>
                <span className="text-[9px] text-slate-500">Instagram Feed</span>
              </button>

              <button
                onClick={() => {
                  setAspectRatio('16:9');
                  setRenderedOutput(null);
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${
                  aspectRatio === '16:9'
                    ? 'bg-amber-400/15 border-amber-400/50 text-amber-300 shadow-sm shadow-amber-400/20'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-4 h-4 mb-1" />
                <span className="text-[11px] font-bold">16:9 Master</span>
                <span className="text-[9px] text-slate-500">YouTube VOD</span>
              </button>
            </div>
          </div>

          {/* Camera Physics */}
          <div className="glass-card rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Camera Physics
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={enableFaceTracking} 
                  onChange={(e) => setEnableFaceTracking(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-8 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-400"></div>
              </label>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Deadzone Leeway:</span>
                  <span className="font-mono text-amber-300 font-bold">{deadzone} px</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="60" 
                  value={deadzone}
                  onChange={(e) => setDeadzone(parseInt(e.target.value))}
                  className="w-full accent-amber-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Prevents camera micro-jitter during subtle speaker hand gestures.
                </span>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Pan Easing Rate:</span>
                  <span className="font-mono text-amber-300 font-bold">{smoothFactor}</span>
                </div>
                <input 
                  type="range" 
                  min="0.02" 
                  max="0.15" 
                  step="0.01"
                  value={smoothFactor}
                  onChange={(e) => setSmoothFactor(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Cinematic camera acceleration when the speaker walks across stage.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

