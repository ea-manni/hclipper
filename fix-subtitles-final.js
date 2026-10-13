const fs = require('fs');
let code = fs.readFileSync('ui/src/views/SubtitlesView.tsx', 'utf8');

// I apparently lost the usage of Switch and Slider because my regex missed them somehow.
// Oh wait, `SubtitlesView.tsx` might have already been using `input type="range"`? No, I checked and replaced it in `fix-subtitles-proper.js` but wait... the previous replace didn't work because `git restore` brought it back to a bad state where the input replace didn't fire!

// Let's re-run the switch/slider replacements properly

// 1. Switches
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

// 2. Sliders
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

// 3. Select
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


fs.writeFileSync('ui/src/views/SubtitlesView.tsx', code);
