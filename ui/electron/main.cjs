const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

let mainWindow = null;

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
    // mainWindow.webContents.openDevTools();
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

// IPC Handler: File Dialog
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

// IPC Handler: Run Python Engine Command
ipcMain.handle('hclipper:run-engine', (event, { command, args = [] }) => {
  return new Promise((resolve, reject) => {
    const pythonExe = process.platform === 'win32' ? 'python' : 'python3';
    const cliArgs = ['-m', 'engine.cli', command, ...args, '--json'];

    const child = spawn(pythonExe, cliArgs, {
      cwd: PROJECT_ROOT,
      shell: false
    });

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
              mainWindow.webContents.send('hclipper:engine-event', parsed);
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
        mainWindow.webContents.send('hclipper:engine-log', { level: 'stderr', text: errText });
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, events: parsedEvents, output: rawOutput });
      } else {
        resolve({ success: false, code, output: rawOutput });
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
});

// IPC Handler: Get Project Paths & Config
ipcMain.handle('hclipper:get-system-info', async () => {
  return {
    platform: process.platform,
    projectRoot: PROJECT_ROOT,
    assetsDir: path.join(PROJECT_ROOT, 'assets'),
    clipsDir: path.join(PROJECT_ROOT, 'clips')
  };
});
