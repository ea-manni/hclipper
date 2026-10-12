import React, { useState } from 'react';
import { 
  Folder, 
  Plus, 
  Film, 
  Layers, 
  Trash2, 
  Copy, 
  Calendar, 
  ArrowRight, 
  Upload, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useWorkflow } from '../context/WorkflowContext';

export const ProjectsView: React.FC = () => {
  const { 
    projects, 
    activeProjectId, 
    switchProject, 
    createProject, 
    deleteProject, 
    duplicateProject,
    setActiveTab 
  } = useWorkflow();

  const [newProjectName, setNewProjectName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceVideo, setNewSourceVideo] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showCreateCard, setShowCreateCard] = useState<boolean>(false);

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

  const handleCreateAndOpen = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = newProjectName.trim() || `New Project ${projects.length + 1}`;
    createProject(finalName, newSourceVideo.trim(), newSourceUrl.trim());
    setNewProjectName('');
    setNewSourceUrl('');
    setNewSourceVideo('');
    setShowCreateCard(false);
    setActiveTab('ingest');
  };

  const handleOpenWorkspace = (projectId: string) => {
    switchProject(projectId);
    setActiveTab('ingest');
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-7 animate-in fade-in duration-150">
      {/* View Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Folder className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-display text-white tracking-tight">
                Studio Projects & Workspaces
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage your long-form sermon and podcast video repurposing workspaces ({projects.length} Total)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => handleCreateAndOpen()}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Quick Blank Project</span>
          </button>

          <button
            onClick={() => setShowCreateCard(!showCreateCard)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{showCreateCard ? 'Hide Form' : 'New Custom Project'}</span>
          </button>
        </div>
      </div>

      {/* Creation Card (Expandable) */}
      {showCreateCard && (
        <form onSubmit={handleCreateAndOpen} className="glass-card rounded-2xl p-6 border-amber-400/30 space-y-4 bg-[#0e121c]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Create New Project Workspace
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateCard(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Project Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Sunday Service — The Anointing"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                autoFocus
              />
            </div>

            <div className="col-span-12 md:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                YouTube URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={newSourceUrl}
                onChange={(e) => setNewSourceUrl(e.target.value)}
                className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            <div className="col-span-12 md:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Local Video File (Optional)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="C:/Videos/sermon.mp4"
                  value={newSourceVideo}
                  onChange={(e) => setNewSourceVideo(e.target.value)}
                  className="flex-1 bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
                <button
                  type="button"
                  onClick={handlePickLocalFile}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center space-x-1"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Browse...</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20"
            >
              Create & Launch Workspace
            </button>
          </div>
        </form>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((proj) => {
          const isActive = proj.id === activeProjectId;
          const renderedCount = proj.clips?.filter((c) => c.isRendered).length || 0;
          const totalClips = proj.clips?.length || 0;

          return (
            <div
              key={proj.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                isActive
                  ? 'bg-amber-500/[0.08] border-amber-500/40 shadow-xl shadow-amber-500/5 ring-1 ring-amber-400/20'
                  : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-white/5 text-slate-400'
                    }`}>
                      <Folder className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{proj.name}</h3>
                      <div className="flex items-center space-x-2 mt-0.5">
                        {isActive && (
                          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            Active Workspace
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>{new Date(proj.updatedAt || proj.createdAt).toLocaleDateString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => duplicateProject(proj.id)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="Duplicate Workspace"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {projects.length > 1 && (
                      confirmDeleteId === proj.id ? (
                        <div className="flex items-center space-x-1 bg-red-950/60 p-1 rounded-lg border border-red-500/40">
                          <span className="text-[9px] text-red-300 font-bold px-1">Delete?</span>
                          <button
                            onClick={() => {
                              deleteProject(proj.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-1.5 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[9px] font-bold"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[9px]"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(proj.id)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete Workspace"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </div>

                {proj.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {proj.description}
                  </p>
                )}

                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 space-y-1.5 text-[11px] text-slate-300">
                  <div className="flex items-center space-x-2 truncate">
                    <Film className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-slate-400">Media:</span>
                    <span className="font-mono text-white truncate">
                      {proj.sourceVideo ? proj.sourceVideo.split(/\\|\//).pop() : 'No source video attached yet'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                    <span className="flex items-center space-x-1 text-sky-400">
                      <Layers className="w-3 h-3" />
                      <span>{totalClips} Clips Scouted</span>
                    </span>
                    <span className="flex items-center space-x-1 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{renderedCount} Rendered Master Shorts</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  ID: {proj.id.slice(0, 14)}
                </span>

                <button
                  onClick={() => handleOpenWorkspace(proj.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md transition-all active:scale-95 ${
                    isActive
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20'
                      : 'bg-white/10 hover:bg-white/15 text-white'
                  }`}
                >
                  <span>{isActive ? 'Continue in Workspace' : 'Switch & Open'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
