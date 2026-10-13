const fs = require('fs');
let code = fs.readFileSync('ui/src/views/SubtitlesView.tsx', 'utf8');
console.log(code.includes('import { Button }'));
