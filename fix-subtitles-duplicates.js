const fs = require('fs');
let code = fs.readFileSync('ui/src/views/SubtitlesView.tsx', 'utf8');

code = code.replace(/import \{ Tabs, TabsList, TabsTrigger, TabsContent \} from '\.\.\/components\/ui\/tabs';\nimport \{ Card \} from '\.\.\/components\/ui\/card';\n/, '');

fs.writeFileSync('ui/src/views/SubtitlesView.tsx', code);
