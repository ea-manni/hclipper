const fs = require('fs');
let code = fs.readFileSync('ui/src/views/ReframeView.tsx', 'utf8');

// Add imports
if (!code.includes('import { Button }')) {
  code = code.replace(/import \{ useWorkflow \} from '\.\.\/context\/WorkflowContext';/,
  `import { useWorkflow } from '../context/WorkflowContext';\nimport { Button } from '../components/ui/button';\nimport { Card } from '../components/ui/card';\nimport { Slider } from '../components/ui/slider';\nimport { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';`);
}

// 1. First set of tabs - Preview Mode
code = code.replace(/<div className="flex bg-slate-900 rounded-lg p-1 border border-white\/5 w-max">([\s\S]*?)<\/div>/,
`<Tabs value={previewMode} onValueChange={(val) => setPreviewMode(val as any)} className="w-max">
            <TabsList>
              <TabsTrigger value="stage" className="flex items-center space-x-2">
                <Film className="w-3.5 h-3.5" />
                <span>Source Stage View</span>
              </TabsTrigger>
              <TabsTrigger value="cropped" className="flex items-center space-x-2">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Simulated Output View</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>`);

// 2. Play/pause buttons and Analyze
code = code.replace(/<button\s+onClick=\{handleAnalyzeAction\}[\s\S]*?<\/button>/,
`<Button
                onClick={handleAnalyzeAction}
                disabled={isAnalyzing || isRendering || !sourceVideo}
                variant={hasTrajectoryData ? "outline" : "default"}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing... {analysisProgress}%</span>
                  </>
                ) : hasTrajectoryData ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Re-Analyze Stage</span>
                  </>
                ) : (
                  <>
                    <Target className="w-3.5 h-3.5" />
                    <span>Analyze Source Stage</span>
                  </>
                )}
              </Button>`);

code = code.replace(/<button\s+onClick=\{togglePlayback\}\s+className="w-8 h-8[\s\S]*?<\/button>/,
`<Button size="icon" onClick={togglePlayback} disabled={!sourceVideo}>
                {isPlaying ? <Pause className="w-4 h-4 text-slate-950" /> : <Play className="w-4 h-4 text-slate-950 ml-0.5" />}
              </Button>`);

code = code.replace(/<button\s+onClick=\{openOutputDirectory\}\s+className="px-4 py-2[\s\S]*?<\/button>/,
`<Button variant="outline" size="sm" onClick={openOutputDirectory} disabled={!activeClip.isRendered}>
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Open Export Folder</span>
              </Button>`);

