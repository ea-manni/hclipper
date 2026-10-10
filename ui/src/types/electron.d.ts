export interface HclipperAPI {
  selectFile: (options?: { title?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
  runEngine: (command: string, args: (string | number)[]) => Promise<{
    success: boolean;
    events?: any[];
    code?: number;
    output?: string;
  }>;
  getSystemInfo: () => Promise<{
    platform: string;
    projectRoot: string;
    assetsDir: string;
    clipsDir: string;
  }>;
  onEngineEvent: (callback: (data: any) => void) => () => void;
  onEngineLog: (callback: (data: { level: string; text: string }) => void) => () => void;
}

declare global {
  interface Window {
    hclipper?: HclipperAPI;
  }
}
