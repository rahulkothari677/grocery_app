const { execSync } = require('child_process');
const path = require('path');

const testScripts = [
  'test_security.js',
  'test_multistore.js',
  'test_extended_features.js',
  'test_substitutions_chat.js',
  'test_sockets_queues.js',
  'test_wallet_reversals.js',
  'test_compression.js',
  'test_migration.js',
  'test_search_recommend.js',
  'test_admin_governance.js'
];

console.log("=== LuxeGrocer Master Feature Verification Runner ===\n");
let passedCount = 0;
let failedCount = 0;
const results = [];

testScripts.forEach(script => {
  console.log(`Running ${script}...`);
  try {
    const output = execSync(`node ${script}`, { stdio: 'pipe', cwd: __dirname });
    console.log(`✅ ${script} PASSED!\n`);
    passedCount++;
    results.push({ script, status: 'PASS' });
  } catch (error) {
    console.log(`❌ ${script} FAILED!`);
    console.error(error.stdout ? error.stdout.toString() : '');
    console.error(error.stderr ? error.stderr.toString() : error.message);
    console.log('\n');
    failedCount++;
    results.push({ script, status: 'FAIL', error: error.message });
  }
});

console.log("==================================================");
console.log("               VERIFICATION SUMMARY               ");
console.log("==================================================");
results.forEach(res => {
  console.log(`${res.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} : ${res.script}`);
});
console.log("\nPassed: " + passedCount + " / " + testScripts.length);
console.log("Failed: " + failedCount + " / " + testScripts.length);

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("\nALL SYSTEMS FUNCTIONING PERFECTLY!");
  process.exit(0);
}
