export interface HclipperAPI {
  selectFile: (options?: { title?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
  saveFileDialog: (options?: { title?: string; defaultPath?: string }) => Promise<string | null>;
  openPath: (filePath: string) => Promise<boolean>;
  showInFolder: (filePath: string) => Promise<boolean>;
  runEngine: (command: string, args: (string | number)[], jobId?: string) => Promise<{
    success: boolean;
    jobId?: string;
    events?: any[];
    code?: number;
    output?: string;
  }>;
  cancelJob: (jobId: string) => Promise<boolean>;
  readQueue: () => Promise<any[]>;
  saveQueue: (items: any[]) => Promise<boolean>;
  readProjects: () => Promise<any[] | null>;
  saveProjects: (projects: any[]) => Promise<boolean>;
  selectDirectory: (options?: { title?: string }) => Promise<string | null>;
  openFolder: (folderPath: string) => Promise<boolean>;
  getSettings: () => Promise<{ downloadsDir: string; clipsDir: string; [key: string]: any }>;
  saveSettings: (settings: { downloadsDir?: string; clipsDir?: string; [key: string]: any }) => Promise<boolean>;
  listDownloads: () => Promise<{ name: string; title: string; path: string; sizeBytes: number; sizeMB: string; mtime: number }[]>;
  getSystemInfo: () => Promise<{
    platform: string;
    projectRoot: string;
    assetsDir: string;
    clipsDir: string;
    downloadsDir: string;
    sessionsDir: string;
  }>;
  resolveMediaUrl: (rawPath: string) => Promise<string>;
  onEngineEvent: (callback: (data: any) => void) => () => void;
  onEngineLog: (callback: (data: { level: string; text: string; jobId?: string }) => void) => () => void;
}

declare global {
  interface Window {
    hclipper?: HclipperAPI;
  }
}
