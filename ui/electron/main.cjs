const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

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
      sandbox: false
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

// IPC Handler: Open Path in OS Explorer / Default Video Player
ipcMain.handle('hclipper:open-path', async (event, filePath) => {
  if (!filePath) return false;
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
    const extraPaths = [binDir, pythonDir, pythonScripts].filter(p => fs.existsSync(p));
    if (extraPaths.length > 0) {
      childEnv.PATH = `${extraPaths.join(path.delimiter)}${path.delimiter}${childEnv.PATH || ''}`;
    }

    const currentJobId = jobId || `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const bundledEngineExe = path.join(PROJECT_ROOT, 'bin', 'hclipper-engine.exe');

    let child;
    if (fs.existsSync(bundledEngineExe)) {
      child = spawn(bundledEngineExe, [command, ...args, '--json'], {
        cwd: PROJECT_ROOT,
        env: childEnv,
        shell: false
      });
    } else {
      const cliArgs = ['-m', 'engine.cli', command, ...args, '--json'];
      child = spawn(pythonExe, cliArgs, {
        cwd: PROJECT_ROOT,
        env: childEnv,
        shell: false
      });
    }

    activeJobs.set(currentJobId, child);

    let rawOutput = '';
    let parsedEvents = [];

    child.stdout.on('data', (data) => {
      const text = data.toString();
      rawOutput += text;

      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

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
            // Ignore parse error
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
      }
    });

    child.stderr.on('data', (data) => {
      const errText = data.toString();
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
        resolve({ success: false, jobId: currentJobId, code, output: rawOutput });
      }
    });

    child.on('error', (err) => {
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

// IPC Handler: Read Clips Queue directly from clips_queue.json
ipcMain.handle('hclipper:read-queue', async () => {
  const queuePath = path.join(PROJECT_ROOT, 'clips_queue.json');
  if (fs.existsSync(queuePath)) {
    try {
      const data = fs.readFileSync(queuePath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
  return [];
});

// IPC Handler: Save Clips Queue to clips_queue.json
ipcMain.handle('hclipper:save-queue', async (event, items) => {
  const queuePath = path.join(PROJECT_ROOT, 'clips_queue.json');
  try {
    fs.writeFileSync(queuePath, JSON.stringify(items, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
});

// IPC Handler: Read Projects from projects.json
ipcMain.handle('hclipper:read-projects', async () => {
  const projectsPath = path.join(PROJECT_ROOT, 'projects.json');
  if (fs.existsSync(projectsPath)) {
    try {
      const data = fs.readFileSync(projectsPath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }
  return null;
});

// IPC Handler: Save Projects to projects.json
ipcMain.handle('hclipper:save-projects', async (event, projects) => {
  const projectsPath = path.join(PROJECT_ROOT, 'projects.json');
  try {
    fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
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
