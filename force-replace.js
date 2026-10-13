const fs = require('fs');
let code = fs.readFileSync('ui/src/views/SubtitlesView.tsx', 'utf8');

// The reason it wasn't replaced is because `npm run build` showed errors: none of my replacements worked.
// This is because the newlines/spaces in the regex didn't match the source exactly.
// I will use more robust substring replacement strategies.

code = code.replace(/<button[^>]*?onClick=\{togglePlayback\}[^>]*?>[\s\S]*?<\/button>/,
`<Button size="icon" onClick={togglePlayback} disabled={!sourceVideo}>
                {isPlaying ? <Pause className="w-4 h-4 text-slate-950" /> : <Play className="w-4 h-4 text-slate-950 ml-0.5" />}
              </Button>`);

code = code.replace(/<button[^>]*?onClick=\{openOutputDirectory\}[^>]*?>[\s\S]*?<\/button>/,
`<Button variant="outline" size="sm" onClick={openOutputDirectory} disabled={!activeClip.isSubtitled}>
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Open Export Folder</span>
              </Button>`);

code = code.replace(/<div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">[\s\S]*?<\/div>/,
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

code = code.replace(/<button[^>]*?onClick=\{handleTranscribe\}[^>]*?>[\s\S]*?<\/button>/,
`<Button
              onClick={handleTranscribe}
              disabled={isTranscribing || !sourceVideo}
              variant={hasCaptions ? "outline" : "default"}
              className="px-5 w-full"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
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

code = code.replace(/<button[^>]*?onClick=\{handleRenderSubtitleClip\}[^>]*?>[\s\S]*?<\/button>/,
`<Button
              onClick={handleRenderSubtitleClip}
              disabled={isRendering || !sourceVideo}
              variant={activeClip.isSubtitled ? "outline" : "default"}
              className="w-full justify-center"
            >
              {isRendering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Rendering Final Clip ({renderProgress}%)...</span>
                </>
              ) : activeClip.isSubtitled ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400">Master Render Saved</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Master Render Clip #{activeClipIndex + 1}</span>
                </>
              )}
            </Button>`);

code = code.replace(/<button[^>]*?onClick=\{onNavigateToReframe\}[^>]*?>[\s\S]*?<\/button>/,
`<Button variant="ghost" onClick={onNavigateToReframe}>
          ← Back to Step 4: AI Reframe
        </Button>`);

code = code.replace(/<button[^>]*?onClick=\{onNext\}[^>]*?>[\s\S]*?<\/button>/,
`<Button onClick={onNext} className="shadow-lg shadow-amber-500/20">
          <span>Proceed to Step 6: Publish</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>`);

code = code.replace(/<input[^>]*?checked=\{enableSubtitles\}[^>]*?\/>/,
`<Switch
                    checked={enableSubtitles}
                    onCheckedChange={(checked) => setEnableSubtitles(checked)}
                  />`);

code = code.replace(/<input[^>]*?checked=\{enableBGM\}[^>]*?\/>/,
`<Switch
                    checked={enableBGM}
                    onCheckedChange={(checked) => setEnableBGM(checked)}
                  />`);

code = code.replace(/<input[^>]*?checked=\{enableAudioDSP\}[^>]*?\/>/,
`<Switch
                    checked={enableAudioDSP}
                    onCheckedChange={(checked) => setEnableAudioDSP(checked)}
                  />`);

code = code.replace(/<input[^>]*?value=\{marginV\}[^>]*?\/>/,
`<Slider
                  min={50}
                  max={900}
                  step={10}
                  value={[marginV]}
                  onValueChange={(val) => setSubtitlesState((prev) => ({ ...prev, marginV: val[0] }))}
                />`);

code = code.replace(/<input[^>]*?value=\{bgmVolume\}[^>]*?\/>/,
`<Slider
                  min={0.05}
                  max={1.0}
                  step={0.05}
                  value={[bgmVolume]}
                  onValueChange={(val) => setSubtitlesState((prev) => ({ ...prev, bgmVolume: val[0] }))}
                />`);

code = code.replace(/<select[^>]*?value=\{bgmTrack\}[^>]*?>[\s\S]*?<\/select>/,
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

// Fix presets buttons
code = code.replace(/<button[^>]*?key=\{preset\.id\}[^>]*?>([\s\S]*?)<\/button>/g,
`<Card
                              interactive
                              key={preset.id}
                              onClick={() => setSubtitlesState((prev) => ({ ...prev, hookBannerPreset: preset.id }))}
                              className={\`p-3 text-left relative overflow-hidden \${
                                hookBannerPreset === preset.id
                                  ? 'bg-amber-400/10 border-amber-400/50'
                                  : 'bg-slate-900 border-white/5 hover:border-white/20'
                              }\`}
                            >$1</Card>`);


fs.writeFileSync('ui/src/views/SubtitlesView.tsx', code);
