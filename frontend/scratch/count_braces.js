const fs = require('fs');
const content = fs.readFileSync('components/StudyTrackerApp.tsx', 'utf8');
const lines = content.split('\n');

let openBraces = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    openBraces += opens - closes;
    if (i >= 162 && i <= 950) {
        console.log(`${i + 1}: ${openBraces} | ${line.trim()}`);
    }
}
