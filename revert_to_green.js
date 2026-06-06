const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/pages/Signup.css',
  'src/pages/Login.css',
  'src/pages/HouseholdProfile.css',
  'src/pages/Profile.css',
  'src/pages/PendingVerification.css',
  'src/pages/EmailVerification.css',
  'src/pages/EmergencyHotlines.css'
];

// We want to replace the YELLOW we put in back to GREEN, but keep specific things yellow.
// eab308 was primary yellow. facc15 was light yellow/accent. ca8a04 was dark yellow.
// Let's replace eab308 -> 16a34a (Green 600)
// facc15 -> 22c55e (Green 500)
// ca8a04 -> 15803d (Green 700)
// a16207 -> 166534 (Green 800)
// 0f172a -> ffffff (Text color on primary buttons/headers)

const revertToGreen = [
  { search: /#eab308/gi, replace: '#16a34a' },
  { search: /#facc15/gi, replace: '#22c55e' },
  { search: /#ca8a04/gi, replace: '#15803d' },
  { search: /#a16207/gi, replace: '#166534' },
  { search: /#0f172a/gi, replace: '#ffffff' }
];

for (const file of filesToUpdate) {
  const filePath = path.join('c:/Users/minim/Documents/barangay-voting/barangay-system', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // First, revert the yellow replacements back to green
    for (const { search, replace } of revertToGreen) {
      content = content.replace(search, replace);
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Reverted to Green: ${file}`);
    }
  }
}
