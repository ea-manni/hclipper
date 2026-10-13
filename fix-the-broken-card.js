const fs = require('fs');
let code = fs.readFileSync('ui/src/views/SubtitlesView.tsx', 'utf8');

code = code.replace(/<Card\n\s+interactive\n\s+key=\{preset\.id\}\n\s+onClick=\{\(\) => setSubtitlesState\(\(prev\) => \(\{ \.\.\.prev, hookBannerPreset: preset\.id \}\)\)\}\n\s+className=\{`p-3 text-left relative overflow-hidden \$\{\n\s+hookBannerPreset === preset\.id\n\s+\? 'bg-amber-400\/10 border-amber-400\/50'\n\s+: 'bg-slate-900 border-white\/5 hover:border-white\/20'\n\s+\}`\}\n\s+> handleHookPresetChange\(preset\.id\)\}\n\s+className=\{`p-2\.5 rounded-lg border text-left transition-all \$\{\n\s+isSelected\n\s+\? 'bg-amber-400\/10 border-amber-400\/60 text-white shadow-sm'\n\s+: 'bg-slate-900\/80 border-white\/5 text-slate-400 hover:text-white hover:border-white\/10'\n\s+\}`\}\n\s+>/g,
`<Card
                          interactive
                          key={preset.id}
                          onClick={() => setSubtitlesState((prev) => ({ ...prev, hookBannerPreset: preset.id }))}
                          className={\`p-3 text-left relative overflow-hidden \${
                            isSelected
                              ? 'bg-amber-400/10 border-amber-400/50'
                              : 'bg-slate-900 border-white/5 hover:border-white/20'
                          }\`}
                        >`);

fs.writeFileSync('ui/src/views/SubtitlesView.tsx', code);
