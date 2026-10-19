const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const PROJECT_ROOT = app.isPackaged 
  ? process.resourcesPath 
  : path.resolve(__dirname, '..', '..');

let mainWindow = null;
const activeJobs = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#090b10',
    title: 'hclipper — AI Short-Form Video Studio',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#090b10',
      symbolColor: '#94a3b8',
      height: 38
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false
    }
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler: File Dialog (Open)
ipcMain.handle('hclipper:select-file', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options?.title || 'Select Video File',
    properties: ['openFile'],
    filters: options?.filters || [
      { name: 'Video Files', extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi'] },
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a', 'aac'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

// IPC Handler: File Dialog (Save)
ipcMain.handle('hclipper:save-file-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: options?.title || 'Save Master Video',
    defaultPath: options?.defaultPath || 'Clip_Master.mp4',
    filters: [
      { name: 'MP4 Video', extensions: ['mp4'] }
    ]
  });
  if (result.canceled || !result.filePath) return null;
  return result.filePath;
});

// IPC Handler: Open Path in OS Explorer / Default Video Player / Browser
ipcMain.handle('hclipper:open-path', async (event, filePath) => {
  if (!filePath) return false;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    await shell.openExternal(filePath);
    return true;
  }
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(PROJECT_ROOT, filePath);
  if (fs.existsSync(resolved)) {
    await shell.openPath(resolved);
    return true;
  }
  return false;
});

// IPC Handler: Show Item in Folder
ipcMain.handle('hclipper:show-in-folder', async (event, filePath) => {
  if (!filePath) return false;
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(PROJECT_ROOT, filePath);
  if (fs.existsSync(resolved)) {
    shell.showItemInFolder(resolved);
    return true;
  }
  return false;
});

// IPC Handler: Select Directory
ipcMain.handle('hclipper:select-directory', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options?.title || 'Select Folder',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

// IPC Handler: Open Folder in OS File Explorer
ipcMain.handle('hclipper:open-folder', async (event, folderPath) => {
  if (!folderPath) return false;
  const resolved = path.isAbsolute(folderPath) ? folderPath : path.join(PROJECT_ROOT, folderPath);
  if (!fs.existsSync(resolved)) {
    try {
      fs.mkdirSync(resolved, { recursive: true });
    } catch (e) {}
  }
  await shell.openPath(resolved);
  return true;
});

// IPC Handler: Persistent Settings Management
const getSettingsPath = () => path.join(app.getPath('userData'), 'settings.json');

ipcMain.handle('hclipper:get-settings', async () => {
  const defaultVideos = path.join(app.getPath('videos'), 'hclipper');
  const defaults = {
    downloadsDir: fs.existsSync(path.join(PROJECT_ROOT, 'downloads'))
      ? path.join(PROJECT_ROOT, 'downloads')
      : path.join(defaultVideos, 'downloads'),
    clipsDir: fs.existsSync(path.join(PROJECT_ROOT, 'clips'))
      ? path.join(PROJECT_ROOT, 'clips')
      : path.join(defaultVideos, 'clips')
  };
  const settingsFile = getSettingsPath();
  if (fs.existsSync(settingsFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
      return { ...defaults, ...data };
    } catch (e) {}
  }
  return defaults;
});

ipcMain.handle('hclipper:save-settings', async (event, settings) => {
  const settingsFile = getSettingsPath();
  try {
    fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
    if (settings.downloadsDir) {
      fs.mkdirSync(settings.downloadsDir, { recursive: true });
    }
    if (settings.clipsDir) {
      fs.mkdirSync(settings.clipsDir, { recursive: true });
    }
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
});

// Helper: Auto-detect Python executable across system paths & virtualenvs
function detectPythonExecutable() {
  const candidates = [
    path.join(PROJECT_ROOT, 'python', 'python.exe'),
    path.join(process.resourcesPath, 'python', 'python.exe'),
    path.join(PROJECT_ROOT, 'bin', 'python.exe'),
    path.join(PROJECT_ROOT, '.venv', 'Scripts', 'python.exe'),
    path.join(PROJECT_ROOT, 'venv', 'Scripts', 'python.exe'),
    path.join(__dirname, '..', '..', '.venv', 'Scripts', 'python.exe'),
    path.join(__dirname, '..', '..', 'venv', 'Scripts', 'python.exe'),
  ];

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      const pythonProgramsDir = path.join(localAppData, 'Programs', 'Python');
      if (fs.existsSync(pythonProgramsDir)) {
        try {
          const versions = fs.readdirSync(pythonProgramsDir);
          for (const ver of versions.sort().reverse()) {
            candidates.push(path.join(pythonProgramsDir, ver, 'python.exe'));
          }
        } catch (e) {}
      }
      candidates.push(path.join(localAppData, 'Programs', 'Python', 'Launcher', 'py.exe'));
    }

    const drives = ['C:', 'D:'];
    for (const drive of drives) {
      for (const ver of ['Python314', 'Python313', 'Python312', 'Python311', 'Python310']) {
        candidates.push(path.join(`${drive}\\`, ver, 'python.exe'));
        candidates.push(path.join(`${drive}\\`, 'Program Files', ver, 'python.exe'));
        candidates.push(path.join(`${drive}\\`, 'Program Files (x86)', ver, 'python.exe'));
      }
    }
    candidates.push('C:\\Windows\\py.exe');
  }

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    const lookupCmd = process.platform === 'win32' ? 'where.exe python' : 'which python3';
    const output = require('child_process').execSync(lookupCmd, { encoding: 'utf8', windowsHide: true });
    const lines = output.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (fs.existsSync(line)) {
        return line;
      }
    }
  } catch (e) {}

  return process.platform === 'win32' ? 'python.exe' : 'python3';
}

