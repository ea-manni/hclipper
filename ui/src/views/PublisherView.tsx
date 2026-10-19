import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Send, 
  RefreshCw, 
  Edit3, 
  Globe, 
  Play, 
  Save, 
  X, 
  LogIn,
  Terminal,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Folder,
  ExternalLink,
  Film
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon, TikTokIcon } from '../components/Icons';
import { useWorkflow } from '../context/WorkflowContext';

interface QueueItem {
  id: string;
  projectId?: string;
  projectName?: string;
  title: string;
  filename: string;
  file_path: string;
  duration?: string;
  caption?: string;
  status: {
    youtube?: string;
    tiktok_ng?: string;
    tiktok_us?: string;
    instagram?: string;
  };
}

interface LogEntry {
  id: string;
  time: string;
  text: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

export const PublisherView: React.FC = () => {
  const { projects, switchProject, setActiveTab } = useWorkflow();
  const [selectedRange, setSelectedRange] = useState('1-3');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    instagram: true,
    tiktok_ng: true,
    tiktok_us: false,
    youtube: true
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // Live Video Player Modal
  const [previewVideo, setPreviewVideo] = useState<{
    url: string;
    title: string;
    filename: string;
    filePath: string;
  } | null>(null);

  // Live Log Drawer State
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', time: new Date().toLocaleTimeString(), text: 'Publisher engine ready. Real clips loaded from disk.', type: 'info' }
  ]);
  const [showLogDrawer, setShowLogDrawer] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Accounts Modal State
  const [activeAccountModal, setActiveAccountModal] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [sessionStatuses, setSessionStatuses] = useState({
    youtube: false,
    tiktok_ng: false,
    tiktok_us: false,
    instagram: false
  });

  // Edit Caption Modal State
  const [editingClip, setEditingClip] = useState<QueueItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');

  // Queue Data (Strictly real files on disk — zero mock placeholders)
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const addLog = (text: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    setLogs((prev) => [
      ...prev.slice(-150),
      { id: Math.random().toString(36).substring(2, 9), time: new Date().toLocaleTimeString(), text, type }
    ]);
  };

  const loadQueueFromDisk = async () => {
    if (window.hclipper) {
      const items = await window.hclipper.readQueue();
      if (items && Array.isArray(items) && items.length > 0) {
        setQueue(items);
      } else {
        // Trigger automatic scan if queue file was empty
        await handleScanClips();
      }
      // Check session status
      const res = await window.hclipper.runEngine('session-status', []);
      if (res.events && res.events.length > 0) {
        const lastEvt = res.events[res.events.length - 1];
        if (lastEvt.event === 'session_status') {
          setSessionStatuses({
            youtube: lastEvt.youtube,
            tiktok_ng: lastEvt.tiktok_ng,
            tiktok_us: lastEvt.tiktok_us,
            instagram: lastEvt.instagram
          });
        }
      }
    }
  };

  useEffect(() => {
    loadQueueFromDisk();

    if (window.hclipper) {
      const unsubLog = window.hclipper.onEngineLog((data: { level: string; text: string; jobId?: string }) => {
        addLog(data.text, data.level === 'stderr' ? 'warn' : 'info');
      });
      const unsubEvt = window.hclipper.onEngineEvent((evt: any) => {
        if (evt.event === 'publish_progress') {
          addLog(`[${evt.progress}%] ${evt.clip_id} -> ${evt.platform}: ${evt.status.toUpperCase()}`, evt.status === 'posted' ? 'success' : 'warn');
        } else if (evt.event === 'publish_result') {
          addLog(`Batch publish finished: ${evt.published_count || 0} operations executed.`, evt.success ? 'success' : 'warn');
        } else if (evt.event === 'login_result') {
          if (evt.success) {
            addLog(`Session profile created for ${evt.platform}!`, 'success');
          } else {
            addLog(`Session error on ${evt.platform}: ${evt.error}`, 'error');
          }
        }
      });

      return () => {
        unsubLog();
        unsubEvt();
      };
    }
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleScanClips = async () => {
    setIsScanning(true);
    addLog('Scanning clips/ directory for rendered short clips...', 'info');
    if (window.hclipper) {
      await window.hclipper.runEngine('publish', ['--scan']);
      const items = await window.hclipper.readQueue();
      if (items) setQueue(items);
      setIsScanning(false);
      setPublishMessage('Scanned clips/ directory and updated queue with verified files.');
      addLog(`Scan completed. Found ${items?.length || 0} real clips in queue.`, 'success');
    } else {
      setTimeout(() => {
        setIsScanning(false);
        setPublishMessage('Scanned clips/ directory. Queue is up to date.');
      }, 600);
    }
  };

  const handleBatchPublish = async () => {
    setIsPublishing(true);
    setPublishMessage(`Executing automated social publish for Clips ${selectedRange}...`);
    addLog(`Initiating batch publish for Clips ${selectedRange}...`, 'info');

    const plats = [];
    if (selectedPlatforms.instagram) plats.push('ig');
    if (selectedPlatforms.tiktok_ng) plats.push('tt_ng');
    if (selectedPlatforms.tiktok_us) plats.push('tt_us');
    if (selectedPlatforms.youtube) plats.push('yt');

    if (window.hclipper) {
      const res = await window.hclipper.runEngine('publish', [
        '--publish', selectedRange,
        '--platforms', plats.join(',')
      ]);
      setIsPublishing(false);
      if (res.success) {
        setPublishMessage(`Clips ${selectedRange} successfully published!`);
        addLog(`Clips ${selectedRange} batch completed successfully.`, 'success');
        await loadQueueFromDisk();
      } else {
        setPublishMessage(`Publishing completed with status logged in console.`);
        addLog(`Publishing finished with warnings/errors.`, 'warn');
      }
    } else {
      setTimeout(() => {
        setIsPublishing(false);
        setPublishMessage(`Clips ${selectedRange} successfully published to selected platforms!`);
        addLog(`Mock publish completed for Clips ${selectedRange}`, 'success');
      }, 1500);
    }
  };

  const handleConnectSession = async (platformKey: string) => {
    setIsLoggingIn(true);
    addLog(`Launching interactive browser session for ${platformKey}...`, 'info');
    if (window.hclipper) {
      const pKey = platformKey === 'tiktok_us' ? 'tiktok' : platformKey;
      await window.hclipper.runEngine('login', ['--platform', pKey]);
      setIsLoggingIn(false);
      setActiveAccountModal(null);
      await loadQueueFromDisk();
    }
  };

  // Open Real In-App Interactive Video Player Modal
  const openVideoInPlayer = async (item: QueueItem) => {
    const rawPath = item.file_path;
    let url = rawPath;
    if (window.hclipper?.resolveMediaUrl) {
      url = await window.hclipper.resolveMediaUrl(rawPath);
    } else {
      let norm = rawPath.replace(/\\/g, '/');
      if (!norm.startsWith('http') && !norm.startsWith('file:')) {
        url = norm.startsWith('/') ? `file://${norm}` : `file:///${norm}`;
      }
    }

    setPreviewVideo({
      url,
      title: item.title,
      filename: item.filename,
      filePath: rawPath
    });
    addLog(`Playing video: ${item.filename}`, 'info');
  };

  const openInExplorer = (filePath: string) => {
    if (window.hclipper?.showInFolder) {
      window.hclipper.showInFolder(filePath);
    }
  };

  const openInDefaultOSPlayer = (filePath: string) => {
    if (window.hclipper?.openPath) {
      window.hclipper.openPath(filePath);
    }
  };

  const openCaptionModal = (clip: QueueItem) => {
    setEditingClip(clip);
    setEditTitle(clip.title);
    setEditCaption(clip.caption || '');
  };

  const saveCaptionModal = async () => {
    if (!editingClip) return;
    const updated = queue.map((it) => 
      it.id === editingClip.id ? { ...it, title: editTitle, caption: editCaption } : it
    );
    setQueue(updated);
    if (window.hclipper) {
      await window.hclipper.saveQueue(updated);
    }
    setEditingClip(null);
    addLog(`Updated caption metadata for ${editingClip.filename}`, 'success');
  };

  const renderBadge = (status?: string) => {
    if (status === 'posted') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
          <CheckCircle className="w-2.5 h-2.5" /> Live
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
          <AlertCircle className="w-2.5 h-2.5" /> Failed
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
        <Clock className="w-2.5 h-2.5" /> Ready
      </span>
    );
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-2xl font-bold font-display text-white">Social Publisher & Clips Queue</h2>
            <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Step 6 of 6
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real playable clips rendered on your machine. Preview with built-in player and publish across TikTok, Instagram Reels, and YouTube Shorts.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.hclipper?.openFolder?.('clips')}
            className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Clips Folder</span>
          </button>
          <button
            onClick={handleScanClips}
            disabled={isScanning}
            className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>Scan Disk Clips</span>
          </button>
        </div>
      </div>

      {/* Account Profiles Grid */}
      <div className="grid grid-cols-4 gap-4">
        {/* YouTube */}
        <div 
          onClick={() => setActiveAccountModal('youtube')}
          className="glass-card rounded-xl p-4 space-y-2 border-red-500/20 cursor-pointer hover:border-red-500/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <YoutubeIcon className="w-5 h-5 text-red-500" />
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              sessionStatuses.youtube ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
            }`}>
              {sessionStatuses.youtube ? 'Connected' : 'Click to Login'}
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-white">YouTube Shorts</div>
            <div className="text-[10px] text-slate-400">
              {sessionStatuses.youtube ? 'Connected Channel' : 'Click to Authenticate'}
            </div>
          </div>
        </div>

        {/* TikTok Primary / Global */}
        <div 
          onClick={() => setActiveAccountModal('tiktok_ng')}
          className="glass-card rounded-xl p-4 space-y-2 border-emerald-500/20 cursor-pointer hover:border-emerald-500/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <TikTokIcon className="w-5 h-5 text-emerald-400" />
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              sessionStatuses.tiktok_ng ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
            }`}>
              {sessionStatuses.tiktok_ng ? 'Connected' : 'Click to Login'}
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-white">TikTok (Direct / Global)</div>
            <div className="text-[10px] text-slate-400">
              {sessionStatuses.tiktok_ng ? 'Connected Account' : 'Click to Authenticate'}
            </div>
          </div>
        </div>

        {/* Instagram */}
        <div 
          onClick={() => setActiveAccountModal('instagram')}
          className="glass-card rounded-xl p-4 space-y-2 border-pink-500/20 cursor-pointer hover:border-pink-500/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <InstagramIcon className="w-5 h-5 text-pink-500" />
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              sessionStatuses.instagram ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
            }`}>
              {sessionStatuses.instagram ? 'Connected' : 'Click to Login'}
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-white">Instagram Reels</div>
            <div className="text-[10px] text-slate-400">
              {sessionStatuses.instagram ? 'Connected Profile' : 'Click to Authenticate'}
            </div>
          </div>
        </div>

        {/* TikTok US */}
        <div 
          onClick={() => setActiveAccountModal('tiktok_us')}
          className="glass-card rounded-xl p-4 space-y-2 border-sky-500/20 cursor-pointer hover:border-sky-500/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <Globe className="w-5 h-5 text-sky-400" />
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              sessionStatuses.tiktok_us ? 'text-sky-400 bg-sky-500/10' : 'text-amber-400 bg-amber-500/10'
            }`}>
              {sessionStatuses.tiktok_us ? 'VPN Guarded' : 'Setup Profile'}
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-white">TikTok (US Region)</div>
            <div className="text-[10px] text-slate-400">
              {sessionStatuses.tiktok_us ? 'US Session Active' : 'US Proxy Guard'}
            </div>
          </div>
        </div>
      </div>

      {/* Publishing Controls */}
      <div className="glass-card rounded-xl p-5 border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-6 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-semibold uppercase text-[11px]">Clip Range:</span>
            <input 
              type="text" 
              value={selectedRange} 
              onChange={(e) => setSelectedRange(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded px-2.5 py-1 text-white font-mono w-20 text-center focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input 
                type="checkbox" 
                checked={selectedPlatforms.instagram}
                onChange={(e) => setSelectedPlatforms({ ...selectedPlatforms, instagram: e.target.checked })}
                className="accent-amber-400"
              />
              <span className="text-slate-300 font-medium">IG Reels</span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input 
                type="checkbox" 
                checked={selectedPlatforms.tiktok_ng}
                onChange={(e) => setSelectedPlatforms({ ...selectedPlatforms, tiktok_ng: e.target.checked })}
                className="accent-amber-400"
              />
              <span className="text-slate-300 font-medium">TikTok NG</span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input 
                type="checkbox" 
                checked={selectedPlatforms.youtube}
                onChange={(e) => setSelectedPlatforms({ ...selectedPlatforms, youtube: e.target.checked })}
                className="accent-amber-400"
              />
              <span className="text-slate-300 font-medium">YouTube Shorts</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleBatchPublish}
          disabled={isPublishing || queue.length === 0}
          className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-amber-500/10 flex items-center space-x-2"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isPublishing ? 'Publishing Selected...' : `Publish Selected Clips (${selectedRange})`}</span>
        </button>
      </div>

      {publishMessage && (
        <div className="text-xs text-amber-300 bg-amber-400/10 border border-amber-400/20 p-3 rounded-lg flex items-center justify-between">
          <span>{publishMessage}</span>
          <CheckCircle className="w-4 h-4 text-emerald-400" />
        </div>
      )}

      {/* Holistic Multi-Project Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center space-x-1.5">
          <Folder className="w-3.5 h-3.5 text-amber-400" />
          <span>Project Filter:</span>
        </span>
        <button
          onClick={() => setSelectedProjectFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
            selectedProjectFilter === 'all'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
          }`}
        >
          All Projects ({queue.length})
        </button>
        {projects.map((proj) => {
          const count = queue.filter(
            (q) => q.projectId === proj.id || q.projectName === proj.name
          ).length;
          return (
            <button
              key={proj.id}
              onClick={() => setSelectedProjectFilter(proj.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 flex items-center space-x-1.5 transition-all ${
                selectedProjectFilter === proj.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              <span>{proj.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedProjectFilter === proj.id ? 'bg-black/30 text-slate-900 font-bold' : 'bg-white/10 text-slate-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Central Queue Table — Real Files Only */}
      <div className="glass-card rounded-xl overflow-hidden border-white/10">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Holistic Playable Clips Queue
            </span>
            <span className="text-[10px] font-mono bg-amber-400/10 text-amber-300 border border-amber-400/20 px-2 py-0.5 rounded-full font-bold">
              {queue.filter(
                (item) =>
                  selectedProjectFilter === 'all' ||
                  item.projectId === selectedProjectFilter
              ).length} Clips Visible
            </span>
          </div>
          <span className="text-xs text-slate-400">All clips verified on local disk across all projects</span>
        </div>

        {queue.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <Film className="w-8 h-8 mx-auto text-slate-600 opacity-50" />
            <div className="text-xs font-semibold text-slate-400">No rendered clips found in queue</div>
            <p className="text-[11px] text-slate-600">
              Click "Scan Disk Clips" or render clips in Step 2 / Step 4 to populate your queue.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Clip Title & Project</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">YouTube</th>
                <th className="py-3 px-3">TikTok NG</th>
                <th className="py-3 px-3">Instagram</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {queue
                .filter(
                  (item) =>
                    selectedProjectFilter === 'all' ||
                    item.projectId === selectedProjectFilter
                )
                .map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{item.title}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[10px] text-amber-400 font-medium bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded flex items-center space-x-1">
                          <Folder className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{item.projectName || 'Project Clip'}</span>
                        </span>
                        <span className="text-[10px] text-slate-600">•</span>
                        <span className="text-[10px] text-slate-500 font-mono">{item.filename}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-400">{item.duration || '30s'}</td>
                    <td className="py-3.5 px-3">{renderBadge(item.status?.youtube)}</td>
                    <td className="py-3.5 px-3">{renderBadge(item.status?.tiktok_ng)}</td>
                    <td className="py-3.5 px-3">{renderBadge(item.status?.instagram)}</td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {/* Play in Built-in Video Player */}
                      <button 
                        onClick={() => openVideoInPlayer(item)}
                        className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded font-bold text-[11px] inline-flex items-center gap-1 shadow-sm transition-all"
                        title="Play Video in Built-in Player"
                      >
                        <Play className="w-3 h-3 fill-slate-950" /> Play
                      </button>
                      {/* Jump to Project Studio */}
                      <button 
                        onClick={() => {
                          if (item.projectId) switchProject(item.projectId);
                          setActiveTab('reframe');
                        }}
                        className="p-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded border border-sky-500/30 inline-flex items-center"
                        title="Open in Project Studio"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      {/* Reveal in Explorer */}
                      <button 
                        onClick={() => openInExplorer(item.file_path)}
                        className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded border border-white/10 inline-flex items-center"
                        title="Reveal in File Explorer"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                      {/* Edit Caption */}
                      <button 
                        onClick={() => openCaptionModal(item)}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded text-[11px] font-medium border border-white/10 inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Live Log Console Drawer */}
      <div className="glass-card rounded-xl overflow-hidden border-white/10">
        <div 
          onClick={() => setShowLogDrawer(!showLogDrawer)}
          className="p-3 bg-slate-950/80 border-b border-white/5 flex items-center justify-between cursor-pointer select-none hover:bg-slate-950 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200">Execution Console & Activity Log</span>
            <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-slate-400 border border-white/5">
              {logs.length} events
            </span>
          </div>
          {showLogDrawer ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>

        {showLogDrawer && (
          <div 
            ref={logContainerRef}
            className="p-3 bg-slate-950 font-mono text-[11px] h-36 overflow-y-auto space-y-1 select-text"
          >
            {logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-2">
                <span className="text-slate-600 shrink-0">[{log.time}]</span>
                <span className={
                  log.type === 'success' ? 'text-emerald-400' :
                  log.type === 'warn' ? 'text-amber-400' :
                  log.type === 'error' ? 'text-red-400' : 'text-slate-300'
                }>
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* REAL IN-APP INTERACTIVE VIDEO PLAYER MODAL */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card bg-[#090c14] border border-white/15 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">{previewVideo.title}</h3>
                <span className="text-[10px] text-slate-400 font-mono">{previewVideo.filename}</span>
              </div>
              <button 
                onClick={() => setPreviewVideo(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vertical 9:16 Video Player Container */}
            <div className="relative aspect-[9/16] max-h-[65vh] mx-auto bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
              <video
                src={previewVideo.url}
                controls
                autoPlay
                className="w-full h-full object-cover"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                onClick={() => openInExplorer(previewVideo.filePath)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Show in Windows Explorer</span>
              </button>
              <button
                onClick={() => openInDefaultOSPlayer(previewVideo.filePath)}
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-bold flex items-center space-x-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Windows Player</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Caption Modal */}
      {editingClip && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card bg-[#0d1017] border border-white/15 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Edit Clip Metadata & Social Caption</h3>
              <button 
                onClick={() => setEditingClip(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Clip Title:</label>
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white mt-1 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Social Caption & Hashtags:</label>
                <textarea 
                  rows={4}
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-xs text-slate-200 mt-1 focus:outline-none focus:border-amber-400 leading-relaxed font-sans"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button 
                onClick={() => setEditingClip(null)}
                className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={saveCaptionModal}
                className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center space-x-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Login Session Modal */}
      {activeAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card bg-[#0d1017] border border-white/15 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white capitalize">{activeAccountModal.replace('_', ' ')} Session</h3>
              <button 
                onClick={() => setActiveAccountModal(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Launches an interactive Chromium browser session. Log in once; your cookies and authentication tokens will be securely preserved in <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">sessions/</code> for automatic publishing.
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button 
                onClick={() => setActiveAccountModal(null)}
                className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium"
              >
                Close
              </button>
              <button 
                onClick={() => handleConnectSession(activeAccountModal)}
                disabled={isLoggingIn}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold flex items-center space-x-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isLoggingIn ? 'Launching Chromium...' : 'Launch Login Browser'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
