import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Cpu, 
  Video, 
  Loader2, 
  Settings, 
  FolderOpen, 
  Folder,
  Plus,
  ChevronDown,
  X, 
  Check, 
  HardDrive
} from 'lucide-react';
import { useWorkflow } from '../context/WorkflowContext';
import { ProjectModal } from './ProjectModal';

interface HeaderProps {
  activeTab?: string;
}

export const Header: React.FC<HeaderProps> = () => {
  const { 
    reframeState, 
    ingestState, 
    settings, 
    updateSettings, 
    openDirectory, 
    addLog,
    projects,
    activeProjectId,
    activeProject,
    switchProject,
    showProjectModal,
    setShowProjectModal
  } = useWorkflow();

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [downloadsDir, setDownloadsDir] = useState(settings.downloadsDir);
  const [clipsDir, setClipsDir] = useState(settings.clipsDir);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePickDownloadsDir = async () => {
    if (window.hclipper?.selectDirectory) {
      const selected = await window.hclipper.selectDirectory({
        title: 'Choose Destination Folder for Video Downloads'
      });
      if (selected) {
        setDownloadsDir(selected);
      }
    }
  };

  const handlePickClipsDir = async () => {
    if (window.hclipper?.selectDirectory) {
      const selected = await window.hclipper.selectDirectory({
        title: 'Choose Destination Folder for Rendered Master Clips'
      });
      if (selected) {
        setClipsDir(selected);
      }
    }
  };

  const handleSaveSettings = async () => {
    await updateSettings({ downloadsDir, clipsDir });
    setSaveSuccess(true);
    addLog(`Updated storage paths: Downloads -> ${downloadsDir}, Clips -> ${clipsDir}`, 'success');
    setTimeout(() => {
      setSaveSuccess(false);
      setShowSettingsModal(false);
    }, 1200);
  };

  return (
    <header className="h-14 border-b border-white/5 bg-[#0d111a]/80 backdrop-blur-md px-5 flex items-center justify-between select-none relative z-30">
      {/* Brand & Project Switcher */}
      <div className="flex items-center space-x-4">
        {/* Brand */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Video className="w-4 h-4 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-extrabold tracking-tight text-white font-display">hclipper</span>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-400/20">
                v1.0 Studio
              </span>
            </div>
            <button
              onClick={() => window.hclipper?.openPath?.('https://github.com/ea-manni')}
              className="text-[10px] text-slate-400 hover:text-amber-300 transition-colors -mt-0.5 text-left block"
              title="A product of Daysman Solutions Limited (Open GitHub: @ea-manni)"
            >
              by Daysman Solutions Limited
            </button>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-white/10" />

        {/* Project Selector Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-amber-400/30 text-white transition-all shadow-sm group"
          >
            <div className="w-5 h-5 rounded-md bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
              <Folder className="w-3 h-3 text-amber-400" />
            </div>
            <div className="text-left max-w-[240px] truncate">
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold leading-none">
                Active Project
              </div>
              <div className="text-xs font-bold text-white truncate leading-tight mt-0.5">
                {activeProject?.name || 'Pastor David Ogbueli — Discover Destiny'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors shrink-0" />
          </button>

          {/* Project Switcher Menu */}
          {showProjectDropdown && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-[#0e121c] border border-white/15 rounded-xl shadow-2xl z-50 p-2 space-y-1 backdrop-blur-xl">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Switch Project</span>
                <span className="text-amber-400 font-mono">{projects.length} Total</span>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1">
                {projects.map((p) => {
                  const isSelected = p.id === activeProjectId;
                  const renderedCount = p.clips?.filter((c) => c.isRendered).length || 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        switchProject(p.id);
                        setShowProjectDropdown(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-amber-500/15 text-amber-300 font-bold border border-amber-400/20'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="truncate font-semibold">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {p.clips?.length || 0} scouted • {renderedCount} reframed
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center space-x-1.5">
                <button
                  onClick={() => {
                    setShowProjectDropdown(false);
                    setShowProjectModal(true);
                  }}
                  className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-semibold text-center"
                >
                  Manage All Projects...
                </button>
                <button
                  onClick={() => {
                    setShowProjectDropdown(false);
                    setShowProjectModal(true);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center space-x-1 shadow-sm"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Background Job Notification Bar */}
      {reframeState.isRendering && (
        <div className="flex items-center space-x-2.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full animate-pulse shadow-sm shadow-amber-500/10">
          <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span className="text-xs font-semibold text-amber-300">
            Rendering Short: {reframeState.renderProgress}%
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            (Intel QSV Native GPU)
          </span>
        </div>
      )}

      {ingestState.isDownloading && !reframeState.isRendering && (
        <div className="flex items-center space-x-2.5 px-3 py-1 bg-sky-500/10 border border-sky-500/30 rounded-full animate-pulse">
          <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
          <span className="text-xs font-semibold text-sky-300">
            Stream Ingesting: {ingestState.downloadProgress}%
          </span>
        </div>
      )}

      {/* Quick Action Folders & Hardware Status */}
      <div className="flex items-center space-x-2.5 text-xs">
        <button
          onClick={() => openDirectory(settings.clipsDir || 'clips')}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          title="Open Rendered Clips Folder in Windows Explorer"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium text-[11px]">Clips Folder</span>
        </button>

        <button
          onClick={() => {
            setDownloadsDir(settings.downloadsDir);
            setClipsDir(settings.clipsDir);
            setShowSettingsModal(true);
          }}
          className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          title="Storage & Application Preferences"
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-white/10 mx-1" />

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <Cpu className="w-3.5 h-3.5" />
          <span className="font-medium text-[11px]">Intel QSV</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="font-medium text-[11px]">YuNet ONNX</span>
        </div>
      </div>

      {/* Settings / Storage Preferences Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card bg-[#0e121c] border border-white/15 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                  <HardDrive className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Storage & Output Folders</h3>
                  <p className="text-[11px] text-slate-400">Configure where downloads and rendered clips are saved</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Downloads Folder */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Stream Downloads Directory</span>
                  <button
                    onClick={() => openDirectory(downloadsDir)}
                    className="text-amber-400 hover:underline text-[10px] lowercase"
                  >
                    reveal in explorer
                  </button>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={downloadsDir}
                    onChange={(e) => setDownloadsDir(e.target.value)}
                    className="flex-1 bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                  <button
                    onClick={handlePickDownloadsDir}
                    className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-lg text-xs"
                  >
                    Browse...
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Default: <code className="text-slate-400">%USERPROFILE%\Videos\hclipper\downloads</code>
                </p>
              </div>

              {/* Clips Folder */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Rendered Master Shorts Directory</span>
                  <button
                    onClick={() => openDirectory(clipsDir)}
                    className="text-amber-400 hover:underline text-[10px] lowercase"
                  >
                    reveal in explorer
                  </button>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={clipsDir}
                    onChange={(e) => setClipsDir(e.target.value)}
                    className="flex-1 bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                  <button
                    onClick={handlePickClipsDir}
                    className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-lg text-xs"
                  >
                    Browse...
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Default: <code className="text-slate-400">%USERPROFILE%\Videos\hclipper\clips</code>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              {saveSuccess ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Preferences saved successfully!</span>
                </span>
              ) : <div />}

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-amber-500/20"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Management Modal */}
      <ProjectModal 
        isOpen={showProjectModal} 
        onClose={() => setShowProjectModal(false)} 
      />
    </header>
  );
};
