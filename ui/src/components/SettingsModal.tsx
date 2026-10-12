import React, { useState, useEffect } from 'react';
import { HardDrive, X, Check } from 'lucide-react';
import { useWorkflow } from '../context/WorkflowContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, openDirectory, addLog } = useWorkflow();
  const [downloadsDir, setDownloadsDir] = useState(settings.downloadsDir);
  const [clipsDir, setClipsDir] = useState(settings.clipsDir);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDownloadsDir(settings.downloadsDir);
      setClipsDir(settings.clipsDir);
      setSaveSuccess(false);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

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
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card bg-[#0e121c] border border-white/15 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
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
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
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
                type="button"
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
                type="button"
                onClick={handlePickDownloadsDir}
                className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-lg text-xs transition-colors"
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
                type="button"
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
                type="button"
                onClick={handlePickClipsDir}
                className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-lg text-xs transition-colors"
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
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-amber-500/20 transition-all"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
