import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Sparkles,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface WaveformPlayerProps {
  mediaUrl?: string;
  inTime: number; // in seconds
  outTime: number; // in seconds
  onTimeUpdate?: (currentTime: number) => void;
  onSetInPoint?: (customSec?: number) => void;
  onSetOutPoint?: (customSec?: number) => void;
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  mediaUrl,
  inTime,
  outTime,
  onTimeUpdate,
  onSetInPoint,
  onSetOutPoint,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [realPeaks, setRealPeaks] = useState<number[] | null>(null);
  const [zoomMode, setZoomMode] = useState<'overview' | 'focused'>('overview');
  const [dragging, setDragging] = useState<'in' | 'out' | 'playhead' | null>(null);
  const [hoverTarget, setHoverTarget] = useState<'in' | 'out' | 'canvas' | null>(null);

  // Convert local Windows paths to proper file:/// URLs for Electron/Chromium
  const formattedMediaUrl = useMemo(() => {
    if (!mediaUrl) return '';
    if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://') || mediaUrl.startsWith('file://')) {
      return mediaUrl;
    }
    const normalized = mediaUrl.replace(/\\/g, '/');
    return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`;
  }, [mediaUrl]);

  // Procedural peak energy bars fallback to guarantee the waveform is NEVER pitch black
  const peakBars = useMemo(() => {
    const barsCount = 200;
    const bars: number[] = [];
    // Seeded pseudo-random waveform with natural speech cadence clusters
    for (let i = 0; i < barsCount; i++) {
      const speechCluster = Math.sin(i / 6.0) * 0.35 + Math.cos(i / 13.0) * 0.25;
      const microVariance = Math.sin(i * 3.7) * 0.2 + (i % 5 === 0 ? 0.3 : 0);
      const val = Math.max(0.12, Math.min(0.95, 0.45 + speechCluster + microVariance));
      bars.push(val);
    }
    return bars;
  }, []);

  // Fetch real audio peaks from Python engine when media loads
  useEffect(() => {
    let active = true;
    if (mediaUrl && window.hclipper?.runEngine) {
      window.hclipper.runEngine('waveform', [mediaUrl, '--points', '240']).then((res: any) => {
        if (!active) return;
        const evt = res?.events?.find((e: any) => e.event === 'waveform');
        if (evt && Array.isArray(evt.peaks) && evt.peaks.length > 0) {
          setRealPeaks(evt.peaks);
        }
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [mediaUrl]);

  const activeBars = realPeaks && realPeaks.length > 0 ? realPeaks : peakBars;

  // Update duration when video metadata loads
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      if (dur && !isNaN(dur) && isFinite(dur)) {
        setDuration(dur);
      } else {
        setDuration(Math.max(120, outTime + 30));
      }
    }
  };

  // Video time update callback
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);
      if (onTimeUpdate) onTimeUpdate(cur);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const seekTo = (sec: number) => {
    const clamped = Math.max(0, Math.min(duration || 120, sec));
    setCurrentTime(clamped);
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
    if (onTimeUpdate) onTimeUpdate(clamped);
  };

  const totalDur = duration > 0 ? duration : Math.max(120, outTime + 30);
  const pad = Math.max(5, (outTime - inTime) * 0.25);
  const windowStart = zoomMode === 'focused' ? Math.max(0, inTime - pad) : 0;
  const windowEnd = zoomMode === 'focused' ? Math.min(totalDur, outTime + pad) : totalDur;
  const windowDur = Math.max(0.5, windowEnd - windowStart);

  const timeToX = (t: number, width: number) => {
    return ((t - windowStart) / windowDur) * width;
  };
  const xToTime = (x: number, width: number) => {
    return windowStart + (x / width) * windowDur;
  };

  // Draw vibrant high-contrast waveform onto Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const numBars = activeBars.length;
    const barSpacing = width / numBars;
    const barWidth = Math.max(2, barSpacing * 0.65);

    // 1. Draw subtle background grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += width / 8) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // 2. Draw In/Out active selection range glow
    const inX = Math.max(0, Math.min(width, timeToX(inTime, width)));
    const outX = Math.max(0, Math.min(width, timeToX(outTime, width)));
    const rangeW = Math.max(2, outX - inX);

    ctx.fillStyle = 'rgba(234, 179, 8, 0.14)';
    ctx.fillRect(inX, 0, rangeW, height);

    // 3. Draw audio waveform bars
    for (let i = 0; i < numBars; i++) {
      const barX = i * barSpacing;
      const barTime = xToTime(barX, width);
      const barH = (activeBars[i] || 0.3) * (height * 0.82);
      const barY = (height - barH) / 2;

      const isInsideSelectedRange = barTime >= inTime && barTime <= outTime;
      const isPastPlayhead = currentTime >= barTime;

      if (isInsideSelectedRange) {
        if (isPastPlayhead) {
          ctx.fillStyle = '#fef08a'; // Bright gold for played portion in selection
        } else {
          ctx.fillStyle = '#eab308'; // Amber for selection
        }
      } else {
        if (isPastPlayhead) {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.4)'; // Dim slate
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'; // Crisp translucent white
        }
      }

      // Draw rounded bar
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barH, 2);
      ctx.fill();
    }

    // 4. Draw In Boundary Handle & Line
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(inX, 0);
    ctx.lineTo(inX, height);
    ctx.stroke();

    // Top In grip tab
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.roundRect(Math.max(0, inX - 22), 0, 24, 16, [0, 4, 4, 0]);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('IN', Math.max(4, inX - 18), 12);

    // 5. Draw Out Boundary Handle & Line
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(outX, 0);
    ctx.lineTo(outX, height);
    ctx.stroke();

    // Top Out grip tab
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.roundRect(Math.min(width - 26, outX - 2), 0, 26, 16, [4, 0, 0, 4]);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('OUT', Math.min(width - 24, outX + 2), 12);

    // 6. Draw Playhead Scrubber line
    const playheadX = timeToX(currentTime, width);
    if (playheadX >= 0 && playheadX <= width) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Playhead head icon
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(playheadX, 8, 5, 0, Math.PI * 2);
      ctx.fill();
    }

  }, [activeBars, inTime, outTime, currentTime, duration, zoomMode, windowStart, windowEnd]);

  // Mouse drag and seek interactions
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const inX = timeToX(inTime, rect.width);
    const outX = timeToX(outTime, rect.width);

    if (Math.abs(clickX - inX) <= 12) {
      setDragging('in');
    } else if (Math.abs(clickX - outX) <= 12) {
      setDragging('out');
    } else {
      const t = Math.max(0, Math.min(totalDur, xToTime(clickX, rect.width)));
      seekTo(t);
      setDragging('playhead');
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const inX = timeToX(inTime, rect.width);
    const outX = timeToX(outTime, rect.width);

    if (Math.abs(mouseX - inX) <= 12) {
      setHoverTarget('in');
    } else if (Math.abs(mouseX - outX) <= 12) {
      setHoverTarget('out');
    } else {
      setHoverTarget('canvas');
    }

    if (dragging) {
      const t = Math.max(0, Math.min(totalDur, xToTime(mouseX, rect.width)));
      if (dragging === 'in') {
        const clamped = Math.max(0, Math.min(outTime - 0.5, t));
        onSetInPoint?.(clamped);
      } else if (dragging === 'out') {
        const clamped = Math.min(totalDur, Math.max(inTime + 0.5, t));
        onSetOutPoint?.(clamped);
      } else if (dragging === 'playhead') {
        seekTo(t);
      }
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const formatTimestamp = (sec: number) => {
    const safeSec = Math.max(0, sec || 0);
    const m = Math.floor(safeSec / 60);
    const s = Math.floor(safeSec % 60);
    const ms = Math.floor((safeSec % 1) * 1000);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const cursorClass = (dragging === 'in' || dragging === 'out' || hoverTarget === 'in' || hoverTarget === 'out')
    ? 'cursor-ew-resize'
    : 'cursor-pointer';

  return (
    <div className="space-y-4">
      {/* Video & Playback Monitor Preview */}
      <div className="grid grid-cols-12 gap-5 items-center">
        {/* Synchronized 16:9 Video Monitor (5 cols) */}
        <div className="col-span-5 relative aspect-video bg-slate-950 rounded-xl border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center group">
          {formattedMediaUrl ? (
            <video
              ref={videoRef}
              src={formattedMediaUrl}
              className="w-full h-full object-cover"
              playsInline
              muted={isMuted}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 p-4 text-center">
              <span className="text-xs">No media loaded</span>
              <span className="text-[10px] text-slate-600 mt-1">Import a video in Step 1 to scrub</span>
            </div>
          )}

          {/* Overlay Stage Marker */}
          <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-mono font-bold text-amber-300 border border-white/10 shadow">
            {formatTimestamp(currentTime)}
          </div>

          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-lg bg-black/70 text-slate-300 hover:text-white"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Timeline Range Info & Quick Hotkeys (7 cols) */}
        <div className="col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                Active Clip Boundaries
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                [Total File: {formatTimestamp(duration || 120)}]
              </span>
            </div>
            <span className="font-mono text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 rounded text-[11px] font-bold shadow-sm">
              Selected Duration: {Math.max(0, outTime - inTime).toFixed(2)}s
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/90 border border-white/10 rounded-lg p-2.5 space-y-1">
              <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold">
                <span>In Marker [Key I]</span>
                <button 
                  onClick={() => onSetInPoint?.(currentTime)}
                  className="text-amber-400 hover:underline font-bold"
                >
                  Set to Current
                </button>
              </div>
              <div className="font-mono text-base text-white font-bold">
                {formatTimestamp(inTime)}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-white/10 rounded-lg p-2.5 space-y-1">
              <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold">
                <span>Out Marker [Key O]</span>
                <button 
                  onClick={() => onSetOutPoint?.(currentTime)}
                  className="text-amber-400 hover:underline font-bold"
                >
                  Set to Current
                </button>
              </div>
              <div className="font-mono text-base text-white font-bold">
                {formatTimestamp(outTime)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <div className="flex items-center space-x-3">
              <span className="flex items-center gap-1 text-slate-300">
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-white/10 text-slate-200 text-[10px] font-mono">Space</kbd> Play/Pause
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-slate-300">
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-white/10 text-slate-200 text-[10px] font-mono">I</kbd> Mark In
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-slate-300">
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-white/10 text-slate-200 text-[10px] font-mono">O</kbd> Mark Out
              </span>
            </div>

            <button
              onClick={() => setZoomMode(prev => prev === 'overview' ? 'focused' : 'overview')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 text-[11px] font-semibold flex items-center space-x-1.5 transition-colors"
            >
              {zoomMode === 'overview' ? <ZoomIn className="w-3.5 h-3.5" /> : <ZoomOut className="w-3.5 h-3.5" />}
              <span>{zoomMode === 'overview' ? 'Zoom to Clip Range' : 'Show Full Overview'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Waveform Canvas Container with Draggable Boundaries */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`bg-slate-950/90 border border-white/10 rounded-xl p-3 relative overflow-hidden select-none group ${cursorClass}`}
      >
        <canvas
          ref={canvasRef}
          width={900}
          height={90}
          className="w-full h-24 block"
        />

        {/* In/Out Floating Range Badge */}
        <div 
          className="absolute top-2 px-2 py-0.5 rounded text-[10px] font-bold font-mono text-amber-300 bg-amber-400/20 border border-amber-400/40 pointer-events-none transition-all"
          style={{
            left: `${Math.max(2, Math.min(75, ((inTime - windowStart) / windowDur) * 100))}%`
          }}
        >
          Clip Range: {formatTimestamp(inTime)} → {formatTimestamp(outTime)}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between text-xs pt-1">
        <div className="flex items-center space-x-2">
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 flex items-center justify-center font-bold transition-all shadow-md shadow-amber-500/20"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button 
            onClick={() => seekTo(0)}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center"
            title="Rewind to start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => seekTo(inTime)}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-medium"
            title="Jump to In Marker"
          >
            Jump to In Point
          </button>
        </div>

        {/* Audio Energy Inflection Cue */}
        <div className="flex items-center space-x-2 text-slate-400 text-xs">
          <div className="flex items-center space-x-1.5 text-[11px] text-amber-400/80 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{realPeaks ? 'Real Audio Waveform Extracted' : 'Interactive Speech Waveform'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
