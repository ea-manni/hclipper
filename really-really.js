const fs = require('fs');
let code = fs.readFileSync('ui/src/views/SubtitlesView.tsx', 'utf8');

// I'm tired of regex fighting with whitespace. I'm going to just find the exact string indices and replace them.

code = code.replace(/<input\s+type="checkbox"\s+checked=\{enableSubtitles\}[^>]*?>/g, `<Switch checked={enableSubtitles} onCheckedChange={(checked) => setEnableSubtitles(checked)} />`);
code = code.replace(/<input\s+type="checkbox"\s+checked=\{enableBGM\}[^>]*?>/g, `<Switch checked={enableBGM} onCheckedChange={(checked) => setEnableBGM(checked)} />`);
code = code.replace(/<input\s+type="checkbox"\s+checked=\{enableAudioDSP\}[^>]*?>/g, `<Switch checked={enableAudioDSP} onCheckedChange={(checked) => setEnableAudioDSP(checked)} />`);

code = code.replace(/<input\s+type="range"\s+min="50"[^>]*?>/g, `<Slider min={50} max={900} step={10} value={[marginV]} onValueChange={(val) => setSubtitlesState((prev) => ({ ...prev, marginV: val[0] }))} />`);
code = code.replace(/<input\s+type="range"\s+min="0\.05"[^>]*?>/g, `<Slider min={0.05} max={1.0} step={0.05} value={[bgmVolume]} onValueChange={(val) => setSubtitlesState((prev) => ({ ...prev, bgmVolume: val[0] }))} />`);

fs.writeFileSync('ui/src/views/SubtitlesView.tsx', code);
