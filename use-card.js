const fs = require('fs');
let code = fs.readFileSync('ui/src/views/ReframeView.tsx', 'utf8');

// There's a generic div acting as a card that we can replace
code = code.replace(/<div className="glass-card rounded-xl p-5 space-y-3">/g, '<Card className="p-5 space-y-3">');
code = code.replace(/<div className="glass-card rounded-xl p-5 space-y-4">/g, '<Card className="p-5 space-y-4">');
code = code.replace(/<div className="glass-card rounded-xl p-5 space-y-3 bg-gradient-to-br from-slate-900 to-amber-950\/20 border-amber-500\/20">/g, '<Card className="p-5 space-y-3 bg-gradient-to-br from-slate-900 to-amber-950/20 border-amber-500/20">');
// Since these are opening tags, we also need to close them properly.
// The easiest way is to let TypeScript catch it or just do it carefully.