// 3. Render Buttons inside activeClip block
code = code.replace(/<button\s+onClick=\{handleRenderClick\}[\s\S]*?{isRendering \? \([\s\S]*?\) : \([\s\S]*?<\/button>/,
`<Button
                onClick={handleRenderClick}
                disabled={isRendering || !sourceVideo}
                variant={activeClip.isRendered ? "outline" : "default"}
                className="w-full justify-center"
              >
                {isRendering ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rendering ({renderProgress}%)...</span>
                  </>
                ) : activeClip.isRendered ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-400">Clip Rendered Successfully</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Render Clip #{activeClipIndex + 1} (GPU)</span>
                  </>
                )}
              </Button>`);

code = code.replace(/<button\s+onClick=\{handleBatchRenderAll\}\s+disabled=.*?className=.*?{isBatchRendering \? \([\s\S]*?\) : isRendering \? \([\s\S]*?\) : \([\s\S]*?\)[\s]*?}<\/button>/,
`<Button
              onClick={handleBatchRenderAll}
              disabled={isBatchRendering || isRendering || !sourceVideo}
              className="w-full justify-center py-2.5"
            >
              {isBatchRendering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Batch Rendering ({clips.filter(c => c.isRendered).length}/{clips.length} Finished)...</span>
                </>
              ) : isRendering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Rendering Single Clip in Progress...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>⚡ Batch Render All {clips.length} Clips (QSV)</span>
                </>
              )}
            </Button>`);


// 4. Clip Selector Tabs
code = code.replace(/<div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">([\s\S]*?)<\/div>/,
`<Tabs value={activeClipIndex.toString()} onValueChange={(val) => selectClip(parseInt(val))}>
            <TabsList className="flex w-max space-x-1">
              {clips.map((clip, i) => (
                <TabsTrigger key={clip.id} value={i.toString()} className="flex items-center space-x-1.5 px-3 py-1.5">
                  <span>Clip {i + 1}</span>
                  {clip.isRendered && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>`);


// 5. Sliders
code = code.replace(/<input\s+type="range"\s+min="0"\s+max="80"\s+value=\{deadzone\}\s+onChange=\{\(e\) => setReframeState\(\(prev\) => \(\{ \.\.\.prev, deadzone: parseInt\(e\.target\.value\) \}\)\)\}\s+className="w-full accent-amber-400 bg-slate-800 rounded-lg cursor-pointer h-1\.5"\s+\/>/,
`<Slider
                min={0}
                max={80}
                step={1}
                value={[deadzone]}
                onValueChange={(val) => setReframeState((prev) => ({ ...prev, deadzone: val[0] }))}
              />`);

code = code.replace(/<input\s+type="range"\s+min="0\.01"\s+max="0\.2"\s+step="0\.01"\s+value=\{smoothFactor\}\s+onChange=\{\(e\) => setReframeState\(\(prev\) => \(\{ \.\.\.prev, smoothFactor: parseFloat\(e\.target\.value\) \}\)\)\}\s+className="w-full accent-amber-400 bg-slate-800 rounded-lg cursor-pointer h-1\.5"\s+\/>/,
`<Slider
                min={0.01}
                max={0.2}
                step={0.01}
                value={[smoothFactor]}
                onValueChange={(val) => setReframeState((prev) => ({ ...prev, smoothFactor: val[0] }))}
              />`);

// 6. Next/Back buttons at footer
code = code.replace(/<button\s+onClick=\{onNavigateToScout\}\s+className="px-4 py-2 rounded-lg bg-white\/5 hover:bg-white\/10 text-slate-400 text-xs font-semibold">\s+← Back to Step 2: AI Clip Scout\s+<\/button>/,
`<Button variant="ghost" onClick={onNavigateToScout}>
          ← Back to Step 2: AI Clip Scout
        </Button>`);

code = code.replace(/<button\s+onClick=\{onNext\}\s+className="px-6 py-2\.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center space-x-2 shadow-lg shadow-amber-500\/20">\s+<span>Proceed to Step 5: Captions & Hooks<\/span>\s+<ArrowRight className="w-3\.5 h-3\.5" \/>\s+<\/button>/,
`<Button onClick={onNext} className="shadow-lg shadow-amber-500/20">
          <span>Proceed to Step 5: Captions & Hooks</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>`);

// 7. Dialog buttons
code = code.replace(/<button\s+onClick=\{\(\) => setShowRerenderConfirm\(false\)\}\s+className="px-4 py-2 rounded-lg bg-white\/5 hover:bg-white\/10 text-slate-300 text-xs font-semibold transition-colors">\s+Cancel\s+<\/button>/,
`<Button variant="outline" onClick={() => setShowRerenderConfirm(false)}>
                Cancel
              </Button>`);

code = code.replace(/<button\s+onClick=\{async \(\) => \{\s+setShowRerenderConfirm\(false\);\s+await startRenderClip\(activeClipIndex, true, false\);\s+\}\}\s+className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500\/20 transition-all">\s+Yes, Re-render Clip\s+<\/button>/,
`<Button
                onClick={async () => {
                  setShowRerenderConfirm(false);
                  await startRenderClip(activeClipIndex, true, false);
                }}
              >
                Yes, Re-render Clip
              </Button>`);

fs.writeFileSync('ui/src/views/ReframeView.tsx', code);
