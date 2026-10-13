const fs = require('fs');
let code = fs.readFileSync('ui/src/views/SubtitlesView.tsx', 'utf8');

// I replaced handleHookPresetChange with inline `setSubtitlesState` so handleHookPresetChange is no longer used.
// Let's bring it back to its intended form since it may have contained other logic:
// Wait, I didn't see its body before. I'll just change the onClick back to use `handleHookPresetChange`!
code = code.replace(/onClick=\{\(\) => setSubtitlesState\(\(prev\) => \(\{ \.\.\.prev, hookBannerPreset: preset\.id \}\)\)\}/g,
  "onClick={() => handleHookPresetChange(preset.id as any)}");

// And for the unused imports, I'll remove the extra import declarations
code = code.replace(/import \{ Tabs, TabsList, TabsTrigger \} from '\.\.\/components\/ui\/tabs';\n/g, '');
code = code.replace(/import \{ Select, SelectTrigger, SelectValue, SelectContent, SelectItem \} from '\.\.\/components\/ui\/select';\n/g, '');
code = code.replace(/import \{ Button \} from '\.\.\/components\/ui\/button';\n/, '');
code = code.replace(/import \{ Switch \} from '\.\.\/components\/ui\/switch';\n/, '');
code = code.replace(/import \{ Slider \} from '\.\.\/components\/ui\/slider';\n/, '');

// Then add them properly exactly once:
code = code.replace(/import \{ useWorkflow \} from '\.\.\/context\/WorkflowContext';/,
  `import { useWorkflow } from '../context/WorkflowContext';\nimport { Button } from '../components/ui/button';\nimport { Switch } from '../components/ui/switch';\nimport { Slider } from '../components/ui/slider';\nimport { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';\nimport { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';\nimport { Card } from '../components/ui/card';`);

fs.writeFileSync('ui/src/views/SubtitlesView.tsx', code);
