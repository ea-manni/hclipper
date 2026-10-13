const fs = require('fs');
let code = fs.readFileSync('ui/src/views/SubtitlesView.tsx', 'utf8');

if (!code.includes('import { Button }')) {
  code = code.replace(/import \{ useWorkflow \} from '\.\.\/context\/WorkflowContext';/,
  `import { useWorkflow } from '../context/WorkflowContext';\nimport { Button } from '../components/ui/button';\nimport { Switch } from '../components/ui/switch';\nimport { Slider } from '../components/ui/slider';\nimport { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';\nimport { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';\nimport { Card } from '../components/ui/card';`);
}

// 1. Buttons
code = code.replace(/<button\n\s+onClick=\{togglePlayback\}[\s\S]*?<\/button>/,
`<Button size="icon" onClick={togglePlayback} disabled={!sourceVideo}>
                {isPlaying ? <Pause className="w-4 h-4 text-slate-950" /> : <Play className="w-4 h-4 text-slate-950 ml-0.5" />}
              </Button>`);

code = code.replace(/<button\n\s+onClick=\{openOutputDirectory\}[\s\S]*?<\/button>/,
`<Button variant="outline" size="sm" onClick={openOutputDirectory} disabled={!activeClip.isSubtitled}>
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Open Export Folder</span>
              </Button>`);

// 2. Tabs
code = code.replace(/<div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">([\s\S]*?)<\/div>/,
`<Tabs value={activeClipIndex.toString()} onValueChange={(val) => selectClip(parseInt(val))}>
            <TabsList className="flex w-max space-x-1 overflow-x-auto scrollbar-hide">
              {clips.map((clip, i) => (
                <TabsTrigger key={clip.id} value={i.toString()} className="flex items-center space-x-1.5 px-3 py-1.5">
                  <span>Clip {i + 1}</span>
                  {clip.isSubtitled && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>`);

// 3. Switches
code = code.replace(/<input\n\s+type="checkbox"\n\s+checked=\{enableSubtitles\}\n\s+onChange=\{\(e\) => setEnableSubtitles\(e\.target\.checked\)\}\n\s+className="w-4 h-4 accent-amber-400 bg-slate-900 border-white\/10 rounded cursor-pointer"\n\s+\/>/,
`<Switch
                    checked={enableSubtitles}
                    onCheckedChange={(checked) => setEnableSubtitles(checked)}
                  />`);

code = code.replace(/<input\n\s+type="checkbox"\n\s+checked=\{enableBGM\}\n\s+onChange=\{\(e\) => setEnableBGM\(e\.target\.checked\)\}\n\s+className="w-4 h-4 accent-amber-400 bg-slate-900 border-white\/10 rounded cursor-pointer"\n\s+\/>/,
`<Switch
                    checked={enableBGM}
                    onCheckedChange={(checked) => setEnableBGM(checked)}
                  />`);

code = code.replace(/<input\n\s+type="checkbox"\n\s+checked=\{enableAudioDSP\}\n\s+onChange=\{\(e\) => setEnableAudioDSP\(e\.target\.checked\)\}\n\s+className="w-4 h-4 accent-amber-400 bg-slate-900 border-white\/10 rounded cursor-pointer"\n\s+\/>/,
`<Switch
                    checked={enableAudioDSP}
                    onCheckedChange={(checked) => setEnableAudioDSP(checked)}
                  />`);

// 4. Sliders
code = code.replace(/<input \n\s+type="range" \n\s+min="50"\n\s+max="900"\n\s+step="10"\n\s+value=\{marginV\}\n\s+onChange=\{\(e\) => setSubtitlesState\(\(prev\) => \(\{ \.\.\.prev, marginV: parseInt\(e\.target\.value\) \}\)\)\}\n\s+className="w-full accent-amber-400 bg-slate-800 rounded-lg cursor-pointer h-1\.5"\n\s+\/>/,
`<Slider
                  min={50}
                  max={900}
                  step={10}
                  value={[marginV]}
                  onValueChange={(val) => setSubtitlesState((prev) => ({ ...prev, marginV: val[0] }))}
                />`);

code = code.replace(/<input \n\s+type="range" \n\s+min="0\.05"\n\s+max="1\.0"\n\s+step="0\.05"\n\s+value=\{bgmVolume\}\n\s+onChange=\{\(e\) => setSubtitlesState\(\(prev\) => \(\{ \.\.\.prev, bgmVolume: parseFloat\(e\.target\.value\) \}\)\)\}\n\s+className="w-full accent-amber-400 bg-slate-800 rounded-lg cursor-pointer h-1\.5"\n\s+\/>/,
`<Slider
                  min={0.05}
                  max={1.0}
                  step={0.05}
                  value={[bgmVolume]}
                  onValueChange={(val) => setSubtitlesState((prev) => ({ ...prev, bgmVolume: val[0] }))}
                />`);


