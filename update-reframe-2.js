const fs = require('fs');
let code = fs.readFileSync('ui/src/views/ReframeView.tsx', 'utf8');

// Replace the Aspect Ratio buttons
code = code.replace(/<button\s+onClick=\{\(\) => setReframeState\(\(prev\) => \(\{ \.\.\.prev, aspectRatio: '9:16' \}\)\)\}\s+className=\{`p-3 rounded-lg border text-center transition-all \$\{\s+aspectRatio === '9:16'\s+\? 'bg-amber-400\/10 border-amber-400\/50 text-white'\s+: 'bg-slate-900 border-white\/5 text-slate-400 hover:text-white'\s+\}`\}\s+>\s+<Smartphone className="w-5 h-5 mx-auto mb-1 text-amber-400" \/>\s+<div className="text-xs font-bold">9:16<\/div>\s+<div className="text-\[9px\] text-slate-500">TikTok\/Reels<\/div>\s+<\/button>/,
`<Card
                interactive
                onClick={() => setReframeState((prev) => ({ ...prev, aspectRatio: '9:16' }))}
                className={\`p-3 text-center \${
                  aspectRatio === '9:16'
                    ? 'bg-amber-400/10 border-amber-400/50 text-white'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }\`}
              >
                <Smartphone className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                <div className="text-xs font-bold">9:16</div>
                <div className="text-[9px] text-slate-500">TikTok/Reels</div>
              </Card>`);

code = code.replace(/<button\s+onClick=\{\(\) => setReframeState\(\(prev\) => \(\{ \.\.\.prev, aspectRatio: '1:1' \}\)\)\}\s+className=\{`p-3 rounded-lg border text-center transition-all \$\{\s+aspectRatio === '1:1'\s+\? 'bg-amber-400\/10 border-amber-400\/50 text-white'\s+: 'bg-slate-900 border-white\/5 text-slate-400 hover:text-white'\s+\}`\}\s+>\s+<Square className="w-5 h-5 mx-auto mb-1 text-sky-400" \/>\s+<div className="text-xs font-bold">1:1<\/div>\s+<div className="text-\[9px\] text-slate-500">Instagram<\/div>\s+<\/button>/,
`<Card
                interactive
                onClick={() => setReframeState((prev) => ({ ...prev, aspectRatio: '1:1' }))}
                className={\`p-3 text-center \${
                  aspectRatio === '1:1'
                    ? 'bg-amber-400/10 border-amber-400/50 text-white'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }\`}
              >
                <Square className="w-5 h-5 mx-auto mb-1 text-sky-400" />
                <div className="text-xs font-bold">1:1</div>
                <div className="text-[9px] text-slate-500">Instagram</div>
              </Card>`);

code = code.replace(/<button\s+onClick=\{\(\) => setReframeState\(\(prev\) => \(\{ \.\.\.prev, aspectRatio: '16:9' \}\)\)\}\s+className=\{`p-3 rounded-lg border text-center transition-all \$\{\s+aspectRatio === '16:9'\s+\? 'bg-amber-400\/10 border-amber-400\/50 text-white'\s+: 'bg-slate-900 border-white\/5 text-slate-400 hover:text-white'\s+\}`\}\s+>\s+<Monitor className="w-5 h-5 mx-auto mb-1 text-emerald-400" \/>\s+<div className="text-xs font-bold">16:9<\/div>\s+<div className="text-\[9px\] text-slate-500">Landscape<\/div>\s+<\/button>/,
`<Card
                interactive
                onClick={() => setReframeState((prev) => ({ ...prev, aspectRatio: '16:9' }))}
                className={\`p-3 text-center \${
                  aspectRatio === '16:9'
                    ? 'bg-amber-400/10 border-amber-400/50 text-white'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }\`}
              >
                <Monitor className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                <div className="text-xs font-bold">16:9</div>
                <div className="text-[9px] text-slate-500">Landscape</div>
              </Card>`);

fs.writeFileSync('ui/src/views/ReframeView.tsx', code);
