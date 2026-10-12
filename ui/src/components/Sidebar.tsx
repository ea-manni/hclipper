import React from 'react';
import { 
  Download, 
  Scissors, 
  ScanFace, 
  Subtitles, 
  Share2, 
  Terminal,
  Loader2,
  CheckCircle2,
  Folder,
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useWorkflow } from '../context/WorkflowContext';

interface SidebarProps {
  showLogs: boolean;
  setShowLogs: (show: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  showLogs, 
  setShowLogs 
}) => {
  const { 
    activeTab, 
    setActiveTab, 
    sourceVideo, 
    reframeState, 
    ingestState,
    clips,
    activeProject
  } = useWorkflow();

  const renderedCount = clips?.filter((c) => c.isRendered).length || 0;

  const projectWorkflowSteps = [
    { 
      id: 'ingest', 
      label: '1. Ingestion', 
      icon: Download, 
      description: 'YouTube / FB / Local',
      status: ingestState.isDownloading ? (
        <span className="flex items-center space-x-1 text-[9px] font-bold text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded border border-sky-400/20 animate-pulse">
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          <span>{ingestState.downloadProgress}%</span>
        </span>
      ) : sourceVideo ? (
        <span className="flex items-center space-x-1 text-[9px] font-semibold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
          <CheckCircle2 className="w-2.5 h-2.5" />
          <span>Loaded</span>
        </span>
      ) : null
    },
    { 
      id: 'scout', 
      label: '2. AI Clip Scout', 
      icon: Scissors, 
      description: 'Discover Viral Moments',
      status: clips.length > 0 ? (
        <span className="text-[9px] font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
          {clips.length} clips
        </span>
      ) : null
    },
    { 
      id: 'timeline', 
      label: '3. Timeline & Audio', 
      icon: Scissors, 
      description: 'Waveform & Vocal DSP',
      status: null
    },
    { 
      id: 'reframe', 
      label: '4. AI Auto-Reframe', 
      icon: ScanFace, 
      description: '9:16 Face Tracker',
      status: reframeState.isRendering ? (
        <span className="flex items-center space-x-1 text-[9px] font-bold text-amber-400 bg-amber-400/15 px-1.5 py-0.5 rounded border border-amber-400/30 animate-pulse">
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          <span>{reframeState.renderProgress}%</span>
        </span>
      ) : renderedCount > 0 ? (
        <span className="flex items-center space-x-1 text-[9px] font-semibold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
          <CheckCircle2 className="w-2.5 h-2.5" />
          <span>{renderedCount} Ready</span>
        </span>
      ) : null
    },
    { 
      id: 'subtitles', 
      label: '5. Captions & Hook', 
      icon: Subtitles, 
      description: 'Headlines & TikTok Styles',
      status: null
    }
  ];

  return (
    <aside className="w-64 border-r border-white/5 bg-[#0b0e16] flex flex-col justify-between py-4 select-none shrink-0 overflow-y-auto">
      <div className="space-y-4 px-3">
        {/* Active Project Card */}
        <div 
          onClick={() => setActiveTab('projects')}
          className="p-2.5 rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-amber-400/30 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 flex items-center space-x-1.5">
              <Folder className="w-3 h-3 text-amber-400" />
              <span>Project Scope</span>
            </span>
            <span className="text-[10px] text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center">
              <span>manage</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="text-xs font-bold text-white truncate mt-1">
            {activeProject?.name || 'Pastor David Ogbueli'}
          </div>
          <div className="flex items-center space-x-2 mt-1.5 text-[10px] text-slate-400">
            <span className="text-emerald-400 font-semibold">{renderedCount} rendered</span>
            <span>•</span>
            <span>{clips.length} scouted</span>
          </div>
        </div>

        {/* Section 1: Embedded Project Workflow */}
        <div className="space-y-1">
          <div className="px-3 pb-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center justify-between">
            <span>Project Workflow</span>
            <span className="text-[9px] text-slate-600 font-mono">1–5</span>
          </div>

          {projectWorkflowSteps.map((step) => {
            const Icon = step.icon;
            const isActive = activeTab === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveTab(step.id)}
                className={`w-full flex items-start justify-between px-3 py-2 rounded-lg text-left transition-all ${
                  isActive
                    ? 'bg-amber-400/10 text-amber-300 border border-amber-400/25 shadow-sm shadow-amber-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-start space-x-2.5 min-w-0">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                  <div className="truncate">
                    <div className="text-xs font-semibold truncate">{step.label}</div>
                    <div className="text-[10px] text-slate-500 truncate">{step.description}</div>
                  </div>
                </div>
                {step.status && (
                  <div className="ml-1 shrink-0 self-center">
                    {step.status}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-white/5 mx-2" />

        {/* Section 2: Holistic Multi-Project Command Center */}
        <div className="space-y-1">
          <div className="px-3 pb-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center justify-between">
            <span>Cross-Project Hub</span>
            <span className="text-[9px] text-sky-400 font-mono">Holistic</span>
          </div>

          {/* Step 6: Holistic Social Publisher */}
          <button
            onClick={() => setActiveTab('publisher')}
            className={`w-full flex items-start justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
              activeTab === 'publisher'
                ? 'bg-sky-500/15 text-sky-300 border border-sky-400/30 shadow-sm shadow-sky-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-start space-x-2.5 min-w-0">
              <Share2 className={`w-4 h-4 mt-0.5 shrink-0 ${activeTab === 'publisher' ? 'text-sky-400' : 'text-slate-500'}`} />
              <div className="truncate">
                <div className="text-xs font-bold truncate">6. Social Publisher</div>
                <div className="text-[10px] text-slate-400 truncate">All Projects Master Hub</div>
              </div>
            </div>
            <span className="text-[9px] font-bold text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded border border-sky-400/20 shrink-0 self-center">
              Unified
            </span>
          </button>

          {/* Manage All Projects Button */}
          <button
            onClick={() => setActiveTab('projects')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
              activeTab === 'projects'
                ? 'bg-amber-400/15 text-amber-300 font-bold border border-amber-400/20 shadow-sm shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <Layers className={`w-4 h-4 ${activeTab === 'projects' ? 'text-amber-400' : 'text-slate-500'}`} />
            <span className="font-medium text-xs">Projects Manager</span>
          </button>
        </div>
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

        {/* Daysman Solutions Limited Open-Source Attribution & Hire Link */}
        <div className="pt-2 px-1 text-[10px] text-slate-500 border-t border-white/5 space-y-1 mt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300">Daysman Solutions</span>
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded font-bold">
              MIT OSS
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Product of <strong className="text-white">Daysman Solutions Limited</strong>
          </p>
          <button
            onClick={() => {
              if (window.hclipper?.openPath) {
                window.hclipper.openPath('https://github.com/ea-manni');
              }
            }}
            className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/20 transition-all font-semibold text-[10px] group mt-1"
            title="Open Developer GitHub Profile (Available for Hire)"
          >
            <span>GitHub: @ea-manni</span>
            <ExternalLink className="w-2.5 h-2.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </aside>
  );
};
