const fs = require('fs');
let code = fs.readFileSync('ui/src/views/ReframeView.tsx', 'utf8');

// Remove the unused import line
code = code.replace(/import \{ Tabs, TabsList, TabsTrigger, TabsContent \} from '\.\.\/components\/ui\/tabs';\n/, '');

// Then add it back properly where it's actually used if it is missing
// Wait, why is it unused? Because the Tabs replacement in the first step failed due to regex mismatch!

code = code.replace(/<div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">\n\s+\{clips\.map\(\(clip, i\) => \(\n\s+<button\n\s+key=\{clip\.id\}\n\s+onClick=\{\(\) => selectClip\(i\)\}\n\s+className=\{`px-3\.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all flex items-center space-x-2 \$\{\n\s+activeClipIndex === i\n\s+\? 'bg-amber-400\/10 border-amber-400\/50 text-white'\n\s+: 'bg-slate-900 border-white\/5 text-slate-400 hover:text-white hover:bg-white\/5'\n\s+\}`\}\n\s+>\n\s+<span>Clip \{i \+ 1\}<\/span>\n\s+\{clip\.isRendered && <CheckCircle2 className="w-3\.5 h-3\.5 text-emerald-400" \/>\}\n\s+<\/button>\n\s+\)\}\n\s+<\/div>/,
`<Tabs value={activeClipIndex.toString()} onValueChange={(val) => selectClip(parseInt(val))}>
            <TabsList className="flex w-max space-x-1 overflow-x-auto scrollbar-hide">
              {clips.map((clip, i) => (
                <TabsTrigger key={clip.id} value={i.toString()} className="flex items-center space-x-1.5 px-3 py-1.5">
                  <span>Clip {i + 1}</span>
                  {clip.isRendered && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>`);


code = code.replace(/<div className="flex bg-slate-900 rounded-lg p-1 border border-white\/5 w-max">\n\s+<button\n\s+onClick=\{\(\) => setPreviewMode\('stage'\)\}\n\s+className=\{`px-3 py-1\.5 rounded text-xs font-semibold transition-all flex items-center space-x-1\.5 \$\{\n\s+previewMode === 'stage' \? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'\n\s+\}`\}\n\s+>\n\s+<Film className="w-3\.5 h-3\.5" \/>\n\s+<span>Source Stage View<\/span>\n\s+<\/button>\n\s+<button\n\s+onClick=\{\(\) => setPreviewMode\('cropped'\)\}\n\s+className=\{`px-3 py-1\.5 rounded text-xs font-semibold transition-all flex items-center space-x-1\.5 \$\{\n\s+previewMode === 'cropped' \? 'bg-amber-400\/20 text-amber-400 shadow' : 'text-slate-400 hover:text-white'\n\s+\}`\}\n\s+>\n\s+<Smartphone className="w-3\.5 h-3\.5" \/>\n\s+<span>Simulated Output View<\/span>\n\s+<\/button>\n\s+<\/div>/,
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

code = `import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';\n` + code;

fs.writeFileSync('ui/src/views/ReframeView.tsx', code);
