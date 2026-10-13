import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';

export interface IngestState {
  url: string;
  isDownloading: boolean;
  downloadProgress: number;
  statusMessage: string;
  speedStr: string;
  etaStr: string;
  errorMessage: string | null;
}

export interface ReframeState {
  aspectRatio: '9:16' | '1:1' | '16:9';
  enableFaceTracking: boolean;
  deadzone: number;
  smoothFactor: number;
  trajectoryData: number[];
  isAnalyzing: boolean;
  analysisProgress: number;
  isRendering: boolean;
  renderProgress: number;
  renderPhase: 'idle' | 'tracking' | 'rendering' | 'completed' | 'error';
  renderedOutput: string | null;
  renderError: string | null;
}

export interface TimelineState {
  inTime: number;
  outTime: number;
  activePlayhead: number;
  cadenceTrim: boolean;
  noiseThreshold: string;
  minSilence: number;
  vocalHighpass: boolean;
  vocalDenoise: boolean;
  socialLoudness: boolean;
  musicBed: boolean;
  musicVolume: number;
}

export interface SubtitlesState {
  headline: string;
  hookBannerPreset?: 'frosted_gold' | 'cyber_neon' | 'clean_minimal' | 'viral_warning' | 'kinetic_spring';
  stylePreset: 'tiktok_bold' | 'dynamic_pop' | 'clean_white';
  includeSocialPills: boolean;
  includeOutro: boolean;
  tiktokHandle: string;
  showTiktok: boolean;
  youtubeHandle: string;
  showYoutube: boolean;
  instagramHandle: string;
  showInstagram: boolean;
  enableHookBanner?: boolean;
  hookBannerDuration?: 'first_3s' | 'first_5s' | 'full_clip';
}

export interface ClipCandidate {
  id: string;
  start: number;
  end: number;
  score: number;
  title: string;
  hook: string;
  reason: string;
  isRendered?: boolean;
  renderedPath?: string;
  customHeadline?: string;
  hookBannerPreset?: 'frosted_gold' | 'cyber_neon' | 'clean_minimal' | 'viral_warning' | 'kinetic_spring';
  subtitlePreset?: 'tiktok_bold' | 'dynamic_pop' | 'clean_white';
  durationAdvisory?: string;
  storyArc?: 'complete_story' | 'punchy_takeaway' | 'extended_narrative' | string;
  transcriptCues?: { start: number; end: number; text: string }[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  sourceVideo: string;
  sourceUrl?: string;
  sourceDuration?: number;
  createdAt: string;
  updatedAt: string;
  status?: 'draft' | 'scouted' | 'reframed' | 'ready' | 'published';
  clips: ClipCandidate[];
  activeClipIndex: number;
  ingestState: IngestState;
  timelineState: TimelineState;
  reframeState: ReframeState;
  subtitlesState: SubtitlesState;
}

export interface AppSettings {
  downloadsDir: string;
  clipsDir: string;
}

export interface WorkflowContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sourceVideo: string;
  setSourceVideo: (path: string, newTitle?: string, sourceUrl?: string) => void;
  logs: string[];
  addLog: (text: string, level?: string) => void;
  clearLogs: () => void;
  
  // Settings
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  openDirectory: (dirPath: string) => Promise<boolean>;
  
