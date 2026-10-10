import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  ZoomIn, 
  ZoomOut
} from 'lucide-react';

interface WaveformPlayerProps {
  mediaUrl?: string;
  inTime: number; // in seconds
  outTime: number; // in seconds
  onTimeUpdate?: (currentTime: number) => void;
  onSetInPoint?: () => void;
  onSetOutPoint?: () => void;
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  mediaUrl,
  inTime,
  outTime,
  onTimeUpdate,
  onSetInPoint,
  onSetOutPoint,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize WaveSurfer
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(255, 255, 255, 0.25)',
      progressColor: '#eab308',
      cursorColor: '#fef08a',
      cursorWidth: 2,
      barWidth: 2.5,
      barGap: 1.5,
      barRadius: 2,
      height: 84,
      normalize: true,
      media: videoRef.current || undefined,
    });

    wavesurferRef.current = ws;

    // Load sample audio or mediaUrl
    const audioSource = mediaUrl || 'https://actions.google.com/sounds/v1/ambiences/humming_room_tone.ogg';
    ws.load(audioSource);

    ws.on('ready', () => {
      setDuration(ws.getDuration() || 75.0);
    });

    ws.on('audioprocess', (time) => {
      setCurrentTime(time);
      if (onTimeUpdate) onTimeUpdate(time);
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));

    return () => {
      ws.destroy();
    };
  }, [mediaUrl]);

  const togglePlay = () => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.playPause();
  };

  const handleZoom = (delta: number) => {
    if (!wavesurferRef.current) return;
    const newZoom = Math.max(0, Math.min(100, zoomLevel + delta));
    setZoomLevel(newZoom);
    wavesurferRef.current.zoom(newZoom);
  };

  const formatTimestamp = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Video & Playback Monitor Preview */}
      <div className="grid grid-cols-12 gap-5 items-center">
        {/* Synchronized 16:9 Video Monitor (5 cols) */}
        <div className="col-span-5 relative aspect-video bg-slate-950 rounded-xl border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center group">
          <video
            ref={videoRef}
            src={mediaUrl}
            className="w-full h-full object-cover"
            playsInline
            muted={isMuted}
          />
          {/* Overlay Stage Marker */}
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono font-bold text-amber-300 border border-white/10">
            {formatTimestamp(currentTime)}
          </div>

          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-lg bg-black/60 text-slate-300 hover:text-white"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Timeline Range Info & Quick Hotkeys (7 cols) */}
        <div className="col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              Selection Range & Timing
            </span>
            <span className="font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded text-[11px] font-bold">
              Selected Duration: {Math.max(0, outTime - inTime).toFixed(2)}s
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/90 border border-white/10 rounded-lg p-2.5 space-y-1">
              <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold">
                <span>In Marker [Key I]</span>
                <button 
                  onClick={onSetInPoint}
                  className="text-amber-400 hover:underline font-bold"
                >
                  Set to Current
                </button>
              </div>
              <div className="font-mono text-sm text-white font-bold">
                {formatTimestamp(inTime)}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-white/10 rounded-lg p-2.5 space-y-1">
              <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold">
                <span>Out Marker [Key O]</span>
                <button 
                  onClick={onSetOutPoint}
                  className="text-amber-400 hover:underline font-bold"
                >
                  Set to Current
                </button>
              </div>
              <div className="font-mono text-sm text-white font-bold">
                {formatTimestamp(outTime)}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-white/10 text-slate-300 text-[10px]">Space</kbd>
            <span>Play/Pause</span>
            <span className="text-slate-600">|</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-white/10 text-slate-300 text-[10px]">I</kbd>
            <span>Mark In</span>
            <span className="text-slate-600">|</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-white/10 text-slate-300 text-[10px]">O</kbd>
            <span>Mark Out</span>
          </div>
        </div>
      </div>

      {/* Waveform Canvas Container */}
      <div className="bg-slate-950/90 border border-white/10 rounded-xl p-3 relative overflow-hidden">
        <div ref={containerRef} className="cursor-pointer" />

        {/* Visual In/Out Range Highlight */}
        {duration > 0 && (
          <div 
            className="absolute top-0 bottom-0 bg-amber-400/15 border-l-2 border-r-2 border-amber-400 pointer-events-none transition-all duration-75"
            style={{
              left: `${(inTime / duration) * 100}%`,
              width: `${((outTime - inTime) / duration) * 100}%`
            }}
          />
        )}
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
            onClick={() => {
              if (wavesurferRef.current) wavesurferRef.current.seekTo(0);
            }}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center"
            title="Rewind to start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-2 text-slate-400 text-xs">
          <span>Waveform Zoom:</span>
          <button 
            onClick={() => handleZoom(-15)}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] w-8 text-center text-slate-200">{zoomLevel}x</span>
          <button 
            onClick={() => handleZoom(15)}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
