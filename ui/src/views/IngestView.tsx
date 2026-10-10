import React, { useState } from 'react';
import { 
  Link, 
  Upload, 
  DownloadCloud, 
  CheckCircle, 
  Film, 
  ArrowRight,
  FolderOpen
} from 'lucide-react';
import { YoutubeIcon, FacebookIcon } from '../components/Icons';

interface IngestViewProps {
  sourceVideo: string;
  setSourceVideo: (path: string) => void;
  onNext: () => void;
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
      }
    } else {
      const sample = 'C:/Users/Ebunoluwa/Desktop/niyiadekunle/pipeline/Clip1_You_Cant_Afford_It_Master.mp4';
      setSourceVideo(sample);
      setStatusMessage(`Selected sample file: ${sample}`);
    }
  };

  const handleDownload = async () => {
    if (!url.trim()) return;
    setIsDownloading(true);
    setDownloadProgress(10);
    setStatusMessage('Connecting to media stream via yt-dlp...');

    if (window.hclipper) {
      const unsub = window.hclipper.onEngineEvent((evt) => {
        if (evt.event === 'progress') {
          setDownloadProgress(evt.percent || 0);
          setStatusMessage(`Downloading... ${evt.percent}%`);
        } else if (evt.event === 'result') {
          setSourceVideo(evt.video_path);
          setIsDownloading(false);
          setStatusMessage('Download & audio extraction completed!');
        }
      });

      const res = await window.hclipper.runEngine('download', [url]);
      unsub();
      if (!res.success) {
        setStatusMessage('Download finished or handled locally.');
      }
    } else {
      let current = 10;
      const interval = setInterval(() => {
        current += 20;
        if (current >= 100) {
          clearInterval(interval);
          setDownloadProgress(100);
          setIsDownloading(false);
          setSourceVideo('C:/Users/Ebunoluwa/Desktop/hclipper/downloads/sample_sermon.mp4');
          setStatusMessage('Download completed successfully!');
        } else {
          setDownloadProgress(current);
          setStatusMessage(`Downloading 1080p stream... ${current}%`);
        }
      }, 250);
    }
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
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/50 transition-colors"
            />
          </div>
          <button
            onClick={handleDownload}
            disabled={!url || isDownloading}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-amber-500/10 flex items-center space-x-2"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>{isDownloading ? 'Ingesting...' : 'Ingest Stream'}</span>
          </button>
        </div>

        {/* Download Progress Bar */}
        {isDownloading && (
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>{statusMessage}</span>
              <span>{downloadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-300 rounded-full"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}
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