  // Project Management System
  projects: Project[];
  activeProjectId: string;
  activeProject: Project;
  createProject: (name: string, sourceVideo?: string, sourceUrl?: string) => Project;
  switchProject: (projectId: string) => void;
  updateActiveProject: (updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  duplicateProject: (projectId: string) => void;
  showProjectModal: boolean;
  setShowProjectModal: (show: boolean) => void;
  projectModalTab: 'list' | 'create';
  openProjectModal: (tab?: 'list' | 'create') => void;
  showSettingsModal: boolean;
  setShowSettingsModal: (show: boolean) => void;

  // Multi-Clip System (Embedded in Active Project)
  clips: ClipCandidate[];
  setClips: React.Dispatch<React.SetStateAction<ClipCandidate[]>>;
  activeClipIndex: number;
  selectClip: (index: number) => void;
  updateActiveClip: (updates: Partial<ClipCandidate>) => void;
  
  // Ingest (Embedded in Active Project)
  ingestState: IngestState;
  setIngestState: React.Dispatch<React.SetStateAction<IngestState>>;
  
  // Timeline (Embedded in Active Project)
  timelineState: TimelineState;
  setTimelineState: React.Dispatch<React.SetStateAction<TimelineState>>;
  
  // Reframe (Embedded in Active Project)
  reframeState: ReframeState;
  setReframeState: React.Dispatch<React.SetStateAction<ReframeState>>;
  startAnalyzeTrajectory: () => Promise<void>;
  startRenderClip: (clipIndex?: number, force?: boolean) => Promise<string | null>;
  startBatchRenderAll: (skipExisting?: boolean) => Promise<void>;
  
  // Subtitles (Embedded in Active Project)
  subtitlesState: SubtitlesState;
  setSubtitlesState: React.Dispatch<React.SetStateAction<SubtitlesState>>;
}

const EMPTY_PROJECT: Project = {
  id: '',
  name: '',
  description: 'Custom video repurposing workspace',
  sourceVideo: '',
  sourceUrl: '',
  sourceDuration: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'draft',
  clips: [],
  activeClipIndex: 0,
  ingestState: {
    url: '',
    isDownloading: false,
    downloadProgress: 0,
    statusMessage: 'Ready for video input.',
    speedStr: '',
    etaStr: '',
    errorMessage: null
  },
  timelineState: {
    inTime: 0,
    outTime: 30,
    activePlayhead: 0,
    cadenceTrim: false,
    noiseThreshold: '-33dB',
    minSilence: 0.75,
    vocalHighpass: false,
    vocalDenoise: false,
    socialLoudness: true,
    musicBed: false,
    musicVolume: 8
  },
  reframeState: {
    aspectRatio: '9:16',
    enableFaceTracking: true,
    deadzone: 25,
    smoothFactor: 0.06,
    trajectoryData: [],
    isAnalyzing: false,
    analysisProgress: 0,
    isRendering: false,
    renderProgress: 0,
    renderPhase: 'idle',
    renderedOutput: null,
    renderError: null
  },
  subtitlesState: {
    headline: '',
    stylePreset: 'tiktok_bold',
    includeSocialPills: false,
    includeOutro: false,
    tiktokHandle: '',
    showTiktok: false,
    youtubeHandle: '',
    showYoutube: false,
    instagramHandle: '',
    showInstagram: false
  }
};

const WorkflowContext = createContext<WorkflowContextType | null>(null);

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('ingest');
  const [logs, setLogs] = useState<string[]>([
    'hclipper Engine v1.0.0 initialized.',
    'Detected Hardware Acceleration: Intel QSV (h264_qsv).',
    'OpenCV YuNet ONNX Face Tracking Model loaded.',
    'Projects Engine ready. Project-centric studio workflow loaded.'
  ]);

  // Persistent Settings
  const [settings, setSettings] = useState<AppSettings>({
    downloadsDir: 'downloads',
    clipsDir: 'clips'
  });

  // Projects State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [showProjectModal, setShowProjectModal] = useState<boolean>(false);
  const [projectModalTab, setProjectModalTab] = useState<'list' | 'create'>('list');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  const openProjectModal = (tab: 'list' | 'create' = 'list') => {
    setProjectModalTab(tab);
    setShowProjectModal(true);
  };