// IPC Handler: Run Python Engine Command with Job Tracking
ipcMain.handle('hclipper:run-engine', (event, { command, args = [], jobId = null }) => {
  return new Promise((resolve) => {
    const pythonExe = detectPythonExecutable();
    const binDir = path.join(PROJECT_ROOT, 'bin');
    const childEnv = { 
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
      PYTHONUNBUFFERED: '1',
      PYTHONPATH: `${PROJECT_ROOT}${path.delimiter}${process.env.PYTHONPATH || ''}`
    };

    const pythonDir = path.dirname(pythonExe);
    const pythonScripts = path.join(pythonDir, 'Scripts');
    const nodeDirs = [
      'C:\\Program Files\\nodejs',
      'C:\\Program Files (x86)\\nodejs',
      path.join(os.homedir(), 'AppData', 'Roaming', 'npm'),
      path.dirname(process.execPath)
    ];
    const extraPaths = [binDir, pythonDir, pythonScripts, ...nodeDirs].filter(p => fs.existsSync(p));
    if (extraPaths.length > 0) {
      childEnv.PATH = `${extraPaths.join(path.delimiter)}${path.delimiter}${childEnv.PATH || ''}`;
    }

    // Protect complex JSON arguments on Windows command-line
    const tempFilesToClean = [];
    const processedArgs = [...args];
    for (let i = 0; i < processedArgs.length; i++) {
      if ((processedArgs[i] === '--text-cues' || processedArgs[i] === '--custom-cues') && i + 1 < processedArgs.length) {
        const val = processedArgs[i + 1];
        if (typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) {
          try {
            const tmpFile = path.join(os.tmpdir(), `hclipper_cues_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.json`);
            fs.writeFileSync(tmpFile, val, 'utf8');
            processedArgs[i + 1] = tmpFile;
            tempFilesToClean.push(tmpFile);
          } catch (e) {}
        }
      }
    }

    const currentJobId = jobId || `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const bundledEngineExe = path.join(PROJECT_ROOT, 'bin', 'hclipper-engine.exe');

    let child;
    if (fs.existsSync(bundledEngineExe)) {
      child = spawn(bundledEngineExe, [command, ...processedArgs, '--json'], {
        cwd: PROJECT_ROOT,
        env: childEnv,
        shell: false
      });
    } else {
      const cliArgs = ['-m', 'engine.cli', command, ...processedArgs, '--json'];
      child = spawn(pythonExe, cliArgs, {
        cwd: PROJECT_ROOT,
        env: childEnv,
        shell: false
      });
    }

    activeJobs.set(currentJobId, child);

    const cleanupTempFiles = () => {
      tempFilesToClean.forEach((f) => {
        try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
      });
    };

    let rawOutput = '';
    let parsedEvents = [];
    let stdoutBuffer = '';

    const handleStdoutLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.includes('__HCLIPPER_JSON__')) {
        try {
          const jsonPart = trimmed.split('__HCLIPPER_JSON__')[1].trim();
          const parsed = JSON.parse(jsonPart);
          parsedEvents.push(parsed);
          if (mainWindow) {
            mainWindow.webContents.send('hclipper:engine-event', {
              jobId: currentJobId,
              command,
              ...parsed
            });
          }
        } catch (e) {
          console.error('[main.cjs] JSON parse error in event:', e.message);
        }
      } else {
        // Stream raw stdout lines (yt-dlp, ffmpeg, engine logs) to renderer
        if (mainWindow) {
          mainWindow.webContents.send('hclipper:engine-log', {
            jobId: currentJobId,
            level: 'stdout',
            text: trimmed
          });
        }
      }
    };

    child.stdout.on('data', (data) => {
      const text = data.toString();
      rawOutput += text;
      stdoutBuffer += text;

      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || '';

      for (const line of lines) {
        handleStdoutLine(line);
      }
    });

    let rawStderr = '';
    child.stderr.on('data', (data) => {
      const errText = data.toString();
      rawStderr += errText;
      const lines = errText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && mainWindow) {
          mainWindow.webContents.send('hclipper:engine-log', {
            jobId: currentJobId,
            level: 'stderr',
            text: trimmed
          });
        }
      }
    });

    child.on('close', (code) => {
      if (stdoutBuffer && stdoutBuffer.trim()) {
        handleStdoutLine(stdoutBuffer.trim());
        stdoutBuffer = '';
      }
      cleanupTempFiles();
      activeJobs.delete(currentJobId);
      if (code === 0) {
        resolve({ success: true, jobId: currentJobId, events: parsedEvents, output: rawOutput });
      } else {
        if (mainWindow) {
          mainWindow.webContents.send('hclipper:engine-log', {
            jobId: currentJobId,
            level: 'error',
            text: `Process finished with exit code ${code}`
          });
        }
        const errEvent = parsedEvents.find(e => e.event === 'error' || e.error || (e.event === 'motion_result' && e.error) || (e.event === 'highlights_result' && e.error));
        const stderrLastLine = rawStderr.trim().split(/\r?\n/).filter(Boolean).pop();
        const errorMsg = errEvent?.error || errEvent?.detail || stderrLastLine || `Engine process finished with exit code ${code}`;
        resolve({ success: false, jobId: currentJobId, code, error: errorMsg, events: parsedEvents, output: rawOutput });
      }
    });

    child.on('error', (err) => {
      cleanupTempFiles();
      activeJobs.delete(currentJobId);
      if (mainWindow) {
        mainWindow.webContents.send('hclipper:engine-log', {
          jobId: currentJobId,
          level: 'error',
          text: `Engine launch failed: ${err.message}`
        });
        mainWindow.webContents.send('hclipper:engine-event', {
          jobId: currentJobId,
          command,
          event: 'error',
          error: `Could not launch Python engine: ${err.message}. Please verify Python 3.10+ is installed.`
        });
      }
      resolve({ success: false, jobId: currentJobId, error: err.message, output: rawOutput });
    });
  });
});

// IPC Handler: Cancel Running Engine Job
ipcMain.handle('hclipper:cancel-job', async (event, jobId) => {
  if (activeJobs.has(jobId)) {
    const child = activeJobs.get(jobId);
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', child.pid.toString(), '/f', '/t']);
      } else {
        child.kill('SIGKILL');
      }
      activeJobs.delete(jobId);
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
});

// Persistent File Helpers
function getPersistentProjectsPaths() {
  const rootProjects = path.join(PROJECT_ROOT, 'projects.json');
  const userProjects = path.join(app.getPath('userData'), 'projects.json');
  return { rootProjects, userProjects };
}

function getPersistentQueuePaths() {
  const rootQueue = path.join(PROJECT_ROOT, 'clips_queue.json');
  const userQueue = path.join(app.getPath('userData'), 'clips_queue.json');
  return { rootQueue, userQueue };
}

// IPC Handler: Read Clips Queue directly from clips_queue.json
ipcMain.handle('hclipper:read-queue', async () => {
  const { rootQueue, userQueue } = getPersistentQueuePaths();
  const filterValidItems = (items) => {
    if (!Array.isArray(items)) return [];
    return items.filter((it) => {
      const fp = (it.file_path || '').replace(/\\/g, '/').toLowerCase();
      if (fp.includes('/scratch/') || fp.includes('scratch/')) return false;
      const absPath = path.isAbsolute(it.file_path) ? it.file_path : path.join(PROJECT_ROOT, it.file_path);
      return fs.existsSync(absPath);
    });
  };

  // Check root queue first (which Python updates)
  if (fs.existsSync(rootQueue)) {
    try {
      const data = fs.readFileSync(rootQueue, 'utf8');
      const items = JSON.parse(data);
      const valid = filterValidItems(items);
      try {
        fs.mkdirSync(path.dirname(userQueue), { recursive: true });
        fs.writeFileSync(userQueue, JSON.stringify(valid, null, 2), 'utf8');
        fs.writeFileSync(rootQueue, JSON.stringify(valid, null, 2), 'utf8');
      } catch (e) {}
      return valid;
    } catch (e) {}
  }
  // Fallback to userQueue
  if (fs.existsSync(userQueue)) {
    try {
      const data = fs.readFileSync(userQueue, 'utf8');
      const items = JSON.parse(data);
      const valid = filterValidItems(items);
      try {
        fs.writeFileSync(rootQueue, JSON.stringify(valid, null, 2), 'utf8');
      } catch (e) {}
      return valid;
    } catch (e) {}
  }
  return [];
});

// IPC Handler: Save Clips Queue to clips_queue.json
ipcMain.handle('hclipper:save-queue', async (event, items) => {
  const { rootQueue, userQueue } = getPersistentQueuePaths();
  try {
    const jsonStr = JSON.stringify(items, null, 2);
    try {
      fs.mkdirSync(path.dirname(rootQueue), { recursive: true });
      fs.writeFileSync(rootQueue, jsonStr, 'utf8');
    } catch (e) {}
    try {
      fs.mkdirSync(path.dirname(userQueue), { recursive: true });
      fs.writeFileSync(userQueue, jsonStr, 'utf8');
    } catch (e) {}
    return true;
  } catch (e) {
    return false;
  }
});

// IPC Handler: Read Projects from projects.json
ipcMain.handle('hclipper:read-projects', async () => {
  const { rootProjects, userProjects } = getPersistentProjectsPaths();
  // 1. Try reading rootProjects first
  if (fs.existsSync(rootProjects)) {
    try {
      const data = fs.readFileSync(rootProjects, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        try {
          fs.mkdirSync(path.dirname(userProjects), { recursive: true });
          fs.writeFileSync(userProjects, data, 'utf8');
        } catch (e) {}
        return parsed;
      }
    } catch (e) {}
  }

  // 2. Fallback to userProjects
  if (fs.existsSync(userProjects)) {
    try {
      const data = fs.readFileSync(userProjects, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        try {
          fs.writeFileSync(rootProjects, data, 'utf8');
        } catch (e) {}
        return parsed;
      }
    } catch (e) {}
  }

  return [];
});

// IPC Handler: Save Projects to projects.json
ipcMain.handle('hclipper:save-projects', async (event, projects) => {
  const { rootProjects, userProjects } = getPersistentProjectsPaths();
  try {
    const jsonStr = JSON.stringify(projects, null, 2);
    try {
      fs.mkdirSync(path.dirname(rootProjects), { recursive: true });
      fs.writeFileSync(rootProjects, jsonStr, 'utf8');
    } catch (e) {}
    try {
      fs.mkdirSync(path.dirname(userProjects), { recursive: true });
      fs.writeFileSync(userProjects, jsonStr, 'utf8');
    } catch (e) {}
    return true;
  } catch (e) {
    return false;
  }
});

// IPC Handler: List local downloaded media files
ipcMain.handle('hclipper:list-downloads', async () => {
  const defaultVideos = path.join(app.getPath('videos'), 'hclipper', 'downloads');
  const dirs = [
    path.join(app.getPath('userData'), 'downloads'),
    path.join(PROJECT_ROOT, 'downloads'),
    path.join(PROJECT_ROOT, '..', 'downloads'),
    defaultVideos
  ];
  const results = [];
  const seenPaths = new Set();
  for (const d of dirs) {
    if (fs.existsSync(d)) {
      try {
        const files = fs.readdirSync(d);
        for (const f of files) {
          const ext = path.extname(f).toLowerCase();
          if (['.mp4', '.mov', '.mkv', '.webm', '.avi'].includes(ext)) {
            const fullP = path.join(d, f);
            if (!seenPaths.has(fullP)) {
              seenPaths.add(fullP);
              const stats = fs.statSync(fullP);
              results.push({
                name: f,
                title: path.basename(f, ext),
                path: fullP,
                sizeBytes: stats.size,
                sizeMB: (stats.size / (1024 * 1024)).toFixed(1),
                mtime: stats.mtimeMs
              });
            }
          }
        }
      } catch (e) {}
    }
  }
  return results.sort((a, b) => b.mtime - a.mtime);
});

// IPC Handler: Get Project Paths & Hardware Status
ipcMain.handle('hclipper:get-system-info', async () => {
  return {
    platform: process.platform,
    projectRoot: PROJECT_ROOT,
    assetsDir: path.join(PROJECT_ROOT, 'assets'),
    clipsDir: path.join(PROJECT_ROOT, 'clips'),
    downloadsDir: path.join(PROJECT_ROOT, 'downloads'),
    sessionsDir: path.join(PROJECT_ROOT, 'sessions')
  };
});

// IPC Handler: Resolve Local Video/Media Path to file:/// URL
ipcMain.handle('hclipper:resolve-media-url', async (event, rawPath) => {
  if (!rawPath) return '';
  if (rawPath.startsWith('http://') || rawPath.startsWith('https://') || rawPath.startsWith('file://')) {
    return rawPath;
  }

  const workspaceRoot = PROJECT_ROOT;
  const defaultVideos = path.join(app.getPath('videos'), 'hclipper');
  
  const candidates = [
    rawPath,
    path.isAbsolute(rawPath) ? rawPath : path.join(PROJECT_ROOT, rawPath),
    path.isAbsolute(rawPath) ? rawPath : path.join(process.cwd(), rawPath),
    path.join(PROJECT_ROOT, 'clips', path.basename(rawPath)),
    path.join(defaultVideos, 'clips', path.basename(rawPath)),
    path.join(PROJECT_ROOT, 'downloads', path.basename(rawPath)),
    path.join(defaultVideos, 'downloads', path.basename(rawPath))
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const normalized = c.replace(/\\/g, '/');
      return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`;
    }
  }

  // Fallback
  const fallback = path.isAbsolute(rawPath) ? rawPath : path.join(workspaceRoot, rawPath);
  const normalized = fallback.replace(/\\/g, '/');
  return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`;
});

