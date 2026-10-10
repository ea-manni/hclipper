import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ConsoleDrawer } from './components/ConsoleDrawer';
import { IngestView } from './views/IngestView';
import { TimelineView } from './views/TimelineView';
import { ReframeView } from './views/ReframeView';
import { SubtitlesView } from './views/SubtitlesView';
import { PublisherView } from './views/PublisherView';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('ingest');
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [sourceVideo, setSourceVideo] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([
    'hclipper Engine v1.0.0 initialized.',
    'Detected Hardware Acceleration: Intel QSV (h264_qsv).',
    'OpenCV YuNet ONNX Face Tracking Model loaded.',
    'Social publisher sessions directory verified.'
  ]);

  // Hook into Electron engine events if running in desktop app
  useEffect(() => {
    if (window.hclipper) {
      const unsubEvent = window.hclipper.onEngineEvent((data) => {
        setLogs((prev) => [...prev, `[EVENT] ${data.event}: ${JSON.stringify(data)}`]);
      });
      const unsubLog = window.hclipper.onEngineLog((log) => {
        setLogs((prev) => [...prev, `[${log.level.toUpperCase()}] ${log.text.trim()}`]);
      });
      return () => {
        unsubEvent();
        unsubLog();
      };
    }
  }, []);

  const handleNext = (nextTab: string) => {
    setActiveTab(nextTab);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#090b10] text-slate-100 overflow-hidden select-none">
      {/* Titlebar & Header */}
      <Header activeTab={activeTab} />

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          showLogs={showLogs}
          setShowLogs={setShowLogs}
        />

        {/* Studio Canvas / Viewport */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#090b10] via-[#0d1017] to-[#0a0d14]">
          {activeTab === 'ingest' && (
            <IngestView 
              sourceVideo={sourceVideo} 
              setSourceVideo={setSourceVideo}
              onNext={() => handleNext('timeline')}
            />
          )}

          {activeTab === 'timeline' && (
            <TimelineView 
              sourceVideo={sourceVideo}
              onNext={() => handleNext('reframe')}
            />
          )}

          {activeTab === 'reframe' && (
            <ReframeView 
              sourceVideo={sourceVideo}
              onNext={() => handleNext('subtitles')}
            />
          )}

          {activeTab === 'subtitles' && (
            <SubtitlesView 
              onNext={() => handleNext('publisher')}
            />
          )}

          {activeTab === 'publisher' && (
            <PublisherView />
          )}
        </main>
      </div>

      {/* Engine Console Output Drawer */}
      <ConsoleDrawer 
        show={showLogs}
        onClose={() => setShowLogs(false)}
        logs={logs}
        onClear={() => setLogs([])}
      />
    </div>
  );
}

export default App;
