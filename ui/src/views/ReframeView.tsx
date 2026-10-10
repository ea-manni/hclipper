import React, { useState } from 'react';
import { 
  Eye, 
  ArrowRight, 
  Sparkles,
  Smartphone,
  Square,
  Monitor
} from 'lucide-react';

interface ReframeViewProps {
  sourceVideo: string;
  onNext: () => void;
}

export const ReframeView: React.FC<ReframeViewProps> = ({ 
  onNext 
}) => {
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1' | '16:9'>('9:16');
  const [enableFaceTracking, setEnableFaceTracking] = useState(true);
  const [deadzone, setDeadzone] = useState(25);
  const [smoothFactor, setSmoothFactor] = useState(0.06);
  const [isSimulating, setIsSimulating] = useState(false);
  const [cropOffsetPercent, setCropOffsetPercent] = useState(38); // 38% from left

  const handleSimulateTrajectory = () => {
    setIsSimulating(true);
    let dir = 1;
    let offset = 38;
    const interval = setInterval(() => {
      offset += dir * 0.8;
      if (offset > 48) dir = -1;
      if (offset < 28) dir = 1;
      setCropOffsetPercent(offset);
    }, 50);

    setTimeout(() => {
      clearInterval(interval);
      setIsSimulating(false);
      setCropOffsetPercent(38);
    }, 4000);
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
        {/* Left: Interactive 16:9 Stage Canvas with 9:16 Crop Box (8 cols) */}
        <div className="col-span-8 glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-amber-400" />
              Source 16:9 Stage View & Crop Window
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
            
            {/* Speaker Silhouette Graphic */}
            <div className="absolute bottom-6 flex flex-col items-center" style={{ left: `${cropOffsetPercent + 8}%` }}>
              <div className="w-14 h-16 rounded-full bg-slate-700/80 border-2 border-amber-400/80 shadow-lg relative flex items-center justify-center">
                <span className="text-[9px] font-bold text-amber-300">Face Center</span>
              </div>
              <div className="w-28 h-24 bg-slate-800/80 rounded-t-3xl mt-1 border border-white/10" />
            </div>

            {/* 9:16 Vertical Crop Window Highlight */}
            <div 
              className="absolute top-0 bottom-0 bg-transparent border-2 border-amber-400 shadow-2xl transition-all duration-75 flex flex-col justify-between p-2 pointer-events-none"
              style={{
                width: '31.64%',
                left: `${cropOffsetPercent}%`,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)'
              }}
            >
              <div className="flex justify-between items-center text-[9px] font-bold text-amber-300 bg-black/80 px-1.5 py-0.5 rounded">
                <span>9:16 SHORTS CROP</span>
                <span>1080x1920</span>
              </div>
              <div className="text-center text-[9px] text-amber-300 bg-black/80 px-1 py-0.5 rounded">
                Deadzone Pan Camera
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleSimulateTrajectory}
              disabled={isSimulating}
              className="px-4 py-2 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSimulating ? 'Simulating Camera Pan...' : 'Simulate Camera Tracking'}</span>
            </button>
            <span className="text-[11px] text-slate-400">
              Crop Window: <strong className="text-white">608 x 1080</strong> (Upscaled via Lanczos)
            </span>
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
                onClick={() => setAspectRatio('9:16')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${
                  aspectRatio === '9:16'
                    ? 'bg-amber-400/15 border-amber-400/50 text-amber-300'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4 mb-1" />
                <span className="text-[11px] font-bold">9:16 Vertical</span>
                <span className="text-[9px] text-slate-500">TikTok/Shorts</span>
              </button>

              <button
                onClick={() => setAspectRatio('1:1')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${
                  aspectRatio === '1:1'
                    ? 'bg-amber-400/15 border-amber-400/50 text-amber-300'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Square className="w-4 h-4 mb-1" />
                <span className="text-[11px] font-bold">1:1 Square</span>
                <span className="text-[9px] text-slate-500">Instagram Feed</span>
              </button>

              <button
                onClick={() => setAspectRatio('16:9')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${
                  aspectRatio === '16:9'
                    ? 'bg-amber-400/15 border-amber-400/50 text-amber-300'
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
