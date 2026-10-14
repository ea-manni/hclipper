import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  Plus, 
  Film, 
  Trash2, 
  Copy, 
  Check, 
  X, 
  Calendar, 
  Layers, 
  Upload,
  ArrowRight
} from 'lucide-react';
import { useWorkflow } from '../context/WorkflowContext';

interface ProjectModalProps {
  isOpen: boolean;
  initialTab?: 'list' | 'create';
  onClose: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, initialTab = 'list', onClose }) => {
  const { 
    projects, 
    activeProjectId, 
    switchProject, 
    createProject, 
    deleteProject, 
    duplicateProject,
    setActiveTab
  } = useWorkflow();

  const [activeTab, setModalTab] = useState<'list' | 'create'>(initialTab);
  const [newProjectName, setNewProjectName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceVideo, setNewSourceVideo] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sync tab when opening
  useEffect(() => {
    if (isOpen) {
      setModalTab(initialTab || 'list');
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handlePickLocalFile = async () => {
    if (window.hclipper?.selectFile) {
      const selected = await window.hclipper.selectFile({
        title: 'Select Source Video File for New Project'
      });
      if (selected) {
        setNewSourceVideo(selected);
        if (!newProjectName) {
          const filename = selected.split(/\\|\//).pop()?.replace(/\.[^/.]+$/, '') || 'New Video Project';
          setNewProjectName(filename);
        }
      }
    }
  };

  const handleCreateNew = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = newProjectName.trim() || `New Project ${projects.length + 1}`;

    createProject(finalName, newSourceVideo.trim(), newSourceUrl.trim());
    setNewProjectName('');
    setNewSourceUrl('');
    setNewSourceVideo('');
    setModalTab('list');
    setActiveTab('ingest');
    onClose();
  };

  const handleSelectAndClose = (id: string) => {
    switchProject(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card bg-[#0e121c] border border-white/15 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Folder className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Studio Projects</h2>
              <p className="text-xs text-slate-400">
                Organize videos, clips, and reframes into independent workspaces
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-white/5 p-0.5 rounded-lg border border-white/10 flex">
              <button
                onClick={() => setModalTab('list')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'list' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Projects ({projects.length})
              </button>
              <button
                onClick={() => setModalTab('create')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition-all ${
                  activeTab === 'create' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Project</span>
              </button>
            </div>

            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {activeTab === 'list' ? (
          projects.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shadow-md">
                <Folder className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">No Workspaces Found</h4>
                <p className="text-xs text-slate-400 mt-0.5">Create a new workspace to organize your videos and clips.</p>
              </div>
              <button
                onClick={() => setModalTab('create')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create New Project</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
              {projects.map((proj) => {
                const isActive = proj.id === activeProjectId;
                const renderedCount = proj.clips?.filter((c) => c.isRendered).length || 0;
                const totalCount = proj.clips?.length || 0;

                return (
                  <div
                    key={proj.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isActive 
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5' 
                        : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2.5">
                          <Folder className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                          <h3 className="text-sm font-bold text-white truncate">{proj.name}</h3>
                          {isActive && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              Active Project
                            </span>
                          )}
                        </div>

                        {proj.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{proj.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[11px] text-slate-400">
                          <span className="flex items-center space-x-1 font-mono text-slate-300">
                            <Film className="w-3.5 h-3.5 text-amber-400" />
                            <span className="truncate max-w-[220px]">
                              {proj.sourceVideo ? proj.sourceVideo.split(/\\|\//).pop() : 'No source video yet'}
                            </span>
                          </span>

                          <span className="flex items-center space-x-1">
                            <Layers className="w-3.5 h-3.5 text-sky-400" />
                            <span>{totalCount} clips scouted ({renderedCount} rendered)</span>
                          </span>

                          <span className="flex items-center space-x-1 text-slate-500">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(proj.updatedAt || proj.createdAt).toLocaleDateString()}</span>
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-1.5 shrink-0">
                        {!isActive ? (
                          <button
                            onClick={() => handleSelectAndClose(proj.id)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1 shadow-md shadow-amber-500/20 transition-transform active:scale-95"
                          >
                            <span>Switch to Project</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={onClose}
                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center space-x-1"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Working Now</span>
                          </button>
                        )}

                        <button
                          onClick={() => duplicateProject(proj.id)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                          title="Duplicate Project"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {confirmDeleteId === proj.id ? (
                          <div className="flex items-center space-x-1 bg-red-950/60 p-1 rounded-lg border border-red-500/40">
                            <span className="text-[10px] text-red-300 font-bold px-1">Delete?</span>
                            <button
                              onClick={() => {
                                deleteProject(proj.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-1.5 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(proj.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete Project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Create New Project Form */
          <form onSubmit={handleCreateNew} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Project Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sunday Service — The Anointing & Purpose"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Source Video Option 1: YouTube URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={newSourceUrl}
                onChange={(e) => setNewSourceUrl(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono text-xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                hclipper will ingest this link inside Step 1 using local yt-dlp.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Source Video Option 2: Local Video File (Optional)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="C:/Videos/sermon_master.mp4"
                  value={newSourceVideo}
                  onChange={(e) => setNewSourceVideo(e.target.value)}
                  className="flex-1 bg-slate-900/90 border border-white/15 rounded-xl px-4 py-2 text-xs text-white font-mono"
                />
                <button
                  type="button"
                  onClick={handlePickLocalFile}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center space-x-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Browse...</span>
                </button>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200/90 flex items-start space-x-2.5 mt-2">
              <Folder className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Each project embeds its own <strong>Steps 1 through 5</strong> (Ingestion, AI Scout, Timeline/DSP, Auto-Reframe, and Captions). You can switch between projects anytime, and all rendered clips feed into the holistic Social Publisher.
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => handleCreateNew()}
                className="px-3.5 py-2 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Quick Blank Project</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setModalTab('list')}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center space-x-1.5 transition-transform active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create & Launch Project</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
