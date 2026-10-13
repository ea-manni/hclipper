const fs = require('fs');
let code = fs.readFileSync('ui/src/views/SubtitlesView.tsx', 'utf8');

// The reason it fails is because the spacing has newlines and the regex uses `[\s]*` which does not match `\n` in JS unless you use `/s` flag or `[\s\S]*`!
// Actually `\s` does match newlines. Why didn't it match? Let's be less strict.

code = code.replace(/<input\n\s+type="checkbox"[\s\S]*?setEnableSubtitles\(e\.target\.checked\)[\s\S]*?\/>/,
`<Switch checked={enableSubtitles} onCheckedChange={(checked) => setEnableSubtitles(checked)} />`);

code = code.replace(/<input\n\s+type="checkbox"[\s\S]*?setEnableBGM\(e\.target\.checked\)[\s\S]*?\/>/,
`<Switch checked={enableBGM} onCheckedChange={(checked) => setEnableBGM(checked)} />`);

code = code.replace(/<input \n\s+type="checkbox" \n\s+checked=\{enableAudioDSP\}[\s\S]*?\/>/,
`<Switch checked={enableAudioDSP} onCheckedChange={(checked) => setEnableAudioDSP(checked)} />`);

code = code.replace(/<input \n\s+type="range" [\s\S]*?setSubtitlesState\(\(prev\) => \(\{ \.\.\.prev, marginV: parseInt\(e\.target\.value\) \}\)\)[\s\S]*?\/>/,
`<Slider min={50} max={900} step={10} value={[marginV]} onValueChange={(val) => setSubtitlesState((prev) => ({ ...prev, marginV: val[0] }))} />`);

code = code.replace(/<input \n\s+type="range" [\s\S]*?setSubtitlesState\(\(prev\) => \(\{ \.\.\.prev, bgmVolume: parseFloat\(e\.target\.value\) \}\)\)[\s\S]*?\/>/,
`<Slider min={0.05} max={1.0} step={0.05} value={[bgmVolume]} onValueChange={(val) => setSubtitlesState((prev) => ({ ...prev, bgmVolume: val[0] }))} />`);

code = code.replace(/<select\n\s+value=\{bgmTrack\}[\s\S]*?<\/select>/,
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
