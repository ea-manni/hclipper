import React, { useState, useEffect, useRef } from 'react';
import { 
  Link, 
  Upload, 
  DownloadCloud, 
  CheckCircle, 
  Film, 
  ArrowRight,
  FolderOpen,
  Terminal,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  X
} from 'lucide-react';
import { YoutubeIcon, FacebookIcon } from '../components/Icons';

interface IngestViewProps {
  sourceVideo: string;
  setSourceVideo: (path: string) => void;
  onNext: () => void;
}

interface IngestLog {
  id: string;
  time: string;
  level: 'stdout' | 'stderr' | 'error' | 'info' | 'progress';
  text: string;
}

export const IngestView: React.FC<IngestViewProps> = ({ 
  sourceVideo, 
  setSourceVideo, 
  onNext 
}) => {
  const [url, setUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [speedStr, setSpeedStr] = useState('');
  const [etaStr, setEtaStr] = useState('');
  const [logs, setLogs] = useState<IngestLog[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Auto-scroll console when new logs arrive
  useEffect(() => {
    if (showConsole && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs, showConsole]);

  const addLog = (text: string, level: IngestLog['level'] = 'stdout') => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [
      ...prev.slice(-400),
      {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        time,
        level,
        text
      }
    ]);
  };

  const detectPlatform = (inputUrl: string) => {
    if (!inputUrl) return null;
    if (inputUrl.includes('youtube.com') || inputUrl.includes('youtu.be')) return 'youtube';
    if (inputUrl.includes('facebook.com') || inputUrl.includes('fb.watch')) return 'facebook';
    return 'direct';
  };

  const platform = detectPlatform(url);

  const handleSelectLocal = async () => {
    if (window.hclipper) {
      const selected = await window.hclipper.selectFile({
        title: 'Choose Source Sermon / Long-Form Video'
      });
      if (selected) {
        setSourceVideo(selected);
        setStatusMessage(`Selected local video: ${selected}`);
        setErrorMessage(null);
        addLog(`Imported local media file: ${selected}`, 'info');
      }
    } else {
      const sample = 'C:/Users/Ebunoluwa/Desktop/hclipper/downloads/sample_sermon.mp4';
      setSourceVideo(sample);
      setStatusMessage(`Selected sample file: ${sample}`);
    }
  };

  const handleDownload = async () => {
    if (!url.trim()) return;
    setIsDownloading(true);
    setDownloadProgress(10);
    setStatusMessage('Connecting to media stream via yt-dlp...');
    setSpeedStr('');
    setEtaStr('');
    setErrorMessage(null);
    setShowConsole(true);
    addLog(`Initiating media ingestion for URL: ${url.trim()}`, 'info');

    if (window.hclipper) {
      const unsubEvent = window.hclipper.onEngineEvent((evt) => {
        if (evt.event === 'progress') {
          const pct = typeof evt.percent === 'number' ? Math.round(evt.percent * 10) / 10 : 0;
          setDownloadProgress(pct);
          if (evt.speed_str) setSpeedStr(evt.speed_str);
          if (evt.eta_str) setEtaStr(evt.eta_str);

          if (evt.status === 'processing') {
            setStatusMessage('Merging audio/video tracks (FFmpeg)... 95%');
          } else if (evt.status === 'downloading') {
            const stats = [evt.speed_str, evt.eta_str ? `ETA: ${evt.eta_str}` : ''].filter(Boolean).join(' • ');
            setStatusMessage(`Downloading stream... ${pct}%${stats ? ` (${stats})` : ''}`);
          }
        } else if (evt.event === 'result') {
          setSourceVideo(evt.video_path);
          setIsDownloading(false);
          setDownloadProgress(100);
          setStatusMessage('Download & audio extraction completed successfully!');
          addLog(`✓ Ingestion completed: ${evt.video_path}`, 'info');
        } else if (evt.event === 'error') {
          setIsDownloading(false);
          setErrorMessage(evt.error || 'Failed to download stream.');
          setStatusMessage('Ingestion failed. See logs below.');
          addLog(`✗ Engine error: ${evt.error}`, 'error');
        }
      });

      const unsubLog = window.hclipper.onEngineLog((log) => {
        let level: IngestLog['level'] = log.level === 'stderr' ? 'stderr' : 'stdout';
        const txt = log.text;
        if (txt.includes('ERROR') || txt.includes('Error:') || log.level === 'error') {
          level = 'error';
        } else if (txt.includes('[download]') || txt.includes('[ingest]') || txt.includes('[youtube]')) {
          level = 'progress';
        }
        addLog(txt, level);
      });

      try {
        const res = await window.hclipper.runEngine('download', [url.trim()]);
        if (!res.success) {
          setIsDownloading(false);
          if (!errorMessage) {
            setErrorMessage('Download process exited with an error. Check live logs below.');
            setStatusMessage('Process terminated.');
          }
          addLog(`Process exited with code ${res.code ?? 'unknown'}`, 'stderr');
        }
      } catch (err: any) {
        setIsDownloading(false);
        setErrorMessage(err?.message || 'Failed to launch ingestion process.');
        setStatusMessage('Execution failed.');
        addLog(`Subprocess exception: ${err?.message}`, 'error');
      } finally {
        unsubEvent();
        unsubLog();
      }
    } else {
      // Browser preview fallback
      let current = 10;
      const interval = setInterval(() => {
        current += 15;
        if (current >= 100) {
          clearInterval(interval);
          setDownloadProgress(100);
          setIsDownloading(false);
          setSourceVideo('C:/Users/Ebunoluwa/Desktop/hclipper/downloads/sample_sermon.mp4');
          setStatusMessage('Download completed successfully!');
          addLog('Mock stream download completed.', 'info');
        } else {
          setDownloadProgress(current);
          setStatusMessage(`Downloading 1080p stream... ${current}% (4.8 MB/s • ETA: 12s)`);
          setSpeedStr('4.8 MB/s');
          setEtaStr('12s');
          addLog(`[download] ${current}% of ~120.0MB at 4.8MB/s ETA 00:12`, 'progress');
        }
      }, 300);
    }
  };

  const handleCopyLogs = () => {
    const text = logs.map(l => `[${l.time}] [${l.level.toUpperCase()}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold font-display text-white">Source Media Ingestion</h2>
        <p className="text-xs text-slate-400 mt-1">
          Import church sermons, podcast episodes, or livestreams from YouTube, Facebook, or your local drive.
        </p>
      </div>

      {/* URL Stream Downloader Card */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DownloadCloud className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">Online Stream Extraction (yt-dlp)</h3>
          </div>
          {platform && (
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-semibold">
              {platform === 'youtube' && (
                <span className="text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded flex items-center gap-1.5">
                  <YoutubeIcon className="w-3.5 h-3.5" /> YouTube Video / Live
                </span>
              )}
              {platform === 'facebook' && (
                <span className="text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded flex items-center gap-1.5">
                  <FacebookIcon className="w-3.5 h-3.5" /> Facebook Watch / Stream
                </span>
              )}
              {platform === 'direct' && (
                <span className="text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5" /> Direct HLS/MP4 URL
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Paste YouTube video/stream URL or Facebook Watch link..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && url && !isDownloading) {
                  handleDownload();
                }
              }}
              className="w-full bg-slate-900/90 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/50 transition-colors"
            />
          </div>
          <button
            onClick={handleDownload}
            disabled={!url.trim() || isDownloading}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-amber-500/10 flex items-center space-x-2"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>{isDownloading ? 'Ingesting...' : 'Ingest Stream'}</span>
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/25 rounded-lg p-3.5 flex items-start justify-between text-xs text-red-300">
            <div className="flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-red-200">Stream Extraction Failed</div>
                <div className="text-[11px] text-red-300/90 font-mono break-all">{errorMessage}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0 ml-3">
              <button 
                onClick={handleDownload}
                className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded text-[11px] font-semibold flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
              <button 
                onClick={() => setErrorMessage(null)}
                className="p-1 hover:text-white text-red-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Download Progress Bar & Speed / ETA Tickers */}
        {isDownloading && (
          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                {statusMessage}
              </span>
              <div className="flex items-center space-x-2 text-[10px] font-mono">
                {speedStr && (
                  <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-amber-300 font-bold">
                    ⚡ {speedStr}
                  </span>
                )}
                {etaStr && (
                  <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-slate-400">
                    ⏱️ ETA: {etaStr}
                  </span>
                )}
                <span className="text-amber-400 font-bold text-xs">{downloadProgress}%</span>
              </div>
            </div>

            <div className="w-full h-2 bg-slate-900 border border-white/10 rounded-full overflow-hidden p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 transition-all duration-300 rounded-full shadow-sm shadow-amber-400/50"
                style={{ width: `${Math.max(downloadProgress, 3)}%` }}
              />
            </div>
          </div>
        )}

        {/* Live Engine Console Drawer Toggle */}
        <div className="pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowConsole(!showConsole)}
              className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>Real-Time Ingestion Logs</span>
              <span className="px-1.5 py-0.2 bg-white/5 border border-white/10 rounded text-[10px] font-mono text-slate-400">
                {logs.length}
              </span>
              {showConsole ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showConsole && logs.length > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyLogs}
                  className="px-2 py-1 text-[11px] bg-white/5 hover:bg-white/10 text-slate-300 rounded border border-white/5 flex items-center space-x-1"
                  title="Copy logs to clipboard"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => setLogs([])}
                  className="px-2 py-1 text-[11px] bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 rounded border border-white/5 flex items-center space-x-1"
                  title="Clear log console"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
            )}
          </div>

          {/* Embedded Terminal Box */}
          {showConsole && (
            <div className="mt-3 bg-[#06080d] border border-white/10 rounded-lg p-3 font-mono text-[11px] shadow-inner">
              <div 
                ref={consoleRef}
                className="max-h-48 overflow-y-auto space-y-1 select-text scrollbar-thin pr-1"
              >
                {logs.length === 0 ? (
                  <div className="text-slate-500 italic py-2">
                    Waiting for engine activity... Subprocess stdout, yt-dlp network chunks, and FFmpeg logs will stream here.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="leading-relaxed flex items-start space-x-2">
                      <span className="text-slate-600 select-none shrink-0 font-mono text-[10px]">
                        [{log.time}]
                      </span>
                      <span className={`break-all ${
                        log.level === 'error' 
                          ? 'text-red-400 font-semibold' 
                          : log.level === 'stderr' 
                          ? 'text-amber-400/90' 
                          : log.level === 'progress' 
                          ? 'text-amber-300' 
                          : log.level === 'info' 
                          ? 'text-cyan-400' 
                          : 'text-slate-300'
                      }`}>
                        {log.text}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Or Divider */}
      <div className="relative flex items-center justify-center">
        <div className="border-t border-white/5 w-full absolute" />
        <span className="bg-[#090b10] px-4 text-[10px] tracking-widest uppercase text-slate-500 font-bold relative">
          OR IMPORT LOCAL FILE
        </span>
      </div>

      {/* Local Drag & Drop Area */}
      <div 
        onClick={handleSelectLocal}
        className="glass-card rounded-xl p-8 border-dashed border-2 border-white/10 hover:border-amber-400/40 cursor-pointer flex flex-col items-center justify-center text-center space-y-3 transition-colors group"
      >
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-amber-400/10 transition-colors">
          <Upload className="w-6 h-6 text-slate-400 group-hover:text-amber-400 transition-colors" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">
            Click to Browse or Drag & Drop Video File
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Supports MP4, MOV, MKV, WebM up to 4K 60fps
          </p>
        </div>
        <button className="px-4 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 flex items-center space-x-1.5">
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Select from Computer</span>
        </button>
      </div>

      {/* Active Selected Source Card */}
      {sourceVideo && (
        <div className="glass-card border-amber-400/30 rounded-xl p-5 flex items-center justify-between bg-amber-400/[0.03]">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white">Active Source Loaded</span>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate max-w-md">
                {sourceVideo}
              </p>
            </div>
          </div>

          <button
            onClick={onNext}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-amber-500/10 flex items-center space-x-2"
          >
            <span>Proceed to Timeline & DSP</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

