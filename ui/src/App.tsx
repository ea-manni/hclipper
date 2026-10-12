import { useState } from 'react';
import { WorkflowProvider, useWorkflow } from './context/WorkflowContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ConsoleDrawer } from './components/ConsoleDrawer';
import { IngestView } from './views/IngestView';
import { ClipScoutView } from './views/ClipScoutView';
import { TimelineView } from './views/TimelineView';
import { ReframeView } from './views/ReframeView';
import { SubtitlesView } from './views/SubtitlesView';
import { PublisherView } from './views/PublisherView';

function StudioWorkspace() {
  const { activeTab, setActiveTab, sourceVideo, setSourceVideo, logs, clearLogs } = useWorkflow();
  const [showLogs, setShowLogs] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#090b10] text-slate-100 overflow-hidden select-none">
      {/* Titlebar & Header */}
      <Header />

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar with Live Job Badges */}
        <Sidebar 
          showLogs={showLogs}
          setShowLogs={setShowLogs}
        />

        {/* Studio Canvas / Viewport - Persistent Mounted Tabs */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#090b10] via-[#0d1017] to-[#0a0d14]">
          {/* Step 1: Video Ingestion */}
          <div className={activeTab === 'ingest' ? 'block' : 'hidden'}>
            <IngestView 
              sourceVideo={sourceVideo} 
              setSourceVideo={setSourceVideo}
              onNext={() => setActiveTab('scout')}
            />
          </div>

          {/* Step 2: AI Clip Scout & Multi-Splitter */}
          <div className={activeTab === 'scout' ? 'block' : 'hidden'}>
            <ClipScoutView 
              onNavigateToTimeline={() => setActiveTab('timeline')}
              onNavigateToReframe={() => setActiveTab('reframe')}
              onNavigateToSubtitles={() => setActiveTab('subtitles')}
            />
          </div>

          {/* Step 3: Timeline & Audio Clarity */}
          <div className={activeTab === 'timeline' ? 'block' : 'hidden'}>
            <TimelineView 
              onNext={() => setActiveTab('reframe')}
              onNavigateToScout={() => setActiveTab('scout')}
            />
          </div>

          {/* Step 4: AI Auto-Reframe (Face Tracking) */}
          <div className={activeTab === 'reframe' ? 'block' : 'hidden'}>
            <ReframeView 
              onNext={() => setActiveTab('subtitles')}
              onNavigateToScout={() => setActiveTab('scout')}
            />
          </div>

          {/* Step 5: Captions & Hooks */}
          <div className={activeTab === 'subtitles' ? 'block' : 'hidden'}>
            <SubtitlesView 
              onNext={() => setActiveTab('publisher')}
              onNavigateToScout={() => setActiveTab('scout')}
            />
          </div>

          {/* Step 6: Social Publisher & Queue */}
          <div className={activeTab === 'publisher' ? 'block' : 'hidden'}>
            <PublisherView />
          </div>
        </main>
      </div>

      {/* Engine Console Output Drawer */}
      <ConsoleDrawer 
        show={showLogs}
        onClose={() => setShowLogs(false)}
        logs={logs}
        onClear={clearLogs}
      />
    </div>
  );
}

export function App() {
  return (
    <WorkflowProvider>
      <StudioWorkspace />
    </WorkflowProvider>
  );
}

export default App;
