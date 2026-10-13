const fs = require('fs');
let code = fs.readFileSync('ui/src/views/SubtitlesView.tsx', 'utf8');

// I made a mess replacing presets because of the multi-line capture with $1 and the way it was originally written.

code = code.replace(/<Card[^>]*?> handleHookPresetChange\(preset\.id\)\}[\s\S]*?>/g,
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
