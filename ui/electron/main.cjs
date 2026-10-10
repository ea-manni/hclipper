const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

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

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
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

// IPC Handler: Run Python Engine Command with Job Tracking
ipcMain.handle('hclipper:run-engine', (event, { command, args = [], jobId = null }) => {
  return new Promise((resolve, reject) => {
    const pythonExe = process.platform === 'win32' ? 'python' : 'python3';
    const cliArgs = ['-m', 'engine.cli', command, ...args, '--json'];
    const currentJobId = jobId || `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const child = spawn(pythonExe, cliArgs, {
      cwd: PROJECT_ROOT,
      shell: false
    });

    activeJobs.set(currentJobId, child);

    let rawOutput = '';
    let parsedEvents = [];

    child.stdout.on('data', (data) => {
      const text = data.toString();
      rawOutput += text;

      const lines = text.split('\n');
      for (const line of lines) {
        if (line.includes('__HCLIPPER_JSON__')) {
          try {
            const jsonPart = line.split('__HCLIPPER_JSON__')[1].trim();
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
        }
      }
    });

    child.stderr.on('data', (data) => {
      const errText = data.toString();
      if (mainWindow) {
        mainWindow.webContents.send('hclipper:engine-log', {
          jobId: currentJobId,
          level: 'stderr',
          text: errText
        });
      }
    });

    child.on('close', (code) => {
      activeJobs.delete(currentJobId);
      if (code === 0) {
        resolve({ success: true, jobId: currentJobId, events: parsedEvents, output: rawOutput });
      } else {
        resolve({ success: false, jobId: currentJobId, code, output: rawOutput });
      }
    });

    child.on('error', (err) => {
      activeJobs.delete(currentJobId);
      reject(err);
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