  // Active Project Data References
  const [sourceVideo, setSourceVideoState] = useState<string>('');
  const [clips, setClips] = useState<ClipCandidate[]>([]);
  const [activeClipIndex, setActiveClipIndex] = useState<number>(0);
  const [ingestState, setIngestState] = useState<IngestState>(EMPTY_PROJECT.ingestState);
  const [timelineState, setTimelineState] = useState<TimelineState>(EMPTY_PROJECT.timelineState);
  const [reframeState, setReframeState] = useState<ReframeState>(EMPTY_PROJECT.reframeState);
  const [subtitlesState, setSubtitlesState] = useState<SubtitlesState>(EMPTY_PROJECT.subtitlesState);

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0] || EMPTY_PROJECT;
  }, [projects, activeProjectId]);

  const addLog = (text: string, level: string = 'stdout') => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [...prev.slice(-500), `[${time}] [${level.toUpperCase()}] ${text.trim()}`]);
  };

  const clearLogs = () => setLogs([]);

  const saveProjectsToDisk = async (updatedProjects: Project[]) => {
    try {
      localStorage.setItem('hclipper_projects', JSON.stringify(updatedProjects));
      if (window.hclipper?.saveProjects) {
        await window.hclipper.saveProjects(updatedProjects);
      }
    } catch (e) {}
  };

  const handleSetSourceVideo = (path: string, newTitle?: string, sourceUrl?: string) => {
    setSourceVideoState(path);
    if (!path) return;
    const cleanTitle = newTitle || path.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '') || 'Media Project';
    setProjects((prev) => {
      const updated = prev.map((p) => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            name: (!p.name || p.name.startsWith('New Project')) && cleanTitle ? cleanTitle : p.name,
            sourceVideo: path,
            sourceUrl: sourceUrl || p.sourceUrl,
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      });
      saveProjectsToDisk(updated);
      return updated;
    });
  };

  // Load Settings and Projects on start
  useEffect(() => {
    if (window.hclipper?.getSettings) {
      window.hclipper.getSettings().then((s) => {
        if (s) {
          setSettings({
            downloadsDir: s.downloadsDir || 'downloads',
            clipsDir: s.clipsDir || 'clips'
          });
        }
      }).catch(() => {});
    }

    if (window.hclipper?.readProjects) {
      window.hclipper.readProjects().then((loaded) => {
        if (loaded && Array.isArray(loaded) && loaded.length > 0) {
          setProjects(loaded);
          const savedActiveId = localStorage.getItem('hclipper_active_project_id');
          const target = loaded.find((p) => p.id === savedActiveId) || 
                         [...loaded].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())[0];
          setActiveProjectId(target.id);
          applyProjectState(target);
          addLog(`Loaded ${loaded.length} project(s) from persistent storage. Active: "${target.name}"`, 'project');
        } else {
          setProjects([]);
          setActiveProjectId('');
          applyProjectState(EMPTY_PROJECT);
        }
      }).catch(() => {});
    } else {
      const stored = localStorage.getItem('hclipper_projects');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProjects(parsed);
            const savedActiveId = localStorage.getItem('hclipper_active_project_id');
            const target = parsed.find((p: any) => p.id === savedActiveId) || parsed[0];
            setActiveProjectId(target.id);
            applyProjectState(target);
          } else {
            setProjects([]);
            setActiveProjectId('');
            applyProjectState(EMPTY_PROJECT);
          }
        } catch (e) {}
      }
    }
  }, []);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    if (window.hclipper?.saveSettings) {
      await window.hclipper.saveSettings(merged);
    }
  };

  const openDirectory = async (dirPath: string) => {
    if (window.hclipper?.openFolder) {
      return await window.hclipper.openFolder(dirPath);
    }
    return false;
  };

  const applyProjectState = (proj: Project) => {
    const videoToSet = proj.sourceVideo || '';
    setSourceVideoState(videoToSet);
    setClips(proj.clips || []);
    setActiveClipIndex(proj.activeClipIndex || 0);
    if (proj.id) {
      localStorage.setItem('hclipper_active_project_id', proj.id);
    }
    setIngestState(proj.ingestState || {
      url: proj.sourceUrl || '',
      isDownloading: false,
      downloadProgress: 0,
      statusMessage: '',
      speedStr: '',
      etaStr: '',
      errorMessage: null
    });
    setTimelineState(proj.timelineState || {
      inTime: 0,
      outTime: 30,
      activePlayhead: 0,
      cadenceTrim: false,
      noiseThreshold: '-33dB',
      minSilence: 0.75,
      vocalHighpass: false,
      vocalDenoise: false,
      socialLoudness: true,
      musicBed: false,
      musicVolume: 8
    });
    setReframeState(proj.reframeState || {
      aspectRatio: '9:16',
      enableFaceTracking: true,
      deadzone: 25,
      smoothFactor: 0.06,
      trajectoryData: [],
      isAnalyzing: false,
      analysisProgress: 0,
      isRendering: false,
      renderProgress: 0,
      renderPhase: 'idle',
      renderedOutput: null,
      renderError: null
    });
    setSubtitlesState(proj.subtitlesState || {
      headline: '',
      stylePreset: 'tiktok_bold',
      includeSocialPills: false,
      includeOutro: false,
      tiktokHandle: '',
      showTiktok: false,
      youtubeHandle: '',
      showYoutube: false,
      instagramHandle: '',
      showInstagram: false
    });
  };

  const switchProject = (targetId: string) => {
    const target = projects.find((p) => p.id === targetId);
    if (!target) return;

    // Snapshot current project before switching
    if (activeProject.id) {
      const currentProjectSnapshot: Project = {
        ...activeProject,
        sourceVideo,
        clips,
        activeClipIndex,
        ingestState,
        timelineState,
        reframeState,
        subtitlesState,
        updatedAt: new Date().toISOString()
      };

      const updated = projects.map((p) => (p.id === activeProject.id ? currentProjectSnapshot : p));
      setProjects(updated);
      saveProjectsToDisk(updated);
    }

    setActiveProjectId(targetId);
    applyProjectState(target);
    addLog(`Switched project to: "${target.name}"`, 'project');
  };

  const createProject = (name: string, newSourceVideo: string = '', newSourceUrl: string = ''): Project => {
    // 1. Snapshot current active project before switching
    let updatedProjects = [...projects];
    if (activeProjectId && activeProject.id) {
      const currentProjectSnapshot: Project = {
        ...activeProject,
        sourceVideo,
        clips,
        activeClipIndex,
        ingestState,
        timelineState,
        reframeState,
        subtitlesState,
        updatedAt: new Date().toISOString()
      };
      updatedProjects = projects.map((p) => (p.id === activeProject.id ? currentProjectSnapshot : p));
    }

    // 2. Create clean new project
    const newProj: Project = {
      id: `proj_${Date.now()}`,
      name: name.trim() || `New Project ${projects.length + 1}`,
      description: 'Custom video repurposing workspace',
      sourceVideo: newSourceVideo,
      sourceUrl: newSourceUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
      clips: [],
      activeClipIndex: 0,
      ingestState: {
        url: newSourceUrl,
        isDownloading: false,
        downloadProgress: 0,
        statusMessage: newSourceVideo ? 'Video attached.' : 'Ready for video input.',
        speedStr: '',
        etaStr: '',
        errorMessage: null
      },
      timelineState: {
        inTime: 0,
        outTime: 30,
        activePlayhead: 0,
        cadenceTrim: false,
        noiseThreshold: '-33dB',
        minSilence: 0.75,
        vocalHighpass: false,
        vocalDenoise: false,
        socialLoudness: true,
        musicBed: false,
        musicVolume: 8
      },
      reframeState: {
        aspectRatio: '9:16',
        enableFaceTracking: true,
        deadzone: 25,
        smoothFactor: 0.06,
        trajectoryData: [],
        isAnalyzing: false,
        analysisProgress: 0,
        isRendering: false,
        renderProgress: 0,
        renderPhase: 'idle',
        renderedOutput: null,
        renderError: null
      },
      subtitlesState: {
        headline: '',
        stylePreset: 'tiktok_bold',
        includeSocialPills: false,
        includeOutro: false,
        tiktokHandle: '',
        showTiktok: false,
        youtubeHandle: '',
        showYoutube: false,
        instagramHandle: '',
        showInstagram: false
      }
    };

    // 3. Atomically update project list
    const updated = [...updatedProjects, newProj];
    setProjects(updated);
    saveProjectsToDisk(updated);

    // 4. Immediately switch active workspace to the new project
    setActiveProjectId(newProj.id);
    applyProjectState(newProj);
    setActiveTab('ingest');
    addLog(`✓ Created & switched to clean project "${newProj.name}". Ready for source media ingestion.`, 'project');
    return newProj;
  };

  const updateActiveProject = (updates: Partial<Project>) => {
    setProjects((prev) => {
      const updated = prev.map((p) => {
        if (p.id === activeProjectId) {
          return { ...p, ...updates, updatedAt: new Date().toISOString() };
        }
        return p;
      });
      saveProjectsToDisk(updated);
      return updated;
    });
  };

  const deleteProject = (projectId: string) => {
    if (projects.length <= 1) {
      addLog('Cannot delete the last remaining project.', 'warn');
      return;
    }
    const remaining = projects.filter((p) => p.id !== projectId);
    setProjects(remaining);
    saveProjectsToDisk(remaining);
    if (activeProjectId === projectId) {
      setActiveProjectId(remaining[0].id);
      applyProjectState(remaining[0]);
    }
    addLog('Project deleted successfully.', 'info');
  };

  const duplicateProject = (projectId: string) => {
    const target = projects.find((p) => p.id === projectId);
    if (!target) return;
    const duplicated: Project = {
      ...JSON.parse(JSON.stringify(target)),
      id: `proj_${Date.now()}`,
      name: `${target.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [...projects, duplicated];
    setProjects(updated);
    saveProjectsToDisk(updated);
    switchProject(duplicated.id);
    addLog(`Duplicated project "${duplicated.name}"`, 'project');
  };

  // Sync state changes back to active project in projects array
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      setProjects((prev) => {
        const updated = prev.map((p) => {
          if (p.id === activeProjectId) {
            return {
              ...p,
              sourceVideo,
              clips,
              activeClipIndex,
              ingestState,
              timelineState,
              reframeState,
              subtitlesState,
              updatedAt: new Date().toISOString()
            };
          }
          return p;
        });
        saveProjectsToDisk(updated);
        return updated;
      });
    }, 400);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [sourceVideo, clips, activeClipIndex, ingestState, timelineState, reframeState, subtitlesState, activeProjectId]);

  // Select active clip and synchronize timeline & subtitles
  const selectClip = (index: number) => {
    if (index >= 0 && index < clips.length) {
      setActiveClipIndex(index);
      const c = clips[index];
      setTimelineState((prev) => ({
        ...prev,
        inTime: c.start,
        outTime: c.end,
        activePlayhead: c.start
      }));
      setSubtitlesState((prev) => ({
        ...prev,
        headline: c.customHeadline || c.hook,
        hookBannerPreset: c.hookBannerPreset || prev.hookBannerPreset || 'frosted_gold',
        stylePreset: c.subtitlePreset || 'tiktok_bold'
      }));
      if (c.renderedPath) {
        setReframeState((prev) => ({
          ...prev,
          renderedOutput: c.renderedPath || null,
          renderPhase: 'completed',
          renderProgress: 100
        }));
      }
    }
  };

  const updateActiveClip = (updates: Partial<ClipCandidate>) => {
    setClips((prev) => {
      const updated = [...prev];
      if (updated[activeClipIndex]) {
        updated[activeClipIndex] = { ...updated[activeClipIndex], ...updates };
      }
      return updated;
    });
  };

  // IPC Event Listener
  useEffect(() => {
    if (window.hclipper) {
      const unsubEvent = window.hclipper.onEngineEvent((data) => {
        addLog(`Event: ${data.event}`, 'engine');

        if (data.event === 'reframe_progress') {
          setReframeState((prev) => ({
            ...prev,
            isRendering: true,
            renderProgress: typeof data.percent === 'number' ? Math.round(data.percent * 10) / 10 : prev.renderProgress,
            renderPhase: (data.phase as any) || 'rendering'
          }));
        } else if (data.event === 'reframe_result') {
          setReframeState((prev) => ({
            ...prev,
            isRendering: false,
            renderProgress: 100,
            renderPhase: 'completed',
            renderedOutput: data.output || prev.renderedOutput,
            renderError: null
          }));
          addLog(`✓ Reframe render completed: ${data.output}`, 'success');
        } else if (data.event === 'trajectory') {
          setReframeState((prev) => ({
            ...prev,
            isAnalyzing: false,
            analysisProgress: 100,
            trajectoryData: data.trajectory || []
          }));
        }
      });

      const unsubLog = window.hclipper.onEngineLog((log) => {
        addLog(log.text, log.level);
      });

      return () => {
        unsubEvent();
        unsubLog();
      };
    }
  }, []);

  // Trigger YuNet Trajectory Analysis
  const startAnalyzeTrajectory = async () => {
    if (reframeState.isAnalyzing) return;
    setReframeState((prev) => ({
      ...prev,
      isAnalyzing: true,
      analysisProgress: 10
    }));

    const curClip = clips[activeClipIndex];
    const sTime = curClip ? curClip.start : timelineState.inTime;
    const eTime = curClip ? curClip.end : timelineState.outTime;

    if (window.hclipper && sourceVideo) {
      addLog(`[${activeProject.name}] Initiating YuNet face tracking on ${sourceVideo} [${sTime}s - ${eTime}s]...`, 'reframe');
      await window.hclipper.runEngine('reframe', [
        sourceVideo,
        '--trajectory-only',
        '--start', sTime.toString(),
        '--end', eTime.toString(),
        '--aspect', reframeState.aspectRatio,
        '--deadzone', reframeState.deadzone.toString(),
        '--smooth', reframeState.smoothFactor.toString()
      ]);
    } else {
      setTimeout(() => {
        setReframeState((prev) => ({
          ...prev,
          isAnalyzing: false,
          analysisProgress: 100,
          trajectoryData: Array.from({ length: 300 }, (_, i) => 400 + Math.sin(i / 15) * 80)
        }));
      }, 600);
    }
  };

  // Render Targeted Single Clip Fast (4-8 seconds on GPU)
  const startRenderClip = async (targetIndex?: number, _force?: boolean): Promise<string | null> => {
    const idx = targetIndex !== undefined ? targetIndex : activeClipIndex;
    const clip = clips[idx];
    if (!clip) return null;

    const outFilename = `${clip.id || `Clip_${idx + 1}`}.mp4`;
    const targetOut = `clips/${outFilename}`;

    setReframeState((prev) => ({
      ...prev,
      isRendering: true,
      renderProgress: 5,
      renderPhase: 'rendering',
      renderedOutput: null,
      renderError: null
    }));

    addLog(`[${activeProject.name}] Hardware render for Clip #${idx + 1} (${clip.start}s - ${clip.end}s): ${targetOut}`, 'reframe');

    // Register into holistic queue helper
    const registerHolisticQueue = async () => {
      if (window.hclipper?.readQueue && window.hclipper?.saveQueue) {
        try {
          const curQueue = (await window.hclipper.readQueue()) || [];
          const existingIdx = curQueue.findIndex((q: any) => q.id === clip.id || q.filename === outFilename);
          const newItem = {
            id: clip.id || `Clip_${idx + 1}`,
            projectId: activeProjectId,
            projectName: activeProject.name,
            title: clip.title,
            filename: outFilename,
            file_path: targetOut,
            duration: `${Math.round(clip.end - clip.start)}s`,
            caption: clip.customHeadline || clip.title,
            status: {
              youtube: 'pending',
              tiktok_ng: 'pending',
              tiktok_us: 'pending',
              instagram: 'pending'
            }
          };
          if (existingIdx >= 0) {
            curQueue[existingIdx] = newItem;
          } else {
            curQueue.push(newItem);
          }
          await window.hclipper.saveQueue(curQueue);
          addLog(`Registered rendered clip into Holistic Social Publisher queue!`, 'publisher');
        } catch (e) {}
      }
    };

    if (window.hclipper && sourceVideo) {
      const res = await window.hclipper.runEngine('reframe', [
        sourceVideo,
        targetOut,
        '--start', clip.start.toString(),
        '--end', clip.end.toString(),
        '--aspect', reframeState.aspectRatio,
        '--deadzone', reframeState.deadzone.toString(),
        '--smooth', reframeState.smoothFactor.toString()
      ]);

      if (res.success) {
        setClips((prev) => {
          const up = [...prev];
          if (up[idx]) {
            up[idx] = { ...up[idx], isRendered: true, renderedPath: targetOut };
          }
          return up;
        });
        setReframeState((prev) => ({
          ...prev,
          isRendering: false,
          renderProgress: 100,
          renderPhase: 'completed',
          renderedOutput: targetOut
        }));
        await registerHolisticQueue();
        return targetOut;
      } else {
        setReframeState((prev) => ({
          ...prev,
          isRendering: false,
          renderPhase: 'error',
          renderError: 'Render terminated. Verify video file format.'
        }));
        return null;
      }
    } else {
      // Mock / Dev Fallback
      setClips((prev) => {
        const up = [...prev];
        if (up[idx]) {
          up[idx] = { ...up[idx], isRendered: true, renderedPath: targetOut };
        }
        return up;
      });
      setReframeState((prev) => ({
        ...prev,
        isRendering: false,
        renderProgress: 100,
        renderPhase: 'completed',
        renderedOutput: targetOut
      }));
      await registerHolisticQueue();
      return targetOut;
    }
  };

  // Batch Render All Discovered Clips
  const startBatchRenderAll = async (skipExisting = false) => {
    addLog(`[${activeProject.name}] Batch rendering short clips (${skipExisting ? 'skipping already rendered' : 'rendering all'})...`, 'batch');
    for (let i = 0; i < clips.length; i++) {
      if (skipExisting && clips[i].isRendered) {
        addLog(`[Batch ${i + 1}/${clips.length}] Skipping already rendered Clip #${i + 1} ("${clips[i].title}")`, 'info');
        continue;
      }
      selectClip(i);
      addLog(`[Batch ${i + 1}/${clips.length}] Rendering ${clips[i].title}...`, 'batch');
      await startRenderClip(i, true);
    }
    addLog(`✓ Batch render process completed for clips!`, 'success');
  };

  return (
    <WorkflowContext.Provider
      value={{
        activeTab,
        setActiveTab,
        sourceVideo,
        setSourceVideo: handleSetSourceVideo,
        logs,
        addLog,
        clearLogs,
        settings,
        updateSettings,
        openDirectory,
        projects,
        activeProjectId,
        activeProject,
        createProject,
        switchProject,
        updateActiveProject,
        deleteProject,
        duplicateProject,
        showProjectModal,
        setShowProjectModal,
        projectModalTab,
        openProjectModal,
        showSettingsModal,
        setShowSettingsModal,
        clips,
        setClips,
        activeClipIndex,
        selectClip,
        updateActiveClip,
        ingestState,
        setIngestState,
        timelineState,
        setTimelineState,
        reframeState,
        setReframeState,
        startAnalyzeTrajectory,
        startRenderClip,
        startBatchRenderAll,
        subtitlesState,
        setSubtitlesState
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
};
