const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
const query = process.argv[3];

if (!filePath || !query) {
    console.error("Usage: node search.js <filePath> <query>");
    process.exit(1);
}

const absolutePath = path.resolve(filePath);
if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
}

const content = fs.readFileSync(absolutePath, 'utf8');
const lines = content.split('\n');

console.log(`Searching for "${query}" in ${filePath}...`);
let count = 0;
lines.forEach((line, index) => {
    if (line.toLowerCase().includes(query.toLowerCase())) {
        console.log(`${index + 1}: ${line.trim()}`);
        count++;
    }
});
console.log(`Found ${count} matches.`);
