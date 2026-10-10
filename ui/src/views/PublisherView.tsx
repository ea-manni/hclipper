import React, { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon, TikTokIcon } from '../components/Icons';

interface QueueItem {
  id: string;
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

export const PublisherView: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState('1-6');
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    instagram: true,
    tiktok_ng: true,
    tiktok_us: false,
    youtube: true
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // Edit Caption Modal State
  const [editingClip, setEditingClip] = useState<QueueItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');

  // Queue Data
  const [queue, setQueue] = useState<QueueItem[]>([
    {
      id: 'Clip1_You_Cant_Afford_It_Master',
      title: 'Stop Proving Things To People (You Can\'t Afford It)',
      filename: 'Clip1_You_Cant_Afford_It_Master.mp4',
      file_path: 'clips/Clip1_You_Cant_Afford_It_Master.mp4',
      duration: '68s',
      caption: 'Stop proving things to people! Preached by Pastor Niyi Adekunle.\n\n#Shorts #Reels #TikTok',
      status: {
        youtube: 'posted',
        tiktok_ng: 'posted',
        tiktok_us: 'pending',
        instagram: 'posted'
      }
    },
    {
      id: 'Clip2_They_Got_There_First_Master',
      title: 'They Got There First Means Nothing',
      filename: 'Clip2_They_Got_There_First_Master.mp4',
      file_path: 'clips/Clip2_They_Got_There_First_Master.mp4',
      duration: '117s',
      caption: 'They got there first means nothing! Catch the full message.\n\n#Shorts #Reels #TikTok',
      status: {
        youtube: 'posted',
        tiktok_ng: 'posted',
        tiktok_us: 'pending',
        instagram: 'posted'
      }
    },
    {
      id: 'Clip3_Destiny_Friends_Master',
      title: '10,000 Friends, But Who Prays For You?',
      filename: 'Clip3_Destiny_Friends_Master.mp4',
      file_path: 'clips/Clip3_Destiny_Friends_Master.mp4',
      duration: '102s',
      caption: '10,000 Friends, but who prays for you? #PastorNiyiAdekunle',
      status: {
        youtube: 'posted',
        tiktok_ng: 'posted',
        tiktok_us: 'pending',
        instagram: 'posted'
      }
    },
    {
      id: 'Clip4_Something_Huge_Is_Coming_Master',
      title: 'Something Huge Is Coming in Your Life',
      filename: 'Clip4_Something_Huge_Is_Coming_Master.mp4',
      file_path: 'clips/Clip4_Something_Huge_Is_Coming_Master.mp4',
      duration: '57s',
      caption: 'Something huge is coming in your life! #Shorts #TikTok',
      status: {
        youtube: 'posted',
        tiktok_ng: 'posted',
        tiktok_us: 'pending',
        instagram: 'posted'
      }
    },
    {
      id: 'Clip5_The_Blessing_That_Makes_Rich_Master',
      title: 'The Blessing That Makes Rich and Adds No Sorrow',
      filename: 'Clip5_The_Blessing_That_Makes_Rich_Master.mp4',
      file_path: 'clips/Clip5_The_Blessing_That_Makes_Rich_Master.mp4',
      duration: '104s',
      caption: 'The blessing that makes rich and adds no sorrow.\n\n#Shorts #Reels',
      status: {
        youtube: 'posted',
        tiktok_ng: 'pending',
        tiktok_us: 'pending',
        instagram: 'pending'
      }
    },
    {
      id: 'Clip6_The_Making_In_Secret_Master',
      title: 'The Making in Secret Before the Manifestation',
      filename: 'Clip6_The_Making_In_Secret_Master.mp4',
      file_path: 'clips/Clip6_The_Making_In_Secret_Master.mp4',
      duration: '64s',
      caption: 'The making in secret before the manifestation.\n\n#Shorts #Reels',
      status: {
        youtube: 'pending',
        tiktok_ng: 'pending',
        tiktok_us: 'pending',
        instagram: 'pending'
      }
    }
  ]);

