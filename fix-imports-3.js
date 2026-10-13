const fs = require('fs');
let code = fs.readFileSync('ui/src/views/ReframeView.tsx', 'utf8');

// I put it at the very top of the file, which causes the unused error because it's duplicated.
code = code.replace(/^import \{ Tabs, TabsList, TabsTrigger, TabsContent \} from '\.\.\/components\/ui\/tabs';\n/, '');

fs.writeFileSync('ui/src/views/ReframeView.tsx', code);