// 5. Select
code = code.replace(/<select\n\s+value=\{bgmTrack\}\n\s+onChange=\{\(e\) => setSubtitlesState\(\(prev\) => \(\{ \.\.\.prev, bgmTrack: e\.target\.value \}\)\)\}\n\s+className="w-full bg-slate-900 border border-white\/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400\/50"\n\s+>\n\s+<option value="none">None \/ Muted<\/option>\n\s+<option value="cinematic">Epic Cinematic \(ambient\)<\/option>\n\s+<option value="lofi">Lofi Chillhop<\/option>\n\s+<option value="worship">Ambient Worship Pads<\/option>\n\s+<option value="phonk">Aggressive Phonk<\/option>\n\s+<\/select>/,
`<Select value={bgmTrack} onValueChange={(val) => setSubtitlesState((prev) => ({ ...prev, bgmTrack: val }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select BGM Track" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None / Muted</SelectItem>
                    <SelectItem value="cinematic">Epic Cinematic (ambient)</SelectItem>
                    <SelectItem value="lofi">Lofi Chillhop</SelectItem>
                    <SelectItem value="worship">Ambient Worship Pads</SelectItem>
                    <SelectItem value="phonk">Aggressive Phonk</SelectItem>
                  </SelectContent>
                </Select>`);

// 6. Action buttons
code = code.replace(/<button\n\s+onClick=\{handleTranscribe\}\n\s+disabled=\{isTranscribing \|\| !sourceVideo\}[\s\S]*?<\/button>/,
`<Button
              onClick={handleTranscribe}
              disabled={isTranscribing || !sourceVideo}
              variant={hasCaptions ? "outline" : "default"}
              className="px-5 w-full"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Transcribing...</span>
                </>
              ) : hasCaptions ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400">Captions Ready</span>
                </>
              ) : (
                <>
                  <AtSign className="w-3.5 h-3.5" />
                  <span>Auto-Generate Captions (AI)</span>
                </>
              )}
            </Button>`);

code = code.replace(/<button\n\s+onClick=\{handleRenderSubtitleClip\}\n\s+disabled=\{isRendering \|\| !sourceVideo\}[\s\S]*?<\/button>/,
`<Button
              onClick={handleRenderSubtitleClip}
              disabled={isRendering || !sourceVideo}
              variant={activeClip.isSubtitled ? "outline" : "default"}
              className="w-full justify-center"
            >
              {isRendering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Rendering Final Clip ({renderProgress}%)...</span>
                </>
              ) : activeClip.isSubtitled ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-amber-400">Master Render Saved</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Master Render Clip #{activeClipIndex + 1}</span>
                </>
              )}
            </Button>`);


code = code.replace(/<button\n\s+onClick=\{onNavigateToReframe\}\n\s+className="px-4 py-2 rounded-lg bg-white\/5 hover:bg-white\/10 text-slate-400 text-xs font-semibold"\n\s+>\n\s+← Back to Step 4: AI Reframe\n\s+<\/button>/,
`<Button variant="ghost" onClick={onNavigateToReframe}>
          ← Back to Step 4: AI Reframe
        </Button>`);

code = code.replace(/<button\n\s+onClick=\{onNext\}\n\s+className="px-6 py-2\.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center space-x-2 shadow-lg shadow-amber-500\/20"\n\s+>\n\s+<span>Proceed to Step 6: Publish<\/span>\n\s+<ArrowRight className="w-3\.5 h-3\.5" \/>\n\s+<\/button>/,
`<Button onClick={onNext} className="shadow-lg shadow-amber-500/20">
          <span>Proceed to Step 6: Publish</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>`);

// Fix the card
code = code.replace(/<button\n\s+key=\{preset\.id\}\n\s+onClick=\{\(\) => handleHookPresetChange\(preset\.id\)\}\n\s+className=\{`p-2\.5 rounded-lg border text-left transition-all \$\{\n\s+isSelected\n\s+\? 'bg-amber-400\/10 border-amber-400\/60 text-white shadow-sm'\n\s+: 'bg-slate-900\/80 border-white\/5 text-slate-400 hover:text-white hover:border-white\/10'\n\s+\}`\}\n\s+>/g,
`<Card
                          interactive
                          key={preset.id}
                          onClick={() => handleHookPresetChange(preset.id)}
                          className={\`p-2.5 text-left \${
                            isSelected
                              ? 'bg-amber-400/10 border-amber-400/60 text-white shadow-sm'
                              : 'bg-slate-900/80 border-white/5 text-slate-400 hover:text-white hover:border-white/10'
                          }\`}
                        >`);

code = code.replace(/<\/p>\n\s+<\/button>\n\s+\)\;\n\s+\}\)}/g,
`</p>
                        </Card>
                      );
                    }}`);

fs.writeFileSync('ui/src/views/SubtitlesView.tsx', code);
