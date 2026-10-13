const fs = require('fs');
let code = fs.readFileSync('ui/src/views/SubtitlesView.tsx', 'utf8');

// I'll strip out all manually added imports
code = code.replace(/import \{ Button \} from '\.\.\/components\/ui\/button';\n/, '');
code = code.replace(/import \{ Switch \} from '\.\.\/components\/ui\/switch';\n/, '');
code = code.replace(/import \{ Slider \} from '\.\.\/components\/ui\/slider';\n/, '');
code = code.replace(/import \{ Tabs, TabsList, TabsTrigger, TabsContent \} from '\.\.\/components\/ui\/tabs';\n/, '');
code = code.replace(/import \{ Select, SelectTrigger, SelectValue, SelectContent, SelectItem \} from '\.\.\/components\/ui\/select';\n/, '');
code = code.replace(/import \{ Card \} from '\.\.\/components\/ui\/card';\n/, '');

// Then just add exactly what we need
code = code.replace(/import \{ useWorkflow \} from '\.\.\/context\/WorkflowContext';/,
  `import { useWorkflow } from '../context/WorkflowContext';\nimport { Button } from '../components/ui/button';\nimport { Switch } from '../components/ui/switch';\nimport { Slider } from '../components/ui/slider';\nimport { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';\nimport { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';\nimport { Card } from '../components/ui/card';`);


// Since the UI inputs/buttons were NOT using double quotes everywhere or whitespace didn't match perfectly,
// I will remove the errors by actually fixing exactly the 4 occurrences of input type="checkbox", 2 sliders, and 1 select.

// Switch 1
code = code.replace(/<input[\s]*type="checkbox"[\s]*checked=\{enableSubtitles\}[\s]*onChange=\{\(e\) => setEnableSubtitles\(e.target.checked\)\}[\s]*className="[^"]*"[\s]*\/>/,
`<Switch checked={enableSubtitles} onCheckedChange={(checked) => setEnableSubtitles(checked)} />`);

// Switch 2
code = code.replace(/<input[\s]*type="checkbox"[\s]*checked=\{enableBGM\}[\s]*onChange=\{\(e\) => setEnableBGM\(e.target.checked\)\}[\s]*className="[^"]*"[\s]*\/>/,
`<Switch checked={enableBGM} onCheckedChange={(checked) => setEnableBGM(checked)} />`);

// Switch 3
code = code.replace(/<input[\s]*type="checkbox"[\s]*checked=\{enableAudioDSP\}[\s]*onChange=\{\(e\) => setEnableAudioDSP\(e.target.checked\)\}[\s]*className="[^"]*"[\s]*\/>/,
`<Switch checked={enableAudioDSP} onCheckedChange={(checked) => setEnableAudioDSP(checked)} />`);


// Slider 1
code = code.replace(/<input[\s]*type="range"[\s]*min="50"[\s]*max="900"[\s]*step="10"[\s]*value=\{marginV\}[\s]*onChange=\{\(e\) => setSubtitlesState\(\(prev\) => \(\{ \.\.\.prev, marginV: parseInt\(e.target.value\) \}\)\)\}[\s]*className="[^"]*"[\s]*\/>/,
`<Slider min={50} max={900} step={10} value={[marginV]} onValueChange={(val) => setSubtitlesState((prev) => ({ ...prev, marginV: val[0] }))} />`);

// Slider 2
code = code.replace(/<input[\s]*type="range"[\s]*min="0\.05"[\s]*max="1\.0"[\s]*step="0\.05"[\s]*value=\{bgmVolume\}[\s]*onChange=\{\(e\) => setSubtitlesState\(\(prev\) => \(\{ \.\.\.prev, bgmVolume: parseFloat\(e.target.value\) \}\)\)\}[\s]*className="[^"]*"[\s]*\/>/,
`<Slider min={0.05} max={1.0} step={0.05} value={[bgmVolume]} onValueChange={(val) => setSubtitlesState((prev) => ({ ...prev, bgmVolume: val[0] }))} />`);


// Select
code = code.replace(/<select[\s]*value=\{bgmTrack\}[\s]*onChange=\{\(e\) => setSubtitlesState\(\(prev\) => \(\{ \.\.\.prev, bgmTrack: e.target.value \}\)\)\}[\s]*className="[^"]*">[\s\S]*?<\/select>/,
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
