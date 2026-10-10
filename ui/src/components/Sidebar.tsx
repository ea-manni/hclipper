import React from 'react';
import { 
  Download, 
  Scissors, 
  ScanFace, 
  Subtitles, 
  Share2, 
  Terminal
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showLogs: boolean;
  setShowLogs: (show: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  showLogs, 
  setShowLogs 
}) => {
  const tabs = [
    { id: 'ingest', label: '1. Ingestion', icon: Download, description: 'YouTube / FB / Local' },
    { id: 'timeline', label: '2. Timeline & DSP', icon: Scissors, description: 'Waveform & Pauses' },
    { id: 'reframe', label: '3. AI Auto-Reframe', icon: ScanFace, description: '9:16 Face Tracker' },
    { id: 'subtitles', label: '4. Captions & Hook', icon: Subtitles, description: 'Karaoke & Banners' },
    { id: 'publisher', label: '5. Social Publisher', icon: Share2, description: 'YT, TikTok, IG Queue' },
  ];

  return (
    <aside className="w-60 border-r border-white/5 bg-[#0b0e16] flex flex-col justify-between py-4 select-none shrink-0">
      <div className="space-y-1 px-3">
        <div className="px-3 pb-2 text-[10px] uppercase font-bold tracking-wider text-slate-500">
          Studio Workflow
        </div>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-start space-x-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                isActive
                  ? 'bg-amber-400/10 text-amber-300 border border-amber-400/25 shadow-sm shadow-amber-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 mt-0.5 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
              <div>
                <div className="text-xs font-semibold">{tab.label}</div>
                <div className="text-[10px] text-slate-500">{tab.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom utilities */}
      <div className="px-3 pt-3 border-t border-white/5 space-y-1">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            showLogs 
              ? 'bg-white/10 text-white' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <span>Engine Live Logs</span>
        </button>
      </div>
    </aside>
  );
};
