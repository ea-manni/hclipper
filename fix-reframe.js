const fs = require('fs');
let code = fs.readFileSync('ui/src/views/ReframeView.tsx', 'utf8');

// I made a mistake in my replace regex, some buttons weren't replaced.
code = code.replace(/<button\n\s+onClick=\{handleAnalyzeAction\}\n\s+disabled=\{isAnalyzing \|\| isRendering \|\| !sourceVideo\}\n\s+className=\{`px-3\.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all flex items-center space-x-2 \$\{\n\s+hasTrajectoryData\n\s+\? 'bg-slate-800 border-white\/10 text-slate-300 hover:bg-slate-700 hover:text-white'\n\s+: 'bg-amber-400 border-amber-400 text-slate-950 hover:bg-amber-300 shadow-md shadow-amber-500\/20'\n\s+\} \$\{\(isAnalyzing \|\| isRendering \|\| !sourceVideo\) \? 'opacity-50 cursor-not-allowed' : 'active:scale-95'\}`\}\n\s+>\n\s+\{isAnalyzing \? \(\n\s+<>\n\s+<Loader2 className="w-3\.5 h-3\.5 animate-spin text-amber-400" \/>\n\s+<span>Analyzing\.\.\. \{analysisProgress\}%<\/span>\n\s+<\/>\n\s+\) : hasTrajectoryData \? \(\n\s+<>\n\s+<RefreshCw className="w-3\.5 h-3\.5" \/>\n\s+<span>Re-Analyze Stage<\/span>\n\s+<\/>\n\s+\) : \(\n\s+<>\n\s+<Target className="w-3\.5 h-3\.5" \/>\n\s+<span>Analyze Source Stage<\/span>\n\s+<\/>\n\s+\)\}\n\s+<\/button>/,
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

// Fix play button
code = code.replace(/<button\n\s+onClick=\{togglePlayback\}\n\s+className="w-8 h-8 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold flex items-center justify-center transition-all shadow"\n\s+disabled=\{!sourceVideo\}\n\s+>\n\s+\{isPlaying \? <Pause className="w-4 h-4 text-slate-950" \/> : <Play className="w-4 h-4 text-slate-950 ml-0\.5" \/>\}\n\s+<\/button>/,
`<Button size="icon" onClick={togglePlayback} disabled={!sourceVideo}>
                {isPlaying ? <Pause className="w-4 h-4 text-slate-950" /> : <Play className="w-4 h-4 text-slate-950 ml-0.5" />}
              </Button>`);

// Open folder button
code = code.replace(/<button\n\s+onClick=\{openOutputDirectory\}\n\s+className="px-4 py-2 bg-amber-400\/10 hover:bg-amber-400\/20 disabled:opacity-50 border border-amber-400\/30 text-amber-300 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1\.5"\n\s+disabled=\{!activeClip\.isRendered\}\n\s+>\n\s+<FolderOpen className="w-3\.5 h-3\.5" \/>\n\s+<span>Open Export Folder<\/span>\n\s+<\/button>/,
`<Button variant="outline" size="sm" onClick={openOutputDirectory} disabled={!activeClip.isRendered}>
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Open Export Folder</span>
              </Button>`);

// Render buttons inside activeClip block
code = code.replace(/<button\n\s+onClick=\{handleRenderClick\}\n\s+disabled=\{isRendering \|\| !sourceVideo\}\n\s+className=\{`px-5 py-2\.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 shadow-md \$\{\n\s+isRendering\n\s+\? 'bg-slate-800 text-slate-400 border border-white\/10 cursor-not-allowed opacity-75'\n\s+: activeClip\.isRendered\n\s+\? 'bg-emerald-500\/10 text-emerald-400 border border-emerald-500\/30 hover:bg-emerald-500\/20'\n\s+: !sourceVideo\n\s+\? 'bg-slate-800\/80 text-slate-500 border border-white\/5 cursor-not-allowed'\n\s+: 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500\/20 active:scale-95'\n\s+\}`\}\n\s+>\n\s+\{isRendering \? \(\n\s+<>\n\s+<Loader2 className="w-3\.5 h-3\.5 animate-spin text-amber-400" \/>\n\s+<span>Rendering \(\{renderProgress\}%\)\.\.\.<\/span>\n\s+<\/>\n\s+\) : activeClip\.isRendered \? \(\n\s+<>\n\s+<CheckCircle2 className="w-3\.5 h-3\.5 text-emerald-400" \/>\n\s+<span>Clip Rendered Successfully<\/span>\n\s+<\/>\n\s+\) : \(\n\s+<>\n\s+<Zap className="w-3\.5 h-3\.5" \/>\n\s+<span>Render Clip #\{activeClipIndex \+ 1\} \(GPU\)<\/span>\n\s+<\/>\n\s+\)\}\n\s+<\/button>/,
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

code = code.replace(/<button\n\s+onClick=\{handleBatchRenderAll\}\n\s+disabled=\{isBatchRendering \|\| isRendering \|\| !sourceVideo\}\n\s+className=\{`w-full py-2\.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-md \$\{\n\s+isBatchRendering \|\| isRendering\n\s+\? 'bg-slate-800 text-slate-400 border border-white\/10 cursor-not-allowed opacity-75'\n\s+: !sourceVideo\n\s+\? 'bg-slate-800\/80 text-slate-500 border border-white\/5 cursor-not-allowed'\n\s+: 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500\/20 active:scale-95'\n\s+\}`\}\n\s+>\n\s+\{isBatchRendering \? \(\n\s+<>\n\s+<Loader2 className="w-3\.5 h-3\.5 animate-spin text-amber-400" \/>\n\s+<span>Batch Rendering \(\{clips\.filter\(c => c\.isRendered\)\.length\}\/\{clips\.length\} Finished\)\.\.\.<\/span>\n\s+<\/>\n\s+\) : isRendering \? \(\n\s+<>\n\s+<Loader2 className="w-3\.5 h-3\.5 animate-spin text-amber-400" \/>\n\s+<span>Rendering Single Clip in Progress\.\.\.<\/span>\n\s+<\/>\n\s+\) : \(\n\s+<>\n\s+<Zap className="w-3\.5 h-3\.5" \/>\n\s+<span>⚡ Batch Render All \{clips\.length\} Clips \(QSV\)<\/span>\n\s+<\/>\n\s+\)\}\n\s+<\/button>/,
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

fs.writeFileSync('ui/src/views/ReframeView.tsx', code);