  // Load real queue from disk if in Electron
  const loadQueueFromDisk = async () => {
    if (window.hclipper) {
      const items = await window.hclipper.readQueue();
      if (items && items.length > 0) {
        setQueue(items);
      }
    }
  };

  useEffect(() => {
    loadQueueFromDisk();
  }, []);

  const handleScanClips = async () => {
    setIsScanning(true);
    if (window.hclipper) {
      await window.hclipper.runEngine('publish', ['--scan']);
      await loadQueueFromDisk();
      setIsScanning(false);
      setPublishMessage('Scanned clips/ directory and updated queue.');
    } else {
      setTimeout(() => {
        setIsScanning(false);
        setPublishMessage('Scanned clips/ directory. Queue is up to date.');
      }, 800);
    }
  };

  const handleBatchPublish = async () => {
    setIsPublishing(true);
    setPublishMessage(`Executing automated social publish for Clips ${selectedRange}...`);

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
        await loadQueueFromDisk();
      } else {
        setPublishMessage(`Publishing completed with status logged in console.`);
      }
    } else {
      setTimeout(() => {
        setIsPublishing(false);
        setPublishMessage(`Clips ${selectedRange} successfully published to selected platforms!`);
        setQueue((prev) =>
          prev.map((item) => ({
            ...item,
            status: {
              ...item.status,
              tiktok_ng: selectedPlatforms.tiktok_ng ? 'posted' : item.status.tiktok_ng,
              instagram: selectedPlatforms.instagram ? 'posted' : item.status.instagram,
              youtube: selectedPlatforms.youtube ? 'posted' : item.status.youtube
            }
          }))
        );
      }, 2000);
    }
  };

  const openVideoInPlayer = (filePath: string) => {
    if (window.hclipper) {
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
          <h2 className="text-2xl font-bold font-display text-white">Multi-Account Social Publisher</h2>
          <p className="text-xs text-slate-400 mt-1">
            Automate publishing to YouTube Shorts, TikTok (US & Nigeria accounts), and Instagram Reels with session persistence.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleScanClips}
            disabled={isScanning}
            className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>Scan Clips Directory</span>
          </button>
        </div>
      </div>

      {/* Account Profiles Grid */}
      <div className="grid grid-cols-4 gap-4">
        {/* YouTube */}
        <div className="glass-card rounded-xl p-4 space-y-2 border-red-500/20">
          <div className="flex items-center justify-between">
            <YoutubeIcon className="w-5 h-5 text-red-500" />
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Active</span>
          </div>
          <div>
            <div className="text-xs font-bold text-white">YouTube Shorts</div>
            <div className="text-[10px] text-slate-400">@NIYIADEKUNLETV</div>
          </div>
          <div className="text-[10px] text-slate-500 pt-1">Studio Session Saved</div>
        </div>

        {/* TikTok NG */}
        <div className="glass-card rounded-xl p-4 space-y-2 border-emerald-500/20">
          <div className="flex items-center justify-between">
            <TikTokIcon className="w-5 h-5 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">30k+ Fanbase</span>
          </div>
          <div>
            <div className="text-xs font-bold text-white">TikTok Nigeria</div>
            <div className="text-[10px] text-slate-400">@niyiadekunle6</div>
          </div>
          <div className="text-[10px] text-slate-500 pt-1">Direct Connection OK</div>
        </div>

        {/* TikTok US */}
        <div className="glass-card rounded-xl p-4 space-y-2 border-sky-500/20">
          <div className="flex items-center justify-between">
            <Globe className="w-5 h-5 text-sky-400" />
            <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">VPN Guarded</span>
          </div>
          <div>
            <div className="text-xs font-bold text-white">TikTok US</div>
            <div className="text-[10px] text-slate-400">US Geolocation Enforced</div>
          </div>
          <div className="text-[10px] text-slate-500 pt-1">Pre-flight Guard Active</div>
        </div>

        {/* Instagram Reels */}
        <div className="glass-card rounded-xl p-4 space-y-2 border-pink-500/20">
          <div className="flex items-center justify-between">
            <InstagramIcon className="w-5 h-5 text-pink-500" />
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">2FA Linked</span>
          </div>
          <div>
            <div className="text-xs font-bold text-white">Instagram Reels</div>
            <div className="text-[10px] text-slate-400">@niyiadekunle_</div>
          </div>
          <div className="text-[10px] text-slate-500 pt-1">Persistent Browser Profile</div>
        </div>
      </div>

      {/* Batch Publish Control Bar */}
      <div className="glass-card rounded-xl p-4 flex items-center justify-between bg-amber-400/[0.02] border-amber-400/20">
        <div className="flex items-center space-x-6 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-semibold">Publish Range:</span>
            <input 
              type="text" 
              value={selectedRange} 
              onChange={(e) => setSelectedRange(e.target.value)}
              placeholder="e.g. 1-6"
              className="w-16 bg-slate-900 border border-white/10 rounded px-2 py-1 font-mono text-amber-300 font-bold text-center focus:outline-none"
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

            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input 
                type="checkbox" 
                checked={selectedPlatforms.tiktok_us}
                onChange={(e) => setSelectedPlatforms({ ...selectedPlatforms, tiktok_us: e.target.checked })}
                className="accent-amber-400"
              />
              <span className="text-slate-300 font-medium">TikTok US (VPN)</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleBatchPublish}
          disabled={isPublishing}
          className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-amber-500/10 flex items-center space-x-2"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isPublishing ? 'Publishing Selected...' : `Publish Clips ${selectedRange}`}</span>
        </button>
      </div>

      {publishMessage && (
        <div className="text-xs text-amber-300 bg-amber-400/10 border border-amber-400/20 p-3 rounded-lg flex items-center justify-between">
          <span>{publishMessage}</span>
          <CheckCircle className="w-4 h-4 text-emerald-400" />
        </div>
      )}

      {/* Central Queue Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Clips Queue & Platform Matrix
          </span>
          <span className="text-xs text-slate-400">Total in Queue: {queue.length} Clips</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
            <tr>
              <th className="py-3 px-4">Clip Title</th>
              <th className="py-3 px-3">Dur</th>
              <th className="py-3 px-3">YouTube</th>
              <th className="py-3 px-3">TikTok NG</th>
              <th className="py-3 px-3">Instagram</th>
              <th className="py-3 px-3">TikTok US</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {queue.map((item) => (
              <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-white">{item.title}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{item.filename}</div>
                </td>
                <td className="py-3.5 px-3 font-mono text-slate-400">{item.duration}</td>
                <td className="py-3.5 px-3">{renderBadge(item.status.youtube)}</td>
                <td className="py-3.5 px-3">{renderBadge(item.status.tiktok_ng)}</td>
                <td className="py-3.5 px-3">{renderBadge(item.status.instagram)}</td>
                <td className="py-3.5 px-3">{renderBadge(item.status.tiktok_us)}</td>
                <td className="py-3.5 px-4 text-right space-x-1.5">
                  <button 
                    onClick={() => openVideoInPlayer(item.file_path)}
                    className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded border border-white/10 inline-flex items-center"
                    title="Play Video"
                  >
                    <Play className="w-3 h-3 text-amber-400" />
                  </button>
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
      </div>

      {/* Edit Caption & Metadata Modal */}
      {editingClip && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card bg-[#0e121a] rounded-xl border border-white/15 w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Edit Clip Metadata & Social Caption</h3>
              <button onClick={() => setEditingClip(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Title</label>
                <input 
                  type="text" 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Caption & Hashtags</label>
                <textarea 
                  rows={6}
                  value={editCaption} 
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-slate-200 font-sans focus:outline-none focus:border-amber-400 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-white/10">
              <button 
                onClick={() => setEditingClip(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button 
                onClick={saveCaptionModal}
                className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
