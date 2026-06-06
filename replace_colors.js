const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/pages/Signup.css',
  'src/pages/Login.css',
  'src/pages/HouseholdProfile.css',
  'src/pages/Profile.css',
  'src/pages/PendingVerification.css',
  'src/pages/EmailVerification.css'
];

const replacements = [
  { search: /#16A34A/gi, replace: '#eab308' },
  { search: /#15803D/gi, replace: '#ca8a04' },
  { search: /#22C55E/gi, replace: '#facc15' },
  { search: /#166534/gi, replace: '#a16207' },
  { search: /#0052CC/gi, replace: '#eab308' },
  { search: /#0066FF/gi, replace: '#facc15' },
  { search: /#2563EB/gi, replace: '#eab308' },
  { search: /#3B82F6/gi, replace: '#facc15' },
  { search: /#1D4ED8/gi, replace: '#ca8a04' },
  { search: /#1976d2/gi, replace: '#ca8a04' }
];

for (const file of filesToUpdate) {
  const filePath = path.join('c:/Users/minim/Documents/barangay-voting/barangay-system', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const { search, replace } of replacements) {
      content = content.replace(search, replace);
    }
    
    // Also change white text to dark text on yellow buttons
    content = content.replace(/color:\s*white;/gi, (match) => {
        // We only want to replace this inside primary buttons or badges that just got turned yellow.
        // It's a bit risky to regex all "color: white;".
        return match;
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${file}`);
    }
  }
}
