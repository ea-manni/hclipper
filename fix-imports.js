const fs = require('fs');
let code = fs.readFileSync('ui/src/views/ReframeView.tsx', 'utf8');

// The original import replace seems to have added duplicates or placed them in a way
// that TypeScript isn't catching the usages correctly, let's look at the file.
